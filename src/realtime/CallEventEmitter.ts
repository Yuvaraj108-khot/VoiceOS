import { socketServer } from './SocketServer';
import { logger } from '../lib/logger';

export class CallEventEmitter {
  /**
   * Emits a real-time event when a call status changes.
   */
  emitStatusChange(organizationId: string, callId: string, status: string) {
    logger.debug(`Emitting call status change: ${callId} -> ${status}`);
    socketServer.emitToOrg(organizationId, 'call:status_changed', { callId, status });
  }

  /**
   * Emits a real-time transcript chunk for live monitoring.
   */
  emitLiveTranscript(organizationId: string, callId: string, role: 'user' | 'assistant', text: string) {
    socketServer.emitToOrg(organizationId, 'call:live_transcript', { callId, role, text });
  }
}

export const callEventEmitter = new CallEventEmitter();
