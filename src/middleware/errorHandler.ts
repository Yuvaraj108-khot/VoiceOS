import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../lib/logger';
import { isDev } from '../config/app.config';

/**
 * Global error handler middleware.
 * Maps application errors (Zod, Prisma, standard errors) to uniform ApiError JSON responses.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = (req as any).requestId;

  // 1. Handled API Errors
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, 'Internal API Error');
    }
    err.send(res, requestId);
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    ApiError.validationError(fields).send(res, requestId);
    return;
  }

  // 3. Prisma DB Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      ApiError.conflict(`${target} already exists`).send(res, requestId);
      return;
    }
    // Record not found
    if (err.code === 'P2025') {
      ApiError.notFound('Resource').send(res, requestId);
      return;
    }
    // Foreign key constraint failed
    if (err.code === 'P2003') {
      ApiError.badRequest('Referenced record does not exist').send(res, requestId);
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    ApiError.badRequest('Invalid database query parameters').send(res, requestId);
    return;
  }

  // 4. JWT Errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    ApiError.unauthorized('Invalid token').send(res, requestId);
    return;
  }

  // 5. Fallback — Unknown Internal Errors
  logger.error({ err, requestId, url: req.url }, 'Unhandled Error');

  const message = isDev ? err.message : 'An unexpected error occurred';
  const internalError = new ApiError(500, message, 'INTERNAL_SERVER_ERROR');

  internalError.send(res, requestId);
};
