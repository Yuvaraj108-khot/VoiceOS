import { Queue } from 'bullmq';
import { logger } from '../../lib/logger';
import { analyticsQueue } from '../queues/analytics.queue';

/**
 * Schedules recurring jobs for the analytics engine.
 */
export async function startAnalyticsScheduler() {
  logger.info('Starting Analytics Scheduler');
  
  // Flush metrics from Redis to Postgres every 5 minutes
  await analyticsQueue.add('flushRedisToPostgres', {}, {
    repeat: { pattern: '*/5 * * * *' } // Cron format
  });
}
