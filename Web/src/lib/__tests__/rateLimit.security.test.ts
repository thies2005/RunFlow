
describe('checkRateLimitAsync Security', () => {
    const originalEnv = process.env;
    let mockIncr: jest.Mock;
    let mockExpire: jest.Mock;
    let mockTtl: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };

        mockIncr = jest.fn();
        mockExpire = jest.fn();
        mockTtl = jest.fn();

        jest.mock('@upstash/redis', () => {
            return {
                Redis: jest.fn().mockImplementation(() => ({
                    incr: mockIncr,
                    expire: mockExpire,
                    ttl: mockTtl,
                })),
            };
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('falls back to in-memory when REDIS_URL is missing in PRODUCTION', async () => {
        delete process.env.REDIS_URL;
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

        const { checkRateLimitAsync } = await import('../rateLimit');

        const result = await checkRateLimitAsync('test-id-prod', { limit: 10, windowSeconds: 60 });

        expect(mockIncr).not.toHaveBeenCalled();
        // Updated expectation: The implementation securely fails closed in production
        expect(result.allowed).toBe(false);
    });

    it('fails closed when Redis operations fail (Secure)', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        // Even in development, if Redis is configured but fails, we should fail closed or warn.
        // My implementation fails closed regardless of env if Redis throws.

        const { checkRateLimitAsync } = await import('../rateLimit');

        // Make Redis throw
        mockIncr.mockRejectedValue(new Error('Redis connection failed'));

        const result = await checkRateLimitAsync('test-id-fail', { limit: 10, windowSeconds: 60 });

        expect(mockIncr).toHaveBeenCalled();
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it('falls back to in-memory when REDIS_URL is missing in DEVELOPMENT', async () => {
        delete process.env.REDIS_URL;
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

        const { checkRateLimitAsync } = await import('../rateLimit');

        const result = await checkRateLimitAsync('test-id-dev', { limit: 10, windowSeconds: 60 });

        expect(mockIncr).not.toHaveBeenCalled();
        expect(result.allowed).toBe(true);
    });
});
