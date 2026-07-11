import { Server, Socket } from 'socket.io';

export function registerAnalyticsEvents(io: Server, socket: Socket) {
  // Can be used if clients need to request specific realtime metric updates
  // In most cases, the server broadcasts down to the org room automatically.
  socket.on('analytics:subscribe_dashboard', () => {
    // Scaffold: potentially join a specific dashboard room
  });
}
