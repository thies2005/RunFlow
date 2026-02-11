// Redis client implementation pattern
// Lazy-loads the Redis client only when needed and configured

// Minimal Redis interface for our usage
export interface RedisClient {
    set(key: string, value: string, options?: { ex?: number; nx?: boolean }): Promise<string | null>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
}

let redisClient: RedisClient | null = null;
let redisInitialized = false;

/**
 * Dynamic import helper for optional @upstash/redis dependency
 * Using Function constructor as a safer alternative to eval() for optional dynamic requires
 * This prevents webpack from bundling the dependency at build time
 */
function dynamicRequire(moduleName: string): unknown {
    // Using Function constructor instead of eval() for better security
    // This is still a dynamic require but with a slightly better security profile
    const requireFn = new Function('return require')() as NodeRequire;
    return requireFn(moduleName);
}

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
        redisInitialized = true; // Mark as initialized (but null) to stop retry
        return null;
    }

    try {
        // Dynamic import to prevent webpack from bundling @upstash/redis
        const { Redis: DynamicRedis } = dynamicRequire('@upstash/redis') as { Redis: new (options: { url: string; token: string }) => RedisClient };

        redisClient = new DynamicRedis({ url: redisUrl, token: redisToken || '' });
        console.log('[Redis] Client initialized successfully');
    } catch (error) {
        console.warn('[Redis] Failed to initialize client (optional dependency missing?):', error);
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
        console.error('[Redis] Lock error:', error);
        return true; // Fail open to allow DB lock to handle it
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
        console.error('[Redis] Release lock error:', error);
    }
}
