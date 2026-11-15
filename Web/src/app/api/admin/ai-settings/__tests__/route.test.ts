/**
 * @jest-environment node
 */

import { GET, PUT } from '../route';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
    prisma: {
        globalAiSettings: {
            findUnique: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
        },
        user: {
            count: jest.fn(),
        },
        userAiSettings: {
            count: jest.fn(),
        },
    },
}));

jest.mock('@/lib/admin/auth', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/rateLimitAdmin', () => ({
    adminRateLimit: jest.fn(),
    applyRateLimitHeaders: jest.fn(),
}));

jest.mock('@/lib/security/csrf', () => ({
    validateCsrfToken: jest.fn(),
    csrfValidationErrorResponse: jest.fn(),
}));

jest.mock('@/lib/admin/auditLog', () => ({
    logAdminAction: jest.fn(),
}));

jest.mock('@/lib/crypto', () => ({
    encryptToken: jest.fn((token) => `encrypted_${token}`),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { validateCsrfToken } from '@/lib/security/csrf';
import { handleError } from '@/lib/errors/handler';

describe('/api/admin/ai-settings', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.ALLOW_SIGNUPS;

        // Default successful mocks
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (applyRateLimitHeaders as jest.Mock).mockImplementation((response) => response);
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        (validateCsrfToken as jest.Mock).mockReturnValue(true);
    });

    describe('GET', () => {
        it('should return settings and stats successfully', async () => {
            (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({
                id: 'singleton',
                defaultBaseUrl: 'https://api.openai.com',
                defaultApiKey: 'encrypted_key',
                defaultModel: 'gpt-4',
            });
            (prisma.user.count as jest.Mock).mockResolvedValue(100);
            (prisma.userAiSettings.count as jest.Mock).mockResolvedValue(50);

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings');
            const response = await GET(request);
            const data = await response!.json();

            expect(response!.status).toBe(200);
            expect(data.settings).toBeDefined();
            expect(data.stats).toBeDefined();
            expect(data.settings.hasDefaultApiKey).toBe(true);
            expect(data.settings.allowSignups).toBe(true);
            expect(data.settings.envAllowSignups).toBe(true);
            expect(data.settings.effectiveAllowSignups).toBe(true);
        });

        it('should report envAllowSignups=false and effectiveAllowSignups=false when ALLOW_SIGNUPS=no', async () => {
            process.env.ALLOW_SIGNUPS = 'no';
            (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({
                id: 'singleton',
                defaultBaseUrl: 'https://api.openai.com',
                defaultApiKey: 'encrypted_key',
                defaultModel: 'gpt-4',
                allowSignups: true,
            });
            (prisma.user.count as jest.Mock).mockResolvedValue(100);
            (prisma.userAiSettings.count as jest.Mock).mockResolvedValue(50);

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings');
            const response = await GET(request);
            const data = await response!.json();

            expect(response!.status).toBe(200);
            expect(data.settings.allowSignups).toBe(true);
            expect(data.settings.envAllowSignups).toBe(false);
            expect(data.settings.effectiveAllowSignups).toBe(false);
        });

        it('should delegate error handling to handleError', async () => {
            // Force an error
            const error = new Error('Database error');
            (prisma.globalAiSettings.findUnique as jest.Mock).mockRejectedValue(error);
            (handleError as jest.Mock).mockReturnValue(NextResponse.json({ error: 'Handled Error' }, { status: 500 }));

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings');
            await GET(request);

            expect(handleError).toHaveBeenCalledWith(error);
        });
    });

    describe('PUT', () => {
        it('should update settings and fallbackProviderId successfully', async () => {
            (prisma.globalAiSettings.upsert as jest.Mock).mockResolvedValue({
                id: 'singleton',
                defaultBaseUrl: 'https://api.anthropic.com',
                defaultApiKey: 'encrypted_key',
                defaultModel: 'claude-2',
                fallbackProviderId: 'prov_fallback_1',
            });

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings', {
                method: 'PUT',
                body: JSON.stringify({
                    defaultBaseUrl: 'https://api.anthropic.com',
                    defaultModel: 'claude-2',
                    fallbackProviderId: 'prov_fallback_1',
                }),
            });

            const response = await PUT(request);
            const data = await response!.json();

            expect(response!.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.settings.fallbackProviderId).toBe('prov_fallback_1');
            expect(prisma.globalAiSettings.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({
                        fallbackProviderId: 'prov_fallback_1',
                    }),
                })
            );
        });

        it('should update allowSignups when ALLOW_SIGNUPS is enabled', async () => {
            process.env.ALLOW_SIGNUPS = 'yes';
            (prisma.globalAiSettings.upsert as jest.Mock).mockResolvedValue({
                id: 'singleton',
                allowSignups: false,
            });

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings', {
                method: 'PUT',
                body: JSON.stringify({ allowSignups: false }),
            });

            const response = await PUT(request);
            const data = await response!.json();

            expect(response!.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.settings.allowSignups).toBe(false);
            expect(data.settings.envAllowSignups).toBe(true);
            expect(data.settings.effectiveAllowSignups).toBe(false);
            expect(prisma.globalAiSettings.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ allowSignups: false }),
                })
            );
        });

        it('should reject enabling allowSignups with 403 when ALLOW_SIGNUPS=false', async () => {
            process.env.ALLOW_SIGNUPS = 'false';

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings', {
                method: 'PUT',
                body: JSON.stringify({ allowSignups: true }),
            });

            const response = await PUT(request);
            const data = await response!.json();

            expect(response!.status).toBe(403);
            expect(data.error).toContain('ALLOW_SIGNUPS');
            expect(prisma.globalAiSettings.upsert).not.toHaveBeenCalled();
        });

        it('should delegate error handling to handleError', async () => {
            const error = new Error('Update failed');
            (prisma.globalAiSettings.upsert as jest.Mock).mockRejectedValue(error);
            (handleError as jest.Mock).mockReturnValue(NextResponse.json({ error: 'Handled Error' }, { status: 500 }));

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings', {
                method: 'PUT',
                body: JSON.stringify({}),
            });

            await PUT(request);

            expect(handleError).toHaveBeenCalledWith(error);
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });
});
