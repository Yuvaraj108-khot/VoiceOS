import { redis } from './redis';
import { logger } from './logger';

const DEFAULT_TTL = 300; // 5 minutes

export const cache = {
  /**
   * Get a cached value. Returns null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ key, err }, 'Cache get error');
      return null;
    }
  },

  /**
   * Set a cached value with optional TTL (seconds)
   */
  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      logger.warn({ key, err }, 'Cache set error');
    }
  },

  /**
   * Delete a cached key
   */
  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await redis.del(...keys);
    } catch (err) {
      logger.warn({ keys, err }, 'Cache del error');
    }
  },

  /**
   * Delete all keys matching a pattern (use sparingly — SCAN-based)
   */
  async delPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  },

  /**
   * Get-or-Set: returns cached value or executes factory function and caches result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = DEFAULT_TTL,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  },

  /**
   * Increment a numeric counter (for analytics, rate limiting)
   */
  async incr(key: string, ttl?: number): Promise<number> {
    const count = await redis.incr(key);
    if (count === 1 && ttl) await redis.expire(key, ttl);
    return count;
  },

  /**
   * Build a namespaced cache key
   */
  key(...parts: (string | number)[]): string {
    return parts.join(':');
  },
};

// Cache key namespaces
export const CacheKeys = {
  org: (orgId: string) => `org:${orgId}`,
  orgSettings: (orgId: string) => `org:settings:${orgId}`,
  employee: (empId: string) => `employee:${empId}`,
  employeeList: (orgId: string) => `org:${orgId}:employees`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userMembership: (userId: string, orgId: string) => `user:${userId}:org:${orgId}`,
  callSession: (callSid: string) => `call:session:${callSid}`,
  callAnalytics: (orgId: string, date: string) => `analytics:${orgId}:${date}`,
  phoneNumber: (number: string) => `phone:${number}`,
  rateLimitKey: (identifier: string) => `rl:${identifier}`,
};
