import { Worker } from 'bullmq';
import { logger } from '../../lib/logger';
import { analyticsAggregator } from '../../analytics/AnalyticsAggregator';

const connection = { host: 'localhost', port: 6379 };

export const analyticsWorker = new Worker('AnalyticsQueue', async (job) => {
  logger.info(`Processing analytics job ${job.id}`);
  
  if (job.name === 'flushRedisToPostgres') {
    await analyticsAggregator.flushToDatabase();
  }
  
}, { connection });

analyticsWorker.on('completed', job => logger.debug(`Analytics job ${job.id} completed`));
analyticsWorker.on('failed', (job, err) => logger.error(`Analytics job ${job?.id} failed: ${err.message}`));
