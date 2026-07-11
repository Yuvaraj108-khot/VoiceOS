import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export function registerNotificationEvents(io: Server, socket: Socket) {
  socket.on('notification:mark_read', async (data: { notificationId: string }) => {
    try {
      await prisma.notification.update({
        where: { id: data.notificationId },
        data: { isRead: true }
      });
      logger.debug(`Notification ${data.notificationId} marked as read via websocket`);
    } catch (err) {
      logger.error(`Error marking notification read via WS: ${err}`);
    }
  });
}
