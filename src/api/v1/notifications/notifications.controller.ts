import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const notificationsController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const unreadOnly = req.query.unread === 'true';

    const result = await notificationsService.list(req.user!.id, { page, limit, unreadOnly });
    
    ApiResponse.success(res, result.items, {
      meta: {
        ...ApiResponse.paginationMeta(result.total, result.page, result.limit),
        unreadCount: result.unreadCount,
      }
    });
  },

  async markAsRead(req: Request, res: Response) {
    const notification = await notificationsService.markAsRead(req.user!.id, req.params.id);
    ApiResponse.success(res, notification);
  },

  async markAllAsRead(req: Request, res: Response) {
    await notificationsService.markAllAsRead(req.user!.id);
    ApiResponse.noContent(res);
  }
};
