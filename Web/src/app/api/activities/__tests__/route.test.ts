/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        activity: {
            findMany: jest.fn(),
            count: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        workout: {
            findMany: jest.fn(),
            updateMany: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: {
        activities: { limit: 20, windowSeconds: 60 },
    },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/api/apiResponse', () => ({
    cachedResponse: jest.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

jest.mock('@/lib/validation/validator', () => ({
    validateBody: jest.fn(),
}));

jest.mock('@/lib/metrics/fitnessCache', () => ({ updateFitnessCache: jest.fn() }));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { handleError } from '@/lib/errors/handler';

describe('GET /api/activities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);
        (prisma.workout.findMany as jest.Mock).mockResolvedValue([]);
        (cachedResponse as jest.Mock).mockImplementation((data) => {
            const response = new Response(JSON.stringify(data), { status: 200 });
            return response;
        });
    });

    it('should handle successful request', async () => {
        const mockActivities = [
            {
                id: 'activity-1',
                stravaId: BigInt(123456),
                type: 'RUN',
                name: 'Morning Run',
                startDate: new Date(),
                distance: 5000,
                movingTime: 1800,
                isLinked: false,
            },
        ];

        (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);
        (prisma.activity.count as jest.Mock).mockResolvedValue(1);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('activities');
    });

    it('should return 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities');

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should handle limit and offset params', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities?limit=10&offset=20');

        const response = await GET(mockRequest);

        expect(prisma.activity.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: 10,
                skip: 20,
            })
        );
    });

    it('should handle type filter', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities?type=RUN');

        const response = await GET(mockRequest);

        expect(prisma.activity.findMany).toHaveBeenCalled();
    });

    it.each([['strava', { gt: BigInt(0) }], ['runflow', { lt: BigInt(0) }]])(
        'filters %s before pagination and count', async (source, stravaId) => {
            await GET(new NextRequest(`http://localhost/api/activities?source=${source}&limit=10&offset=20`));
            expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-1', stravaId }), take: 10, skip: 20,
            }));
            expect(prisma.activity.count).toHaveBeenCalledWith({ where: expect.objectContaining({ userId: 'user-1', stravaId }) });
        },
    );

    it('should handle raceEligible filter', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities?raceEligible=true');

        const response = await GET(mockRequest);

        expect(prisma.activity.findMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        (prisma.activity.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/activities');

        const response = await GET(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});

describe('POST /api/activities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (validateBody as jest.Mock).mockResolvedValue({
            success: true,
            data: {
                name: 'Test Run',
                date: '2024-01-01',
                type: 'RUN',
                distance: 5,
                duration: 30,
                hr: 150,
                hrZones: { z1: 60, z2: 120, z3: 180, z4: 240, z5: 300 },
            },
        });
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.activity.create as jest.Mock).mockResolvedValue({
            id: 'activity-1',
            stravaId: BigInt(-1234567890),
            name: 'Test Run',
            type: 'RUN',
            startDate: new Date(),
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Run',
                date: '2024-01-01',
                type: 'RUN',
                distance: 5,
                duration: 30,
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('id');
    });

    it('should return 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities', {
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

        const mockRequest = new NextRequest('http://localhost:3000/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(400);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should handle duplicate activity', async () => {
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue({
            id: 'existing-activity',
            stravaId: BigInt(123456),
            name: 'Existing Run',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Run',
                date: '2024-01-01',
                type: 'RUN',
                distance: 5,
                duration: 30,
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(data).toHaveProperty('duplicate', true);
    });

    it('should handle errors gracefully', async () => {
        (prisma.activity.create as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});


describe('DELETE /api/activities', () => {
    const request = (ids: unknown) => new NextRequest('http://localhost/api/activities', {
        method: 'DELETE', body: JSON.stringify({ ids }), headers: { 'Content-Type': 'application/json' },
    });
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
        (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(prisma));
    });
    it('unlinks and deletes the selected owned activities', async () => {
        const date = new Date();
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([{ id: 'a', startDate: date }]);
        (prisma.activity.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
        const response = await DELETE(request(['a']));
        expect(response.status).toBe(200);
        expect(prisma.workout.updateMany).toHaveBeenCalledWith({
            where: { linkedActivityId: { in: ['a'] }, goal: { userId: 'user-1' } }, data: { linkedActivityId: null },
        });
        expect(prisma.activity.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', id: { in: ['a'] } } });
    });
    it('rejects mixed ownership without deleting anything', async () => {
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([{ id: 'a', startDate: new Date() }]);
        const response = await DELETE(request(['a', 'other']));
        expect(response.status).toBe(404);
        expect(prisma.workout.updateMany).not.toHaveBeenCalled();
        expect(prisma.activity.deleteMany).not.toHaveBeenCalled();
    });
    it('rejects missing selection and unauthenticated requests', async () => {
        expect((await DELETE(request([]))).status).toBe(400);
        (auth as jest.Mock).mockResolvedValue(null);
        expect((await DELETE(request(['a']))).status).toBe(401);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});
