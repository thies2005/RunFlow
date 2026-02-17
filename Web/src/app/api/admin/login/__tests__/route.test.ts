/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/admin/auth', () => ({
    verifyAdminCredentials: jest.fn(),
    signAdminToken: jest.fn(),
    COOKIE_NAME: 'admin-token',
}));

jest.mock('@/lib/security/csrf', () => ({
    setCsrfCookie: jest.fn(),
}));

jest.mock('@/lib/rateLimitAdmin', () => ({
    adminRateLimit: jest.fn(),
    applyRateLimitHeaders: jest.fn(),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { verifyAdminCredentials, signAdminToken, COOKIE_NAME } from '@/lib/admin/auth';
import { setCsrfCookie } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { handleError } from '@/lib/errors/handler';

describe('POST /api/admin/login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (applyRateLimitHeaders as jest.Mock).mockImplementation((response) => response);
        (verifyAdminCredentials as jest.Mock).mockResolvedValue(true);
        (signAdminToken as jest.Mock).mockResolvedValue('admin-jwt-token');
        (setCsrfCookie as jest.Mock).mockImplementation(() => {});
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin-password',
            }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('expiresIn', 86400);
        expect(response.cookies.get(COOKIE_NAME)).toBeDefined();
    });

    it('should require username', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: 'admin-password',
            }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should require password', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
            }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
    });

    it('should return 401 for invalid credentials', async () => {
        (verifyAdminCredentials as jest.Mock).mockResolvedValue(false);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'wrong-password',
            }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toHaveProperty('error');
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin-password',
            }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should handle errors gracefully', async () => {
        (verifyAdminCredentials as jest.Mock).mockRejectedValue(new Error('Auth error'));
        (handleError as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin-password',
            }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(handleError).toHaveBeenCalled();
    });

    it('should set CSRF cookie on successful login', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin-password',
            }),
        });

        const response = await POST(mockRequest);

        expect(setCsrfCookie).toHaveBeenCalledWith(response);
    });
});
