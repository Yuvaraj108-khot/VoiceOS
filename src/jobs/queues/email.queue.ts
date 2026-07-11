import { Queue } from 'bullmq';
import { redis } from '../../lib/redis';

// Note: BullMQ requires standard Redis config, we can extract host/port from the existing setup.
// For scaffolding, we define the queue structures.

const connection = { host: 'localhost', port: 6379 }; // Scaffold config

export const emailQueue = new Queue('EmailQueue', { connection });
