import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
// import { embeddingService } from '../knowledge/EmbeddingService'; // Phase 12

export class ContextRetriever {
  /**
   * Retrieves relevant context for a given user utterance using vector similarity search.
   */
  async retrieveContext(employeeId: string, userInput: string, topK: number = 3): Promise<string> {
    try {
      // 1. Check if employee has linked knowledge bases
      const links = await prisma.knowledgeDocument.findMany({
        where: { employeeId },
        select: { id: true }
      });

      if (links.length === 0) return ''; // No knowledge assigned

      const kbIds = links.map((l: any) => l.id);

      // 2. Generate embedding for user input
      // const embedding = await embeddingService.generateEmbedding(userInput);
      // Mocking embedding array for scaffold
      const embedding = Array(1536).fill(0.1); 

      // 3. Perform vector search in PostgreSQL using pgvector
      // Note: This requires the pgvector extension to be installed in PostgreSQL.
      // We use raw SQL because Prisma's native vector support might require specific syntax.
      
      /*
      const vectorStr = `[${embedding.join(',')}]`;
      const kbIdsStr = kbIds.map(id => `'${id}'`).join(',');

      const results = await prisma.$queryRawUnsafe<any[]>(`
        SELECT text_content, 1 - (embedding <=> '${vectorStr}'::vector) as similarity
        FROM "DocumentChunk"
        WHERE "knowledgeBaseId" IN (${kbIdsStr})
        ORDER BY embedding <=> '${vectorStr}'::vector
        LIMIT ${topK};
      `);
      */

      // Mocking results for scaffold until Phase 12 (Knowledge Engine) is fully built
      const results: any[] = []; 

      if (results.length === 0) return '';

      // 4. Combine top results into a single context string
      return results.map((r, i) => `[Fact ${i + 1}]: ${r.text_content}`).join('\n');

    } catch (error) {
      logger.error(`Error retrieving context for employee ${employeeId}: ${error}`);
      return '';
    }
  }
}

export const contextRetriever = new ContextRetriever();
