/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        goal: {
            findMany: jest.fn(),
            updateMany: jest.fn(),
        },
        activity: {
            findMany: jest.fn(),
        },
        dailyFitness: {
            aggregate: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: {
        general: { limit: 100, windowSeconds: 60 },
    },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/api/apiResponse', () => ({
    cachedResponse: jest.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

jest.mock('@/lib/services/analytics', () => ({
    AnalyticsService: {
        calculateCurrentWeekMileage: jest.fn(() => 20),
        calculateVO2max: jest.fn(() => ({ rawVO2max: 45, effectiveVO2max: 44 })),
        calculateShape: jest.fn(() => 0.85),
        calculateEasyTrimp: jest.fn(() => 100),
        calculateFitnessMetrics: jest.fn(() => ({ ctl: 50, atl: 40, tsb: 10, workloadRatio: 0.8 })),
    },
}));

jest.mock('@/lib/strava/sync', () => ({
    getSyncStatus: jest.fn(() => ({ synced: true, lastSyncAt: new Date() })),
}));

jest.mock('@/lib/metrics/fitnessCache', () => ({
    ensureFitnessCacheUpToDate: jest.fn(() => ({ ctl: 50, atl: 40, tsb: 10 })),
}));

jest.mock('@/lib/redis', () => ({
    getRedisClient: jest.fn(async () => null),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { handleError } from '@/lib/errors/handler';

describe('GET /api/dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            hrMax: 185,
            vdotCorrectionFactor: 1.0,
            includeCrossTraining: true,
        });
        (prisma.goal.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'goal-1',
                name: 'Marathon',
                currentVdot: 45,
                workouts: [],
            },
        ]);
        (prisma.goal.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'activity-1',
                stravaId: BigInt(123456),
                type: 'RUN',
                name: 'Morning Run',
                startDate: new Date(),
                distance: 5000,
                movingTime: 1800,
            },
        ]);
        (prisma.dailyFitness.aggregate as jest.Mock).mockResolvedValue({
            _max: { ctl: 60, atl: 50 },
        });
        (cachedResponse as jest.Mock).mockImplementation((data) => {
            const response = new Response(JSON.stringify(data), { status: 200 });
            return response;
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('stats');
        expect(data).toHaveProperty('recentActivities');
        expect(data).toHaveProperty('goals');
    });

    it('should return 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard');

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should handle date parameter', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard?date=2024-01-15');

        const response = await GET(mockRequest);

        expect(response.status).toBe(200);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard');

        const response = await GET(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should include all required stats', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(data.stats).toHaveProperty('currentWeekMileage');
        expect(data.stats).toHaveProperty('effectiveVO2max');
        expect(data.stats).toHaveProperty('rawVO2max');
        expect(data.stats).toHaveProperty('marathonShape');
        expect(data.stats).toHaveProperty('ctl');
        expect(data.stats).toHaveProperty('atl');
        expect(data.stats).toHaveProperty('tsb');
        expect(data.stats).toHaveProperty('workloadRatio');
        expect(data.stats).toHaveProperty('easyTrimp');
        expect(data.stats).toHaveProperty('hrMax');
    });

    it('should serialize BigInt for stravaId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(data.recentActivities.activities[0].stravaId).toBe('123456');
    });

    it('should handle errors gracefully', async () => {
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/dashboard');

        const response = await GET(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});
