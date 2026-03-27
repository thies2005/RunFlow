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
        user: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { prisma } from '@/lib/db';

describe('GET /api/admin/users', () => {
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
                name: 'Test User',
                email: 'test@example.com',
                image: 'https://example.com/avatar.jpg',
                createdAt: new Date(),
                lastSyncAt: new Date(),
                _count: { activities: 10 },
                aiSettings: {
                    usageTier: 'FREE',
                    adminAllowed: true,
                    aiEnabled: true,
                },
            },
        ]);
        (prisma.user.count as jest.Mock).mockResolvedValue(1);
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('users');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('page');
        expect(data).toHaveProperty('limit');
        expect(data).toHaveProperty('totalPages');
    });

    it('should return 401 when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should handle pagination params', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users?page=2&limit=20');

        const response = await GET(mockRequest);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 20,
                take: 20,
            })
        );
    });

    it('should limit max page size', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users?limit=200');

        const response = await GET(mockRequest);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: 100,
            })
        );
    });

    it('should handle search parameter', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users?search=test');

        const response = await GET(mockRequest);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.any(Array),
                }),
            })
        );
    });

    it('should transform user data', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.users[0]).toHaveProperty('id');
        expect(data.users[0]).toHaveProperty('name');
        expect(data.users[0]).toHaveProperty('email');
        expect(data.users[0]).toHaveProperty('createdAt');
        expect(data.users[0]).toHaveProperty('lastSyncAt');
        expect(data.users[0]).toHaveProperty('activityCount');
        expect(data.users[0]).toHaveProperty('aiSettings');
    });

    it('should include AI settings', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.users[0].aiSettings).toHaveProperty('usageTier');
        expect(data.users[0].aiSettings).toHaveProperty('adminAllowed');
        expect(data.users[0].aiSettings).toHaveProperty('aiEnabled');
    });

    it('should calculate totalPages correctly', async () => {
        (prisma.user.count as jest.Mock).mockResolvedValue(25);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users?limit=10');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.totalPages).toBe(3);
    });

    it('should apply rate limit headers', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users');

        const response = await GET(mockRequest);

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });
});
