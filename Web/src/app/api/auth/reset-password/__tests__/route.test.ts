/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/auth/tokens', () => ({
    verifyAuthCode: jest.fn(),
}));

jest.mock('@/lib/auth/auth-email', () => ({
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { verifyAuthCode } from '@/lib/auth/tokens';
import { hashPassword, validatePassword } from '@/lib/auth/auth-email';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (verifyAuthCode as jest.Mock).mockResolvedValue(true);
        (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
        (validatePassword as jest.Mock).mockReturnValue({ valid: true });
        (prisma.user.update as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
        });
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                code: '123456',
                password: 'NewValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(verifyAuthCode).toHaveBeenCalledWith('test@example.com', '123456', 'PASSWORD_RESET');
        expect(hashPassword).toHaveBeenCalledWith('NewValidPassword123!');
        expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should require email', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: '123456',
                password: 'NewValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should require code', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'NewValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should require password', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                code: '123456',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should validate verification code', async () => {
        (verifyAuthCode as jest.Mock).mockResolvedValue(false);

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                code: 'invalid-code',
                password: 'NewValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should validate password strength', async () => {
        (validatePassword as jest.Mock).mockReturnValue({
            valid: false,
            errors: ['Password is too weak'],
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                code: '123456',
                password: 'weak',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                code: '123456',
                password: 'NewValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data).toHaveProperty('error');
    });

    it('should handle errors gracefully', async () => {
        (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                code: '123456',
                password: 'NewValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });
});
