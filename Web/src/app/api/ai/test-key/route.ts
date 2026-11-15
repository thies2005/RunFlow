/**
 * Test API Key Endpoint
 * POST /api/ai/test-key
 * 
 * Tests if an API key works by making a simple completion request
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requireAdmin, COOKIE_NAME } from '@/lib/admin/auth';
import { testAiConfig, tryDecryptAiKey, AiConfig, validateBaseUrl } from '@/lib/ai/providers';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    const clientId = getClientIdentifier(request);
    const rl = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
    if (!rl.allowed) return NextResponse.json({ valid: false, error: 'Too many requests' }, { status: 429 });

    try {
        const body = await request.json();
        const { apiKey, baseUrl, model, provider, providerId } = body;

        const hasAdminCredential = Boolean(
            request.cookies.get(COOKIE_NAME)?.value ||
            request.headers.get('authorization')?.startsWith('Bearer ')
        );

        let isAdmin = false;
        let userId: string | null = null;

        const requiresStrictAdmin = Boolean(providerId) || Boolean(request.headers.get('x-csrf-token'));

        if (requiresStrictAdmin && hasAdminCredential) {
            const adminResult = await requireAdmin(request);
            if ('admin' in adminResult) {
                isAdmin = true;
            } else {
                return adminResult.error;
            }
        } else {
            const session = await auth();
            if (session?.user?.id) {
                userId = session.user.id;
                isAdmin = Boolean((session.user as { isAdmin?: boolean })?.isAdmin);
                if (!isAdmin) {
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { isAdmin: true },
                    });
                    isAdmin = Boolean(user?.isAdmin);
                }
            } else if (hasAdminCredential) {
                const adminResult = await requireAdmin(request);
                if ('admin' in adminResult) {
                    isAdmin = true;
                } else {
                    return adminResult.error;
                }
            } else {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        let resolvedApiKey = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;
        if (!resolvedApiKey && providerId) {
            if (!isAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (typeof providerId !== 'string') {
                return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
            }
            const storedProvider = await prisma.aiProvider.findUnique({
                where: { id: providerId },
                select: { apiKey: true },
            });
            if (!storedProvider?.apiKey) {
                return NextResponse.json({ error: 'Stored API key not found for provider' }, { status: 404 });
            }
            resolvedApiKey = tryDecryptAiKey(storedProvider.apiKey, 'test-key-provider', providerId);
        }

        if (!resolvedApiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        const effectiveBaseUrl = baseUrl || (provider === 'google' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1');
        const adminAllowedUrls = isAdmin && typeof baseUrl === 'string' && baseUrl.startsWith('https://') ? [baseUrl] : [];
        if (!validateBaseUrl(effectiveBaseUrl, adminAllowedUrls)) {
            return NextResponse.json({ valid: false, error: 'Base URL must be a valid HTTPS AI provider endpoint' }, { status: 400 });
        }

        const effectiveModel = model || 'gpt-4o-mini';
        if (typeof effectiveModel !== 'string' || !/^[A-Za-z0-9._:/-]+$/.test(effectiveModel) || effectiveModel.includes('..')) {
            return NextResponse.json({ valid: false, error: 'Invalid model identifier' }, { status: 400 });
        }
        if (typeof model !== 'undefined' && (typeof model !== 'string' || !/^[A-Za-z0-9._:/-]+$/.test(model) || model.includes('..'))) {
            return NextResponse.json({ valid: false, error: 'Invalid model identifier' }, { status: 400 });
        }

        const config: AiConfig = {
            provider: provider || 'openai',
            apiKey: resolvedApiKey,
            apiKeys: [resolvedApiKey],
            baseUrl: effectiveBaseUrl,
            model: effectiveModel,
        };

        const result = await testAiConfig(config, {
            statusOnly: true,
            allowedUrls: isAdmin && baseUrl ? [baseUrl] : undefined,
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                valid: true,
                message: 'API key is valid!',
                model: result.model || config.model
            });
        } else {
            return NextResponse.json({
                success: false,
                valid: false,
                error: result.error || 'Unknown error'
            });
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({
            success: false,
            valid: false,
            error: message,
        });
    }
}
