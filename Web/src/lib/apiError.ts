/**
 * API Error Handling Utilities
 * 
 * Provides standardized error types and handling for API routes.
 */

import { NextResponse } from 'next/server';

/**
 * Standardized error codes for API responses
 */
export enum ApiErrorCode {
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMITED = 'RATE_LIMITED',
    CONFLICT = 'CONFLICT',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Error response structure
 */
interface ApiErrorResponse {
    error: ApiErrorCode;
    message: string;
    details?: unknown;
}

/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: ApiErrorCode,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        // Maintain proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }

    /**
     * Convert to NextResponse
     */
    toResponse(): NextResponse<ApiErrorResponse> {
        const payload: ApiErrorResponse = {
            error: this.code,
            message: this.message,
        };

        if (this.details !== undefined && this.details !== null) {
            payload.details = this.details;
        }

        return NextResponse.json(payload, { status: this.statusCode });
    }

    // Factory methods for common errors
    static unauthorized(message = 'Authentication required'): ApiError {
        return new ApiError(401, ApiErrorCode.UNAUTHORIZED, message);
    }

    static forbidden(message = 'Access denied'): ApiError {
        return new ApiError(403, ApiErrorCode.FORBIDDEN, message);
    }

    static notFound(resource = 'Resource'): ApiError {
        return new ApiError(404, ApiErrorCode.NOT_FOUND, `${resource} not found`);
    }

    static validation(message: string, details?: unknown): ApiError {
        return new ApiError(400, ApiErrorCode.VALIDATION_ERROR, message, details);
    }

    static rateLimited(message = 'Too many requests'): ApiError {
        return new ApiError(429, ApiErrorCode.RATE_LIMITED, message);
    }

    static conflict(message: string): ApiError {
        return new ApiError(409, ApiErrorCode.CONFLICT, message);
    }

    static internal(message = 'An unexpected error occurred'): ApiError {
        return new ApiError(500, ApiErrorCode.INTERNAL_ERROR, message);
    }

    static database(message = 'Database operation failed'): ApiError {
        return new ApiError(500, ApiErrorCode.DATABASE_ERROR, message);
    }

    static externalService(service: string, message?: string): ApiError {
        return new ApiError(
            502,
            ApiErrorCode.EXTERNAL_SERVICE_ERROR,
            message || `${service} service unavailable`
        );
    }
}

/**
 * Handle and convert errors to appropriate API responses
 * 
 * @param error - The caught error
 * @param logContext - Additional context for logging
 * @returns NextResponse with appropriate status and error message
 */
export function handleApiError(
    error: unknown,
    logContext?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
    // Log the error with context
    console.error('[API Error]', {
        ...logContext,
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
    });

    // Handle our custom ApiError
    if (error instanceof ApiError) {
        return error.toResponse();
    }

    // Handle standard Error
    if (error instanceof Error) {
        // Don't expose internal error messages in production
        const message = process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message;

        return NextResponse.json(
            { error: ApiErrorCode.INTERNAL_ERROR, message },
            { status: 500 }
        );
    }

    // Handle unknown error types
    return NextResponse.json(
        { error: ApiErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred' },
        { status: 500 }
    );
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}
