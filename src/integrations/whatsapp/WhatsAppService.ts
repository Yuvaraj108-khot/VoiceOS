import { logger } from '../../lib/logger';

export class WhatsAppService {
  async sendMessage(integrationId: string, to: string, message: string) {
    logger.info(`Sending WhatsApp message to ${to}`);
    return true;
  }
}

export const whatsappService = new WhatsAppService();
