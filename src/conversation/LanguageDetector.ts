import { groq, chatCompletion, ChatMessage } from '../lib/groq';
import { logger } from '../lib/logger';

export class LanguageDetector {
  /**
   * Detects the language of the user's input.
   * Useful if the AI needs to dynamically switch TTS language voices.
   */
  async detectLanguage(userInput: string): Promise<string> {
    const prompt = `
      Identify the primary language of the following text. 
      Respond with ONLY the ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'de').

      Text: "${userInput}"
    `;

    try {
      const response = await chatCompletion([{ role: 'user', content: prompt }]);
      const lang = response.trim().toLowerCase();
      
      // Basic validation (length 2 code)
      if (lang.length === 2) {
        return lang;
      }
      return 'en'; // fallback
    } catch (error) {
      logger.error(`Error detecting language: ${error}`);
      return 'en';
    }
  }
}

export const languageDetector = new LanguageDetector();
