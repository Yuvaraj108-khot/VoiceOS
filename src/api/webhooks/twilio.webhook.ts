import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import twilio from 'twilio';
import { callSessionManager } from '../../telephony/CallSessionManager';

const VoiceResponse = twilio.twiml.VoiceResponse;

function getStreamHost(req: Request): string {
  // If TWILIO_WEBHOOK_BASE_URL is configured with a public hostname, use it
  if (process.env.TWILIO_WEBHOOK_BASE_URL) {
    try {
      const parsed = new URL(process.env.TWILIO_WEBHOOK_BASE_URL);
      if (parsed.host && !parsed.host.includes('localhost')) {
        return parsed.host;
      }
    } catch { /* ignore */ }
  }

  // Next, if incoming request has a public host header (e.g. from localtunnel or ngrok)
  const reqHost = req.headers.host;
  if (reqHost && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')) {
    return reqHost;
  }

  if (process.env.TWILIO_WEBHOOK_BASE_URL) {
    try {
      return new URL(process.env.TWILIO_WEBHOOK_BASE_URL).host;
    } catch { /* ignore */ }
  }

  return reqHost || 'localhost:4000';
}

/**
 * Voice TwiML webhook — called by Twilio when a call is answered (inbound or outbound).
 * Returns TwiML that connects the call to our AI via a media stream WebSocket.
 * Route: POST /webhooks/twilio/voice (also handles /inbound and legacy /webhooks/twilio)
 */
export const twilioVoiceWebhook = async (req: Request, res: Response) => {
  const { CallSid, From, To, Direction } = req.body;
  const { callId, employeeId } = req.query as Record<string, string>;

  logger.info(`[TwiML] Voice webhook | SID: ${CallSid} | Direction: ${Direction} | From: ${From} → To: ${To}`);

  try {
    const streamHost = getStreamHost(req);

    // 1. Resolve assigned AI Employee
    let resolvedEmployeeId = employeeId;
    let organizationId = '';

    if (!resolvedEmployeeId && To) {
      const pn = await prisma.phoneNumber.findFirst({
        where: { number: To },
        include: { employee: true }
      }).catch(() => null);

      if (pn?.employeeId) {
        resolvedEmployeeId = pn.employeeId;
        organizationId = pn.organizationId;
      }
    }

    if (!resolvedEmployeeId) {
      const activeEmp = await prisma.aIEmployee.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null);

      if (activeEmp) {
        resolvedEmployeeId = activeEmp.id;
        organizationId = activeEmp.organizationId;
      }
    }

    // 2. Track Call in DB
    try {
      if (organizationId && resolvedEmployeeId && CallSid) {
        let customer = await prisma.customer.findFirst({
          where: { phone: From, organizationId }
        });

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
        });

        if (!existingCall) {
          await prisma.call.create({
            data: {
              organizationId,
              employeeId: resolvedEmployeeId,
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
    } catch (err: any) {
      logger.warn(`[TwiML] Call record creation notice: ${err.message}`);
    }

    // 3. Save initial session
    if (CallSid) {
      await callSessionManager.saveSession({
        callId: CallSid,
        employeeId: resolvedEmployeeId || '',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        variables: {},
      });
    }

    // 4. Generate TwiML: connect to media stream and keep call active
    const response = new VoiceResponse();
    const connect = response.connect();
    const streamUrl = `wss://${streamHost}/media-stream`;
    const stream = connect.stream({ url: streamUrl });

    stream.parameter({ name: 'callId',     value: callId || CallSid });
    stream.parameter({ name: 'employeeId', value: resolvedEmployeeId || '' });
    stream.parameter({ name: 'callSid',    value: CallSid });
    stream.parameter({ name: 'direction',  value: Direction || 'inbound' });

    // Ensure Twilio never prematurely hangs up by providing a long pause
    response.pause({ length: 3600 });

    res.type('text/xml');
    res.send(response.toString());

    logger.info(`[TwiML] Sent media stream TwiML for call ${CallSid} pointing to ${streamUrl}`);

  } catch (error) {
    logger.error(`[TwiML] Voice webhook error: ${error}`);
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

    res.status(200).send('OK');
  } catch (error) {
    logger.error(`[Status] Error updating call ${CallSid}: ${error}`);
    res.status(500).send('Error');
  }
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
