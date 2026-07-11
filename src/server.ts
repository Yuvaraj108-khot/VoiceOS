import http from 'http';
import { app } from './app';
import { config } from './config/app.config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
// import { initSocketServer } from './realtime/SocketServer'; // Phase 16

const server = http.createServer(app);

// Initialize WebSockets
// initSocketServer(server);

async function startServer() {
  try {
    // Check DB connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL via Prisma');

    // Check Redis connection
    if (redis.status === "ready") {
      logger.info('Connected to Redis');
    }

    server.listen(config.PORT, () => {
      logger.info(`VoiceOS Backend is running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });

  } catch (error: any) {
    logger.error(error, 'Failed to start server:');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    if (redis.status === "ready") await redis.quit();
    process.exit(0);
  });
});

startServer();
