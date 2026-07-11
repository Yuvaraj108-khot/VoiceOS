import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { generatePrefixedId } from '../utils/generateId';

export class VectorStore {
  /**
   * Saves chunks and their corresponding embeddings into the database.
   * Requires Prisma schema with `DocumentChunk` model supporting vector fields (pgvector).
   */
  async saveChunks(knowledgeBaseId: string, chunks: { text: string; vector: number[] }[]) {
    try {
      // In production with pgvector, you can use Prisma raw query to bulk insert vectors, 
      // or if using Prisma's native vector extension (Prisma 5.1+), you can use createMany.
      
      // We will loop for scaffolding, but batch insert via raw SQL is much faster.
      for (let i = 0; i < chunks.length; i++) {
        const { text, vector } = chunks[i];
        const vectorStr = `[${vector.join(',')}]`;
        
        await prisma.$executeRawUnsafe(`
          INSERT INTO "DocumentChunk" (id, "knowledgeBaseId", "textContent", "embedding", "chunkIndex", "createdAt", "updatedAt")
          VALUES ('${generatePrefixedId('chk')}', '${knowledgeBaseId}', '${text.replace(/'/g, "''")}', '${vectorStr}'::vector, ${i}, NOW(), NOW())
        `);
      }

      logger.info(`Saved ${chunks.length} vectorized chunks for KB ${knowledgeBaseId}`);
    } catch (error) {
      logger.error(`Error saving chunks to VectorStore: ${error}`);
      throw error;
    }
  }

  /**
   * Deletes all chunks associated with a Knowledge Base.
   */
  async deleteChunks(knowledgeBaseId: string) {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "DocumentChunk" WHERE "knowledgeBaseId" = '${knowledgeBaseId}'
    `);
  }
}

export const vectorStore = new VectorStore();
