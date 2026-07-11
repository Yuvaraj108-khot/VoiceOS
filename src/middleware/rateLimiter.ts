import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/app.config';

/**
 * Creates a Redis-backed rate limiter
 */
const createLimiter = (options: {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: options.message ?? 'Too many requests. Please try again later.',
        statusCode: 429,
      },
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => (redis as any).call(...args),
      prefix: `rl:${options.prefix}:`,
    }),
    keyGenerator: (req: Request) => {
      // Use IP + user ID if authenticated (better than just IP)
      const userId = (req as any).user?.id ?? '';
      return `${req.ip}:${userId}`;
    },
    skip: (req: Request) => {
      // Skip rate limiting for super admins
      return (req as any).user?.isSuperAdmin === true;
    },
  });
};

/**
 * Strict limiter for authentication endpoints
 * 10 requests per minute per IP
 */
export const authRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: config.RATE_LIMIT_AUTH_MAX ?? 10,
  prefix: 'auth',
  message: 'Too many authentication attempts. Please wait a minute.',
});

/**
 * Standard API rate limiter
 * 100 requests per minute
 */
export const apiRateLimiter = createLimiter({
  windowMs: config.RATE_LIMIT_WINDOW_MS ?? 60000,
  max: config.RATE_LIMIT_MAX_REQUESTS ?? 100,
  prefix: 'api',
});

/**
 * Relaxed limiter for webhook endpoints (high throughput expected)
 */
export const webhookRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 500,
  prefix: 'webhook',
});

/**
 * Tight limiter for sensitive actions (password reset, invite)
 */
export const sensitiveRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  prefix: 'sensitive',
  message: 'Too many attempts. Please wait 15 minutes.',
});
