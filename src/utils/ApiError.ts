import { Response } from 'express';

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    fields?: FieldError[];
  };
  requestId?: string;
}

/**
 * Custom API error class with HTTP status code, machine-readable error code,
 * and optional field-level validation errors.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: FieldError[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    fields?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code ?? this.defaultCode(statusCode);
    this.fields = fields;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  private defaultCode(statusCode: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codes[statusCode] ?? 'ERROR';
  }

  toJSON(requestId?: string): ApiErrorBody {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.fields && { fields: this.fields }),
      },
      ...(requestId && { requestId }),
    };
  }

  // ─── Static factory methods ──────────────────────────────
  static badRequest(message: string, fields?: FieldError[]): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', fields);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'You do not have permission'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(404, `${resource} not found`, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }

  static tooManyRequests(message = 'Rate limit exceeded'): ApiError {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'An unexpected error occurred'): ApiError {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR');
  }

  static validationError(fields: FieldError[]): ApiError {
    return new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', fields);
  }

  /**
   * Send this error as an HTTP response
   */
  send(res: Response, requestId?: string): Response {
    return res.status(this.statusCode).json(this.toJSON(requestId));
  }
}
