import { LRUCache } from 'lru-cache';
import { MINUTE_MS } from '@/lib/constants';
import { getRedisClient, type RedisClient } from '@/lib/redis';

type RateLimitRecord = {
    timestamps: number[];
};

const rateLimitCache = new LRUCache<string, RateLimitRecord>({
    max: 10000,
    ttl: 15 * MINUTE_MS,
});

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
    client: RedisClient,
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

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
    } catch {
        return checkRateLimitInMemory(key, limit, windowSeconds);
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

    const client = await getRedisClient();
    if (client) {
        return checkRateLimitRedis(client, key, limit, windowSeconds);
    }

    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
        console.warn('Rate Limit: Redis not available in production. Falling back to in-memory (acceptable for long-running Docker containers).');
    }

    return checkRateLimitInMemory(key, limit, windowSeconds);
}

/**
 * Clear the rate-limit state for an identifier (e.g. the failed-login counter
 * for a client+email pair after a successful verification).
 *
 * Best effort: if the Redis delete fails the counter simply keeps its natural
 * window expiry.
 */
export async function resetRateLimit(identifier: string, prefix = ''): Promise<void> {
    const key = `ratelimit:${prefix}:${identifier}`;
    rateLimitCache.delete(key);
    try {
        const client = await getRedisClient();
        if (client) {
            await client.del(key);
        }
    } catch {
        // Best effort only - the window expires on its own.
    }
}

export const RATE_LIMITS = {
    sync: { limit: 10, windowSeconds: 60, prefix: 'sync' },
    activities: { limit: 30, windowSeconds: 60, prefix: 'activities' },
    settings: { limit: 10, windowSeconds: 60, prefix: 'settings' },
    webhooks: { limit: 100, windowSeconds: 60, prefix: 'webhooks' },
    general: { limit: 60, windowSeconds: 60, prefix: 'general' },
} as const;

/**
 * Extract a trustworthy client IP from a forwarded-for header.
 *
 * Proxies that we trust APPEND the address they received the request from to
 * X-Forwarded-For, so the rightmost `trustedHops` entries were written by our
 * own infrastructure while everything to the left of them is client-supplied
 * and freely spoofable. The client's real IP therefore sits at
 * `parts.length - trustedHops`.
 *
 * If the header carries fewer entries than the trusted hop count, it cannot
 * have passed through the expected proxy chain and is not trusted at all.
 * A hop count of 0 means "no trusted proxy" and disables the header entirely.
 */
function extractTrustedForwardedIp(forwardedFor: string | null, trustedHops: number): string | null {
    if (trustedHops <= 0 || !forwardedFor) {
        return null;
    }
    const parts = forwardedFor.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length < trustedHops) {
        return null;
    }
    return parts[parts.length - trustedHops] || null;
}

function getTrustedProxyHops(): number {
    const raw = process.env.TRUSTED_PROXY_HOPS;
    if (raw === undefined || raw === '') {
        // Default: one appending proxy in front of the app (the shipped
        // deployment runs behind a single cloudflared tunnel hop).
        return 1;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 1;
    }
    return parsed;
}

export function getClientIdentifier(request: Request): string {
    const headers = request.headers;

    let ipAddress: string | null = null;

    // 1. Explicitly trusted platform/proxy header (e.g. Cf-Connecting-Ip set
    //    by Cloudflare/cloudflared). Only configure this when the app is not
    //    reachable except through that proxy.
    const trustedHeaderName = process.env.TRUSTED_CLIENT_IP_HEADER?.trim();
    if (trustedHeaderName) {
        ipAddress = headers.get(trustedHeaderName.toLowerCase())?.trim() || null;
    }

    // 2. x-vercel-forwarded-for is only meaningful on Vercel, where the edge
    //    overwrites it. Everywhere else it is a plain client-settable header
    //    and must be ignored.
    if (!ipAddress && process.env.VERCEL) {
        ipAddress = extractTrustedForwardedIp(headers.get('x-vercel-forwarded-for'), 1);
    }

    // 3. X-Forwarded-For: use the entry appended by our trusted proxies (see
    //    extractTrustedForwardedIp). The FIRST entry is client-controlled and
    //    must never be used for rate-limit identity.
    if (!ipAddress) {
        ipAddress = extractTrustedForwardedIp(headers.get('x-forwarded-for'), getTrustedProxyHops());
    }

    // 4. x-real-ip is only trustworthy when set by a trusted proxy (Vercel
    //    sets it; otherwise configure TRUSTED_CLIENT_IP_HEADER=X-Real-Ip).
    if (!ipAddress && process.env.VERCEL) {
        ipAddress = headers.get('x-real-ip')?.trim() || null;
    }

    if (!ipAddress) {
        const sessionCookie = headers.get('cookie') || '';
        const sessionMatch = sessionCookie.match(/sessionId=([^;]+)/);
        ipAddress = sessionMatch ? sessionMatch[1] : 'anonymous';
    }

    // Hash the IP alone. The User-Agent is client-controlled and previously
    // let a single client split its own bucket by rotating the header.
    let hash = 2166136261;
    for (let i = 0; i < ipAddress.length; i++) {
        hash ^= ipAddress.charCodeAt(i);
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
