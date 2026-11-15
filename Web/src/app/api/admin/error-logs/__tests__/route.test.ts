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
    applyRateLimitHeaders: jest.fn((res) => res),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        errorLog: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit } from '@/lib/rateLimitAdmin';
import { prisma } from '@/lib/db';

describe('GET /api/admin/error-logs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 59, reset: Date.now() + 60000 },
        });
        (requireAdmin as jest.Mock).mockResolvedValue({
            admin: { username: 'admin', type: 'admin' },
        });
    });

    it('accurately sums occurrence counts per fingerprint without double counting', async () => {
        const now = new Date('2026-11-15T12:00:00Z');
        const earlier = new Date('2026-11-15T11:00:00Z');
        (prisma.errorLog.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'e1',
                fingerprint: 'fp-a',
                errorMessage: 'Timeout',
                routePath: '/api/sync',
                method: 'POST',
                count: 3,
                resolved: false,
                timestamp: now,
            },
            {
                id: 'e2',
                fingerprint: 'fp-a',
                errorMessage: 'Timeout',
                routePath: '/api/sync',
                method: 'POST',
                count: 1,
                resolved: false,
                timestamp: earlier,
            },
            {
                id: 'e3',
                fingerprint: 'fp-b',
                errorMessage: 'Validation failed',
                routePath: '/api/plan',
                method: 'POST',
                count: 1,
                resolved: true,
                timestamp: now,
            },
        ]);
        (prisma.errorLog.count as jest.Mock).mockResolvedValue(3);

        const req = new NextRequest('http://localhost:3000/api/admin/error-logs');
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.errorGroups).toHaveLength(2);
        const fpA = data.errorGroups.find((g: { fingerprint: string }) => g.fingerprint === 'fp-a');
        const fpB = data.errorGroups.find((g: { fingerprint: string }) => g.fingerprint === 'fp-b');
        expect(fpA.count).toBe(4);
        expect(fpB.count).toBe(1);
    });
});
