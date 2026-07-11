import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v1Router } from './api/v1';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { twilioWebhook } from './api/webhooks/twilio.webhook';
import { stripeWebhook } from './api/webhooks/stripe.webhook';
import { calendarWebhook } from './api/webhooks/calendar.webhook';
import { webhookRateLimiter } from './middleware/rateLimiter';

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors({ origin: '*' })); // Configure properly in production
app.use(compression());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhooks (Mount before express.json() because some require raw bodies)
app.post('/webhooks/twilio', express.urlencoded({ extended: true }), twilioWebhook);
app.post('/webhooks/stripe', webhookRateLimiter, express.raw({ type: 'application/json' }), stripeWebhook);
app.post('/webhooks/calendar', express.json(), calendarWebhook);

// Body parser for standard API routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Version 1
app.use('/v1', v1Router);

// Global Error Handler
app.use(errorHandler);

export { app };
