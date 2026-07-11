import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

export class MetricsCollector {
  /**
   * Tracks a real-time event (e.g., call started, workflow executed).
   * Fast ingestion using Redis HyperLogLog or counters.
   */
  async trackEvent(organizationId: string, eventName: string, value: number = 1) {
    if (redis.status !== 'ready') return;

    const dateStr = new Date().toISOString().split('T')[0];
    const key = `metrics:${organizationId}:${dateStr}:${eventName}`;

    try {
      await redis.incrby(key, value);
    } catch (err) {
      logger.error(`Error tracking metric ${eventName}: ${err}`);
    }
  }

  /**
   * Tracks call duration for moving averages.
   */
  async trackCallDuration(organizationId: string, durationSeconds: number) {
    if (redis.status !== 'ready') return;

    const dateStr = new Date().toISOString().split('T')[0];
    const keySum = `metrics:${organizationId}:${dateStr}:callDurationSum`;
    const keyCount = `metrics:${organizationId}:${dateStr}:callCount`;

    try {
      await redis.incrby(keySum, durationSeconds);
      await redis.incr(keyCount);
    } catch (err) {
      logger.error(`Error tracking call duration: ${err}`);
    }
  }
}

export const metricsCollector = new MetricsCollector();
