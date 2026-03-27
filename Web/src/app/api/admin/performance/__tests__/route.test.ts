import { NextRequest } from 'next/server';
import { GET } from '../route';

jest.mock('@/lib/admin/auth', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/monitoring/health', () => ({
    getHealthStatus: jest.fn(),
    getRecentMetrics: jest.fn(),
    getMemoryUsage: jest.fn(),
}));

jest.mock('@/lib/monitoring/metrics', () => ({
    getAllMetrics: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {},
}));

const { requireAdmin } = require('@/lib/admin/auth');
const { getHealthStatus, getRecentMetrics, getMemoryUsage } = require('@/lib/monitoring/health');
const { getAllMetrics } = require('@/lib/monitoring/metrics');

describe('/api/admin/performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return performance data for authenticated admin', async () => {
        requireAdmin.mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });

        getHealthStatus.mockResolvedValue({
            status: 'healthy',
            timestamp: '2024-01-01T00:00:00.000Z',
            checks: {
                database: { status: 'healthy', latency: 10 },
                strava: { status: 'unhealthy', error: 'Not configured' },
                aiProviders: { status: 'healthy' },
                memory: { status: 'healthy', usedMB: 500, totalMB: 1000, percentage: 50 },
            },
        });

        getRecentMetrics.mockReturnValue({
            errorRate: 0.01,
            avgResponseTime: 100,
            uptime: 3600,
        });

        getMemoryUsage.mockReturnValue({
            usedMB: 500,
            totalMB: 1000,
            percentage: 50,
            status: 'healthy',
        });

        getAllMetrics.mockReturnValue({});

        const request = new NextRequest('http://localhost/api/admin/performance');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('health');
        expect(data.data).toHaveProperty('system');
        expect(data.data).toHaveProperty('requests');
        expect(data.data).toHaveProperty('database');
    });

    it('should reject unauthorized requests', async () => {
        requireAdmin.mockResolvedValue({
            error: new Response('Unauthorized', { status: 401 }),
        });

        const request = new NextRequest('http://localhost/api/admin/performance');
        const response = await GET(request);

        expect(response.status).toBe(401);
    });

    it('should handle errors gracefully', async () => {
        requireAdmin.mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        getHealthStatus.mockRejectedValue(new Error('Health check failed'));

        const request = new NextRequest('http://localhost/api/admin/performance');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error');
    });
});
