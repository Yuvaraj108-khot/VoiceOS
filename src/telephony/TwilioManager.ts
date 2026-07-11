import twilio from 'twilio';
import { config } from '../config/app.config';
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
    if (!this.client) throw ApiError.internal('Twilio not configured');

    const localNumbers = await this.client.availablePhoneNumbers('US').local.list({
      areaCode: areaCode ? parseInt(areaCode, 10) : undefined,
      limit: 1
    });

    if (localNumbers.length === 0) {
      throw ApiError.badRequest('No available numbers found in the requested area code');
    }

    const number = localNumbers[0];

    // Purchase the number
    const purchased = await this.client.incomingPhoneNumbers.create({
      phoneNumber: number.phoneNumber,
      voiceUrl: `https://${config.APP_URL}/webhooks/twilio/inbound`, // Set inbound webhook
      statusCallback: `https://${config.APP_URL}/webhooks/twilio/status`,
      
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
}

export const twilioManager = new TwilioManager();
