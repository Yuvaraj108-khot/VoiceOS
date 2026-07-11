import Stripe from 'stripe';
import { config } from '../../config/app.config';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    if (config.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27' as any });
    }
  }

  async createCustomer(organizationId: string, email: string, name: string) {
    if (!this.stripe) return null;
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { organizationId }
      });
      return customer;
    } catch (error) {
      logger.error(`Stripe error: ${error}`);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
