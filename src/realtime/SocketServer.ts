import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { roomManager } from './RoomManager';
import { registerCallEvents } from './events/callEvents';
import { registerAnalyticsEvents } from './events/analyticsEvents';
import { registerNotificationEvents } from './events/notificationEvents';
import { socketAuthenticate } from '../middleware/authenticate';

export class SocketServer {
  private io: Server | null = null;

  async init(server: HttpServer) {
    this.io = new Server(server, {
      cors: { origin: '*' }
    });

    if (redis.status === "ready") {
      try {
        const pubClient = redis;
        const subClient = pubClient.duplicate();
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter configured');
      } catch (err: any) {
        logger.warn(`Failed to configure Socket.io Redis adapter: ${err.message}. Falling back to in-memory adapter.`);
      }
    }

    // Middleware for JWT authentication
    this.io.use(socketAuthenticate);

    this.io.on('connection', (socket: Socket) => {
      const orgId = socket.data.organizationId;
      logger.info(`Socket connected: ${socket.id} (Org: ${orgId})`);

      // 1. Join Organization Room automatically
      if (orgId) {
        roomManager.joinOrgRoom(socket, orgId);
      }

      // 2. Register Event Handlers
      registerCallEvents(this.io!, socket);
      registerAnalyticsEvents(this.io!, socket);
      registerNotificationEvents(this.io!, socket);

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  emitToOrg(organizationId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`org:${organizationId}`).emit(event, data);
    }
  }
}

export const socketServer = new SocketServer();

// Expose initialization function for server.ts
export function initSocketServer(server: HttpServer) {
  return socketServer.init(server);
}
