/**
 * @jest-environment node
 */

import { GET, PATCH } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/strava/oauth', () => ({
    authOptions: {},
}));

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        activity: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: {
        general: { limit: 100, windowSeconds: 60 },
    },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

describe('GET /api/activities/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.activity.findUnique as jest.Mock).mockResolvedValue({
            id: 'activity-1',
            stravaId: BigInt(123456),
            name: 'Test Run',
            type: 'RUN',
            startDate: new Date(),
            laps: [],
            splits: [],
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1');

        const response = await GET(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('id', 'activity-1');
        expect(data).toHaveProperty('stravaId');
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1');

        const response = await GET(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent activity', async () => {
        (prisma.activity.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1');

        const response = await GET(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(404);
    });

    it('should include laps and splits', async () => {
        (prisma.activity.findUnique as jest.Mock).mockResolvedValue({
            id: 'activity-1',
            stravaId: BigInt(123456),
            name: 'Test Run',
            laps: [{ id: 'lap-1', index: 0 }],
            splits: [{ id: 'split-1', index: 0 }],
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1');

        const response = await GET(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
        (prisma.activity.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1');

        const response = await GET(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(handleError).toHaveBeenCalled();
    });
});

describe('PATCH /api/activities/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.activity.findUnique as jest.Mock).mockResolvedValue({
            userId: 'user-1',
            id: 'activity-1',
            name: 'Original Name',
        });
        (prisma.activity.update as jest.Mock).mockResolvedValue({
            id: 'activity-1',
            name: 'Updated Name',
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('name', 'Updated Name');
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(401);
    });

    it('should return 400 for invalid name', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: '   ' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent activity', async () => {
        (prisma.activity.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(404);
    });

    it('should return 403 for activity not owned by user', async () => {
        (prisma.activity.findUnique as jest.Mock).mockResolvedValue({
            userId: 'other-user',
            id: 'activity-1',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(403);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(response.status).toBe(429);
    });

    it('should handle errors gracefully', async () => {
        (prisma.activity.update as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/activities/activity-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' }),
        });

        const response = await PATCH(mockRequest, { params: Promise.resolve({ id: 'activity-1' }) });

        expect(handleError).toHaveBeenCalled();
    });
});
