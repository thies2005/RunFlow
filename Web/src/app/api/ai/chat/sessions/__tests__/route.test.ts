/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        chatSession: {
            findMany: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions');

describe('GET /api/ai/chat/sessions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({
            id: 'user-1',
        });
        (prisma.chatSession.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'session-1',
                title: 'Chat 1',
                updatedAt: new Date(),
                _count: { messages: 5 },
            },
            {
                id: 'session-2',
                title: 'Chat 2',
                updatedAt: new Date(),
                _count: { messages: 3 },
            },
        ]);
    });

    it('should handle successful request', async () => {
        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('sessions');
        expect(data.sessions).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should order by updatedAt desc', async () => {
        await GET(mockRequest);

        expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { updatedAt: 'desc' },
            })
        );
    });

    it('should include message counts', async () => {
        await GET(mockRequest);

        expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    _count: {
                        select: { messages: true },
                    },
                }),
            })
        );
    });

    it('should handle errors gracefully', async () => {
        (prisma.chatSession.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const response = await GET(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});

describe('POST /api/ai/chat/sessions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({
            id: 'user-1',
        });
        (prisma.chatSession.create as jest.Mock).mockResolvedValue({
            id: 'session-1',
            title: 'New Chat',
        });
    });

    it('should handle successful request', async () => {
        (prisma.chatSession.create as jest.Mock).mockResolvedValue({
            id: 'session-1',
            title: 'My New Chat',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'My New Chat' }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('session');
        expect(data.session.title).toBe('My New Chat');
    });

    it('should return 401 without authentication', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should default title to "New Chat" when not provided', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(prisma.chatSession.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: 'New Chat',
                }),
            })
        );
    });

    it('should handle invalid JSON', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json',
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
        (prisma.chatSession.create as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});

describe('DELETE /api/ai/chat/sessions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({
            id: 'user-1',
        });
        (prisma.chatSession.findUnique as jest.Mock).mockResolvedValue({
            id: 'session-1',
            userId: 'user-1',
            title: 'Chat 1',
        });
        (prisma.chatSession.delete as jest.Mock).mockResolvedValue({
            id: 'session-1',
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions?sessionId=session-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
    });

    it('should return 401 without authentication', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions?sessionId=session-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should return 400 for missing sessionId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
        (prisma.chatSession.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions?sessionId=session-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(response.status).toBe(404);
    });

    it('should return 404 for session not owned by user', async () => {
        (prisma.chatSession.findUnique as jest.Mock).mockResolvedValue({
            id: 'session-1',
            userId: 'other-user',
            title: 'Chat 1',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions?sessionId=session-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(response.status).toBe(404);
    });

    it('should handle errors gracefully', async () => {
        (prisma.chatSession.delete as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/sessions?sessionId=session-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});
