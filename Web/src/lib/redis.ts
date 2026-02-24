// Redis client implementation pattern
// Lazy-loads the Redis client only when needed and configured

// Minimal Redis interface for our usage
export interface RedisClient {
    set(_key: string, _value: string, _options?: { ex?: number; nx?: boolean }): Promise<string | null>;
    get(_key: string): Promise<string | null>;
    del(_key: string): Promise<number>;
    incr(_key: string): Promise<number>;
    expire(_key: string, _seconds: number): Promise<number>;
    ttl(_key: string): Promise<number>;
}

import { logger } from '@/lib/logging/logger';

let redisClient: RedisClient | null = null;
let redisInitialized = false;

/**
 * Initialize and return the Redis client if authentication is available.
 * Uses dynamic import to avoid bundling @upstash/redis if not needed.
 *
 * @returns Redis client or null if not configured
 */
export async function getRedisClient(): Promise<RedisClient | null> {
    if (redisInitialized) return redisClient;

    const redisUrl = process.env.REDIS_URL;
    const redisToken = process.env.REDIS_TOKEN;

    if (!redisUrl) {
        redisInitialized = true;
        return null;
    }

    try {
        const { Redis: DynamicRedis } = await import('@upstash/redis') as { Redis: new (_options: { url: string; token: string }) => RedisClient };

        redisClient = new DynamicRedis({ url: redisUrl, token: redisToken || '' });
        logger.info('Redis client initialized successfully');
    } catch (error) {
        logger.warn('Failed to initialize Redis client (optional dependency missing)', { error: error instanceof Error ? error.message : String(error) });
    }

    redisInitialized = true;
    return redisClient;
}

/**
 * Helper to acquire a distributed lock
 * @param key Lock key
 * @param ttlSeconds Lock duration
 * @returns true if lock acquired, false if busy
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return true; // If no Redis, always "acquire" (fall back to DB lock)

    try {
        // SET key val EX ttl NX -> Only set if not exists
        const result = await redis.set(key, 'locked', { ex: ttlSeconds, nx: true });
        return result === 'OK';
    } catch (error) {
        logger.error('Redis lock error', { key, error: error instanceof Error ? error.message : String(error) });
        return false; // Fail closed - if Redis is configured but errors, deny concurrent access
    }
}

/**
 * Helper to release a distributed lock
 */
export async function releaseLock(key: string): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) return;

    try {
        await redis.del(key);
    } catch (error) {
        logger.error('Redis release lock error', { key, error: error instanceof Error ? error.message : String(error) });
    }
}
