import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_MODEL = process.env.GROQ_MODEL ?? 'qwen/qwen3.8-27b';
export const GROQ_MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS ?? '150', 10);
export const GROQ_TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE ?? '0.4');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streams a chat completion from Groq.
 * Calls onChunk for each text delta, returns the full accumulated text.
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    onChunk?: (delta: string) => Promise<void> | void;
  } = {},
): Promise<string> {
  const stream = await groq.chat.completions.create({
    model: options.model ?? GROQ_MODEL,
    messages,
    max_tokens: options.maxTokens ?? GROQ_MAX_TOKENS,
    temperature: options.temperature ?? GROQ_TEMPERATURE,
    stream: true,
  });

  let fullText = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullText += delta;
      if (options.onChunk) {
        await options.onChunk(delta);
      }
    }
  }

  return fullText;
}

/**
 * Non-streaming chat completion for structured outputs
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: { type: 'json_object' };
  } = {},
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: options.model ?? GROQ_MODEL,
    messages,
    max_tokens: options.maxTokens ?? GROQ_MAX_TOKENS,
    temperature: options.temperature ?? GROQ_TEMPERATURE,
    ...(options.responseFormat && { response_format: options.responseFormat }),
    stream: false,
  });

  return response.choices[0]?.message?.content ?? '';
}
