import { redis } from './redis';
import { logger } from './logger';

const DEFAULT_TTL = 300; // 5 minutes

// High-speed In-Memory L1 Cache Map with TTL expiration
const inMemoryStore = new Map<string, { value: any; expiry: number }>();

export const cache = {
  /**
   * Get a cached value. Checks memory L1 first, then Redis L2.
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    if (inMemoryStore.has(key)) {
      const entry = inMemoryStore.get(key)!;
      if (entry.expiry > now) {
        return entry.value as T;
      }
      inMemoryStore.delete(key);
    }

    if (redis.status !== 'ready') return null;
    try {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 150));
      const redisPromise = redis.get(key).then(raw => {
        if (!raw) return null;
        const val = JSON.parse(raw) as T;
        inMemoryStore.set(key, { value: val, expiry: Date.now() + 60000 });
        return val;
      });
      return await Promise.race([redisPromise, timeoutPromise]);
    } catch (err) {
      logger.warn({ key, err }, 'Cache get error');
      return null;
    }
  },

  /**
   * Set a cached value with optional TTL (seconds)
   */
  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    inMemoryStore.set(key, { value, expiry: Date.now() + ttl * 1000 });
    if (redis.status !== 'ready') return;
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
    for (const k of keys) {
      inMemoryStore.delete(k);
    }
    if (redis.status !== 'ready') return;
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
    // Delete from in-memory store
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of inMemoryStore.keys()) {
      if (regex.test(key)) {
        inMemoryStore.delete(key);
      }
    }

    if (redis.status !== 'ready') return;
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
    if (redis.status !== 'ready') return 0;
    try {
      const count = await redis.incr(key);
      if (count === 1 && ttl) await redis.expire(key, ttl);
      return count;
    } catch {
      return 0;
    }
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
