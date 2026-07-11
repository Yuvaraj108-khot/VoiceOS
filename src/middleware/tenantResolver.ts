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
export const tenantResolver = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.organization) {
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
