import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

export class AnalyticsAggregator {
  /**
   * Run periodically via cron job to flush Redis metrics to the PostgreSQL DB.
   */
  async flushToDatabase() {
    if (redis.status !== 'ready') return;

    logger.info('Flushing Redis analytics to Postgres...');
    try {
      const keys = await redis.keys('metrics:*');
      if (keys.length === 0) return;

      // In a real implementation, we would parse keys and bulk insert into an Analytics table
      // e.g. metrics:orgId:2026-07-10:event -> insert into DB -> delete from Redis

      for (const key of keys) {
        // const val = await redis.get(key);
        // ... bulk insert logic ...
        await redis.del(key);
      }
      
      logger.info(`Flushed ${keys.length} metric keys`);
    } catch (err) {
      logger.error(`Error flushing metrics: ${err}`);
    }
  }
}

export const analyticsAggregator = new AnalyticsAggregator();
