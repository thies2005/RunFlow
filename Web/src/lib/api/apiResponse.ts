/**
 * Standardized API Response Utilities
 *
 * Provides consistent error and success response formats across all API endpoints.
 * Maintains backward compatibility with existing error handling while providing
 * enhanced error details for clients.
 */

import { NextResponse } from 'next/server';
import { safeStringify } from '@/lib/json/serializer';
import { logger } from '@/lib/logging/logger';

/**
 * Standard error response structure
 */
export interface ApiError {
    error: string;
    code?: string;
    details?: unknown;
    timestamp: string;
    path?: string;
}

/**
 * Standard success response wrapper (optional, for enhanced responses)
 */
export interface ApiSuccess<T = unknown> {
    data: T;
    timestamp: string;
}

/**
 * Error codes for consistent client handling
 */
/* eslint-disable no-unused-vars */
export enum ErrorCode {
    // Authentication errors (4xx)
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    FORBIDDEN = 'FORBIDDEN',

    // Client errors (4xx)
    BAD_REQUEST = 'BAD_REQUEST',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    RATE_LIMITED = 'RATE_LIMITED',

    // Server errors (5xx)
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
/* eslint-enable no-unused-vars */

/**
 * Map HTTP status codes to error codes
 */
const statusToErrorCode: Record<number, ErrorCode> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    429: ErrorCode.RATE_LIMITED,
    500: ErrorCode.INTERNAL_ERROR,
    503: ErrorCode.SERVICE_UNAVAILABLE,
};

/**
 * Create a standardized error response
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param code - Optional error code (auto-determined from status if not provided)
 * @param details - Additional error details
 * @param path - Request path for debugging
 *
 * @example
 * ```ts
 * return apiError('Activity not found', 404, ErrorCode.NOT_FOUND, { activityId }, '/api/activities/123');
 * // Returns: { error: 'Activity not found', code: 'NOT_FOUND', details: {...}, timestamp: '...', path: '...' }
 * ```
 */
export function apiError(
    message: string,
    status: number = 500,
    code?: ErrorCode,
    details?: unknown,
    path?: string
): NextResponse<ApiError> {
    const errorCode = code || statusToErrorCode[status] || ErrorCode.INTERNAL_ERROR;

    const errorResponse: ApiError = {
        error: message,
        code: errorCode,
        timestamp: new Date().toISOString(),
    };

    if (details !== undefined) {
        errorResponse.details = details;
    }

    if (path !== undefined) {
        errorResponse.path = path;
    }

    const jsonString = safeStringify(errorResponse);
    return new NextResponse(jsonString, {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Pre-configured error responses for common scenarios
 */

export const errorResponses = {
    unauthorized: (message = 'Unauthorized', details?: unknown) =>
        apiError(message, 401, ErrorCode.UNAUTHORIZED, details),

    invalidToken: (details?: unknown) =>
        apiError('Invalid or expired token', 401, ErrorCode.INVALID_TOKEN, details),

    forbidden: (message = 'Forbidden', details?: unknown) =>
        apiError(message, 403, ErrorCode.FORBIDDEN, details),

    notFound: (resource = 'Resource', details?: unknown) =>
        apiError(`${resource} not found`, 404, ErrorCode.NOT_FOUND, details),

    badRequest: (message = 'Bad request', details?: unknown) =>
        apiError(message, 400, ErrorCode.BAD_REQUEST, details),

    validation: (message = 'Validation error', details?: unknown) =>
        apiError(message, 400, ErrorCode.VALIDATION_ERROR, details),

    conflict: (message = 'Resource conflict', details?: unknown) =>
        apiError(message, 409, ErrorCode.CONFLICT, details),

    rateLimited: (retryAfter?: number) =>
        apiError(
            'Too many requests. Please try again later.',
            429,
            ErrorCode.RATE_LIMITED,
            retryAfter !== undefined ? { retryAfter } : undefined
        ),

    internal: (details?: unknown) =>
        apiError('Internal server error', 500, ErrorCode.INTERNAL_ERROR, details),

    serviceUnavailable: (message = 'Service temporarily unavailable') =>
        apiError(message, 503, ErrorCode.SERVICE_UNAVAILABLE),
};

/**
 * Create a standardized success response (optional wrapper)
 *
 * Use this when you want consistent response structure with metadata.
 * For backward compatibility, you can also return plain NextResponse.json().
 *
 * @example
 * ```ts
 * return apiSuccess({ activities: [], total: 0 });
 * // Returns: { data: { activities: [], total: 0 }, timestamp: '...' }
 * ```
 */
export function apiSuccess<T>(
    data: T,
    status: number = 200
): NextResponse<ApiSuccess<T>> {
    const body: ApiSuccess<T> = {
        data,
        timestamp: new Date().toISOString(),
    };

    const jsonString = safeStringify(body);
    return new NextResponse(jsonString, {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Parse error from unknown and return appropriate response
 * Useful for catch blocks to normalize error handling
 */
export function handleApiError(
    error: unknown,
    context?: { path?: string; details?: unknown }
): NextResponse<ApiError> {
    logger.error('API error', { error: error instanceof Error ? error.message : String(error), context });

    if (error instanceof Error) {
        return apiError(
            process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
            500,
            ErrorCode.INTERNAL_ERROR,
            context?.details,
            context?.path
        );
    }

    return errorResponses.internal(context?.details);
}
