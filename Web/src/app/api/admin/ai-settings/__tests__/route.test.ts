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
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mocks
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (applyRateLimitHeaders as jest.Mock).mockImplementation((response) => response);
        (requireAdmin as jest.Mock).mockResolvedValue({ success: true });
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
        it('should update settings successfully', async () => {
            (prisma.globalAiSettings.upsert as jest.Mock).mockResolvedValue({
                id: 'singleton',
                defaultBaseUrl: 'https://api.anthropic.com',
                defaultApiKey: 'encrypted_key',
                defaultModel: 'claude-2',
            });

            const request = new NextRequest('http://localhost:3000/api/admin/ai-settings', {
                method: 'PUT',
                body: JSON.stringify({
                    defaultBaseUrl: 'https://api.anthropic.com',
                    defaultModel: 'claude-2',
                }),
            });

            const response = await PUT(request);
            const data = await response!.json();

            expect(response!.status).toBe(200);
            expect(data.success).toBe(true);
            expect(prisma.globalAiSettings.upsert).toHaveBeenCalled();
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
});
