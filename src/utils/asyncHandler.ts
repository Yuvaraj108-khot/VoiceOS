import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to Express's next() error handler.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     res.json(data);
 *   }));
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
