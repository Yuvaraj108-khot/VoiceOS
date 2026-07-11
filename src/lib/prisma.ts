import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
    errorFormat: 'minimal',
  });

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development') {
    (client as any).$on('query', (e: any) => {
      if (e.duration > 1000) {
        logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected');
      }
    });
  }

  (client as any).$on('error', (e: any) => {
    logger.error({ message: e.message, target: e.target }, 'Prisma error');
  });

  return client;
};

// Singleton — reuse in dev (hot reload), create fresh in prod
export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.error(error, '❌ Failed to connect to database');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
