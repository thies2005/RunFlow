/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/strava/oauth', () => ({
    authOptions: {},
}));

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        goal: {
            findFirst: jest.fn(),
        },
        activity: {
            findMany: jest.fn(),
        },
        dailyFitness: {
            findFirst: jest.fn(),
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

jest.mock('@/lib/apiResponse', () => ({
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

jest.mock('@/lib/metrics/fitness', () => ({
    getActivityContribution: jest.fn(() => ({ contributesToCtl: true })),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/apiResponse';
import { handleError } from '@/lib/errors/handler';

describe('GET /api/analytics/stats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            hrMax: 185,
            vdotCorrectionFactor: 1.0,
            includeCrossTraining: true,
        });
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({
            id: 'goal-1',
            currentVdot: 45,
        });
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'activity-1',
                type: 'RUN',
                startDate: new Date(),
                distance: 5000,
                movingTime: 1800,
                trimp: 50,
                averageHr: 150,
                hasHeartrate: true,
                hrZone2Time: 60,
                hrZone3Time: 120,
                hrZone4Time: 180,
            },
        ]);
        (prisma.dailyFitness.findFirst as jest.Mock).mockResolvedValue({
            ctl: 50,
            atl: 40,
            tsb: 10,
        });
        (prisma.dailyFitness.aggregate as jest.Mock).mockResolvedValue({
            _max: { ctl: 60, atl: 50 },
        });
        (cachedResponse as jest.Mock).mockImplementation((data) => {
            const response = new Response(JSON.stringify(data), { status: 200 });
            return response;
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/analytics/stats');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('currentWeekMileage');
        expect(data).toHaveProperty('effectiveVO2max');
        expect(data).toHaveProperty('rawVO2max');
        expect(data).toHaveProperty('ctl');
        expect(data).toHaveProperty('atl');
        expect(data).toHaveProperty('tsb');
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/analytics/stats');

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/analytics/stats');

        const response = await GET(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should include all required metrics', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/analytics/stats');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(data).toHaveProperty('currentWeekMileage');
        expect(data).toHaveProperty('effectiveVO2max');
        expect(data).toHaveProperty('rawVO2max');
        expect(data).toHaveProperty('vdotCorrectionFactor');
        expect(data).toHaveProperty('marathonShape');
        expect(data).toHaveProperty('currentVdot');
        expect(data).toHaveProperty('ctl');
        expect(data).toHaveProperty('atl');
        expect(data).toHaveProperty('tsb');
        expect(data).toHaveProperty('workloadRatio');
        expect(data).toHaveProperty('easyTrimp');
        expect(data).toHaveProperty('hrMax');
        expect(data).toHaveProperty('maxCtl');
        expect(data).toHaveProperty('maxAtl');
    });

    it('should handle new user with no fitness cache', async () => {
        (prisma.dailyFitness.findFirst as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/analytics/stats');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.ctl).toBe(50);
        expect(data.atl).toBe(40);
        expect(data.tsb).toBe(10);
    });

    it('should handle errors gracefully', async () => {
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/analytics/stats');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error');
    });
});
