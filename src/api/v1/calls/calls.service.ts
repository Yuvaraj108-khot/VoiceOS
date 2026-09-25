import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import type { z } from 'zod';
import type { triggerCallSchema } from './calls.validator';
import { generatePrefixedId } from '../../../utils/generateId';
import { s3Service } from '../../../lib/s3';
import { twilioManager } from '../../../telephony/TwilioManager';
import { config } from '../../../config/app.config';
import { logger } from '../../../lib/logger';
import twilio from 'twilio';

export const callsService = {
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

    const webhookBase = config.TWILIO_WEBHOOK_BASE_URL ?? config.APP_URL;
    const callId = generatePrefixedId('call');

    // 2. Try creating Call record in DB (if DB available)
    try {
      if (phoneNumberId) {
        await prisma.call.create({
          data: {
            id: callId,
            organizationId,
            employeeId,
            customerId: data.customerId ?? null,
            phoneNumberId,
            twilioCallSid: 'pending',
            direction: 'OUTBOUND',
            status: 'INITIATED',
            fromNumber,
            toNumber: data.toNumber,
          }
        });
      }
    } catch (err: any) {
      logger.warn(`[OutboundCall] Could not record call in DB: ${err.message}`);
    }

    // 3. Dial via Twilio REST API
    try {
      const accountSid = config.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
      const authToken = config.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error('Twilio Account SID or Auth Token is missing in server environment');
      }

      const twilioClient = twilio(accountSid, authToken);

      const twilioCall = await twilioClient.calls.create({
        to: data.toNumber,
        from: fromNumber,
        twiml: `<Response><Say voice="Polly.Salli">Hello! Thank you for answering. This is Voice O S calling you live. How can I assist you today?</Say></Response>`,
        statusCallback: `${webhookBase}/webhooks/twilio/status`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });

      // Update DB record with real Twilio CallSid if created
      try {
        await prisma.call.update({
          where: { id: callId },
          data: { twilioCallSid: twilioCall.sid, status: 'RINGING' }
        });
      } catch { /* silent */ }

      logger.info(`[OutboundCall] Dialing ${data.toNumber} from ${fromNumber} | Twilio SID: ${twilioCall.sid}`);
      return { id: callId, twilioCallSid: twilioCall.sid, status: twilioCall.status, toNumber: data.toNumber, fromNumber };

    } catch (error: any) {
      logger.error(`[OutboundCall] Twilio failed to initiate call: ${error.message}`);
      throw ApiError.badRequest(`Twilio call error: ${error.message}`);
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
  }
};
