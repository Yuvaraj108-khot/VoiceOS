import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import twilio from 'twilio';
import { callSessionManager } from '../../telephony/CallSessionManager';
import { getWebhookBaseUrl } from '../../config/app.config';

const VoiceResponse = twilio.twiml.VoiceResponse;

function getStreamHost(req: Request): string {
  // 1. If incoming request has a public host header (e.g. from cloudflare tunnel)
  const reqHost = req.headers.host;
  if (reqHost && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')) {
    return reqHost;
  }

  // 2. If dynamic webhook base URL has a public hostname, use it
  const webhookBase = getWebhookBaseUrl();
  if (webhookBase) {
    try {
      const parsed = new URL(webhookBase);
      if (parsed.host && !parsed.host.includes('localhost') && !parsed.host.includes('127.0.0.1')) {
        return parsed.host;
      }
    } catch { /* ignore */ }
  }

  return reqHost || `localhost:${process.env.PORT || 4009}`;
}

/**
 * Voice TwiML webhook — called by Twilio when a call is answered (inbound or outbound).
 * Returns TwiML that connects the call to our AI via a media stream WebSocket.
 * Route: POST /webhooks/twilio/voice (also handles /inbound and legacy /webhooks/twilio)
 */
export const twilioVoiceWebhook = async (req: Request, res: Response) => {
  const { CallSid, From, To, Direction } = req.body || {};
  const { callId, employeeId } = (req.query || {}) as Record<string, string>;

  // ─── HIGH-DETAIL DIAGNOSTIC LOGGING ─────────────────────────────
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('[TWILIO WEBHOOK] ✅ REQUEST RECEIVED');
  logger.info(`[TWILIO WEBHOOK] Method : ${req.method || 'POST'}`);
  logger.info(`[TWILIO WEBHOOK] URL    : ${req.protocol || 'http'}://${(typeof req.get === 'function' ? req.get('host') : req.headers?.host) || 'localhost'}${req.originalUrl || ''}`);
  logger.info(`[TWILIO WEBHOOK] CallSid: ${CallSid}`);
  logger.info(`[TWILIO WEBHOOK] From   : ${From}`);
  logger.info(`[TWILIO WEBHOOK] To     : ${To}`);
  logger.info(`[TWILIO WEBHOOK] Dir    : ${Direction}`);
  logger.info(`[TWILIO WEBHOOK] callId param : ${callId || '(none)'}`);
  logger.info(`[TWILIO WEBHOOK] employeeId param: ${employeeId || '(none)'}`);
  logger.info(`[TWILIO WEBHOOK] TWILIO_WEBHOOK_BASE_URL env: ${process.env.TWILIO_WEBHOOK_BASE_URL || '(not set)'}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const streamHost = getStreamHost(req);

    // Default or query-provided employee ID
    const defaultEmployeeId = '7a007f62-0dad-4368-9f1b-d6ff7181429d';
    const resolvedEmployeeId = employeeId || defaultEmployeeId;

    // 1. Generate TwiML IMMEDIATELY so Twilio gets an instantaneous response (< 20ms)
    const response = new VoiceResponse();
    const connect = response.connect();
    const streamUrl = `wss://${streamHost}/media-stream`;
    const stream = connect.stream({ url: streamUrl });

    const finalCallId = String(callId || CallSid || 'call_live');
    const finalEmployeeId = String(resolvedEmployeeId);
    const finalCallSid = String(CallSid || callId || 'sid_live');
    const finalDirection = String(Direction || 'inbound');

    stream.parameter({ name: 'callId', value: finalCallId });
    stream.parameter({ name: 'employeeId', value: finalEmployeeId });
    stream.parameter({ name: 'callSid', value: finalCallSid });
    stream.parameter({ name: 'direction', value: finalDirection });

    // Keep call active
    response.pause({ length: 3600 });

    const twiml = response.toString();

    logger.info(`[TWILIO WEBHOOK] streamHost resolved : ${streamHost}`);
    logger.info(`[TWILIO WEBHOOK] Stream WSS URL      : ${streamUrl}`);
    logger.info(`[TWILIO WEBHOOK] Sending TwiML response immediately`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Respond to Twilio without waiting for DB operations!
    res.type('text/xml');
    res.send(twiml);

    // 2. Perform DB tracking and session saving asynchronously in the background
    (async () => {
      try {
        let organizationId = '';
        let empId = resolvedEmployeeId;

        // Try looking up phone number or active employee if needed
        if (!employeeId && To) {
          const pn = await prisma.phoneNumber.findFirst({
            where: { number: To },
            include: { employee: true }
          }).catch(() => null);

          if (pn?.employeeId) {
            empId = pn.employeeId;
            organizationId = pn.organizationId;
          }
        }

        if (!organizationId) {
          const activeEmp = await prisma.aIEmployee.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' }
          }).catch(() => null);

          if (activeEmp) {
            organizationId = activeEmp.organizationId;
          }
        }

        if (organizationId && empId && CallSid) {
          let customer = await prisma.customer.findFirst({
            where: { phone: From, organizationId }
          }).catch(() => null);

          if (!customer && From) {
            customer = await prisma.customer.create({
              data: {
                organizationId,
                firstName: 'Caller',
                lastName: From.slice(-4),
                phone: From,
              }
            }).catch(() => null) as any;
          }

          const existingCall = await prisma.call.findFirst({
            where: { twilioCallSid: CallSid }
          }).catch(() => null);

          if (!existingCall) {
            await prisma.call.create({
              data: {
                organizationId,
                employeeId: empId,
                customerId: customer?.id || null,
                twilioCallSid: CallSid,
                direction: (Direction?.toUpperCase() === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND') as any,
                status: 'IN_PROGRESS',
                fromNumber: From || 'Unknown',
                toNumber: To || 'Unknown',
                startedAt: new Date(),
              }
            }).catch(() => null);
          }
        }

        if (CallSid) {
          await callSessionManager.saveSession({
            callId: CallSid,
            employeeId: empId,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            variables: {},
          }).catch(() => null);
        }
      } catch (bgErr: any) {
        logger.warn(`[TWILIO WEBHOOK] Background DB tracking notice: ${bgErr.message}`);
      }
    })();

  } catch (error) {
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error(`[TWILIO WEBHOOK] ❌ ERROR — returning fallback TwiML`);
    logger.error(`[TWILIO WEBHOOK] Error: ${error}`);
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const fallback = new VoiceResponse();
    fallback.say("Sorry, I'm having technical difficulties. Please try again later.");
    fallback.hangup();
    res.type('text/xml');
    res.send(fallback.toString());
  }
};

/**
 * Status callback webhook — called by Twilio on every call status change.
 * Route: POST /webhooks/twilio/status
 */
export const twilioStatusWebhook = async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  logger.info(`[Status] Call ${CallSid} → ${CallStatus}`);

  // Respond 200 OK immediately so Twilio never times out or logs 500/502 warnings
  res.status(200).send('OK');

  // Background DB update
  (async () => {
    try {
      const status = mapTwilioStatus(CallStatus);

      const updateData: any = { status };
      if (CallDuration) updateData.duration = parseInt(CallDuration, 10);
      if (CallStatus === 'completed') updateData.endedAt = new Date();
      if (CallStatus === 'in-progress') updateData.startedAt = new Date();

      await prisma.call.updateMany({
        where: { twilioCallSid: CallSid },
        data: updateData,
      });
    } catch (error: any) {
      logger.warn(`[Status] Async update notice for call ${CallSid}: ${error.message}`);
    }
  })();
};

/**
 * Recording webhook — called by Twilio when a recording is ready.
 * Route: POST /webhooks/twilio/recording
 */
export const twilioRecordingWebhook = async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body;
  logger.info(`[Recording] Call ${CallSid} | URL: ${RecordingUrl}`);

  try {
    await prisma.call.updateMany({
      where: { twilioCallSid: CallSid },
      data: {
        recordingUrl: RecordingUrl,
        duration: RecordingDuration ? parseInt(RecordingDuration, 10) : undefined,
      }
    });
    res.status(200).send('OK');
  } catch (error) {
    logger.error(`[Recording] Error: ${error}`);
    res.status(500).send('Error');
  }
};

// ─── Legacy catch-all ────────────────────────────────────────────────────────
export const twilioWebhook = twilioVoiceWebhook;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mapTwilioStatus(twilioStatus: string): string {
  switch (twilioStatus) {
    case 'queued':
    case 'initiated':   return 'INITIATED';
    case 'ringing':     return 'RINGING';
    case 'in-progress': return 'IN_PROGRESS';
    case 'completed':   return 'COMPLETED';
    case 'busy':        return 'BUSY';
    case 'failed':      return 'FAILED';
    case 'no-answer':   return 'NO_ANSWER';
    case 'canceled':    return 'CANCELLED';
    default:            return 'COMPLETED';
  }
}
