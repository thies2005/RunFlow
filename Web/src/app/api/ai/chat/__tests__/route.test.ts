/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        chatSession: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        chatMessage: {
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        globalAiSettings: {
            findUnique: jest.fn(),
        },
        userAiSettings: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('@/lib/ai', () => ({
    getAiConfig: jest.fn(),
    streamChat: jest.fn(),
    buildUserContext: jest.fn(),
    buildActivityContext: jest.fn(),
    formatContextForAi: jest.fn(() => ''),
    buildSystemPrompt: jest.fn(() => ''),
    buildExtendedHistoryContext: jest.fn(() => ''),
    reserveUsageSlot: jest.fn(),
    releaseUsageReservation: jest.fn(),
    incrementUsage: jest.fn(),
    generateCompletion: jest.fn(),
    countTokens: jest.fn(() => 10),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

import { auth } from '@/auth';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import {
    getAiConfig,
    streamChat,
    reserveUsageSlot,
    releaseUsageReservation,
    incrementUsage,
    buildActivityContext,
} from '@/lib/ai';
import { checkRateLimitAsync } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

describe('POST /api/ai/chat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({
            id: 'user-1',
            authMethod: 'session',
        });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getAiConfig as jest.Mock).mockResolvedValue({
            model: 'gpt-4',
            providerId: 'provider-1',
        });
        (reserveUsageSlot as jest.Mock).mockResolvedValue({ allowed: true, claimed: true });
        (releaseUsageReservation as jest.Mock).mockResolvedValue(undefined);
        (incrementUsage as jest.Mock).mockResolvedValue(undefined);
        (prisma.chatSession.create as jest.Mock).mockResolvedValue({
            id: 'session-1',
            title: 'Test message',
        });
        (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({
            systemPrompt: 'System prompt',
        });
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue(null);

        (streamChat as jest.Mock).mockImplementation(async function* () {
            yield 'Hello';
            yield ' world';
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello AI',
            }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('should return 401 without authentication', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should return 400 for missing message', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(400);
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(429);
    });

    it('should return 500 when AI is not enabled', async () => {
        (getAiConfig as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);

        const chunks = [];
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done) {
                chunks.push(result.value);
            }
        }
        const text = Buffer.concat(chunks).toString();
        expect(text).toContain('error');
    });

    it('should emit the usage-limit error over SSE when the reservation is denied', async () => {
        (reserveUsageSlot as jest.Mock).mockResolvedValue({
            allowed: false,
            claimed: false,
            reason: 'Usage limit exceeded',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);

        const chunks = [];
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done) {
                chunks.push(result.value);
            }
        }
        const text = Buffer.concat(chunks).toString();
        expect(text).toContain('Usage limit exceeded');
        // Denied before any provider spend.
        expect(streamChat).not.toHaveBeenCalled();
    });

    it('should reserve the quota slot atomically before any provider work', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(reserveUsageSlot).toHaveBeenCalledWith('user-1');
        // The reservation must happen before the provider stream starts.
        expect((reserveUsageSlot as jest.Mock).mock.invocationCallOrder[0])
            .toBeLessThan((streamChat as jest.Mock).mock.invocationCallOrder[0]);
        // A denied reservation never reaches the provider.
        expect(getAiConfig).toHaveBeenCalled();
    });

    it('should settle token deltas without re-counting the reserved message', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(incrementUsage).toHaveBeenCalledWith(
            'user-1',
            { inputTokens: 20, outputTokens: 10 },
            'provider-1',
            { messagesAlreadyCounted: true }
        );
    });

    it('should refund the reserved slot when the provider stream fails', async () => {
        (streamChat as jest.Mock).mockImplementation(async () => {
            throw new Error('provider exploded');
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(releaseUsageReservation).toHaveBeenCalledWith('user-1');
        // The failed stream never settles usage.
        expect(incrementUsage).not.toHaveBeenCalled();
    });

    it('should not refund when no tier slot was claimed (BYOK)', async () => {
        (reserveUsageSlot as jest.Mock).mockResolvedValue({ allowed: true, claimed: false });

        (streamChat as jest.Mock).mockImplementation(async () => {
            throw new Error('provider exploded');
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(releaseUsageReservation).not.toHaveBeenCalled();
    });

    it('should handle existing session', async () => {
        (prisma.chatSession.findUnique as jest.Mock).mockResolvedValue({
            id: 'existing-session',
            userId: 'user-1',
            title: 'Previous title',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello AI',
                sessionId: 'existing-session',
            }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
        (prisma.chatSession.create as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });

    it('should not build activity context without the activity consent flags', async () => {
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue({
            accessAllActivities: false,
            accessActivityHistory: false,
            accessActivityLogs: false,
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Analyze my run',
                activityId: 'act-1',
            }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(buildActivityContext).not.toHaveBeenCalled();
    });

    it('should scope activity context to the session user when consent is granted', async () => {
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue({
            accessActivityHistory: true,
        });
        (buildActivityContext as jest.Mock).mockResolvedValue({
            activity: {
                id: 'act-1',
                name: 'Morning Run',
                type: 'RUN',
                date: '2026-09-28',
                distance: 10000,
                duration: 3000,
                pace: 300,
                avgHr: 152,
            },
            plannedWorkout: undefined,
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Analyze my run',
                activityId: 'act-1',
            }),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(buildActivityContext).toHaveBeenCalledWith('act-1', 'user-1');

        // The activity block reaches the model input for the session user only.
        const systemMessage = (streamChat as jest.Mock).mock.calls[0][1].find(
            (m: { role: string }) => m.role === 'system'
        );
        expect(systemMessage.content).toContain('Morning Run');
    });
});
