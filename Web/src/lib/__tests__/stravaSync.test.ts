
import { rateLimiter } from '../strava/sync';
import { getRedisClient } from '../redis';

// Mock dependencies
jest.mock('../redis', () => ({
    getRedisClient: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
}));

jest.mock('../db', () => ({
    prisma: {},
}));

jest.mock('../strava/oauth', () => ({
    refreshStravaToken: jest.fn(),
}));

// Mock metrics libraries to avoid import issues if they have side effects
jest.mock('../metrics/trimp', () => ({ calculateTrimp: jest.fn() }));
jest.mock('../metrics/fitness', () => ({ calculateRunningTss: jest.fn(), getActivityContribution: jest.fn() }));
jest.mock('../metrics/runalyze', () => ({ calculateEffectiveVO2max: jest.fn() }));
jest.mock('../metrics/vdot', () => ({ calculateTrainingPaces: jest.fn() }));
jest.mock('../metrics/fitnessCache', () => ({ updateFitnessCache: jest.fn() }));
jest.mock('../metrics/calories', () => ({ calculateCalories: jest.fn(), calculateAge: jest.fn() }));

describe('Strava Rate Limiter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset in-memory state
        rateLimiter.requests = 0;
        rateLimiter.windowStart = Date.now();
    });

    it('should use in-memory limiter when Redis is unavailable', async () => {
        (getRedisClient as jest.Mock).mockResolvedValue(null);

        const start = Date.now();
        await rateLimiter.checkAndWait();
        const end = Date.now();

        expect(getRedisClient).toHaveBeenCalled();
        expect(rateLimiter.requests).toBe(1);
        expect(end - start).toBeLessThan(100); // Should be instant
    });

    it('should use Redis limiter when available', async () => {
        const mockRedis = {
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
            ttl: jest.fn().mockResolvedValue(60),
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        await rateLimiter.checkAndWait();

        expect(getRedisClient).toHaveBeenCalled();
        expect(mockRedis.incr).toHaveBeenCalledWith('strava:rate_limit:requests');
        expect(mockRedis.expire).toHaveBeenCalledWith('strava:rate_limit:requests', expect.any(Number));
    });

    it('should wait when rate limit exceeded in Redis', async () => {
        const mockRedis = {
            incr: jest.fn()
                .mockResolvedValueOnce(100) // First call: limit exceeded (95 is limit)
                .mockResolvedValueOnce(1),  // Second call (after wait): new window
            expire: jest.fn().mockResolvedValue(1),
            ttl: jest.fn().mockResolvedValue(1), // Wait 1s
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        const start = Date.now();
        await rateLimiter.checkAndWait();
        const end = Date.now();

        expect(mockRedis.incr).toHaveBeenCalledTimes(2);
        // We expect it to wait roughly 1s + buffer.
        // 1s = 1000ms. Code waits (ttl+1)*1000 = 2000ms.
        // Wait, code says:
        // const waitTime = ttl > 0 ? ttl : windowSeconds;
        // await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
        // So if ttl=1, waitTime=1. Sleep 2000ms.
        expect(end - start).toBeGreaterThanOrEqual(1900);
    });
});
