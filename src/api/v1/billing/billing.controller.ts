import { Request, Response } from 'express';
import { billingService } from './billing.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const billingController = {
  async getSubscription(req: Request, res: Response) {
    const data = await billingService.getSubscription(req.organization!.id);
    ApiResponse.success(res, data);
  },

  async createCheckoutSession(req: Request, res: Response) {
    const { priceId, successUrl, cancelUrl } = req.body;
    const session = await billingService.createCheckoutSession(req.organization!.id, priceId, successUrl, cancelUrl);
    ApiResponse.success(res, session);
  },

  async createPortalSession(req: Request, res: Response) {
    const { returnUrl } = req.body;
    const session = await billingService.createPortalSession(req.organization!.id, returnUrl);
    ApiResponse.success(res, session);
  },

  async handleWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    await billingService.handleWebhook(req.body, signature);
    res.json({ received: true });
  }
};
