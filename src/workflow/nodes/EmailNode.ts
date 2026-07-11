import { logger } from '../../lib/logger';

export const emailNode = {
  async execute(data: any, context: Record<string, any>) {
    // Replace variables in subject/body from context
    const to = data.to;
    logger.info(`Executing Email Node: Sending email to ${to}`);
    // In production, push to email background queue
    return {
      output: {
        emailSent: true,
        to
      }
    };
  }
};
