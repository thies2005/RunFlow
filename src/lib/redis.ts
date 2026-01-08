// Redis client implementation pattern
// Lazy-loads the Redis client only when needed and configured

let redisClient: any = null;
let redisInitialized = false;

/**
 * Initialize and return the Redis client if authentication is available.
 * Uses dynamic import hack to avoid bundling @upstash/redis if not needed.
 * 
 * @returns Redis client or null if not configured
 */
export async function getRedisClient(): Promise<any | null> {
    if (redisInitialized) return redisClient;

    const redisUrl = process.env.REDIS_URL;
    const redisToken = process.env.REDIS_TOKEN;

    if (!redisUrl) {
        redisInitialized = true; // Mark as initialized (but null) to stop retry
        return null;
    }

    try {
        // Use eval to prevent webpack from bundling @upstash/redis strict dependency
        // This makes the dependency truly optional at build time
        const dynamicRequire = eval('require');
        const { Redis: DynamicRedis } = dynamicRequire('@upstash/redis');

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

    // START DB-Fallback Logic Check
    // Ideally if no Redis, we rely on DB which we do anyway. 
    // But here if Redis exists, we use it.

    try {
        // SET key val EX ttl NX -> Only set if not exists
        const result = await redis.set(key, 'locked', { ex: ttlSeconds, nx: true });
        return result === 'OK';
    } catch (error) {
        console.error('[Redis] Lock error:', error);
        return true; // Fail open to allow DB lock to handle it? Or fail closed? 
        // Fail open lets the process continue and rely on DB lock.
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
