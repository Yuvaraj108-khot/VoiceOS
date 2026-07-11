import { logger } from '../../lib/logger';

export const webhookNode = {
  async execute(data: any, context: Record<string, any>) {
    logger.info(`Executing Webhook Node: POST to ${data.url}`);
    
    try {
      // In production, use fetch/axios with timeout
      // const res = await fetch(data.url, { method: data.method || 'POST', body: JSON.stringify(context) });
      return {
        output: {
          webhookSuccess: true,
          statusCode: 200
        }
      };
    } catch (err) {
      return {
        output: { webhookSuccess: false, error: String(err) }
      };
    }
  }
};
