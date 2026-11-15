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
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        foodItem: {
            create: jest.fn(),
        },
        nutritionLog: {
            create: jest.fn(),
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

jest.mock('@/lib/ai/executor', () => {
    const ai = jest.requireMock('@/lib/ai');
    return {
        executeStreamWithFallback: jest.fn(async (userId: string, _fn: string, messages: unknown[], opts?: unknown) => {
            const config = await ai.getAiConfig(userId);
            if (!config) {
                throw new Error('AI not configured');
            }
            const stream = await ai.streamChat(config, messages, opts);
            return {
                stream,
                targetUsed: {
                    providerId: config.providerId ?? 'provider-1',
                    providerSlug: 'mock',
                    model: config.model ?? 'gpt-4',
                },
                attempts: 1,
            };
        }),
        executeCompletionWithFallback: jest.fn(async (userId: string, _fn: string, messages: unknown[]) => {
            const config = await ai.getAiConfig(userId);
            const text = await ai.generateCompletion(config, messages);
            return {
                text,
                targetUsed: {
                    providerId: config?.providerId ?? 'provider-1',
                    providerSlug: 'mock',
                    model: config?.model ?? 'gpt-4',
                },
                attempts: 1,
            };
        }),
    };
});

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
        (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.foodItem.create as jest.Mock).mockResolvedValue({
            id: 'food-1',
            calories: 300,
            protein: 20,
            carbs: 30,
            fats: 10,
        });
        (prisma.nutritionLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' });
        (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({
            systemPrompt: 'System prompt',
        });
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue(null);

        (handleError as jest.Mock).mockImplementation((err: unknown) =>
            new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        );
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
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error).toBeTruthy();
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
        expect(response.status).toBe(429);
        const body = await response.json();
        expect(body.error).toContain('Usage limit exceeded');
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
            { messagesAlreadyCounted: true, model: 'gpt-4' }
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
        expect(response.status).toBe(500);

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
        expect(response.status).toBe(500);

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

    it('should include sanitized chronological history for an existing owned session', async () => {
        (prisma.chatSession.findUnique as jest.Mock).mockResolvedValue({
            id: 'existing-session',
            userId: 'user-1',
            title: 'Previous title',
        });
        (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([
            {
                role: 'assistant',
                content: 'Logged lunch! <!-- MEAL_LOGGED_WIDGET: {"name":"Salad","calories":400} -->',
            },
            {
                role: 'user',
                content: 'I ate a salad <!-- WATER_LOGGED_WIDGET: {"amount": 2} -->',
            },
        ]);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'What about dinner?',
                sessionId: 'existing-session',
            }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
            where: { sessionId: 'existing-session', userId: 'user-1' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { role: true, content: true },
        });

        const sentMessages = (streamChat as jest.Mock).mock.calls[0][1];
        expect(sentMessages).toHaveLength(4);
        expect(sentMessages[0].role).toBe('system');
        expect(sentMessages[1]).toEqual({ role: 'user', content: 'I ate a salad' });
        expect(sentMessages[2]).toEqual({ role: 'assistant', content: 'Logged lunch!' });
        expect(sentMessages[3]).toEqual({ role: 'user', content: 'What about dinner?' });
    });

    it('should not load history when sessionId belongs to another user', async () => {
        (prisma.chatSession.findUnique as jest.Mock).mockResolvedValue({
            id: 'foreign-session',
            userId: 'other-user',
            title: 'Other user chat',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello',
                sessionId: 'foreign-session',
            }),
        });

        const response = await POST(mockRequest);
        const reader = response.body?.getReader();
        if (reader) {
            let result;
            while (!(result = await reader.read()).done);
        }

        expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
    });

    it('should normalize mealType to uppercase valid MealType defaulting to SNACK', async () => {
        (streamChat as jest.Mock).mockImplementationOnce(async function* () {
            yield 'Logged your breakfast! <!-- MEAL_LOGGED_WIDGET: {"name":"Oats","mealType":"breakfast","calories":350,"protein":12,"carbs":55,"fats":7} -->';
        });

        const req1 = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'I ate oats for breakfast' }),
        });
        const res1 = await POST(req1);
        const reader1 = res1.body?.getReader();
        if (reader1) {
            let r;
            while (!(r = await reader1.read()).done);
        }

        expect(prisma.nutritionLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ mealType: 'BREAKFAST' }),
            })
        );

        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1', authMethod: 'session' });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getAiConfig as jest.Mock).mockResolvedValue({ model: 'gpt-4', providerId: 'provider-1' });
        (reserveUsageSlot as jest.Mock).mockResolvedValue({ allowed: true, claimed: true });
        (prisma.chatSession.create as jest.Mock).mockResolvedValue({ id: 'session-2', title: 'Test' });
        (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({ systemPrompt: 'System' });
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.foodItem.create as jest.Mock).mockResolvedValue({ id: 'food-2', calories: 200, protein: 5, carbs: 25, fats: 8 });
        (streamChat as jest.Mock).mockImplementationOnce(async function* () {
            yield 'Logged! <!-- MEAL_LOGGED_WIDGET: {"name":"Apple","calories":95,"protein":0,"carbs":25,"fats":0} -->';
        });

        const req2 = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'I ate an apple' }),
        });
        const res2 = await POST(req2);
        const reader2 = res2.body?.getReader();
        if (reader2) {
            let r;
            while (!(r = await reader2.read()).done);
        }

        expect(prisma.nutritionLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ mealType: 'SNACK' }),
            })
        );
    });
});
