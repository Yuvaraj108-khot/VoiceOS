import { Queue } from 'bullmq';
const connection = { host: 'localhost', port: 6379 };

export const notificationQueue = new Queue('NotificationQueue', { connection });
