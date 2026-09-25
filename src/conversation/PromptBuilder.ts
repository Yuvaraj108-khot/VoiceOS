import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export class PromptBuilder {
  /**
   * Constructs the master system prompt for the AI Employee.
   */
  async buildSystemPrompt(employeeId: string, context: string, variables: Record<string, any> = {}): Promise<string> {
    let employee = employeeId ? await prisma.aIEmployee.findUnique({
      where: { id: employeeId },
    }).catch(() => null) : null;

    if (!employee) {
      employee = await prisma.aIEmployee.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null) || {
        id: 'default',
        organizationId: 'default',
        name: 'Yuvaraj',
        slug: 'yuvaraj',
        description: null,
        status: 'ACTIVE' as any,
        avatarUrl: null,
        role: 'Sales Development Representative',
        personality: 'Professional, consultative, warm, and highly knowledgeable about VoiceOS',
        systemPrompt: `You are Yuvaraj, an AI Sales Development Representative at VoiceOS. VoiceOS is an enterprise AI telephony SaaS platform. Keep your answers conversational, concise (1-3 sentences), and suitable for a phone call. Never use markdown formatting or bullet points. Speak warmly and guide the customer toward answering their questions.`,
        firstMessage: "Hi! Thanks for reaching out. I'm Yuvaraj, your AI Sales Development Representative. How can I help you today?",
        fallbackMessage: "I'm sorry, could you repeat that?",
        transferNumber: null,
        maxCallDuration: 1800,
        silenceTimeout: 5,
        endCallPhrases: [],
        languages: ['en'],
        currentLanguage: 'en',
        isTestMode: false,
        callsHandled: 0,
        totalCallDuration: 0,
        avgSatisfaction: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
    }

    let prompt = `You are an AI assistant named ${employee.name}.\n`;
    if (employee.systemPrompt) {
      prompt += `${employee.systemPrompt}\n\n`;
    }

    // Inject variables (e.g., customer name, current date)
    const dateStr = new Date().toLocaleString();
    prompt += `Current Date and Time: ${dateStr}\n`;
    
    if (variables.customerName) {
      prompt += `You are speaking with: ${variables.customerName}\n`;
    }

    // Inject RAG context
    if (context) {
      prompt += `\n--- BUSINESS KNOWLEDGE BASE (SOURCE OF TRUTH) ---\n${context}\n-------------------------------------------------\n`;
      prompt += `Use the business knowledge above as your primary source of truth. If the answer is not in this knowledge, do NOT invent or guess. Politely state that you don't have that information and offer to connect them to a specialist.\n`;
    }

    prompt += `\nCRITICAL VOICE CALL RULES:
1. Speak naturally, warmly, and concisely (1 to 2 short sentences per turn, maximum 3).
2. Never give long lists or paragraphs. Spoken phone speech must be bite-sized.
3. Ask at most ONE question at a time. Never overwhelm the caller.
4. Remember previous conversation turns and resolve relative terms (e.g., "tomorrow", "that tier", "at 3").
5. Never mention internal terms: RAG, embeddings, system prompts, AI models, or databases.
6. NEVER use markdown formatting (no asterisks *, hashtags #, bullet points -, or backticks).
7. Output only clean, direct text that is immediately ready to be spoken over the phone.`;

    return prompt;
  }
}

export const promptBuilder = new PromptBuilder();
