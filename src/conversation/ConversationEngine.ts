import { logger } from '../lib/logger';
import { callSessionManager } from '../telephony/CallSessionManager';
import { memoryManager } from './MemoryManager';
import { promptBuilder } from './PromptBuilder';
import { contextRetriever } from './ContextRetriever';
import { groq, chatCompletion, ChatMessage } from '../lib/groq';

export class ConversationEngine {
  /**
   * Main entry point for transcribed audio text during a call.
   * Takes the user's spoken text, processes it through the LLM, and returns the AI's response text.
   */
  async processUserInput(callId: string, userInput: string): Promise<string> {
    try {
      const session = await callSessionManager.getSession(callId);
      if (!session) throw new Error('Call session not found');

      // 1. Add user input to memory
      await memoryManager.addMessage(callId, { role: 'user', content: userInput });

      // 2. Retrieve relevant context (RAG)
      const context = await contextRetriever.retrieveContext(session.employeeId, userInput);

      // 3. Build the prompt
      const systemPrompt = await promptBuilder.buildSystemPrompt(session.employeeId, context, session.variables);
      const conversationHistory = await memoryManager.getHistory(callId);

      // 4. Call LLM (Gemini 3.1 Pro Low as per user preference, modeled via our unified client or direct SDK)
      // Note: Assuming `groq` (or Gemini SDK wrapper) takes an array of messages
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((h: any) => ({ role: h.role as "user" | "system" | "assistant", content: h.content }))
      ];

      const aiResponse = await chatCompletion(messages);

      // 5. Add AI response to memory
      await memoryManager.addMessage(callId, { role: 'assistant', content: aiResponse });

      return aiResponse;
    } catch (error) {
      logger.error(`Error in ConversationEngine for call ${callId}: ${error}`);
      return "I'm sorry, I'm having trouble processing that right now. Could you repeat?";
    }
  }

  async handleCallStart(callId: string): Promise<string> {
    logger.info(`Conversation started for call ${callId}`);
    // Potentially trigger a proactive greeting from the LLM here
    return "Hello! How can I help you today?";
  }

  async handleCallEnd(callId: string) {
    logger.info(`Conversation ended for call ${callId}`);
    // Post-call processing (e.g. summarization) is handled by background jobs
  }
}

export const conversationEngine = new ConversationEngine();
