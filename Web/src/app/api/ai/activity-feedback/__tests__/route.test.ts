/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';

jest.mock('@/lib/strava/oauth', () => ({
    authOptions: {},
}));

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        activity: {
            findFirst: jest.fn(),
        },
        activityAiFeedback: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        feedbackJob: {
            upsert: jest.fn(),
        },
    },
}));

jest.mock('@/lib/ai/feedback', () => ({
    generateAndSaveActivityFeedback: jest.fn(),
}));

describe('GET /api/ai/activity-feedback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue({
            id: 'activity-1',
            name: 'Test Run',
            type: 'RUN',
        });
    });

    it('should handle successful request with cached feedback', async () => {
        (prisma.activityAiFeedback.findUnique as jest.Mock).mockResolvedValue({
            id: 'feedback-1',
            activityId: 'activity-1',
            plannedComparison: 'Great run!',
            progressAnalysis: 'Good progress',
            goalTrajectory: 'On track',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback?activityId=activity-1');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('feedback');
        expect(data).toHaveProperty('cached', true);
    });

    it('should handle successful request without cached feedback', async () => {
        (prisma.activityAiFeedback.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback?activityId=activity-1');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('feedback', null);
        expect(data).toHaveProperty('cached', false);
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback?activityId=activity-1');

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should return 400 for missing activityId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback');

        const response = await GET(mockRequest);

        expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent activity', async () => {
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback?activityId=activity-1');

        const response = await GET(mockRequest);

        expect(response.status).toBe(404);
    });

    it('should handle errors gracefully', async () => {
        (prisma.activity.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback?activityId=activity-1');

        const response = await GET(mockRequest);

        expect(response.status).toBe(500);
    });
});

describe('POST /api/ai/activity-feedback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
    });

    it('should return 401 without authentication', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should return 400 for missing activityId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(400);
    });

    it('should handle successful request', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockResolvedValue({
            feedback: {
                id: 'feedback-1',
                activityId: 'activity-1',
                plannedComparison: 'Great run!',
                progressAnalysis: 'Good progress',
                goalTrajectory: 'On track',
            },
            cached: false,
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('feedback');
        expect(data).toHaveProperty('cached', false);
    });

    it('should return cached feedback when regenerate is false', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockResolvedValue({
            feedback: {
                id: 'feedback-1',
                activityId: 'activity-1',
                plannedComparison: 'Cached feedback',
            },
            cached: true,
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1', regenerate: false }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('cached', true);
    });

    it('should return 404 when activity not found', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockRejectedValue(new Error('Activity not found'));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(404);
    });

    it('should return 403 when AI is not enabled', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockRejectedValue(
            new Error('AI features not enabled or no provider configured')
        );

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(403);
    });

    it('should return 429 when usage limit exceeded', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockRejectedValue(
            new Error('Usage limit reached')
        );

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should queue feedback job on abort', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockImplementation(
            (_activityId: string, _userId: string, _regenerate: boolean, signal: AbortSignal) => {
                Object.defineProperty(signal, 'aborted', { value: true, configurable: true });
                throw new DOMException('The operation was aborted', 'AbortError');
            }
        );
        (prisma.feedbackJob.upsert as jest.Mock).mockResolvedValue({ id: 'job-1' });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('queued', true);
        expect(prisma.feedbackJob.upsert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        (generateAndSaveActivityFeedback as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(500);
    });
});
