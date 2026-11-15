/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        aiProvider: { findUnique: jest.fn() },
    },
}));

jest.mock('@/lib/admin/auth', () => ({
    COOKIE_NAME: 'runflow_admin_token',
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/ai/providers', () => ({
    testAiConfig: jest.fn(),
    tryDecryptAiKey: jest.fn(),
    validateBaseUrl: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
    getClientIdentifier: jest.fn().mockReturnValue('test-client'),
    RATE_LIMITS: { settings: {} },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { testAiConfig, tryDecryptAiKey } from '@/lib/ai/providers';

describe('POST /api/ai/test-key', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (testAiConfig as jest.Mock).mockResolvedValue({ success: true, model: 'gpt-4o-mini' });
    });

    it('allows NextAuth user session with apiKey even when an admin cookie exists without x-csrf-token', async () => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', isAdmin: false } });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isAdmin: false });

        const req = new NextRequest('http://localhost:3000/api/ai/test-key', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                cookie: 'runflow_admin_token=stale-or-active',
            },
            body: JSON.stringify({
                apiKey: 'sk-user-key',
                baseUrl: 'https://api.openai.com/v1',
                model: 'gpt-4o-mini',
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(requireAdmin).not.toHaveBeenCalled();
    });

    it('requires strict admin auth and decrypts stored key when providerId is passed', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'admin', type: 'admin' } });
        (prisma.aiProvider.findUnique as jest.Mock).mockResolvedValue({ apiKey: 'encrypted-secret' });
        (tryDecryptAiKey as jest.Mock).mockReturnValue('decrypted-provider-key');

        const req = new NextRequest('http://localhost:3000/api/ai/test-key', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-csrf-token': 'valid-csrf',
                cookie: 'runflow_admin_token=valid-admin-jwt',
            },
            body: JSON.stringify({
                provider: 'openai',
                providerId: 'prov-1',
                apiKey: null,
                baseUrl: 'https://api.openai.com/v1',
                model: 'gpt-4o-mini',
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(requireAdmin).toHaveBeenCalled();
        expect(testAiConfig).toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: 'decrypted-provider-key' }),
            expect.anything(),
        );
    });

    it('rejects unauthenticated requests even if providerId is omitted', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const req = new NextRequest('http://localhost:3000/api/ai/test-key', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ apiKey: 'sk-test' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns CSRF error from requireAdmin when providerId is passed without valid CSRF', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
        });

        const req = new NextRequest('http://localhost:3000/api/ai/test-key', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                cookie: 'runflow_admin_token=valid-admin-jwt',
            },
            body: JSON.stringify({ providerId: 'prov-1' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
    });
});
