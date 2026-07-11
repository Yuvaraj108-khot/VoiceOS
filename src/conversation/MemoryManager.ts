import { redis } from '../lib/redis';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class MemoryManager {
  /**
   * Appends a message to the call's memory stack in Redis.
   */
  async addMessage(callId: string, message: ChatMessage): Promise<void> {
    if (redis.status !== "ready") return;
    const key = `call_memory:${callId}`;
    
    // Push message to the end of the list
    await redis.rpush(key, JSON.stringify(message));
    
    // Set an expiration of 24 hours so it cleans up automatically
    await redis.expire(key, 86400);
  }

  /**
   * Retrieves the full conversation history for a call.
   */
  async getHistory(callId: string): Promise<ChatMessage[]> {
    if (redis.status !== "ready") return [];
    
    const key = `call_memory:${callId}`;
    const data = await redis.lrange(key, 0, -1);
    
    return data.map((item: any) => JSON.parse(item) as ChatMessage);
  }

  /**
   * Clears the memory for a call.
   */
  async clearMemory(callId: string): Promise<void> {
    if (redis.status !== "ready") return;
    await redis.del(`call_memory:${callId}`);
  }
}

export const memoryManager = new MemoryManager();
