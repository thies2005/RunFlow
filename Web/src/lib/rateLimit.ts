/**
 * Rate Limiter with Optional Redis Support
 *
 * Supports two modes:
 * 1. In-memory: Works for single-instance deployments (default)
 * 2. Redis: For distributed/serverless environments (when REDIS_URL is set)
 *
 * Uses a fixed window algorithm with automatic cleanup
 */

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

// Minimal Redis interface for our usage
interface RedisClient {
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
}

// In-memory store for rate limit records (fallback when Redis unavailable)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Redis client (lazy loaded when REDIS_URL is configured)
let redisClient: RedisClient | null = null;
let redisInitialized = false;

/**
 * Initialize Redis client if REDIS_URL is configured
 * Returns true if Redis is available, false otherwise
 *
 * NOTE: This uses dynamic require to prevent webpack from bundling @upstash/redis.
 * The package is truly optional - Redis will only be used if:
 * 1. REDIS_URL environment variable is set
 * 2. @upstash/redis package is installed
 */
async function initRedis(): Promise<boolean> {
    if (redisInitialized) return !!redisClient;

    redisInitialized = true;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.log('[RateLimit] REDIS_URL not configured, using in-memory store');
        return false;
    }

    try {
        // Using Function constructor instead of eval() for better security
        // This makes the dependency truly optional at build time
        const requireFn = new Function('return require')() as NodeRequire;
        const { Redis } = requireFn('@upstash/redis') as { Redis: new (options: { url: string; token: string }) => RedisClient };
        redisClient = new Redis({ url: redisUrl, token: process.env.REDIS_TOKEN || '' });
        console.log('[RateLimit] Redis client initialized');
        return true;
    } catch (error) {
        console.warn('[RateLimit] Failed to initialize Redis, falling back to in-memory:', error);
        return false;
    }
}

// Cleanup interval (every 5 minutes, remove expired entries)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
    if (cleanupTimer) return;

    cleanupTimer = setInterval(() => {
        const now = Date.now();
        // Use Array.from for TypeScript compatibility with older targets
        Array.from(rateLimitStore.entries()).forEach(([key, record]) => {
            if (record.resetAt < now) {
                rateLimitStore.delete(key);
            }
        });
    }, CLEANUP_INTERVAL_MS);

    // Don't prevent Node from exiting
    if (cleanupTimer.unref) {
        cleanupTimer.unref();
    }
}

// Start cleanup on module load
startCleanup();

export type RateLimitConfig = {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Window size in seconds */
    windowSeconds: number;
    /** Optional prefix for the key (e.g., route name) */
    prefix?: string;
};

export type RateLimitResult = {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Remaining requests in this window */
    remaining: number;
    /** Unix timestamp (seconds) when the limit resets */
    resetAt: number;
    /** Total limit for this window */
    limit: number;
    /** Optional retry after seconds (implied from resetAt but useful for convenience) */
    retryAfter?: number;
};

/**
 * Check rate limit using Redis (distributed)
 */
async function checkRateLimitRedis(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Redis client should be initialized when calling this function
    const client = redisClient;
    if (!client) {
        throw new Error('Redis client not initialized');
    }

    try {
        // Use Redis atomic increment with expiry
        const currentCount = await client.incr(key);

        // Set expiry on first request
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
        console.error('[RateLimit] Redis error, falling back to in-memory:', error);
        // Fall back to in-memory on Redis failure
        return checkRateLimitInMemory(key, limit, windowSeconds);
    }
}

/**
 * Check rate limit using in-memory store (single instance)
 */
function checkRateLimitInMemory(
    key: string,
    limit: number,
    windowSeconds: number
): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const existing = rateLimitStore.get(key);

    // If no record or window expired, start fresh
    if (!existing || existing.resetAt < now) {
        const resetAt = now + windowMs;
        rateLimitStore.set(key, { count: 1, resetAt });
        return {
            allowed: true,
            remaining: limit - 1,
            resetAt: Math.floor(resetAt / 1000),
            limit,
        };
    }

    // Within window, check limit
    if (existing.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: Math.floor(existing.resetAt / 1000),
            limit,
            retryAfter: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    // Increment and allow
    existing.count++;
    return {
        allowed: true,
        remaining: limit - existing.count,
        resetAt: Math.floor(existing.resetAt / 1000),
        limit,
    };
}

/**
 * Check if a request should be rate limited
 * 
 * Uses Redis if configured (REDIS_URL), otherwise uses in-memory store.
 * Automatically falls back to in-memory if Redis fails.
 * 
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const { limit, windowSeconds, prefix = '' } = config;
    const key = `ratelimit:${prefix}:${identifier}`;

    // For sync usage, always use in-memory (Redis is async)
    // The checkRateLimitAsync can be used for async contexts
    return checkRateLimitInMemory(key, limit, windowSeconds);
}

/**
 * Async version of checkRateLimit that supports Redis
 * Use this in async contexts where Redis is preferred
 */
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

    return checkRateLimitInMemory(key, limit, windowSeconds);
}

/**
 * Rate limit configurations for different API endpoints
 */
export const RATE_LIMITS = {
    // Sync is expensive - limit to 5 per minute
    sync: { limit: 5, windowSeconds: 60, prefix: 'sync' },

    // Activities CRUD - moderate limit
    activities: { limit: 30, windowSeconds: 60, prefix: 'activities' },

    // Settings updates - prevent rapid changes
    settings: { limit: 10, windowSeconds: 60, prefix: 'settings' },

    // Webhooks from Strava - generous limit (Strava may batch events)
    webhooks: { limit: 100, windowSeconds: 60, prefix: 'webhooks' },

    // General API calls
    general: { limit: 60, windowSeconds: 60, prefix: 'general' },
} as const;

/**
 * Helper to get client identifier from request headers
 * Uses X-Forwarded-For for proxied requests, falls back to a placeholder
 */
export function getClientIdentifier(request: Request): string {
    // Try X-Forwarded-For first (for proxied requests)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // Take the first IP in the chain (original client)
        return forwarded.split(',')[0].trim();
    }

    // Try X-Real-IP
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback - in serverless/edge environments, we may not have direct IP access
    // Use a hash of user-agent + accept-language as a weak identifier
    const ua = request.headers.get('user-agent') || 'unknown';
    const lang = request.headers.get('accept-language') || 'unknown';
    return `anon:${simpleHash(ua + lang)}`;
}

/**
 * Simple string hash for anonymous client identification
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toString(),
    };
}

/**
 * Higher-order function for rate-limited API handlers
 * 
 * Reduces boilerplate by handling rate limit checking automatically.
 * 
 * @example
 * ```ts
 * export const GET = withRateLimit(RATE_LIMITS.general, async (request, rateLimitResult) => {
 *     // Your handler logic here
 *     return NextResponse.json({ data }, { headers: rateLimitHeaders(rateLimitResult) });
 * });
 * ```
 */
export function withRateLimit<T>(
    config: RateLimitConfig,
    handler: (request: Request, rateLimitResult: RateLimitResult) => Promise<Response>
): (request: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, config);

        if (!rateLimitResult.allowed) {
            // Import errorResponses lazily to avoid circular dependencies
            const { errorResponses } = await import('@/lib/api/apiResponse');
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        return handler(request, rateLimitResult);
    };
}
