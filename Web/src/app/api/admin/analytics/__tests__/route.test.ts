/**
 * @jest-environment node
 */

import { GET } from '../route';
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
        aiDailyTokenUsage: {
            findMany: jest.fn(),
        },
        userAiSettings: {
            findMany: jest.fn(),
        },
    },
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { prisma } from '@/lib/db';

describe('GET /api/admin/analytics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (prisma.aiDailyTokenUsage.findMany as jest.Mock).mockResolvedValue([
            {
                date: new Date(),
                inputTokens: 1000,
                outputTokens: 500,
                provider: { name: 'openai' },
            },
        ]);
        (prisma.userAiSettings.findMany as jest.Mock).mockResolvedValue([
            {
                userId: 'user-1',
                usageTier: 'FREE',
                messagesUsedThisMonth: 10,
                inputTokensUsedThisMonth: 5000,
                outputTokensUsedThisMonth: 2500,
                user: {
                    name: 'Test User',
                    email: 'test@example.com',
                    image: 'https://example.com/avatar.jpg',
                },
            },
        ]);
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('dailyUsage');
        expect(data).toHaveProperty('topUsers');
    });

    it('should include daily usage data', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(Array.isArray(data.dailyUsage)).toBe(true);
        if (data.dailyUsage.length > 0) {
            expect(data.dailyUsage[0]).toHaveProperty('date');
            expect(data.dailyUsage[0]).toHaveProperty('provider');
            expect(data.dailyUsage[0]).toHaveProperty('input');
            expect(data.dailyUsage[0]).toHaveProperty('output');
            expect(data.dailyUsage[0]).toHaveProperty('total');
        }
    });

    it('should include top users data', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(Array.isArray(data.topUsers)).toBe(true);
        if (data.topUsers.length > 0) {
            expect(data.topUsers[0]).toHaveProperty('id');
            expect(data.topUsers[0]).toHaveProperty('name');
            expect(data.topUsers[0]).toHaveProperty('email');
            expect(data.topUsers[0]).toHaveProperty('tier');
            expect(data.topUsers[0]).toHaveProperty('messages');
            expect(data.topUsers[0]).toHaveProperty('inputTokens');
            expect(data.topUsers[0]).toHaveProperty('outputTokens');
            expect(data.topUsers[0]).toHaveProperty('totalTokens');
        }
    });

    it('should sort top users by total tokens', async () => {
        (prisma.userAiSettings.findMany as jest.Mock).mockResolvedValue([
            {
                userId: 'user-1',
                usageTier: 'FREE',
                messagesUsedThisMonth: 5,
                inputTokensUsedThisMonth: 5000,
                outputTokensUsedThisMonth: 2500,
                user: {
                    name: 'User 1',
                    email: 'user1@example.com',
                    image: null,
                },
            },
            {
                userId: 'user-2',
                usageTier: 'PAID',
                messagesUsedThisMonth: 10,
                inputTokensUsedThisMonth: 10000,
                outputTokensUsedThisMonth: 5000,
                user: {
                    name: 'User 2',
                    email: 'user2@example.com',
                    image: null,
                },
            },
        ]);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.topUsers[0].id).toBe('user-2');
        expect(data.topUsers[1].id).toBe('user-1');
    });

    it('should return 401 when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should filter daily usage by date range', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);

        expect(prisma.aiDailyTokenUsage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    date: expect.any(Object),
                }),
            })
        );
    });

    it('should only include users with usage', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);

        expect(prisma.userAiSettings.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.any(Array),
                }),
            })
        );
    });

    it('should apply rate limit headers', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/analytics');

        const response = await GET(mockRequest);

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });
});
