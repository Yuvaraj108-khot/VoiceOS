import express, { Router } from 'express';
import { billingController } from './billing.controller';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin } from '../../../middleware/authorize';
import { auditLogger } from '../../../middleware/auditLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import { webhookRateLimiter } from '../../../middleware/rateLimiter';

const router = Router();

// Webhook must be raw body for Stripe signature verification
router.post(
  '/webhook',
  webhookRateLimiter,
  express.raw({ type: 'application/json' }),
  asyncHandler(billingController.handleWebhook)
);

// Protected routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/subscription', asyncHandler(billingController.getSubscription));

router.post(
  '/checkout',
  auditLogger({ action: 'UPDATE', resource: 'Billing' }),
  asyncHandler(billingController.createCheckoutSession)
);

router.post(
  '/portal',
  auditLogger({ action: 'UPDATE', resource: 'Billing' }),
  asyncHandler(billingController.createPortalSession)
);

export const billingRoutes = router;
