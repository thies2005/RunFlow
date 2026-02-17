import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';
import { MINUTE_MS } from '@/lib/constants';

interface AdminRateLimitRecord {
    timestamps: number[];
    violations: number[];
}

const adminCache = new LRUCache<string, AdminRateLimitRecord>({
    max: 1000,
    ttl: 60 * MINUTE_MS,
});

const VIOLATION_THRESHOLD = 5;
const BLOCK_DURATION = 15 * MINUTE_MS;

const ADMIN_RATE_LIMITS = {
    read: { limit: 60, window: 60000 },
    write: { limit: 10, window: 60000 },
    sensitive: { limit: 3, window: 60000 },
} as const;

type AdminOperation = keyof typeof ADMIN_RATE_LIMITS;

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

function cleanOldViolations(violations: number[], now: number, windowMs: number): number[] {
    const cutoff = now - windowMs;
    let left = 0;
    let right = violations.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (violations[mid] <= cutoff) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return violations.slice(left);
}

function getClientIP(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    if (realIp) {
        return realIp.trim();
    }

    return 'unknown';
}

function getCacheKey(ip: string, operation: AdminOperation): string {
    return `admin:${operation}:${ip}`;
}

function getViolationKey(ip: string): string {
    return `admin:violations:${ip}`;
}

function isIPBlocked(ip: string): boolean {
    const record = adminCache.get(getViolationKey(ip));
    if (!record) {
        return false;
    }

    const now = Date.now();
    const cleanViolations = cleanOldViolations(record.violations, now, BLOCK_DURATION);
    return cleanViolations.length >= VIOLATION_THRESHOLD;
}

function recordViolation(ip: string): void {
    const key = getViolationKey(ip);
    const now = Date.now();
    const record = adminCache.get(key) || { timestamps: [], violations: [] };

    const cleanViolations = cleanOldViolations(record.violations, now, BLOCK_DURATION);
    cleanViolations.push(now);

    adminCache.set(key, {
        timestamps: record.timestamps,
        violations: cleanViolations,
    });
}

export interface AdminRateLimitResult {
    success: boolean;
    remaining: number;
    reset: number;
    limit: number;
    retryAfter?: number;
}

export async function adminRateLimit(
    request: Request,
    operation: AdminOperation
): Promise<{ success: boolean; result?: AdminRateLimitResult; error?: NextResponse }> {
    const ip = getClientIP(request);

    if (isIPBlocked(ip)) {
        const now = Date.now();
        const record = adminCache.get(getViolationKey(ip));
        const oldestViolation = record?.violations?.[0] || now;
        const blockEnd = oldestViolation + BLOCK_DURATION;
        const retryAfter = Math.max(0, Math.ceil((blockEnd - now) / 1000));

        return {
            success: false,
            error: new NextResponse(
                JSON.stringify({ error: 'Too many violations - IP temporarily blocked' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': '0',
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.floor(blockEnd / 1000)),
                    },
                }
            ),
        };
    }

    const config = ADMIN_RATE_LIMITS[operation];
    const key = getCacheKey(ip, operation);
    const now = Date.now();

    const record = adminCache.get(key) || { timestamps: [], violations: [] };
    const cleanedTimestamps = cleanOldTimestamps(record.timestamps, now, config.window);
    const isLimitExceeded = cleanedTimestamps.length >= config.limit;

    if (!isLimitExceeded) {
        cleanedTimestamps.push(now);
    }

    adminCache.set(key, {
        timestamps: cleanedTimestamps,
        violations: record.violations,
    });

    const remaining = Math.max(0, config.limit - cleanedTimestamps.length);
    const oldestTimestamp = cleanedTimestamps[0] || now;
    const reset = Math.floor((oldestTimestamp + config.window) / 1000);

    if (isLimitExceeded) {
        recordViolation(ip);
        const retryAfter = Math.max(0, Math.ceil((oldestTimestamp + config.window - now) / 1000));

        return {
            success: false,
            error: new NextResponse(
                JSON.stringify({ error: 'Too many requests' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': String(config.limit),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(reset),
                    },
                }
            ),
        };
    }

    return {
        success: true,
        result: {
            success: true,
            remaining,
            reset,
            limit: config.limit,
        },
    };
}

export function getRateLimitHeaders(
    operation: AdminOperation,
    remaining: number,
    reset: number
): Headers {
    const headers = new Headers();
    const limit = ADMIN_RATE_LIMITS[operation].limit;

    headers.set('X-RateLimit-Limit', String(limit));
    headers.set('X-RateLimit-Remaining', String(remaining));
    headers.set('X-RateLimit-Reset', String(reset));

    return headers;
}

export function applyRateLimitHeaders(
    response: NextResponse,
    operation: AdminOperation,
    remaining: number,
    reset: number
): NextResponse {
    const headers = getRateLimitHeaders(operation, remaining, reset);
    headers.forEach((value, key) => {
        response.headers.set(key, value);
    });
    return response;
}
