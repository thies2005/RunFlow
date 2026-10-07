import { validateEnvironmentVariables, getValidatedEnv } from '../validation';
import { randomBytes } from 'crypto';

describe('Environment Validation', () => {
  const originalEnv = process.env;
  const validEncryptionKey = randomBytes(32).toString('base64');

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.STRAVA_CLIENT_SECRET;
    // Clear credentials to prevent new admin/postgres checks from interfering
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.POSTGRES_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should pass with valid configuration', () => {
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw error in production if required variable is missing', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      delete process.env.NEXTAUTH_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => validateEnvironmentVariables()).toThrow('Environment variable validation failed');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('REGRESSION: should require ENCRYPTION_KEY in production (fail closed, no silent plaintext)', () => {
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      expect(() => validateEnvironmentVariables()).toThrow('Environment variable validation failed');
    });

    it('REGRESSION: should reject the .env.example placeholder key (decodes to 27 bytes) in production', () => {
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.ENCRYPTION_KEY = 'generate-32-byte-base64-key-for-prod';
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      expect(() => validateEnvironmentVariables()).toThrow('Environment variable validation failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('exactly 32 bytes'));
    });

    it('REGRESSION: should reject a key of the wrong decoded length even if the string is long', () => {
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.ENCRYPTION_KEY = randomBytes(16).toString('base64');
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      expect(() => validateEnvironmentVariables()).toThrow('Environment variable validation failed');
    });

    it('should only warn about a missing ENCRYPTION_KEY in development', () => {
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

      expect(() => validateEnvironmentVariables()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should not throw in development if required variable is missing (just logs warning)', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      delete process.env.NEXTAUTH_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => validateEnvironmentVariables()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should detect forbidden patterns', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      process.env.NEXTAUTH_SECRET = 'change-in-production'; // Forbidden pattern
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.ENCRYPTION_KEY = validEncryptionKey;

      expect(() => validateEnvironmentVariables()).toThrow('Environment variable validation failed');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should validate zod schema (url format)', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'not-a-url';
      process.env.ENCRYPTION_KEY = validEncryptionKey;

      expect(() => validateEnvironmentVariables()).toThrow('Environment variable validation failed');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getValidatedEnv', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should return env variables when valid', () => {
      process.env.NEXTAUTH_SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      const env = getValidatedEnv();
      expect(env.NEXTAUTH_SECRET).toBe('super-secret-key-that-is-at-least-32-chars-long');
      expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
      expect(env.ENCRYPTION_KEY).toBe(validEncryptionKey);
    });

    it('should return undefined for missing variables in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      delete process.env.NEXTAUTH_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      const env = getValidatedEnv();
      expect(env.NEXTAUTH_SECRET).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
