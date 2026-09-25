import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export class ContextRetriever {
  /**
   * Retrieves relevant context for a given user utterance using knowledge chunks.
   */
  async retrieveContext(employeeId: string, userInput: string, topK: number = 3): Promise<string> {
    if (!employeeId || employeeId === 'default') return '';

    try {
      // Find relevant chunks assigned to this employee
      const chunks = await prisma.knowledgeChunk.findMany({
        where: { employeeId },
        take: topK,
        select: { content: true }
      }).catch(() => []);

      if (!chunks || chunks.length === 0) {
        return '';
      }

      return chunks.map((c: any, i: number) => `[Knowledge ${i + 1}]: ${c.content}`).join('\n');
    } catch (error) {
      logger.error(`Error retrieving context for employee ${employeeId}: ${error}`);
      return '';
    }
  }
}

export const contextRetriever = new ContextRetriever();
