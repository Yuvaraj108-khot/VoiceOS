import { groq, chatCompletion, ChatMessage } from '../lib/groq';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { memoryManager } from './MemoryManager';

export class CallSummarizer {
  /**
   * Generates a summary for a completed call based on its memory history.
   */
  async summarizeCall(callId: string): Promise<void> {
    try {
      const history = await memoryManager.getHistory(callId);
      
      if (history.length < 2) {
        logger.info(`Call ${callId} too short to summarize`);
        return;
      }

      // Convert history to a text transcript
      const transcript = history
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n');

      const prompt = `
        Read the following call transcript and provide a concise 3-5 sentence summary of the conversation.
        Focus on the customer's intent, the outcome, and any required follow-ups.

        TRANSCRIPT:
        ${transcript}
      `;

      const summary = await chatCompletion([{ role: 'user', content: prompt }]);

      // Determine overall sentiment based on the transcript
      const sentimentPrompt = `
        Based on this transcript, what was the overall sentiment of the user?
        Respond ONLY with POSITIVE, NEUTRAL, or NEGATIVE.

        TRANSCRIPT:
        ${transcript}
      `;
      const sentimentRaw = await chatCompletion([{ role: 'user', content: sentimentPrompt }]);
      const sentiment = ['POSITIVE', 'NEGATIVE'].includes(sentimentRaw.trim().toUpperCase()) 
        ? sentimentRaw.trim().toUpperCase() as any
        : 'NEUTRAL';

      // Save to database (assuming a 'summary' field was added to the schema, or store it in workflow logs/metadata)
      // For the sake of this scaffold, we'll update the call sentiment. (Summary field could be added in Prisma schema later)
      await prisma.call.updateMany({
        where: { id: callId },
        data: {
          sentiment,
          // summary: summary // If schema supports it
        }
      });

      logger.info(`Call ${callId} summarized successfully`);

    } catch (error) {
      logger.error(`Error summarizing call ${callId}: ${error}`);
    }
  }
}

export const callSummarizer = new CallSummarizer();
