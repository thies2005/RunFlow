/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('@/lib/auth/tokens', () => ({
    createAuthCode: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
    sendPasswordResetEmail: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

describe('POST /api/auth/forgot-password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (createAuthCode as jest.Mock).mockResolvedValue('123456');
        (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);
    });

    it('should handle successful request for existing user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('message');
        expect(createAuthCode).toHaveBeenCalled();
        expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success even for non-existent user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'nonexistent@example.com',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(createAuthCode).not.toHaveBeenCalled();
    });

    it('should require email', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data).toHaveProperty('error');
    });

    it('should handle email sending errors gracefully', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
        });
        (sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error('Email error'));

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
    });

    it('should handle errors gracefully', async () => {
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
            }),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });

    it('should handle invalid JSON', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json',
        });

        const response = await POST(mockRequest);

        expect(response.status).toBe(500);
    });
});
