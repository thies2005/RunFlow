/**
 * API Response Utilities
 * 
 * Provides helpers for creating API responses with proper caching headers.
 */

import { NextResponse } from 'next/server';
import { safeStringify } from '@/lib/json/serializer';

interface CacheOptions {
    /** Max age in seconds for the cache. Default: 300 (5 minutes) */
    maxAge?: number;
    /** Stale-while-revalidate time in seconds. Default: 60 */
    staleWhileRevalidate?: number;
    /** Whether this is private (user-specific) data. Default: true */
    private?: boolean;
}

/**
 * Create a JSON response with appropriate caching headers
 * 
 * @param data - The data to include in the response
 * @param options - Caching options
 * @param status - HTTP status code (default: 200)
 */
export function cachedResponse<T>(
    data: T,
    options: CacheOptions = {},
    status: number = 200
): NextResponse<T> {
    const {
        maxAge = 300,
        staleWhileRevalidate = 60,
        private: isPrivate = true,
    } = options;

    const visibility = isPrivate ? 'private' : 'public';
    const jsonString = safeStringify(data);

    return new NextResponse(jsonString, {
        status,
        headers: {
            'Cache-Control': `${visibility}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
            'Vary': 'Accept-Encoding, Authorization',
            'Content-Type': 'application/json',
        },
    });
}

/**
 * Create a JSON response that should not be cached
 * Use for sensitive data or real-time endpoints
 */
export function noCacheResponse<T>(data: T, status: number = 200): NextResponse<T> {
    const jsonString = safeStringify(data);
    return new NextResponse(jsonString, {
        status,
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Content-Type': 'application/json',
        },
    });
}

/**
 * Create an error response (never cached)
 */
export function errorResponse(
    message: string,
    status: number = 500,
    details?: unknown
): NextResponse<{ error: string; details?: unknown }> {
    const body = details ? { error: message, details } : { error: message };
    return noCacheResponse(body, status);
}
