import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import type { z } from 'zod';
import type { triggerCallSchema } from './calls.validator';
import { generatePrefixedId } from '../../../utils/generateId';
import { s3Service } from '../../../lib/s3';

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
    // 1. Verify employee
    const employee = await prisma.aIEmployee.findUnique({
      where: { id: data.employeeId },
      include: { phoneNumbers: { take: 1 } }
    });

    if (!employee || employee.organizationId !== organizationId) {
      throw ApiError.notFound('AI Employee');
    }

    if (employee.phoneNumbers.length === 0) {
      throw ApiError.badRequest('AI Employee does not have a provisioned phone number to call from');
    }

    const fromNumber = employee.phoneNumbers[0].number;

    // 2. Create Call record in DB
    const call = await prisma.call.create({
      data: {
        id: generatePrefixedId('call'),
        organizationId,
        employeeId: employee.id,
        customerId: data.customerId,
        phoneNumberId: employee.phoneNumbers[0].id,
        twilioCallSid: '', // Will update once Twilio creates it
        direction: 'OUTBOUND',
        status: 'INITIATED',
        fromNumber,
        toNumber: data.toNumber,
      }
    });

    // 3. TODO: Enqueue to background job or call Twilio REST API directly to initiate call
    // The background job would use Twilio client:
    // client.calls.create({
    //   url: 'https://api.voiceos.com/v1/twilio/outbound-webhook',
    //   to: data.toNumber,
    //   from: fromNumber,
    //   statusCallback: '...',
    //   statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    // });

    return call;
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
