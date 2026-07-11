import { Response } from 'express';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta | Record<string, unknown>;
  requestId?: string;
}

/**
 * Sends a standardized success response
 */
export const ApiResponse = {
  success<T>(
    res: Response,
    data: T,
    options: {
      statusCode?: number;
      message?: string;
      meta?: PaginationMeta | Record<string, unknown>;
    } = {},
  ): Response {
    const { statusCode = 200, message, meta } = options;
    const body: ApiSuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { meta }),
      requestId: (res.req as any).requestId,
    };
    return res.status(statusCode).json(body);
  },

  created<T>(res: Response, data: T, message?: string): Response {
    return ApiResponse.success(res, data, { statusCode: 201, message });
  },

  noContent(res: Response): Response {
    return res.status(204).send();
  },

  /**
   * Helper to build pagination meta
   */
  paginationMeta(total: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },
};
