import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';
import { config } from '../config/app.config';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    // Check for tracing headers from load balancers
    const traceId =
      req.headers['x-request-id'] ||
      req.headers['x-b3-traceid'] ||
      req.headers['traceparent'];

    const id = traceId ? String(traceId) : randomUUID();
    // Attach to req object for use in ApiResponse/ApiError
    (req as any).requestId = id;
    return id;
  },
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  // Skip logging for health checks
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/api/health',
  },
});
