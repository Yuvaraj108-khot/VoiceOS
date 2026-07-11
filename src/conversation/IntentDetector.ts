import { groq, chatCompletion, ChatMessage } from '../lib/groq';
import { logger } from '../lib/logger';

export class IntentDetector {
  /**
   * Evaluates the latest user input to detect if a specific workflow intent was triggered.
   * Returns the name of the intent if detected, otherwise null.
   */
  async detectIntent(userInput: string, possibleIntents: string[]): Promise<string | null> {
    if (possibleIntents.length === 0) return null;

    const prompt = `
      You are an intent classification engine.
      Given the following user utterance, determine if it matches any of the provided intents.
      If it matches an intent, respond with ONLY the exact name of the intent.
      If it does not clearly match any, respond with "NONE".

      User utterance: "${userInput}"
      Possible intents: [${possibleIntents.join(', ')}]
    `;

    try {
      const response = await chatCompletion([{ role: 'user', content: prompt }]);
      const intent = response.trim();
      
      if (intent !== 'NONE' && possibleIntents.includes(intent)) {
        return intent;
      }
      return null;
    } catch (error) {
      logger.error(`Error detecting intent: ${error}`);
      return null;
    }
  }
}

export const intentDetector = new IntentDetector();
