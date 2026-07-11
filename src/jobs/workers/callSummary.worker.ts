import { Worker } from 'bullmq';
import { logger } from '../../lib/logger';
import { callSummarizer } from '../../conversation/CallSummarizer';

const connection = { host: 'localhost', port: 6379 };

export const callSummaryWorker = new Worker('CallSummaryQueue', async (job) => {
  logger.info(`Processing call summary job ${job.id}`);
  const { callId } = job.data;
  
  await callSummarizer.summarizeCall(callId);
  
}, { connection });

callSummaryWorker.on('completed', job => logger.debug(`Call summary job ${job.id} completed`));
callSummaryWorker.on('failed', (job, err) => logger.error(`Call summary job ${job?.id} failed: ${err.message}`));
