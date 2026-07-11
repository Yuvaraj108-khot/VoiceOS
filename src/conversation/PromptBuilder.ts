import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export class PromptBuilder {
  /**
   * Constructs the master system prompt for the AI Employee.
   */
  async buildSystemPrompt(employeeId: string, context: string, variables: Record<string, any> = {}): Promise<string> {
    const employee = await prisma.aIEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw ApiError.notFound('AI Employee');

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
      prompt += `\n--- KNOWLEDGE BASE CONTEXT ---\n${context}\n-----------------------------\n`;
      prompt += `Use the context above to answer questions. If the answer is not in the context, do not make it up.`;
    }

    prompt += `\nKeep your responses conversational, concise, and suitable for a voice call. Do not use markdown or complex formatting.`;

    return prompt;
  }
}

export const promptBuilder = new PromptBuilder();
