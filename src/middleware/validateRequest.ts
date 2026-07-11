import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Middleware factory to validate Express request objects using Zod schemas.
 * Can validate body, query, and params.
 * 
 * Usage:
 *   router.post('/route', validateRequest({ body: myBodySchema }), handler);
 */
export const validateRequest = (schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as any;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // We throw the ZodError directly to let the global errorHandler format it
        next(err);
      } else {
        next(ApiError.badRequest('Validation failed'));
      }
    }
  };
};
