import { logger } from '../../lib/logger';

export class HubspotService {
  async updateContact(integrationId: string, email: string, data: any) {
    logger.info(`Updating HubSpot contact ${email}`);
    return true;
  }
}

export const hubspotService = new HubspotService();
