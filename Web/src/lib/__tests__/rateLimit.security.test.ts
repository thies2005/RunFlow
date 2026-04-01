
describe('checkRateLimitAsync Security', () => {
    const originalEnv = process.env;
    let mockIncr: jest.Mock;
    let mockExpire: jest.Mock;
    let mockTtl: jest.Mock;
    let mockOn: jest.Mock;
    let mockConnect: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };

        mockIncr = jest.fn();
        mockExpire = jest.fn();
        mockTtl = jest.fn();
        mockOn = jest.fn();
        mockConnect = jest.fn().mockResolvedValue(undefined);

        jest.mock('ioredis', () => {
            return {
                __esModule: true,
                default: jest.fn().mockImplementation(() => ({
                    incr: mockIncr,
                    expire: mockExpire,
                    ttl: mockTtl,
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
});
