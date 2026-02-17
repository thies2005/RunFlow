/**
 * @jest-environment node
 */

import { DELETE } from '../route';
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
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { prisma } from '@/lib/db';

describe('DELETE /api/admin/users/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAdmin as jest.Mock).mockResolvedValue({ success: true });
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
        });
        (prisma.user.delete as jest.Mock).mockResolvedValue({
            id: 'user-1',
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'user-1' }) });
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('message');
    });

    it('should return 401 when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'user-1' }) });
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'user-1' }) });
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should return 404 for non-existent user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'user-1' }) });
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(404);
    });

    it('should apply rate limit headers', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'user-1' }) });

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });

    it('should delete user with cascading data', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'user-1' }) });

        expect(prisma.user.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
            })
        );
    });
});
