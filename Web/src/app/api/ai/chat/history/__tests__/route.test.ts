/**
 * @jest-environment node
 */

import { GET, DELETE } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        chatMessage: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

describe('GET /api/ai/chat/history', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'msg-1',
                role: 'user',
                content: 'Hello',
                createdAt: new Date(),
            },
            {
                id: 'msg-2',
                role: 'assistant',
                content: 'Hi there!',
                createdAt: new Date(),
            },
        ]);
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history');

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('messages');
        expect(data.messages).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history');

        const response = await GET(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should filter by activityId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history?activityId=activity-1');

        const response = await GET(mockRequest);

        expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    activityId: 'activity-1',
                }),
            })
        );
    });

    it('should filter by sessionId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history?sessionId=session-1');

        const response = await GET(mockRequest);

        expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    sessionId: 'session-1',
                }),
            })
        );
    });

    it('should handle errors gracefully', async () => {
        (prisma.chatMessage.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history');

        const response = await GET(mockRequest);

        expect(response.status).toBe(500);
    });
});

describe('DELETE /api/ai/chat/history', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({
            user: { id: 'user-1' },
        });
        (prisma.chatMessage.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
    });

    it('should return 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(response.status).toBe(401);
    });

    it('should filter by activityId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history?activityId=activity-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    activityId: 'activity-1',
                }),
            })
        );
    });

    it('should filter by sessionId', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history?sessionId=session-1', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    sessionId: 'session-1',
                }),
            })
        );
    });

    it('should handle errors gracefully', async () => {
        (prisma.chatMessage.deleteMany as jest.Mock).mockRejectedValue(new Error('Database error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/ai/chat/history', {
            method: 'DELETE',
        });

        const response = await DELETE(mockRequest);

        expect(response.status).toBe(500);
    });
});
