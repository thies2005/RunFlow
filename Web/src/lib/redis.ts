import { logger } from '@/lib/logging/logger';

export interface RedisClient {
    set(_key: string, _value: string, _options?: { ex?: number; nx?: boolean }): Promise<string | null>;
    get(_key: string): Promise<string | null>;
    del(_key: string): Promise<number>;
    incr(_key: string): Promise<number>;
    expire(_key: string, _seconds: number): Promise<number>;
    ttl(_key: string): Promise<number>;
}

let redisClient: RedisClient | null = null;
let redisInitialized = false;

function createIoredisAdapter(ioredis: InstanceType<typeof import('ioredis').default>): RedisClient {
    return {
        async set(key: string, value: string, options?: { ex?: number; nx?: boolean }): Promise<string | null> {
            if (options?.ex && options?.nx) {
                return ioredis.set(key, value, 'EX', options.ex, 'NX');
            }
            if (options?.ex) {
                return ioredis.set(key, value, 'EX', options.ex);
            }
            if (options?.nx) {
                return ioredis.set(key, value, 'NX');
            }
            return ioredis.set(key, value);
        },
        async get(key: string): Promise<string | null> {
            return ioredis.get(key);
        },
        async del(key: string): Promise<number> {
            return ioredis.del(key);
        },
        async incr(key: string): Promise<number> {
            return ioredis.incr(key);
        },
        async expire(key: string, seconds: number): Promise<number> {
            return ioredis.expire(key, seconds);
        },
        async ttl(key: string): Promise<number> {
            return ioredis.ttl(key);
        },
    };
}

export async function getRedisClient(): Promise<RedisClient | null> {
    if (redisInitialized) return redisClient;

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        redisInitialized = true;
        return null;
    }

    try {
        const ioredis = (await import('ioredis')).default;
        const client = new ioredis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
            lazyConnect: true,
            connectTimeout: 5000,
        });

        client.on('error', (err: Error) => {
            logger.warn('Redis connection error', { error: err.message });
        });

        await client.ping();

        redisClient = createIoredisAdapter(client);
        logger.info('Redis client initialized successfully');
    } catch (error) {
        logger.warn('Failed to initialize Redis client', { error: error instanceof Error ? error.message : String(error) });
    }

    redisInitialized = true;
    return redisClient;
}

export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return true;

    try {
        const result = await redis.set(key, 'locked', { ex: ttlSeconds, nx: true });
        return result === 'OK';
    } catch (error) {
        logger.error('Redis lock error', { key, error: error instanceof Error ? error.message : String(error) });
        return false;
    }
}

export async function releaseLock(key: string): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) return;

    try {
        await redis.del(key);
    } catch (error) {
        logger.error('Redis release lock error', { key, error: error instanceof Error ? error.message : String(error) });
    }
}
