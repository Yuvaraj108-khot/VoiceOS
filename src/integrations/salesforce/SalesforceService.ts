import { logger } from '../../lib/logger';

export class SalesforceService {
  async updateLead(integrationId: string, leadId: string, data: any) {
    logger.info(`Updating Salesforce lead ${leadId}`);
    return true;
  }
}

export const salesforceService = new SalesforceService();
