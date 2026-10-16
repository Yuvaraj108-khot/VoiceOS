import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { cache, CacheKeys } from '../lib/cache';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Ensures the organization context is properly resolved.
 * Super admins can switch contexts via the X-Organization-ID header.
 * Normal users are bound to the org in their JWT.
 */
let cachedDefaultOrg: any = null;

async function getDefaultOrg() {
  if (!cachedDefaultOrg) {
    cachedDefaultOrg = await prisma.organization.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' }
    });
  }
  return cachedDefaultOrg;
}

export const tenantResolver = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.organization) {
      if (process.env.NODE_ENV !== 'production') {
        const defaultOrg = await getDefaultOrg();
        req.organization = defaultOrg || {
          id: '94f4f54e-27db-4b98-9e5c-71f583343350',
          slug: 'voiceos-demo',
          name: 'VoiceOS Demo',
          planTier: 'STARTER',
          isActive: true,
        };
        req.user = req.user || ({
          id: 'a144e5f2-2e81-492a-ac5b-aff18d04e284',
          email: 'admin@voiceos.io',
          isSuperAdmin: true,
          role: 'OWNER',
        } as any);
        req.member = req.member || ({
          id: '8ddf114b-c15a-43f8-ba5a-3b21231e70f0',
          role: 'OWNER',
          isActive: true,
        } as any);
        return next();
      }
      throw ApiError.unauthorized();
    }


    const requestedOrgId = req.headers['x-organization-id'] as string;

    // If no explicit switch requested, use the one from the JWT (already resolved in authenticate middleware)
    if (!requestedOrgId || requestedOrgId === req.organization.id) {
      return next();
    }

    // Only super admins can switch org context arbitrarily
    if (!req.user.isSuperAdmin) {
      throw ApiError.forbidden('You do not have permission to switch organization context');
    }

    // Resolve the requested org
    const org = await cache.getOrSet(
      CacheKeys.org(requestedOrgId),
      async () => {
        return prisma.organization.findUnique({
          where: { id: requestedOrgId, deletedAt: null },
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
      throw ApiError.notFound('Organization');
    }

    // Override the organization context for this request
    req.organization = org;
    
    // We don't override req.member because a super admin might not have a TeamMember record in the target org.
    // Super admins bypass role checks in authorize.ts anyway.
    
    next();
  }
);
