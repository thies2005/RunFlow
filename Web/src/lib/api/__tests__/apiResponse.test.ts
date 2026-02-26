/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server';
import {
  apiError,
  apiSuccess,
  errorResponses,
  handleApiError,
  ErrorCode,
  ApiError
} from '../apiResponse';
import { logger } from '@/lib/logging/logger';

// Mock logger
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock process.env
const originalEnv = process.env;

describe('API Response Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('apiError', () => {
    it('should create a standard error response with default values', async () => {
      const response = apiError('Something went wrong');
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(body).toEqual(expect.objectContaining({
        error: 'Something went wrong',
        code: ErrorCode.INTERNAL_ERROR,
      }));
      expect(body.timestamp).toBeDefined();
    });

    it('should create an error response with custom status and code', async () => {
      const response = apiError('Not Found', 404, ErrorCode.NOT_FOUND);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual(expect.objectContaining({
        error: 'Not Found',
        code: ErrorCode.NOT_FOUND,
      }));
    });

    it('should include details and path when provided', async () => {
      const details = { field: 'email', reason: 'invalid' };
      const path = '/api/test';
      const response = apiError('Validation Error', 400, ErrorCode.VALIDATION_ERROR, details, path);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual(expect.objectContaining({
        error: 'Validation Error',
        code: ErrorCode.VALIDATION_ERROR,
        details,
        path,
      }));
    });

    it('should correctly infer error code from status if not provided', async () => {
      const response = apiError('Unauthorized', 401);
      const body = await response.json();

      expect(body.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle BigInt in details via safeStringify', async () => {
      const details = { id: BigInt(123) };
      const response = apiError('BigInt Error', 500, ErrorCode.INTERNAL_ERROR, details);
      const body = await response.json();

      // safeStringify converts BigInt to string
      expect(body.details).toEqual({ id: '123' });
    });
  });

  describe('apiSuccess', () => {
    it('should create a success response with data', async () => {
      const data = { message: 'Hello' };
      const response = apiSuccess(data);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(body).toEqual(expect.objectContaining({
        data,
      }));
      expect(body.timestamp).toBeDefined();
    });

    it('should create a success response with custom status', async () => {
      const data = { created: true };
      const response = apiSuccess(data, 201);

      expect(response.status).toBe(201);
    });

    it('should handle BigInt in data', async () => {
      const data = { count: BigInt(9007199254740991) };
      const response = apiSuccess(data);
      const body = await response.json();

      expect(body.data).toEqual({ count: '9007199254740991' });
    });
  });

  describe('errorResponses helpers', () => {
    it('should create unauthorized response', async () => {
      const response = errorResponses.unauthorized();
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(body.error).toBe('Unauthorized');
    });

    it('should create notFound response', async () => {
      const response = errorResponses.notFound('User');
      const body = await response.json();
      expect(response.status).toBe(404);
      expect(body.code).toBe(ErrorCode.NOT_FOUND);
      expect(body.error).toBe('User not found');
    });

    it('should create badRequest response', async () => {
      const response = errorResponses.badRequest('Invalid input');
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe(ErrorCode.BAD_REQUEST);
      expect(body.error).toBe('Invalid input');
    });

    it('should create rateLimited response with retry header', async () => {
      const response = errorResponses.rateLimited(60);
      const body = await response.json();
      expect(response.status).toBe(429);
      expect(body.code).toBe(ErrorCode.RATE_LIMITED);
      expect(body.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('handleApiError', () => {
    it('should handle Error objects in development', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      const response = handleApiError(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(body.error).toBe('Test error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle Error objects in production', async () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Secret error');
      const response = handleApiError(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('An error occurred'); // Generic message
    });

    it('should handle non-Error objects', async () => {
      const response = handleApiError('Unknown string error');
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });

    it('should pass context details', async () => {
      const error = new Error('Context error');
      const context = { path: '/api/fail', details: { foo: 'bar' } };

      // Force development to see the error message
      process.env.NODE_ENV = 'development';

      const response = handleApiError(error, context);
      const body = await response.json();

      expect(body.path).toBe('/api/fail');
      expect(body.details).toEqual({ foo: 'bar' });
    });
  });
});
