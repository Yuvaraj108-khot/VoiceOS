import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

export interface CallSession {
  callId: string;
  employeeId: string;
  customerId?: string;
  status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  variables: Record<string, any>;
}

export class CallSessionManager {
  private localSessions = new Map<string, CallSession>();

  /**
   * Retrieves an active session from memory (Redis or local Map).
   */
  async getSession(callId: string): Promise<CallSession | null> {
    if (this.localSessions.has(callId)) {
      return this.localSessions.get(callId)!;
    }

    if (redis.status === "ready") {
      try {
        const data = await redis.get(`call_session:${callId}`);
        if (data) {
          const session = JSON.parse(data);
          this.localSessions.set(callId, session);
          return session;
        }
      } catch { /* ignore */ }
    }

    return null;
  }

  /**
   * Stores an active session in memory (Redis and local Map).
   */
  async saveSession(session: CallSession): Promise<void> {
    this.localSessions.set(session.callId, session);

    if (redis.status === "ready") {
      try {
        // Set expiry to 2 hours
        await redis.setex(`call_session:${session.callId}`, 7200, JSON.stringify(session));
      } catch { /* ignore */ }
    }
  }

  /**
   * Cleans up a session from memory and finalizes the record in the database.
   */
  async endSession(callId: string, finalStatus: 'COMPLETED' | 'FAILED', durationSeconds: number): Promise<void> {
    try {
      this.localSessions.delete(callId);

      if (redis.status === "ready") {
        try {
          await redis.del(`call_session:${callId}`);
        } catch { /* ignore */ }
      }

      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      await prisma.call.updateMany({
        where: isUuid(callId)
          ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
          : { twilioCallSid: callId },
        data: {
          status: finalStatus,
          duration: durationSeconds,
          endedAt: new Date(),
        }
      });
      
      logger.info(`Session ${callId} ended with status ${finalStatus}`);
    } catch (err) {
      logger.error(`Error ending session ${callId}: ${err}`);
    }
  }

  /**
   * Updates variables for an active call session.
   */
  async updateVariables(callId: string, variables: Record<string, any>): Promise<void> {
    const session = await this.getSession(callId);
    if (session) {
      session.variables = { ...session.variables, ...variables };
      await this.saveSession(session);
    }
  }
}

export const callSessionManager = new CallSessionManager();
