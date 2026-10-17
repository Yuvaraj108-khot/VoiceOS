import twilio from 'twilio';
import { config, getWebhookBaseUrl } from '../config/app.config';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export class TwilioManager {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
      this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    } else {
      logger.warn('Twilio credentials not found. TwilioManager running in mock mode.');
    }
  }

  /**
   * Generates TwiML to connect an incoming or outgoing call to a WebSocket Media Stream.
   */
  generateStreamTwiML(callSid: string, host: string): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    
    const connect = response.connect();
    connect.stream({
      url: `wss://${host}/media-stream`,
      name: `Stream-${callSid}`
    });

    // Keep call alive so Twilio does not hang up if stream yields
    response.pause({ length: 3600 });

    return response.toString();
  }

  /**
   * Validates if a webhook request actually came from Twilio.
   */
  validateWebhook(signature: string, url: string, params: Record<string, any>): boolean {
    if (!config.TWILIO_AUTH_TOKEN) return true; // Skip in mock mode
    return twilio.validateRequest(config.TWILIO_AUTH_TOKEN, signature, url, params);
  }

  /**
   * Provisions a new Twilio phone number and assigns it to an AI Employee
   */
  async provisionPhoneNumber(organizationId: string, employeeId: string, areaCode?: string) {
    if (!this.client) {
      const fakeNumber = `+1${areaCode || '555'}${Math.floor(1000000 + Math.random() * 9000000)}`;
      return prisma.phoneNumber.create({
        data: {
          organizationId,
          employeeId,
          number: fakeNumber,
          twilioSid: `SKmock-${Date.now()}`,
          country: "US",
        }
      });
    }

    const localNumbers = await this.client.availablePhoneNumbers('US').local.list({
      areaCode: areaCode ? parseInt(areaCode, 10) : undefined,
      limit: 1
    });

    if (localNumbers.length === 0) {
      throw ApiError.badRequest('No available numbers found in the requested area code');
    }

    const number = localNumbers[0];

    const webhookBase = getWebhookBaseUrl();

    // Purchase the number
    const purchased = await this.client.incomingPhoneNumbers.create({
      phoneNumber: number.phoneNumber,
      voiceUrl: `${webhookBase}/webhooks/twilio/inbound`, // Set inbound webhook
      statusCallback: `${webhookBase}/webhooks/twilio/status`,
    });

    // Save to DB
    return prisma.phoneNumber.create({
      data: {
        organizationId,
        employeeId,
        number: purchased.phoneNumber,
        twilioSid: purchased.sid,
        country: "US",
      }
    });
  }

  /**
   * Seamlessly transfers an active live Twilio call to a human agent's phone number using <Dial>.
   */
  async transferCall(callSid: string, transferNumber: string, message?: string): Promise<{ success: boolean; sid: string }> {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    
    if (message) {
      response.say(message);
    }
    const dial = response.dial();
    dial.number(transferNumber);

    const twiml = response.toString();

    if (this.client) {
      try {
        logger.info(`[TwilioManager] Live call transfer initiated for callSid=${callSid} -> to=${transferNumber}`);
        const updated = await this.client.calls(callSid).update({
          twiml
        });
        return { success: true, sid: updated.sid };
      } catch (err: any) {
        logger.error(`[TwilioManager] Failed to transfer call via Twilio API: ${err.message}`);
        throw ApiError.badRequest(`Twilio call transfer failed: ${err.message}`);
      }
    } else {
      logger.warn(`[TwilioManager Mock] Mock transferring call ${callSid} to ${transferNumber}`);
      return { success: true, sid: callSid };
    }
  }
}

export const twilioManager = new TwilioManager();
