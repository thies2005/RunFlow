/**
 * Simple in-memory rate limiter for API routes
 * No external dependencies required - works for single-instance deployments
 * 
 * Uses a sliding window algorithm with automatic cleanup
 */

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

// In-memory store for rate limit records
const rateLimitStore = new Map<string, RateLimitRecord>();

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
};

/**
 * Check if a request should be rate limited
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
    const key = `${prefix}:${identifier}`;
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
