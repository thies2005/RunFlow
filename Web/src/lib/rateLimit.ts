import { LRUCache } from 'lru-cache';
import { MINUTE_MS } from '@/lib/constants';

type RateLimitRecord = {
    timestamps: number[];
};

interface RedisClient {
    incr(_key: string): Promise<number>;
    expire(_key: string, _seconds: number): Promise<number>;
    ttl(_key: string): Promise<number>;
}

const rateLimitCache = new LRUCache<string, RateLimitRecord>({
    max: 10000,
    ttl: 15 * MINUTE_MS,
});

let redisClient: RedisClient | null = null;
let redisInitialized = false;

async function initRedis(): Promise<boolean> {
    if (redisInitialized) return !!redisClient;

    redisInitialized = true;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        return false;
    }

    try {
        const { Redis } = await import('@upstash/redis') as { Redis: new (_options: { url: string; token: string }) => RedisClient };
        redisClient = new Redis({ url: redisUrl, token: process.env.REDIS_TOKEN || '' });
        return true;
    } catch (error) {
        return false;
    }
}

export type RateLimitConfig = {
    limit: number;
    windowSeconds: number;
    prefix?: string;
};

export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
    retryAfter?: number;
};

function cleanOldTimestamps(timestamps: number[], now: number, windowMs: number): number[] {
    const cutoff = now - windowMs;
    let left = 0;
    let right = timestamps.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (timestamps[mid] <= cutoff) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return timestamps.slice(left);
}

function checkRateLimitInMemory(
    key: string,
    limit: number,
    windowSeconds: number
): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const record = rateLimitCache.get(key) || { timestamps: [] };

    const cleanedTimestamps = cleanOldTimestamps(record.timestamps, now, windowMs);
    const isLimitExceeded = cleanedTimestamps.length >= limit;

    if (!isLimitExceeded) {
        cleanedTimestamps.push(now);
    }

    rateLimitCache.set(key, { timestamps: cleanedTimestamps });

    const remaining = Math.max(0, limit - cleanedTimestamps.length);
    const oldestTimestamp = cleanedTimestamps[0] || now;
    const resetAt = Math.floor((oldestTimestamp + windowMs) / 1000);

    if (isLimitExceeded) {
        return {
            allowed: false,
            remaining: 0,
            resetAt,
            limit,
            retryAfter: Math.max(0, Math.ceil((oldestTimestamp + windowMs - now) / 1000)),
        };
    }

    return {
        allowed: true,
        remaining,
        resetAt,
        limit,
    };
}

async function checkRateLimitRedis(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const client = redisClient;
    if (!client) {
        throw new Error('Redis client not initialized');
    }

    try {
        const currentCount = await client.incr(key);

        if (currentCount === 1) {
            await client.expire(key, windowSeconds);
        }

        const ttl = await client.ttl(key);
        const resetAt = now + (ttl > 0 ? ttl * 1000 : windowMs);

        if (currentCount > limit) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: Math.floor(resetAt / 1000),
                limit,
                retryAfter: Math.max(0, Math.ceil((resetAt - now) / 1000)),
            };
        }

        return {
            allowed: true,
            remaining: limit - currentCount,
            resetAt: Math.floor(resetAt / 1000),
            limit,
        };
    } catch (error) {
        console.error('Redis rate limit error:', error);
        // Fail closed for security in case of Redis failure
        return {
            allowed: false,
            remaining: 0,
            resetAt: Math.floor((now + windowMs) / 1000),
            limit,
            retryAfter: 60,
        };
    }
}

export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const { limit, windowSeconds, prefix = '' } = config;
    const key = `ratelimit:${prefix}:${identifier}`;

    return checkRateLimitInMemory(key, limit, windowSeconds);
}

export async function checkRateLimitAsync(
    identifier: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const { limit, windowSeconds, prefix = '' } = config;
    const key = `ratelimit:${prefix}:${identifier}`;

    const hasRedis = await initRedis();
    if (hasRedis && redisClient) {
        return checkRateLimitRedis(key, limit, windowSeconds);
    }

    // In production, we must not fall back to in-memory rate limiting as it's ineffective
    // in serverless environments (per-instance state).
    if (process.env.NODE_ENV === 'production') {
        console.error('Security: Redis not available in production. Rate limiting would be ineffective.');
        return {
            allowed: false,
            remaining: 0,
            resetAt: Math.floor((Date.now() + windowSeconds * 1000) / 1000),
            limit,
            retryAfter: 60,
        };
    }

    return checkRateLimitInMemory(key, limit, windowSeconds);
}

export const RATE_LIMITS = {
    sync: { limit: 5, windowSeconds: 60, prefix: 'sync' },
    activities: { limit: 30, windowSeconds: 60, prefix: 'activities' },
    settings: { limit: 10, windowSeconds: 60, prefix: 'settings' },
    webhooks: { limit: 100, windowSeconds: 60, prefix: 'webhooks' },
    general: { limit: 60, windowSeconds: 60, prefix: 'general' },
} as const;

export function getClientIdentifier(request: Request): string {
    const headers = request.headers;

    const forwardedFor = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    const userAgent = headers.get('user-agent') || 'unknown';

    let ipAddress: string | null = null;

    if (forwardedFor) {
        ipAddress = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
        ipAddress = realIp.trim();
    }

    if (!ipAddress) {
        const sessionCookie = headers.get('cookie') || '';
        const sessionMatch = sessionCookie.match(/sessionId=([^;]+)/);
        ipAddress = sessionMatch ? sessionMatch[1] : 'anonymous';
    }

    const identifierData = `${ipAddress}|${userAgent}`;

    let hash = 2166136261;
    for (let i = 0; i < identifierData.length; i++) {
        hash ^= identifierData.charCodeAt(i);
        // FNV-1a prime step optimized for 32-bit JS bitwise operations
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toString(),
    };
}

export function withRateLimit(
    config: RateLimitConfig,
    handler: (_request: Request, _rateLimitResult: RateLimitResult) => Promise<Response>
): (_request: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, config);

        if (!rateLimitResult.allowed) {
            const { errorResponses } = await import('@/lib/api/apiResponse');
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        return handler(request, rateLimitResult);
    };
}
