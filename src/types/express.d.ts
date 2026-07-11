import { Request, Response, NextFunction } from 'express';
import type { MemberRole } from '@prisma/client';

/**
 * Augments Express Request with VoiceOS-specific properties
 * set by authentication and tenant resolver middleware.
 */
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user from JWT */
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isSuperAdmin: boolean;
      };

      /** Current organization context (resolved from token) */
      organization?: {
        id: string;
        slug: string;
        name: string;
        planTier: string;
        isActive: boolean;
      };

      /** Current team member record (user's membership in this org) */
      member?: {
        id: string;
        role: MemberRole;
        isActive: boolean;
      };

      /** Unique request ID for tracing */
      requestId?: string;

      /** API key auth (alternative to JWT) */
      apiKey?: {
        id: string;
        organizationId: string;
        scopes: string[];
      };
    }
  }
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;
