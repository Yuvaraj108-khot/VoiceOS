import { Request, Response, NextFunction } from 'express';
import type { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { asyncHandler } from '../utils/asyncHandler';

interface AuditLogOptions {
  action: AuditAction;
  resource: string;
  getResourceId?: (req: Request, res: Response) => string | undefined;
  getChanges?: (req: Request, res: Response) => Record<string, unknown> | undefined;
  getMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}

/**
 * Middleware factory to asynchronously log user actions to the audit_logs table.
 * Does not block the HTTP response.
 */
export const auditLogger = (options: AuditLogOptions) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // We want to log *after* the request has completed successfully.
    // Express res.on('finish') is the standard way to hook into the end of a response.
    res.on('finish', () => {
      // Only log successful requests (2xx or 3xx)
      if (res.statusCode >= 400) return;

      const organizationId = req.organization?.id;
      const userId = req.user?.id;
      const resourceId = options.getResourceId ? options.getResourceId(req, res) : req.params.id;
      const changes = options.getChanges ? options.getChanges(req, res) : undefined;
      const metadata = options.getMetadata ? options.getMetadata(req, res) : {};

      // Fire and forget
      prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: options.action,
          resource: options.resource,
          resourceId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          changes: changes as any,
          metadata: {
            ...metadata,
            requestId: (req as any).requestId,
            method: req.method,
            path: req.path,
          },
        },
      }).catch(err => {
        logger.error({ err, action: options.action, resource: options.resource }, 'Failed to write audit log');
      });
    });

    next();
  });
};
