/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/auth/auth-email', () => ({
    hashPassword: jest.fn(),
    validateEmail: jest.fn(),
    validatePassword: jest.fn(),
}));

jest.mock('@/lib/auth/tokens', () => ({
    createAuthCode: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
    sendWelcomeEmail: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

import { prisma } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth/auth-email';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
        (validateEmail as jest.Mock).mockReturnValue(true);
        (validatePassword as jest.Mock).mockReturnValue({ valid: true });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
        });
        (createAuthCode as jest.Mock).mockResolvedValue('123456');
        (sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
                name: 'Test User',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('user');
    });

    it('should require email', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: 'ValidPassword123!',
                name: 'Test User',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should require password', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                name: 'Test User',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should validate email format', async () => {
        (validateEmail as jest.Mock).mockReturnValue(false);

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'invalid-email',
                password: 'ValidPassword123!',
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

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'weak',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should return 409 if email already exists', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'existing-user',
            email: 'test@example.com',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data).toHaveProperty('error');
    });

    it('should enforce rate limiting', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data).toHaveProperty('error');
    });

    it('should handle errors gracefully', async () => {
        (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            }),
        });

        const response = await POST(mockRequest);

        expect(handleError).toHaveBeenCalled();
    });

    it('should log error when welcome email fails but still succeed', async () => {
        const emailError = new Error('Email service down');
        (sendWelcomeEmail as jest.Mock).mockRejectedValue(emailError);

        const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
                name: 'Test User',
            }),
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        // Request should still succeed
        expect(response.status).toBe(201);
        expect(data).toHaveProperty('success', true);

        // Error should be logged
        expect(logger.error).toHaveBeenCalledWith(
            '[Register] Failed to send welcome email',
            { error: emailError }
        );
    });
});
