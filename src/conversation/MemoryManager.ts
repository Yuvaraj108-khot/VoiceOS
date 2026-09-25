import { redis } from '../lib/redis';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class MemoryManager {
  private localMemory = new Map<string, ChatMessage[]>();

  /**
   * Appends a message to the call's memory stack in Redis and local memory.
   */
  async addMessage(callId: string, message: ChatMessage): Promise<void> {
    const list = this.localMemory.get(callId) || [];
    list.push(message);
    this.localMemory.set(callId, list);

    if (redis.status === "ready") {
      try {
        const key = `call_memory:${callId}`;
        await redis.rpush(key, JSON.stringify(message));
        await redis.expire(key, 86400);
      } catch { /* ignore redis error */ }
    }
  }

  /**
   * Retrieves the full conversation history for a call.
   */
  async getHistory(callId: string): Promise<ChatMessage[]> {
    if (redis.status === "ready") {
      try {
        const key = `call_memory:${callId}`;
        const data = await redis.lrange(key, 0, -1);
        if (data && data.length > 0) {
          return data.map((item: any) => JSON.parse(item) as ChatMessage);
        }
      } catch { /* ignore and use local memory */ }
    }

    return this.localMemory.get(callId) || [];
  }

  /**
   * Clears the memory for a call.
   */
  async clearMemory(callId: string): Promise<void> {
    this.localMemory.delete(callId);
    if (redis.status === "ready") {
      try {
        await redis.del(`call_memory:${callId}`);
      } catch { /* ignore */ }
    }
  }
}

export const memoryManager = new MemoryManager();
