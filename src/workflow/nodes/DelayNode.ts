import { logger } from '../../lib/logger';

export const delayNode = {
  async execute(data: any, context: Record<string, any>) {
    const delayMs = data.delayMs || 1000;
    logger.info(`Executing Delay Node: Sleeping for ${delayMs}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return {
      output: { delayed: true }
    };
  }
};
