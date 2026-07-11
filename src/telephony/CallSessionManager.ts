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
  /**
   * Retrieves an active session from memory (Redis).
   */
  async getSession(callId: string): Promise<CallSession | null> {
    if (redis.status !== "ready") return null;
    const data = await redis.get(`call_session:${callId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Stores an active session in memory (Redis).
   */
  async saveSession(session: CallSession): Promise<void> {
    if (redis.status !== "ready") return;
    // Set expiry to 2 hours to prevent stale sessions
    await redis.setex(`call_session:${session.callId}`, 7200, JSON.stringify(session));
  }

  /**
   * Cleans up a session from memory and finalizes the record in the database.
   */
  async endSession(callId: string, finalStatus: 'COMPLETED' | 'FAILED', durationSeconds: number): Promise<void> {
    try {
      const session = await this.getSession(callId);
      if (session) {
        if (redis.status === "ready") {
          await redis.del(`call_session:${callId}`);
        }
      }

      await prisma.call.updateMany({
        where: { OR: [{ id: callId }, { twilioCallSid: callId }] },
        data: {
          status: finalStatus,
          duration: durationSeconds,
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
