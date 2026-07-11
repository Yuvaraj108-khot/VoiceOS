import { Request, Response } from 'express';
import { billingService } from '../v1/billing/billing.service';
import { logger } from '../../lib/logger';

export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    res.status(400).send('Missing stripe signature');
    return;
  }

  try {
    await billingService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (error) {
    logger.error(`Error processing Stripe webhook: ${error}`);
    res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};
