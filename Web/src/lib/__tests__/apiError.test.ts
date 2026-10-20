/**
 * Tests for API Error Handling Utilities
 */

import { ApiError, ApiErrorCode, handleApiError } from '../apiError';
import type { RateLimitResult } from '../rateLimit';

interface MockApiResponseBody {
    error?: ApiErrorCode;
    message?: string;
    details?: unknown;
}

interface MockApiResponse {
    body: MockApiResponseBody;
    status: number;
    headers?: Record<string, string>;
}

// Mock NextResponse.json
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, options) => ({
            body,
            status: options?.status || 200,
            headers: options?.headers,
        })),
    },
}));

describe('ApiError', () => {
    describe('constructor', () => {
        it('should create an error with correct properties', () => {
            const error = new ApiError(400, ApiErrorCode.VALIDATION_ERROR, 'Invalid input', { field: 'email' });

            expect(error.statusCode).toBe(400);
            expect(error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
            expect(error.message).toBe('Invalid input');
            expect(error.details).toEqual({ field: 'email' });
            expect(error.name).toBe('ApiError');
        });
    });

    describe('factory methods', () => {
        it('unauthorized() creates 401 error', () => {
            const error = ApiError.unauthorized();
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe(ApiErrorCode.UNAUTHORIZED);
        });

        it('forbidden() creates 403 error', () => {
            const error = ApiError.forbidden('Custom message');
            expect(error.statusCode).toBe(403);
            expect(error.message).toBe('Custom message');
        });

        it('notFound() creates 404 error with resource name', () => {
            const error = ApiError.notFound('Activity');
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('Activity not found');
        });

        it('validation() creates 400 error with details', () => {
            const error = ApiError.validation('Invalid email', { field: 'email' });
            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual({ field: 'email' });
        });

        it('payloadTooLarge() creates 413 error', () => {
            const error = ApiError.payloadTooLarge();
            expect(error.statusCode).toBe(413);
            expect(error.code).toBe(ApiErrorCode.PAYLOAD_TOO_LARGE);
        });

        it('payloadTooLarge() accepts a custom message and details', () => {
            const error = ApiError.payloadTooLarge('Upload exceeds the 5MB total size limit', { bytes: 6 });
            expect(error.statusCode).toBe(413);
            expect(error.code).toBe(ApiErrorCode.PAYLOAD_TOO_LARGE);
            expect(error.message).toBe('Upload exceeds the 5MB total size limit');
            expect(error.details).toEqual({ bytes: 6 });
        });

        it('unprocessable() creates 422 error', () => {
            const error = ApiError.unprocessable();
            expect(error.statusCode).toBe(422);
            expect(error.code).toBe(ApiErrorCode.UNPROCESSABLE);
        });

        it('unprocessable() accepts a custom message and details', () => {
            const error = ApiError.unprocessable('Failed to parse 1 file(s)', { rejectedFiles: [] });
            expect(error.statusCode).toBe(422);
            expect(error.code).toBe(ApiErrorCode.UNPROCESSABLE);
            expect(error.message).toBe('Failed to parse 1 file(s)');
            expect(error.details).toEqual({ rejectedFiles: [] });
        });

        it('rateLimited() creates 429 error', () => {
            const error = ApiError.rateLimited();
            expect(error.statusCode).toBe(429);
            expect(error.code).toBe(ApiErrorCode.RATE_LIMITED);
        });

        it('rateLimited(result) carries the rate-limit headers on toResponse()', () => {
            const result: RateLimitResult = {
                allowed: false,
                remaining: 0,
                resetAt: 1900000000,
                limit: 10,
                retryAfter: 42,
            };
            const error = ApiError.rateLimited('Too many requests. Please try again later.', result);
            expect(error.statusCode).toBe(429);
            expect(error.headers).toEqual({
                'X-RateLimit-Limit': '10',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': '1900000000',
            });

            const response = error.toResponse() as unknown as MockApiResponse;
            expect(response.headers).toEqual({
                'X-RateLimit-Limit': '10',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': '1900000000',
            });
        });

        it('rateLimited() without a result carries no headers', () => {
            const error = ApiError.rateLimited();
            expect(error.headers).toBeUndefined();

            const response = error.toResponse() as unknown as MockApiResponse;
            expect(response.headers).toBeUndefined();
        });

        it('internal() creates 500 error', () => {
            const error = ApiError.internal();
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe(ApiErrorCode.INTERNAL_ERROR);
        });

        it('database() creates 500 error with DATABASE_ERROR code', () => {
            const error = ApiError.database();
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe(ApiErrorCode.DATABASE_ERROR);
        });

        it('externalService() creates 502 error', () => {
            const error = ApiError.externalService('Strava');
            expect(error.statusCode).toBe(502);
            expect(error.message).toBe('Strava service unavailable');
        });
    });

    describe('toResponse()', () => {
        it('should convert error to NextResponse', () => {
            const error = ApiError.validation('Bad request', { field: 'name' });
            const response = error.toResponse();

            expect(response.body).toEqual({
                error: ApiErrorCode.VALIDATION_ERROR,
                message: 'Bad request',
                details: { field: 'name' },
            });
            expect(response.status).toBe(400);
        });

        it('should omit details if not provided', () => {
            const error = ApiError.unauthorized();
            const response = error.toResponse();

            expect((response.body as MockApiResponseBody).details).toBeUndefined();
        });
    });
});

describe('handleApiError', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });

    it('should handle ApiError correctly', () => {
        const error = ApiError.notFound('User');
        const response = handleApiError(error);

        expect((response.body as MockApiResponseBody).error).toBe(ApiErrorCode.NOT_FOUND);
        expect((response.body as MockApiResponseBody).message).toBe('User not found');
    });

    it('should handle standard Error in development', () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
        const error = new Error('Something went wrong');
        const response = handleApiError(error);

        expect((response.body as MockApiResponseBody).error).toBe(ApiErrorCode.INTERNAL_ERROR);
        expect((response.body as MockApiResponseBody).message).toBe('Something went wrong');
    });

    it('should hide error message in production', () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
        const error = new Error('Sensitive database error');
        const response = handleApiError(error);

        expect((response.body as MockApiResponseBody).message).toBe('An unexpected error occurred');
    });

    it('should handle unknown error types', () => {
        const response = handleApiError('string error');

        expect((response.body as MockApiResponseBody).error).toBe(ApiErrorCode.INTERNAL_ERROR);
        expect(response.status).toBe(500);
    });
});
