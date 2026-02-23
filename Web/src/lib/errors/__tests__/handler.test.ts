/**
 * @jest-environment node
 */
import { handleError } from '../handler';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logging/logger';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status || 200,
    })),
  },
}));

// Mock logger
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('handleError', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  describe('Prisma Errors', () => {
    it('should handle P2002 (Unique constraint violation) with 409', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.10.0' }
      );

      const response = handleError(error);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'Duplicate entry' });
      expect(logger.error).toHaveBeenCalledWith('Error', { error: 'Unique constraint failed' });
    });

    it('should handle P2025 (Record not found) with 404', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        { code: 'P2025', clientVersion: '5.10.0' }
      );

      const response = handleError(error);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Resource not found' });
    });

    it('should handle other Prisma errors with 500', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Something went wrong',
        { code: 'P1000', clientVersion: '5.10.0' }
      );

      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error' });
    });
  });

  describe('Syntax Errors', () => {
    it('should handle SyntaxError with 400', () => {
      const error = new SyntaxError('Unexpected token');

      const response = handleError(error);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid request format' });
      expect(logger.error).toHaveBeenCalledWith('Error', { error: 'Unexpected token' });
    });
  });

  describe('Generic Errors', () => {
    it('should return detailed error in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      const error = new Error('Something crashed');

      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    it('should return "Internal server error" in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      const error = new Error('Sensitive info');

      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('Unknown Errors', () => {
    it('should handle non-Error objects in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      const error = 'String error';

      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      expect(logger.error).toHaveBeenCalledWith('Error', { error: 'String error' });
    });

    it('should handle non-Error objects in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      const error = { foo: 'bar' };

      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      expect(logger.error).toHaveBeenCalledWith('Error', { error: '[object Object]' });
    });
  });
});
