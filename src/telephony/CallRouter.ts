import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { twilioManager } from './TwilioManager';
import { logger } from '../lib/logger';
import { callSessionManager } from './CallSessionManager';
import { generatePrefixedId } from '../utils/generateId';

export const callRouter = {
  /**
   * Main entry point for inbound calls via Twilio Voice Webhook
   */
  async handleInbound(req: Request, res: Response) {
    const { CallSid, From, To } = req.body;

    logger.info(`Inbound call received: ${CallSid} from ${From} to ${To}`);

    try {
      // 1. Find the provisioned phone number
      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: { number: To },
        include: { employee: true, organization: true }
      });

      if (!phoneNumber || !phoneNumber.employee) {
        logger.warn(`No AI Employee found for number ${To}`);
        res.type('text/xml').send('<Response><Reject reason="busy" /></Response>');
        return;
      }

      // 2. Identify customer based on caller ID (From)
      let customer = await prisma.customer.findFirst({
        where: { phone: From, organizationId: phoneNumber.organizationId }
      });

      // Optionally auto-create an anonymous customer record
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            id: generatePrefixedId('cus'),
            organizationId: phoneNumber.organizationId,
            firstName: 'Unknown',
            lastName: 'Caller',
            phone: From,
          }
        });
      }

      // 3. Create call record
      const call = await prisma.call.create({
        data: {
          id: generatePrefixedId('call'),
          organizationId: phoneNumber.organizationId,
          employeeId: phoneNumber.employeeId!,
          phoneNumberId: phoneNumber.id,
          customerId: customer.id,
          twilioCallSid: CallSid,
          direction: 'INBOUND',
          status: 'INITIATED',
          fromNumber: From,
          toNumber: To,
        }
      });

      // 4. Initialize Call Session
      await callSessionManager.saveSession({
        callId: call.id,
        employeeId: phoneNumber.employeeId!,
        customerId: customer.id,
        status: 'INITIATED',
        startedAt: new Date(),
        variables: {
          customerName: customer.firstName,
        }
      });

      // 5. Return TwiML to connect media stream
      const host = req.get('host') || process.env.APP_URL;
      const twiml = twilioManager.generateStreamTwiML(CallSid, host!);

      res.type('text/xml').send(twiml);

    } catch (error) {
      logger.error(`Error routing inbound call: ${error}`);
      res.type('text/xml').send('<Response><Reject reason="busy" /></Response>');
    }
  }
};
