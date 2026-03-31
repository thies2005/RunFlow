/**
 * Tests for Configuration Validation
 * 
 * Tests the validateConfig function which validates environment configuration
 * to prevent running with insecure default values.
 */

describe('config validation', () => {
    const originalEnv = process.env;
    const setNodeEnv = (value: string | undefined) => {
        Object.defineProperty(process.env, 'NODE_ENV', {
            value,
            configurable: true,
            enumerable: true,
            writable: true,
        });
    };

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('validateConfig', () => {
        it('should not throw in development mode', () => {
            setNodeEnv('development');
            delete process.env.NEXTAUTH_SECRET;

            const { validateConfig } = require('../config');
            expect(() => validateConfig()).not.toThrow();
        });

        it('should throw in production with missing required secret', () => {
            setNodeEnv('production');
            delete process.env.NEXTAUTH_SECRET;
            process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';

            const { validateConfig } = require('../config');
            expect(() => validateConfig()).toThrow(/Configuration validation failed/);
        });

        it('should detect forbidden pattern in secret value', () => {
            setNodeEnv('production');
            process.env.NEXTAUTH_SECRET = 'development-secret-not-secure';
            process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';

            const { validateConfig } = require('../config');
            expect(() => validateConfig()).toThrow(/Configuration validation failed/);
        });
    });

    describe('getRequiredEnv', () => {
        it('should return value when env var exists', () => {
            process.env.TEST_ENV_VAR = 'my_value';
            const { getRequiredEnv } = require('../config');
            expect(getRequiredEnv('TEST_ENV_VAR')).toBe('my_value');
        });

        it('should throw in production for missing env var', () => {
            setNodeEnv('production');
            delete process.env.NONEXISTENT;

            const { getRequiredEnv } = require('../config');
            expect(() => getRequiredEnv('NONEXISTENT')).toThrow(/is not set/);
        });

        it('should return empty string in development for missing env var', () => {
            setNodeEnv('development');
            delete process.env.NONEXISTENT;

            const { getRequiredEnv } = require('../config');
            expect(getRequiredEnv('NONEXISTENT')).toBe('');
        });
    });
});
