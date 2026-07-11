import { Request, Response, NextFunction } from 'express';
import type { MemberRole } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: MemberRole[] = ['VIEWER', 'AGENT', 'MANAGER', 'ADMIN', 'OWNER'];

/**
 * Returns true if the user's role meets or exceeds the required role
 */
function roleAtLeast(userRole: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

/**
 * Middleware factory: requires the authenticated user to have at least the given role.
 *
 * Usage:
 *   router.post('/employees', authenticate, requireRole('ADMIN'), handler)
 */
export const requireRole =
  (minimumRole: MemberRole) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.member) {
      next(ApiError.unauthorized());
      return;
    }

    // Super admins bypass all role checks
    if (req.user.isSuperAdmin) {
      next();
      return;
    }

    if (!roleAtLeast(req.member.role, minimumRole)) {
      next(
        new ApiError(
          403,
          `This action requires ${minimumRole} role or higher`,
          'INSUFFICIENT_ROLE',
        ),
      );
      return;
    }

    next();
  };

/**
 * Middleware: requires the user to be the organization OWNER
 */
export const requireOwner = requireRole('OWNER');

/**
 * Middleware: requires ADMIN or higher
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Middleware: requires MANAGER or higher
 */
export const requireManager = requireRole('MANAGER');

/**
 * Middleware: requires super admin (platform-level operations)
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user?.isSuperAdmin) {
    next(new ApiError(403, 'Super admin access required', 'SUPER_ADMIN_REQUIRED'));
    return;
  }
  next();
};

/**
 * Middleware: verifies that the resource being accessed belongs to the current org.
 * Use with route params that contain organization-scoped resource IDs.
 */
export const requireOrgScope =
  (paramName = 'id') =>
  (req: Request, res: Response, next: NextFunction): void => {
    // Org scope is enforced at service layer by always including organizationId in queries.
    // This middleware is a lightweight guard to ensure req.organization is set.
    if (!req.organization) {
      next(ApiError.unauthorized('Organization context required'));
      return;
    }
    next();
  };
