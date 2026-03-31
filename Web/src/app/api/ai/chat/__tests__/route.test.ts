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
    checkUsageLimit: jest.fn(),
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

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getAiConfig, streamChat, checkUsageLimit } from '@/lib/ai';
import { checkRateLimitAsync } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

describe('POST /api/ai/chat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getAiConfig as jest.Mock).mockResolvedValue({
            model: 'gpt-4',
            providerId: 'provider-1',
        });
        (checkUsageLimit as jest.Mock).mockResolvedValue({ canUse: true });
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
        (auth as jest.Mock).mockResolvedValue(null);

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

    it('should return 429 when usage limit exceeded', async () => {
        (checkUsageLimit as jest.Mock).mockResolvedValue({
            canUse: false,
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
});
