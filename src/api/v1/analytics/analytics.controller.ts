import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ApiError } from '../../../utils/ApiError';

export const analyticsController = {
  async getOverview(req: Request, res: Response) {
    const { startDate, endDate } = getDateRange(req.query);
    const overview = await analyticsService.getOverview(req.organization!.id, startDate, endDate);
    ApiResponse.success(res, overview);
  },

  async getTrend(req: Request, res: Response) {
    const { startDate, endDate } = getDateRange(req.query);
    const trend = await analyticsService.getDailyTrend(req.organization!.id, startDate, endDate);
    ApiResponse.success(res, trend);
  }
};

function getDateRange(query: any) {
  const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
  const endDate = query.endDate ? new Date(query.endDate) : new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw ApiError.badRequest('Invalid date format. Use ISO strings.');
  }

  return { startDate, endDate };
}
