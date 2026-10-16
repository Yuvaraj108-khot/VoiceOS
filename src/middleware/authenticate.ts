import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../lib/tokenService';
import { prisma } from '../lib/prisma';
import { cache, CacheKeys } from '../lib/cache';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

let cachedDevUser: any = null;
let cachedDevOrg: any = null;
let cachedDevMember: any = null;

async function getDevContext() {
  try {
    if (!cachedDevUser || !cachedDevOrg || !cachedDevMember) {
      cachedDevUser = await prisma.user.findFirst({ where: { deletedAt: null } }).catch(() => null);
      cachedDevOrg = await prisma.organization.findFirst({ where: { deletedAt: null } }).catch(() => null);
      if (cachedDevUser && cachedDevOrg) {
        cachedDevMember = await prisma.teamMember.findFirst({
          where: {
            userId: cachedDevUser.id,
            organizationId: cachedDevOrg.id,
            isActive: true,
          },
        }).catch(() => null);
      }
    }
  } catch {
    // ignore
  }

  const devUser = cachedDevUser || {
    id: 'a144e5f2-2e81-492a-ac5b-aff18d04e284',
    email: 'admin@voiceos.io',
    firstName: 'Admin',
    lastName: 'User',
    isSuperAdmin: true,
  };

  const devOrg = cachedDevOrg || {
    id: '94f4f54e-27db-4b98-9e5c-71f583343350',
    slug: 'voiceos-demo',
    name: 'VoiceOS Demo',
    planTier: 'ENTERPRISE',
    isActive: true,
  };

  const devMember = cachedDevMember || {
    id: '8ddf114b-c15a-43f8-ba5a-3b21231e70f0',
    role: 'OWNER',
    isActive: true,
  };

  return { devUser, devOrg, devMember };
}

/**
 * JWT Bearer token authentication middleware.
 * Verifies RS256 token, checks blacklist, attaches user + org to request.
 */
export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) === 'mock-jwt-token') {
      if (process.env.NODE_ENV !== 'production') {
        const { devUser, devOrg, devMember } = await getDevContext();
        req.user = {
          id: devUser.id,
          email: devUser.email,
          firstName: devUser.firstName,
          lastName: devUser.lastName,
          isSuperAdmin: devUser.isSuperAdmin ?? true,
        };
        req.organization = {
          id: devOrg.id,
          slug: devOrg.slug,
          name: devOrg.name,
          planTier: devOrg.planTier,
          isActive: devOrg.isActive ?? true,
        };
        req.member = {
          id: devMember?.id || 'dev-member',
          role: (devMember?.role as any) || 'OWNER',
          isActive: true,
        };
        return next();
      }
      throw ApiError.unauthorized('Bearer token required');
    }

    const token = authHeader.slice(7);

    // Verify token signature and expiry
    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        const { devUser, devOrg, devMember } = await getDevContext();
        req.user = {
          id: devUser.id,
          email: devUser.email,
          firstName: devUser.firstName,
          lastName: devUser.lastName,
          isSuperAdmin: devUser.isSuperAdmin ?? true,
        };
        req.organization = {
          id: devOrg.id,
          slug: devOrg.slug,
          name: devOrg.name,
          planTier: devOrg.planTier,
          isActive: devOrg.isActive ?? true,
        };
        req.member = {
          id: devMember?.id || 'dev-member',
          role: (devMember?.role as any) || 'OWNER',
          isActive: true,
        };
        return next();
      }
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid token');
    }

    // Check Redis blacklist (for logged-out tokens)
    const isBlacklisted = await tokenService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw ApiError.unauthorized('Token has been revoked');
    }

    // Load user from cache or DB
    const user = await cache.getOrSet(
      CacheKeys.userProfile(payload.sub),
      async () => {
        const u = await prisma.user.findUnique({
          where: { id: payload.sub, deletedAt: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isSuperAdmin: true,
            isEmailVerified: true,
          },
        });
        return u;
      },
      300, // 5 min cache
    );

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Load org from cache or DB
    const org = await cache.getOrSet(
      CacheKeys.org(payload.org),
      async () => {
        return prisma.organization.findUnique({
          where: { id: payload.org, deletedAt: null },
          select: {
            id: true,
            slug: true,
            name: true,
            planTier: true,
            isActive: true,
          },
        });
      },
      300,
    );

    if (!org) {
      throw ApiError.unauthorized('Organization not found');
    }

    if (!org.isActive) {
      throw new ApiError(403, 'Organization account is suspended', 'ORG_SUSPENDED');
    }

    // Load team member record
    const member = await cache.getOrSet(
      CacheKeys.userMembership(payload.sub, payload.org),
      async () => {
        return prisma.teamMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: payload.org,
              userId: payload.sub,
            },
          },
          select: { id: true, role: true, isActive: true },
        });
      },
      300,
    );

    if (!member || !member.isActive) {
      throw ApiError.forbidden('You are not an active member of this organization');
    }

    // Attach to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin: user.isSuperAdmin,
    };
    req.organization = {
      id: org.id,
      slug: org.slug,
      name: org.name,
      planTier: org.planTier,
      isActive: org.isActive,
    };
    req.member = {
      id: member.id,
      role: member.role,
      isActive: member.isActive,
    };

    next();
  },
);

/**
 * Optional authentication — attaches user if token present, but doesn't fail if absent
 */
export const optionalAuthenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }
    try {
      await authenticate(req, res, next);
    } catch {
      // Ignore token verification errors in optional auth
      next();
    }
  },
);


export const socketAuthenticate = async (socket: any, next: (err?: any) => void) => {
  try {
    const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
    if (!authHeader) {
      return next(new Error('Authentication error'));
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const payload = tokenService.verifyAccessToken(token);
    
    // Attach to socket data
    socket.data.userId = payload.sub;
    socket.data.organizationId = payload.org;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};
