import { logger } from '../../lib/logger';
import { callSummaryWorker } from './callSummary.worker';
import { embeddingWorker } from './embedding.worker';
import { analyticsWorker } from './analytics.worker';
import { notificationWorker } from './notification.worker';
import { emailWorker } from './email.worker';

logger.info('[Workers] Initializing all BullMQ background workers...');

export const workers = {
  callSummaryWorker,
  embeddingWorker,
  analyticsWorker,
  notificationWorker,
  emailWorker,
};

logger.info('[Workers] All BullMQ workers successfully initialized and listening on Redis');
