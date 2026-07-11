import { Worker } from 'bullmq';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { generatePrefixedId } from '../../utils/generateId';
// import { socketServer } from '../../realtime/SocketServer'; // Phase 16

const connection = { host: 'localhost', port: 6379 };

export const notificationWorker = new Worker('NotificationQueue', async (job) => {
  logger.info(`Processing notification job ${job.id}`);
  const { organizationId, userId, type, title, message } = job.data;
  
  // 1. Save to DB
  const notif = await prisma.notification.create({
    data: {
      id: generatePrefixedId('notif'),
      organizationId,
      userId,
      type,
      title,
      body: message
    }
  });

  // 2. Broadcast via WebSockets
  // socketServer.emitToOrg(organizationId, 'notification:new', notif);
  
}, { connection });

notificationWorker.on('completed', job => logger.debug(`Notification job ${job.id} completed`));
notificationWorker.on('failed', (job, err) => logger.error(`Notification job ${job?.id} failed: ${err.message}`));
