import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export const twilioWebhook = async (req: Request, res: Response) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  // In production, verify the Twilio signature here to ensure the request is from Twilio

  const { CallSid, CallStatus, From, To, RecordingUrl, RecordingDuration } = req.body;
  logger.info(`Twilio Webhook: Call ${CallSid} status changed to ${CallStatus}`);

  try {
    if (CallSid) {
      const dataToUpdate: any = {
        status: mapTwilioStatusToCallStatus(CallStatus),
      };
      
      if (RecordingUrl) {
        dataToUpdate.recordingUrl = RecordingUrl;
        dataToUpdate.duration = RecordingDuration ? parseInt(RecordingDuration, 10) : 0;
      }

      await prisma.call.updateMany({
        where: { twilioCallSid: CallSid },
        data: dataToUpdate,
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Error processing Twilio webhook: ${error}`);
    res.status(500).send('Error');
  }
};

function mapTwilioStatusToCallStatus(twilioStatus: string) {
  switch (twilioStatus) {
    case 'queued':
    case 'initiated':
      return 'QUEUED';
    case 'ringing':
      return 'RINGING';
    case 'in-progress':
      return 'IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'busy':
    case 'failed':
    case 'no-answer':
    case 'canceled':
      return 'FAILED';
    default:
      return 'FAILED';
  }
}
