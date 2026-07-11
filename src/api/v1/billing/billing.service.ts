import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { config } from '../../../config/app.config';

// Initialize Stripe if API key is present
const stripe = config.STRIPE_SECRET_KEY 
  ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any }) 
  : null;

export const billingService = {
  async getSubscription(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planTier: true, stripeCustomerId: true, stripeSubscriptionId: true }
    });

    if (!org) throw ApiError.notFound('Organization');

    let subscriptionData = null;
    
    if (stripe && org.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        subscriptionData = {
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      } catch (e) {
        // Fallback if Stripe errors (e.g. sub deleted in Stripe but not synced)
        subscriptionData = { status: 'unknown' };
      }
    }

    return {
      planTier: org.planTier,
      stripeCustomerId: org.stripeCustomerId,
      subscription: subscriptionData,
    };
  },

  async createCheckoutSession(organizationId: string, priceId: string, successUrl: string, cancelUrl: string) {
    if (!stripe) throw ApiError.internal('Billing is not configured');

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw ApiError.notFound('Organization');

    let customerId = org.stripeCustomerId;

    // Create a customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId }
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { organizationId },
    });

    return { url: session.url };
  },

  async createPortalSession(organizationId: string, returnUrl: string) {
    if (!stripe) throw ApiError.internal('Billing is not configured');

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || !org.stripeCustomerId) {
      throw ApiError.badRequest('No active billing customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  },

  async handleWebhook(body: any, signature: string) {
    if (!stripe || !config.STRIPE_WEBHOOK_SECRET) return;

    try {
      const event = stripe.webhooks.constructEvent(body, signature, config.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          await prisma.organization.updateMany({
            where: { stripeCustomerId: customerId },
            data: { stripeSubscriptionId: subscription.id, planTier: 'GROWTH' } // In prod, map price ID to plan tier
          });
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          await prisma.organization.updateMany({
            where: { stripeCustomerId: customerId },
            data: { stripeSubscriptionId: null, planTier: 'STARTER' }
          });
          break;
        }
      }
    } catch (err) {
      throw ApiError.badRequest('Webhook Error');
    }
  }
};
