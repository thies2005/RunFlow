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
        },
        chatMessage: {
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

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
}));

import { auth } from '@/auth';
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

const ROUTE_URL = 'http://localhost:3000/api/v1/ai/chat';

async function consumeStream(response: Response) {
    const reader = response.body?.getReader();
    if (reader) {
        let result;
        while (!(result = await reader.read()).done);
    }
}

describe('POST /api/v1/ai/chat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
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
        });
    });

    it('should return 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        }));

        expect(response.status).toBe(401);
    });

    it('should not build activity context without the activity consent flags', async () => {
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue({
            accessAllActivities: false,
            accessActivityHistory: false,
            accessActivityLogs: false,
        });

        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Analyze my run', activityId: 'act-1' }),
        }));
        await consumeStream(response);

        expect(buildActivityContext).not.toHaveBeenCalled();
    });

    it('should scope activity context to the session user and fence untrusted fields', async () => {
        (prisma.userAiSettings.findUnique as jest.Mock).mockResolvedValue({
            accessActivityLogs: true,
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
            plannedWorkout: {
                type: 'EASY_RUN',
                description: 'Steady zone 2',
            },
        });

        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Analyze my run', activityId: 'act-1' }),
        }));
        await consumeStream(response);

        expect(buildActivityContext).toHaveBeenCalledWith('act-1', 'user-1');

        const systemMessage = (streamChat as jest.Mock).mock.calls[0][1].find(
            (m: { role: string }) => m.role === 'system'
        );
        // Activity name and workout description are fenced as untrusted data.
        expect(systemMessage.content).toContain('[untrusted user data: Morning Run]');
        expect(systemMessage.content).toContain('[untrusted user data: Steady zone 2]');
    });

    it('should emit the usage-limit error over SSE when the reservation is denied', async () => {
        (reserveUsageSlot as jest.Mock).mockResolvedValue({
            allowed: false,
            claimed: false,
            reason: 'Usage limit exceeded',
        });

        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        }));
        await consumeStream(response);

        expect(streamChat).not.toHaveBeenCalled();
    });

    it('should reserve the quota slot atomically before any provider work', async () => {
        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        }));
        await consumeStream(response);

        expect(reserveUsageSlot).toHaveBeenCalledWith('user-1');
        expect((reserveUsageSlot as jest.Mock).mock.invocationCallOrder[0])
            .toBeLessThan((streamChat as jest.Mock).mock.invocationCallOrder[0]);
    });

    it('should settle token deltas without re-counting the reserved message', async () => {
        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        }));
        await consumeStream(response);

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

        const response = await POST(new NextRequest(ROUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello AI' }),
        }));
        await consumeStream(response);

        expect(releaseUsageReservation).toHaveBeenCalledWith('user-1');
        expect(incrementUsage).not.toHaveBeenCalled();
    });
});
