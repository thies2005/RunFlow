/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/admin/auth', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/rateLimitAdmin', () => ({
    adminRateLimit: jest.fn(),
    applyRateLimitHeaders: jest.fn((response) => response),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findMany: jest.fn(),
        },
        activity: {
            groupBy: jest.fn(),
        },
    },
}));

jest.mock('@/lib/metrics/fitnessCache', () => ({
    updateFitnessCache: jest.fn(),
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { prisma } from '@/lib/db';
import { updateFitnessCache } from '@/lib/metrics/fitnessCache';

describe('POST /api/admin/recalculate-fitness', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (prisma.user.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'user-1',
                email: 'user1@example.com',
            },
            {
                id: 'user-2',
                email: 'user2@example.com',
            },
        ]);
        (prisma.activity.groupBy as jest.Mock).mockResolvedValue([
            { userId: 'user-1', _min: { startDate: new Date('2023-01-01') } },
            { userId: 'user-2', _min: { startDate: new Date('2023-01-02') } },
        ]);
        (updateFitnessCache as jest.Mock).mockResolvedValue(undefined);
    });

    it('should handle successful request for all users', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('message', 'Recalculation complete');
        expect(data).toHaveProperty('totalUsers', 2);
        expect(data).toHaveProperty('results');
        expect(data.results).toHaveLength(2);

        // Verify groupBy was called correctly
        expect(prisma.activity.groupBy).toHaveBeenCalledWith({
            by: ['userId'],
            _min: { startDate: true },
            where: undefined
        });
    });

    it('should handle successful request for specific user', async () => {
        (prisma.user.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'user-1',
                email: 'user1@example.com',
            },
        ]);
        (prisma.activity.groupBy as jest.Mock).mockResolvedValue([
            { userId: 'user-1', _min: { startDate: new Date('2023-01-01') } },
        ]);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'user-1' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.totalUsers).toBe(1);
        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
            })
        );
        expect(prisma.activity.groupBy).toHaveBeenCalledWith({
            by: ['userId'],
            _min: { startDate: true },
            where: { userId: 'user-1' }
        });
    });

    it('should return 401 when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should skip users without activities', async () => {
        (prisma.activity.groupBy as jest.Mock).mockResolvedValue([]);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results[0].status).toBe('skipped');
        expect(data.results[0].reason).toBe('no_activities');
        expect(updateFitnessCache).not.toHaveBeenCalled();
    });

    it('should handle errors for individual users', async () => {
        (updateFitnessCache as jest.Mock).mockRejectedValue(new Error('Fitness cache error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results[0].status).toBe('error');
        expect(data.results[0].error).toBe('Fitness cache error');
    });

    it('should apply rate limit headers', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });

    it('should call updateFitnessCache with earliest activity date', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/recalculate-fitness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(updateFitnessCache).toHaveBeenCalledWith(
            'user-1',
            expect.arrayContaining([
                expect.objectContaining({
                    startDate: expect.any(Date),
                }),
            ])
        );
    });
});
