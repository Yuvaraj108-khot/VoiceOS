import { Socket } from 'socket.io';

export class RoomManager {
  /**
   * Joins a socket to its organization-wide room.
   */
  joinOrgRoom(socket: Socket, organizationId: string) {
    const roomName = `org:${organizationId}`;
    socket.join(roomName);
  }

  /**
   * Joins a socket to a specific call's room (e.g., for live transcription monitoring).
   */
  joinCallRoom(socket: Socket, callId: string) {
    const roomName = `call:${callId}`;
    socket.join(roomName);
  }
  
  leaveCallRoom(socket: Socket, callId: string) {
    const roomName = `call:${callId}`;
    socket.leave(roomName);
  }
}

export const roomManager = new RoomManager();
