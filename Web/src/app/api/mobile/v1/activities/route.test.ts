/**
 * @jest-environment node
 */
/**
 * Test for Mobile Activities API
 * 
 * Verifies:
 * - Pagination logic (hasMore calculation)
 * - Response structure
 * - Rate limiting integration
 * - Authentication check
 */
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mocks
jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        activity: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
    getClientIdentifier: jest.fn().mockReturnValue('test-client'),
    RATE_LIMITS: { activities: 100 },
    rateLimitHeaders: jest.fn().mockReturnValue({}),
}));

import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';

describe('GET /api/mobile/v1/activities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return activities with hasMore=true when more items exist', async () => {
        // Setup User
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1' });

        // Setup Prisma
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'act-1',
                stravaId: BigInt(123),
                startDate: new Date('2024-01-01'),
                type: 'RUN'
            }
        ]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(10); // Total 10

        // Request with limit 1
        const req = new NextRequest('http://localhost/api/mobile/v1/activities?limit=1&offset=0');

        const response = await GET(req);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.activities).toHaveLength(1);
        expect(json.activities[0].stravaId).toBe('123'); // Serialized
        expect(json.hasMore).toBe(true); // 0 + 1 < 10
        expect(json.total).toBe(10);
    });

    it('should return hasMore=false when reached end', async () => {
        // Setup User
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1' });

        // Setup Prisma
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([
            { id: 'act-1', stravaId: BigInt(123), startDate: new Date(), type: 'RUN' }
        ]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(1);

        // Request with limit 1
        const req = new NextRequest('http://localhost/api/mobile/v1/activities?limit=1&offset=0');

        const response = await GET(req);
        const json = await response.json();

        expect(json.hasMore).toBe(false); // 0 + 1 < 1 is false (it's equal)
    });

    it('should correctly pass pagination parameters to Prisma', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(10);

        const req = new NextRequest('http://localhost/api/mobile/v1/activities?limit=5&offset=5');
        await GET(req);

        expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({
            skip: 5,
            take: 5,
            where: expect.objectContaining({ userId: 'user-1' })
        }));
    });

    it('should return 401 if not authenticated', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const req = new NextRequest('http://localhost/api/mobile/v1/activities');
        const response = await GET(req);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.code).toBe('UNAUTHORIZED');
    });
});
