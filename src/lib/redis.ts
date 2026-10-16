import Redis from 'ioredis';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export const createRedisClient = (): Redis => {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      if (times > 5) {
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn({ attempt: times, delay }, 'Redis: Retrying connection');
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        return true;
      }
      return false;
    },
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('ready', () => logger.debug('Redis ready'));
  client.on('error', (err) => {
    logger.warn(`Redis connection status: ${err.message}`);
  });
  client.on('close', () => logger.debug('Redis connection closed'));
  client.on('reconnecting', () => logger.debug('Redis reconnecting...'));

  return client;
};

export const getRedis = (): Redis => {
  if (!redisInstance) {
    redisInstance = createRedisClient();
  }
  return redisInstance;
};

export const redis = getRedis();

export async function connectRedis(): Promise<void> {
  try {
    await redis.ping();
    logger.info('✅ Redis ping OK');
  } catch (error) {
    logger.error(error, '❌ Failed to connect to Redis');
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis disconnected');
  }
}
