/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/admin/auth', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/security/csrf', () => ({
    getCsrfTokenFromCookie: jest.fn(),
    setCsrfCookie: jest.fn(),
}));

jest.mock('@/lib/rateLimitAdmin', () => ({
    adminRateLimit: jest.fn(),
    applyRateLimitHeaders: jest.fn((response) => response),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            count: jest.fn(),
            findFirst: jest.fn(),
        },
        activity: {
            count: jest.fn(),
        },
        session: {
            count: jest.fn(),
        },
    },
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { prisma } from '@/lib/db';
import * as fs from 'fs';

describe('GET /api/admin/stats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (prisma.user.count as jest.Mock).mockResolvedValue(100);
        (prisma.activity.count as jest.Mock).mockResolvedValue(1000);
        (prisma.session.count as jest.Mock).mockResolvedValue(50);
        (prisma.user.findFirst as jest.Mock).mockResolvedValue({
            lastSyncAt: new Date(),
        });
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue(['backup1.sql.gz', 'backup2.sql']);
        (fs.statSync as jest.Mock).mockReturnValue({
            mtime: new Date(),
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('users');
        expect(data).toHaveProperty('activities');
        expect(data).toHaveProperty('sessions');
        expect(data).toHaveProperty('sync');
        expect(data).toHaveProperty('backups');
    });

    it('should include user statistics', async () => {
        (prisma.user.count as jest.Mock)
            .mockResolvedValueOnce(100)
            .mockResolvedValueOnce(5);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.users.total).toBe(100);
        expect(data.users.newToday).toBe(5);
    });

    it('should include activity statistics', async () => {
        (prisma.activity.count as jest.Mock)
            .mockResolvedValueOnce(1000)
            .mockResolvedValueOnce(50);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.activities.total).toBe(1000);
        expect(data.activities.last7Days).toBe(50);
    });

    it('should include session statistics', async () => {
        (prisma.session.count as jest.Mock)
            .mockResolvedValueOnce(50)
            .mockResolvedValueOnce(20);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.sessions.total).toBe(50);
        expect(data.sessions.active).toBe(20);
    });

    it('should return error when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should handle missing backups directory', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.backups.count).toBe(0);
        expect(data.backups.lastBackupAt).toBeNull();
    });

    it('should apply rate limit headers', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/stats');

        const response = await GET(mockRequest);

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });
});
