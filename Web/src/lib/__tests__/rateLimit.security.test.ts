
describe('checkRateLimitAsync Security', () => {
    const originalEnv = process.env;
    let mockIncr: jest.Mock;
    let mockExpire: jest.Mock;
    let mockTtl: jest.Mock;
    let mockDel: jest.Mock;
    let mockOn: jest.Mock;
    let mockConnect: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };

        mockIncr = jest.fn();
        mockExpire = jest.fn();
        mockTtl = jest.fn();
        mockDel = jest.fn();
        mockOn = jest.fn();
        mockConnect = jest.fn().mockResolvedValue(undefined);

        jest.mock('ioredis', () => {
            return {
                __esModule: true,
                default: jest.fn().mockImplementation(() => ({
                    incr: mockIncr,
                    expire: mockExpire,
                    ttl: mockTtl,
                    del: mockDel,
                    on: mockOn,
                    connect: mockConnect,
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
        expect(result.allowed).toBe(true);
    });

    it('falls back to in-memory when Redis operations fail', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';

        const { checkRateLimitAsync } = await import('../rateLimit');

        // Make Redis throw
        mockIncr.mockRejectedValue(new Error('Redis connection failed'));

        const result = await checkRateLimitAsync('test-id-fail', { limit: 10, windowSeconds: 60 });

        expect(mockIncr).toHaveBeenCalled();
        expect(result.allowed).toBe(true); // Should fall back to in-memory and succeed!
    });

    it('falls back to in-memory when REDIS_URL is missing in DEVELOPMENT', async () => {
        delete process.env.REDIS_URL;
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

        const { checkRateLimitAsync } = await import('../rateLimit');

        const result = await checkRateLimitAsync('test-id-dev', { limit: 10, windowSeconds: 60 });

        expect(mockIncr).not.toHaveBeenCalled();
        expect(result.allowed).toBe(true);
    });

    it('resetRateLimit deletes the Redis key when a client is available', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        mockDel.mockResolvedValue(1);

        const { resetRateLimit } = await import('../rateLimit');

        await resetRateLimit('clientA|victim@example.com', 'login');

        expect(mockDel).toHaveBeenCalledWith('ratelimit:login:clientA|victim@example.com');
    });

    it('resetRateLimit swallows Redis failures and still clears the in-memory bucket', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        mockDel.mockRejectedValue(new Error('Redis gone'));

        const { resetRateLimit, checkRateLimit } = await import('../rateLimit');

        const identifier = 'clientB|victim@example.com';
        checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'login' });
        expect(checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'login' }).allowed).toBe(false);

        await expect(resetRateLimit(identifier, 'login')).resolves.toBeUndefined();

        expect(checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'login' }).allowed).toBe(true);
    });
});
