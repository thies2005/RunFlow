import { getRedisClient } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync } from '@/lib/rateLimit';
import { AnalyticsService } from '@/lib/services/analytics';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies with factories to avoid loading original files
jest.mock('@/lib/redis', () => ({
    getRedisClient: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        goal: { findFirst: jest.fn() },
        activity: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    },
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { general: {} },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/services/analytics', () => ({
    AnalyticsService: {
        calculateFitnessMetrics: jest.fn(),
        calculateEasyTrimp: jest.fn(),
        calculateCurrentWeekMileage: jest.fn(),
        calculateVO2max: jest.fn(),
        calculateShape: jest.fn(),
    }
}));

// Mock Next.js objects
const mockJson = jest.fn();
jest.mock('next/server', () => {
    class MockNextResponse {
        constructor(public body: any, public init?: any) { }
        static json(body: any, init: any) {
            mockJson(body, init);
            const res = new MockNextResponse(body, init); res.headers = new Map(); return res;
        }
    }
    return {
        NextRequest: jest.fn(),
        NextResponse: MockNextResponse,
    };
});

// Import the route handler AFTER mocks
import { GET } from '@/app/api/mobile/v1/analytics/stats/route';

describe('GET /api/mobile/v1/analytics/stats', () => {
    const mockUser = { id: 'user-1' };
    const mockDate = new Date('2023-01-01T00:00:00Z');

    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });

        const { rateLimitHeaders } = require('@/lib/rateLimit');
        (rateLimitHeaders as jest.Mock).mockReturnValue({});

        // Default mocks
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            hrMax: 180,
            vdotCorrectionFactor: 1.0,
            includeCrossTraining: true,
            updatedAt: mockDate,
        });
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({
            currentVdot: 40,
            updatedAt: mockDate,
            isActive: true,
        });
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue({
            updatedAt: mockDate,
        });
        (prisma.activity.count as jest.Mock).mockResolvedValue(100);

        // Mock AnalyticsService methods to return dummy values
        (AnalyticsService.calculateFitnessMetrics as jest.Mock).mockReturnValue({ ctl: 10, atl: 10, tsb: 0, workloadRatio: 1.0 });
        (AnalyticsService.calculateEasyTrimp as jest.Mock).mockReturnValue(100);
        (AnalyticsService.calculateCurrentWeekMileage as jest.Mock).mockReturnValue(20);
        (AnalyticsService.calculateVO2max as jest.Mock).mockReturnValue({ rawVO2max: 40, effectiveVO2max: 40 });
        (AnalyticsService.calculateShape as jest.Mock).mockReturnValue({ shape: 0.5 });
    });

    it('should return cached data if available', async () => {
        const mockRedis = {
            get: jest.fn().mockResolvedValue(JSON.stringify({ cached: true })),
            set: jest.fn(),
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        const request = new NextRequest('http://localhost/api/mobile/v1/analytics/stats');
        await GET(request);

        // Verify cache check
        const expectedKey = `analytics:stats:${mockUser.id}:v1:${mockDate.getTime()}:${mockDate.getTime()}:${mockDate.getTime()}:100`;
        expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);

        // Verify response is from cache
        expect(mockJson).toHaveBeenCalledWith({ cached: true }, expect.anything());

        // Verify expensive operations skipped
        expect(prisma.activity.findMany).not.toHaveBeenCalled();
        expect(AnalyticsService.calculateFitnessMetrics).not.toHaveBeenCalled();
    });

    it('should calculate and cache data on cache miss', async () => {
        const mockRedis = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        const mockActivities = [{ id: '1', type: 'RUN', startDate: new Date() }];
        (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);

        const request = new NextRequest('http://localhost/api/mobile/v1/analytics/stats');
        const response = await GET(request);

        // Verify calculation
        expect(prisma.activity.findMany).toHaveBeenCalled();
        expect(AnalyticsService.calculateFitnessMetrics).toHaveBeenCalled();

        // Verify cache set
        const expectedKey = `analytics:stats:${mockUser.id}:v1:${mockDate.getTime()}:${mockDate.getTime()}:${mockDate.getTime()}:100`;
        expect(mockRedis.set).toHaveBeenCalledWith(
            expectedKey,
            expect.stringContaining('"ctl":10'), // Check for some content
            expect.objectContaining({ ex: 86400 })
        );

        expect((response as any).body).toContain('"ctl":10');
    });

    it('should handle redis failure gracefully', async () => {
        // Redis client throws error on get
        const mockRedis = {
            get: jest.fn().mockRejectedValue(new Error('Redis error')),
            set: jest.fn(),
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

        const request = new NextRequest('http://localhost/api/mobile/v1/analytics/stats');
        const response = await GET(request);

        // Should fall back to calculation
        expect(prisma.activity.findMany).toHaveBeenCalled();
        expect((response as any).body).toContain('"ctl":10');
    });

    it('should use new cache key when data updates', async () => {
        const mockRedis = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        // New activity update time
        const newDate = new Date('2023-01-02T00:00:00Z');
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue({
            updatedAt: newDate,
        });

        const request = new NextRequest('http://localhost/api/mobile/v1/analytics/stats');
        await GET(request);

        const expectedKey = `analytics:stats:${mockUser.id}:v1:${mockDate.getTime()}:${mockDate.getTime()}:${newDate.getTime()}:100`;
        expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);
    });

    it('should use new cache key when activity count changes (deletion)', async () => {
        const mockRedis = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
        };
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

        // Count changed
        (prisma.activity.count as jest.Mock).mockResolvedValue(99);

        const request = new NextRequest('http://localhost/api/mobile/v1/analytics/stats');
        await GET(request);

        const expectedKey = `analytics:stats:${mockUser.id}:v1:${mockDate.getTime()}:${mockDate.getTime()}:${mockDate.getTime()}:99`;
        expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);
    });
});

