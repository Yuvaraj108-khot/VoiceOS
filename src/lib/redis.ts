import Redis from 'ioredis';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export const createRedisClient = (): Redis => {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis: Too many retries, giving up');
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
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('ready', () => logger.debug('Redis ready'));
  client.on('error', (err) => logger.error(err, 'Redis error'));
  client.on('close', () => logger.warn('Redis connection closed'));
  client.on('reconnecting', () => logger.info('Redis reconnecting...'));

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
