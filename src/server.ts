import http from 'http';
import { app } from './app';
import { config } from './config/app.config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { WebSocketServer } from 'ws';
import { initSocketServer } from './realtime/SocketServer';
import { MediaStreamHandler } from './telephony/MediaStreamHandler';

const server = http.createServer(app);

// Initialize WebSockets
initSocketServer(server);

// Twilio Media Stream WebSocket server on /media-stream
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  logger.info(`[Telephony] Twilio Media Stream connected from ${req.socket.remoteAddress}`);
  new MediaStreamHandler(ws);
});

server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/media-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err: any) {
    logger.error(`Error during HTTP upgrade: ${err.message}`);
  }
});

async function startServer() {
  try {
    // Check DB connection
    await prisma.$connect().catch((err) => {
      logger.warn(`PostgreSQL DB connection warning (operating in resilient dev mode): ${err.message}`);
    });

    // Check Redis connection
    if (redis.status === "ready") {
      logger.info('Connected to Redis');
    }

    server.listen(config.PORT, () => {
      logger.info(`VoiceOS Backend is running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });

  } catch (error: any) {
    logger.error(error, 'Failed to start server:');
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
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
