import { Server, Socket } from 'socket.io';
import { logger } from '../../lib/logger';
import { roomManager } from '../RoomManager';

export function registerCallEvents(io: Server, socket: Socket) {
  // Client requests to monitor a specific live call
  socket.on('call:monitor_start', (data: { callId: string }) => {
    logger.debug(`Socket ${socket.id} joining call room ${data.callId}`);
    roomManager.joinCallRoom(socket, data.callId);
  });

  socket.on('call:monitor_stop', (data: { callId: string }) => {
    logger.debug(`Socket ${socket.id} leaving call room ${data.callId}`);
    roomManager.leaveCallRoom(socket, data.callId);
  });
}
