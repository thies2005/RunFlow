/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/strava/oauth', () => ({
    authOptions: {},
}));

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        activity: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        workout: {
            createMany: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: {
        general: { limit: 100, windowSeconds: 60 },
        settings: { limit: 20, windowSeconds: 60 },
    },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/api/apiResponse', () => ({
    cachedResponse: jest.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

jest.mock('@/lib/validation/validator', () => ({
    validateBody: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn((e) => { console.error('TEST CAUGHT ENTIRE ERROR: ', e); return new Response('error', { status: 500 }); }),
}));

jest.mock('@/lib/metrics/vdot', () => ({
    analyzeRace: jest.fn(() => ({
        vdot: 45,
        predictions: {
            '5K': 1080,
            '10K': 2280,
            'HALF': 5400,
            'MARATHON': 11400,
        },
    })),
    predictRaceTime: jest.fn(() => 11400),
}));

jest.mock('@/lib/plans', () => ({
    generateTrainingPlan: jest.fn(() => []),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { handleError } from '@/lib/errors/handler';

describe('GET /api/goals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.goal.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'goal-1',
                name: 'Marathon',
                raceType: 'MARATHON',
                raceDate: new Date('2024-04-15'),
                currentVdot: 45,
                workouts: [],
            },
        ]);
        (cachedResponse as jest.Mock).mockImplementation((data) => {
            const response = new Response(JSON.stringify(data), { status: 200 });
            return response;
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/goals');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('goals');
        expect(data.goals).toHaveLength(1);
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/goals');

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/goals');

        const response = await GET(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should include workouts for current week', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/goals');

        const response = await GET(mockRequest);

        expect(prisma.goal.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    workouts: expect.any(Object),
                }),
            })
        );
    });

    it('should handle errors gracefully', async () => {
        (prisma.goal.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/goals');

        const response = await GET(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});

describe('POST /api/goals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (validateBody as jest.Mock).mockResolvedValue({
            success: true,
            data: {
                name: 'Marathon Goal',
                raceType: 'MARATHON',
                raceDate: '2024-04-15',
                targetTime: 10800,
                weeklyMileageGoal: 40000,
                runsPerWeek: 4,
            },
        });
        (prisma.goal.create as jest.Mock).mockResolvedValue({
            id: 'goal-1',
            name: 'Marathon Goal',
            raceType: 'MARATHON',
            raceDate: new Date('2024-04-15'),
            currentVdot: 45,
        });
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            hrMax: 185,
            vdotCorrectionFactor: 1.0,
        });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user-1' });
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.goal.update as jest.Mock).mockResolvedValue({
            id: 'goal-1',
            currentVdot: 45,
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Marathon Goal',
                raceType: 'MARATHON',
                raceDate: '2024-04-15',
                targetTime: 10800,
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('goal');
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should return 400 for invalid input', async () => {
        (validateBody as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Validation error' }), { status: 400 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(400);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should handle calibration data', async () => {
        (validateBody as jest.Mock).mockResolvedValue({
            success: true,
            data: {
                name: 'Marathon Goal',
                raceType: 'MARATHON',
                raceDate: '2024-04-15',
                calibrationTime: 1800,
                calibrationDistance: '5K',
                calibrationFactor: 1.1,
            },
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Marathon Goal',
                raceType: 'MARATHON',
                raceDate: '2024-04-15',
                calibrationTime: 1800,
                calibrationDistance: '5K',
                calibrationFactor: 1.1,
            }),
        });

        const response = await POST(mockRequest);
        if (response.status !== 200) console.log(await response.clone().text());
        expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
        (prisma.goal.create as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});


