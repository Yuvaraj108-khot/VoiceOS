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
  private sessionAliases = new Map<string, string>(); // alias -> primary callId

  /**
   * Retrieves an active session from memory (Redis or local Map).
   */
  async getSession(callId: string): Promise<CallSession | null> {
    const primaryId = this.sessionAliases.get(callId) || callId;
    if (this.localSessions.has(primaryId)) {
      return this.localSessions.get(primaryId)!;
    }
    if (this.localSessions.has(callId)) {
      return this.localSessions.get(callId)!;
    }

    if (redis.status === "ready") {
      try {
        const data = await redis.get(`call_session:${primaryId}`) || await redis.get(`call_session:${callId}`);
        if (data) {
          const session = JSON.parse(data);
          this.localSessions.set(primaryId, session);
          this.localSessions.set(callId, session);
          return session;
        }
      } catch { /* ignore */ }
    }

    // Try finding counterpart ID from DB if not in memory
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(callId);
      const call = await prisma.call.findFirst({
        where: isUuid ? { id: callId } : { twilioCallSid: callId },
        select: { id: true, twilioCallSid: true }
      });
      if (call) {
        const counterpartId = isUuid ? call.twilioCallSid : call.id;
        if (counterpartId && counterpartId !== callId) {
          this.sessionAliases.set(callId, counterpartId);
          this.sessionAliases.set(counterpartId, callId);
          if (this.localSessions.has(counterpartId)) {
            return this.localSessions.get(counterpartId)!;
          }
        }
      }
    } catch { /* ignore */ }

    return null;
  }

  /**
   * Stores an active session in memory (Redis and local Map).
   */
  async saveSession(session: CallSession): Promise<void> {
    this.localSessions.set(session.callId, session);
    if (session.variables?.twilioCallSid) {
      this.sessionAliases.set(session.variables.twilioCallSid, session.callId);
    }
    if (session.variables?.callId) {
      this.sessionAliases.set(session.variables.callId, session.callId);
    }

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
      const session = await this.getSession(callId);
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

      if (session?.employeeId) {
        await prisma.aIEmployee.update({
          where: { id: session.employeeId },
          data: {
            callsHandled: { increment: 1 },
            totalCallDuration: { increment: durationSeconds }
          }
        }).catch(() => null);
      }
      
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
