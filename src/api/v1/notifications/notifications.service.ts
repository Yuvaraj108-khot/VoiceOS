import { NotificationType } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { generatePrefixedId } from '../../../utils/generateId';

export const notificationsService = {
  async list(userId: string, options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(options.unreadOnly ? { isRead: false } : {})
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    return { items, total, page, limit, unreadCount };
  },

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    
    if (!notification || notification.userId !== userId) {
      throw ApiError.notFound('Notification');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  },

  // Note: This is usually called internally by other services or queue workers, not directly via REST API
  async create(data: { organizationId: string; userId?: string; type: NotificationType; title: string; body: string; metadata?: any; link?: string }) {
    return prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        metadata: data.metadata || {},
        link: data.link,
      }
    });
  }
};
