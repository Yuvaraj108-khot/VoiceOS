import { Worker } from 'bullmq';
import { logger } from '../../lib/logger';
import { documentParser } from '../../knowledge/DocumentParser';
import { chunkingEngine } from '../../knowledge/ChunkingEngine';
import { embeddingService } from '../../knowledge/EmbeddingService';
import { vectorStore } from '../../knowledge/VectorStore';

const connection = { host: 'localhost', port: 6379 };

export const embeddingWorker = new Worker('EmbeddingQueue', async (job) => {
  logger.info(`Processing embedding job ${job.id}`);
  const { knowledgeBaseId, s3Key, mimeType } = job.data;
  
  // 1. Parse
  const text = await documentParser.parseDocument(s3Key, mimeType);
  
  // 2. Chunk
  const chunks = chunkingEngine.chunkText(text);
  
  // 3. Embed
  const embeddings = await embeddingService.generateEmbeddings(chunks);
  
  // 4. Save
  const vectorizedChunks = chunks.map((t, i) => ({ text: t, vector: embeddings[i] }));
  await vectorStore.saveChunks(knowledgeBaseId, vectorizedChunks);
  
}, { connection });

embeddingWorker.on('completed', job => logger.debug(`Embedding job ${job.id} completed`));
embeddingWorker.on('failed', (job, err) => logger.error(`Embedding job ${job?.id} failed: ${err.message}`));
