/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { getAiConfig, checkUsageLimit, buildActivityContext } from '@/lib/ai';
import { generateCompletion } from '@/lib/ai/providers';
import { handleError } from '@/lib/errors/handler';

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
    },
}));

jest.mock('@/lib/ai', () => ({
    getAiConfig: jest.fn(),
    buildUserContext: jest.fn(() => ''),
    buildActivityContext: jest.fn(),
    formatContextForAi: jest.fn(() => ''),
    checkUsageLimit: jest.fn(),
    incrementUsage: jest.fn(),
    ACTIVITY_FEEDBACK_PROMPTS: {
        plannedComparison: 'Compare with planned',
        progressAnalysis: 'Analyze progress',
        goalTrajectory: 'Check goal trajectory',
    },
}));

jest.mock('@/lib/ai/providers', () => ({
    generateCompletion: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
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
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback?activityId=activity-1');

        const response = await GET(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});

describe('POST /api/ai/activity-feedback', () => {
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
        (getAiConfig as jest.Mock).mockResolvedValue({
            model: 'gpt-4',
            providerId: 'provider-1',
        });
        (checkUsageLimit as jest.Mock).mockResolvedValue({ canUse: true });
        (buildActivityContext as jest.Mock).mockResolvedValue({
            activity: {
                name: 'Test Run',
                date: '2024-01-01',
                type: 'RUN',
                distance: 5000,
                duration: 1800,
                pace: 360,
                avgHr: 150,
                maxHr: 180,
                elevationGain: 100,
            },
            plannedWorkout: null,
        });
        (prisma.activityAiFeedback.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.activityAiFeedback.upsert as jest.Mock).mockResolvedValue({
            id: 'feedback-1',
            activityId: 'activity-1',
            plannedComparison: 'Great run!',
            progressAnalysis: 'Good progress',
            goalTrajectory: 'On track',
        });
        (generateCompletion as jest.Mock).mockResolvedValue('AI generated feedback');
    });

    it('should handle successful request', async () => {
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
        (prisma.activityAiFeedback.findUnique as jest.Mock).mockResolvedValue({
            id: 'feedback-1',
            activityId: 'activity-1',
            plannedComparison: 'Cached feedback',
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

    it('should regenerate when regenerate is true', async () => {
        (prisma.activityAiFeedback.findUnique as jest.Mock).mockResolvedValue({
            id: 'feedback-1',
            plannedComparison: 'Old feedback',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1', regenerate: true }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
        expect(prisma.activityAiFeedback.upsert).toHaveBeenCalled();
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

    it('should return 404 for non-existent activity', async () => {
        (prisma.activity.findFirst as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(404);
    });

    it('should return 403 when AI is not enabled', async () => {
        (getAiConfig as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(403);
    });

    it('should return 429 when usage limit exceeded', async () => {
        (checkUsageLimit as jest.Mock).mockResolvedValue({
            canUse: false,
            reason: 'Usage limit exceeded',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should handle errors gracefully', async () => {
        (prisma.activityAiFeedback.upsert as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/activity-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 'activity-1' }),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});
