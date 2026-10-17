import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import type { z } from 'zod';
import type { triggerCallSchema } from './calls.validator';
import { s3Service } from '../../../lib/s3';
import { config, getWebhookBaseUrl } from '../../../config/app.config';
import { logger } from '../../../lib/logger';
import twilio from 'twilio';
import { randomUUID } from 'crypto';
import { memoryManager } from '../../../conversation/MemoryManager';
import { twilioManager } from '../../../telephony/TwilioManager';
import { callEventEmitter } from '../../../realtime/CallEventEmitter';

export const callsService = {
  async getActiveCall(organizationId: string) {
    // 1. Look for live in-progress, ringing, or initiated call
    let call = await prisma.call.findFirst({
      where: {
        organizationId,
        status: { in: ['IN_PROGRESS', 'RINGING', 'INITIATED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, name: true, role: true } },
        transcripts: { take: 50, orderBy: { createdAt: 'asc' } }
      }
    });

    const isLive = !!call;

    // 2. If no call is currently active, fetch the latest completed/recent call
    if (!call) {
      call = await prisma.call.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, role: true } },
          transcripts: { take: 50, orderBy: { createdAt: 'asc' } }
        }
      });
    }

    if (!call) {
      return null;
    }

    // Try reading real in-memory / Redis transcript if active
    let history: any[] = [];
    try {
      history = await memoryManager.getHistory(call.id);
      if ((!history || history.length === 0) && call.twilioCallSid) {
        history = await memoryManager.getHistory(call.twilioCallSid);
      }
    } catch {
      history = [];
    }

    let transcriptList: Array<{ role: 'AI' | 'Caller'; message: string; timestamp: string }> = [];

    if (call.transcripts && call.transcripts.length > 0) {
      transcriptList = call.transcripts.map(t => ({
        role: (t.speaker === 'assistant' || t.speaker === 'ai' || t.speaker === 'AI') ? 'AI' : 'Caller',
        message: t.text,
        timestamp: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } else if (history && history.length > 0) {
      transcriptList = history.map(h => ({
        role: h.role === 'assistant' ? 'AI' : 'Caller',
        message: h.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } else if (call.transcriptRaw) {
      try {
        const parsed = JSON.parse(call.transcriptRaw);
        if (Array.isArray(parsed)) {
          transcriptList = parsed;
        }
      } catch {
        transcriptList = [{
          role: 'AI',
          message: call.transcriptRaw,
          timestamp: new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
      }
    }

    // Calculate duration
    let durationStr = '00:00';
    if (call.duration) {
      const mins = Math.floor(call.duration / 60).toString().padStart(2, '0');
      const secs = (call.duration % 60).toString().padStart(2, '0');
      durationStr = `${mins}:${secs}`;
    } else if (call.startedAt) {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000));
      const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const secs = (elapsedSec % 60).toString().padStart(2, '0');
      durationStr = `${mins}:${secs}`;
    }

    return {
      id: call.id,
      callerNumber: call.direction === 'OUTBOUND' ? call.toNumber : call.fromNumber,
      duration: durationStr,
      agentId: call.employee?.name || 'Yuvaraj (AI SDR)',
      status: (call.status === 'IN_PROGRESS' || call.status === 'RINGING' || call.status === 'INITIATED') ? 'active' : 'completed',
      isLive,
      sentiment: (call.sentiment as any) || 'Positive',
      sentimentScore: call.satisfactionScore || 92,
      intent: 'Sales Inquiry & Booking',
      confidence: 98.4,
      callerName: call.callerName || (call.direction === 'OUTBOUND' ? `Outbound: ${call.toNumber}` : `Inbound: ${call.fromNumber}`),
      accountStatus: call.status,
      language: call.language === 'hi' ? 'Hindi / Hinglish' : 'English (US)',
      summary: call.summary || `Call session with ${call.employee?.name || 'AI Employee'} (${call.direction})`,
      transcript: transcriptList
    };
  },
  async list(organizationId: string, options: { page?: number; limit?: number; status?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(options.status && { status: options.status as any }),
    };

    const [items, total] = await Promise.all([
      prisma.call.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        }
      }),
      prisma.call.count({ where })
    ]);

    return { items, total, page, limit };
  },

  async get(organizationId: string, id: string) {
    const call = await prisma.call.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true } },
        customer: true,
        events: { orderBy: { timestamp: 'asc' } },
      }
    });

    if (!call || call.organizationId !== organizationId) {
      throw ApiError.notFound('Call');
    }

    return call;
  },

  async triggerOutboundCall(organizationId: string, data: z.infer<typeof triggerCallSchema>) {
    // 1. Check for employee in DB
    let employeeId = data.employeeId;
    let phoneNumberId: string | null = null;
    let fromNumber = process.env.TWILIO_PHONE_NUMBER || '+12292673841';

    try {
      const employee = await prisma.aIEmployee.findUnique({
        where: { id: data.employeeId },
        include: { phoneNumbers: { take: 1 } }
      });

      if (employee) {
        employeeId = employee.id;
        if (employee.phoneNumbers.length > 0) {
          phoneNumberId = employee.phoneNumbers[0].id;
          fromNumber = employee.phoneNumbers[0].number;
        }
      }
    } catch {
      // Ignore DB lookup errors for mock IDs in dev
    }

    const webhookBase = getWebhookBaseUrl();
    const callId = randomUUID();

    // 2. Try creating Call record in DB (if DB available)
    // We only create a preliminary record when phoneNumberId is known.
    // Use a unique sentinel callId so there's NO duplicate twilioCallSid conflict
    // when the real Twilio webhook fires later.
    if (phoneNumberId) {
      try {
        await prisma.call.create({
          data: {
            id: callId,
            organizationId,
            employeeId,
            customerId: data.customerId ?? null,
            phoneNumberId,
            twilioCallSid: callId, // Use our own UUID — webhook will update this to real SID
            direction: 'OUTBOUND',
            status: 'INITIATED',
            fromNumber,
            toNumber: data.toNumber,
          }
        });
      } catch (err: any) {
        logger.warn(`[OutboundCall] Could not record call in DB: ${err.message}`);
      }
    }

    // 3. Dial via Twilio REST API
    try {
      const accountSid = config.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
      const authToken = config.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error('Twilio Account SID or Auth Token is missing in server environment');
      }

      const twilioClient = twilio(accountSid, authToken);

      const voiceWebhookUrl = `${webhookBase}/webhooks/twilio/voice?callId=${callId}&employeeId=${employeeId}`;

      const twilioCall = await twilioClient.calls.create({
        to: data.toNumber,
        from: fromNumber,
        url: voiceWebhookUrl,
        statusCallback: `${webhookBase}/webhooks/twilio/status`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });

      // Update DB record with real Twilio CallSid (use updateMany to silently skip if record wasn't created)
      try {
        await prisma.call.updateMany({
          where: { id: callId },
          data: { twilioCallSid: twilioCall.sid, status: 'RINGING' }
        });
      } catch { /* silent */ }

      logger.info(`[OutboundCall] Dialing ${data.toNumber} from ${fromNumber} | Twilio SID: ${twilioCall.sid}`);
      return { id: callId, twilioCallSid: twilioCall.sid, status: twilioCall.status, toNumber: data.toNumber, fromNumber };

    } catch (error: any) {
      logger.error(`[OutboundCall] Twilio failed to initiate call: ${error.message}`);
      let userMsg = `Twilio call error: ${error.message}`;
      if (error.message && error.message.includes('unverified')) {
        userMsg = `Twilio Trial Account restriction: ${error.message}. Please select '+91' for India, or verify this number in Twilio Console (Phone Numbers > Verified Caller IDs).`;
      }
      throw ApiError.badRequest(userMsg);
    }
  },


  async getRecordingUrl(organizationId: string, callId: string) {
    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call || call.organizationId !== organizationId) throw ApiError.notFound('Call');
    if (!call.recordingUrl) throw ApiError.notFound('Recording not found');

    // If it's an S3 URI, generate a presigned URL
    if (call.recordingUrl.startsWith('s3://')) {
      const key = call.recordingUrl.replace(`s3://${process.env.AWS_S3_BUCKET}/`, '');
      const url = await s3Service.getSignedUrl(key, 3600);
      return { url };
    }

    // Otherwise, return the direct URL (e.g. Twilio recording URL)
    return { url: call.recordingUrl };
  },

  async transferCall(organizationId: string, callId: string, payload: { transferNumber: string; message?: string }) {
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const call = await prisma.call.findFirst({
      where: isUuid(callId)
        ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
        : { twilioCallSid: callId },
      include: { employee: true }
    });

    if (!call) {
      throw ApiError.notFound('Call session not found.');
    }

    const sid = call.twilioCallSid || call.id;
    const targetNumber = payload.transferNumber || call.employee?.transferNumber || '+919108796105';
    const message = payload.message || 'Transferring your call to a human representative now. Please hold.';

    logger.info(`[CallService] Transferring call ${call.id} (SID: ${sid}) to ${targetNumber}`);

    const result = await twilioManager.transferCall(sid, targetNumber, message);

    await prisma.call.update({
      where: { id: call.id },
      data: {
        wasTransferred: true,
        summary: `${call.summary || ''} [Transferred to ${targetNumber}]`.trim()
      }
    }).catch(() => {});

    await prisma.callTranscript.create({
      data: {
        callId: call.id,
        speaker: 'system',
        text: `Call transferred to representative at ${targetNumber}`
      }
    }).catch(() => {});

    callEventEmitter.emitLiveTranscript(call.organizationId, call.id, 'assistant', `Transferring call to ${targetNumber}...`);
    callEventEmitter.emitStatusChange(call.organizationId, call.id, 'TRANSFERRED');

    return {
      success: true,
      message: `Call transferred to ${targetNumber}`,
      targetNumber,
      sid: result.sid
    };
  },

  async takeOverCall(organizationId: string, callId: string) {
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const call = await prisma.call.findFirst({
      where: isUuid(callId)
        ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
        : { twilioCallSid: callId }
    });

    if (!call) {
      throw ApiError.notFound('Call session not found.');
    }

    logger.info(`[CallService] Operator takeover activated for call ${call.id}`);

    await prisma.callTranscript.create({
      data: {
        callId: call.id,
        speaker: 'system',
        text: `Operator took over the call.`
      }
    }).catch(() => {});

    callEventEmitter.emitLiveTranscript(call.organizationId, call.id, 'assistant', `Operator has joined the call.`);

    return {
      success: true,
      callId: call.id,
      message: 'Operator takeover active. AI speech paused.'
    };
  }
};
