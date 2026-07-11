import { Worker } from 'bullmq';
import { logger } from '../../lib/logger';

const connection = { host: 'localhost', port: 6379 };

export const emailWorker = new Worker('EmailQueue', async (job) => {
  logger.info(`Processing email job ${job.id}`);
  // Execute email sending logic via SendGrid or similar
}, { connection });

emailWorker.on('completed', job => logger.debug(`Email job ${job.id} completed`));
emailWorker.on('failed', (job, err) => logger.error(`Email job ${job?.id} failed: ${err.message}`));
