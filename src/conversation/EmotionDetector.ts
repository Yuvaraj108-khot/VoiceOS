import { groq, chatCompletion, ChatMessage } from '../lib/groq';
import { logger } from '../lib/logger';

export class EmotionDetector {
  /**
   * Evaluates the tone/emotion of the user's input.
   * Useful for analytics and adjusting the AI's tone dynamically.
   */
  async detectEmotion(userInput: string): Promise<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'> {
    const prompt = `
      Analyze the sentiment of the following text and categorize it as exactly one of: POSITIVE, NEUTRAL, or NEGATIVE.
      Respond with ONLY the category name.

      Text: "${userInput}"
    `;

    try {
      const response = await chatCompletion([{ role: 'user', content: prompt }]);
      const sentiment = response.trim().toUpperCase();
      
      if (['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(sentiment)) {
        return sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      }
      return 'NEUTRAL';
    } catch (error) {
      logger.error(`Error detecting emotion: ${error}`);
      return 'NEUTRAL';
    }
  }
}

export const emotionDetector = new EmotionDetector();
