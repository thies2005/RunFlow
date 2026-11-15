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
import { detectByokProviderType, parseApiKeys } from '@/lib/ai/routing';
import { sanitizeErrorMessage, toSafeUserError, type AiProviderType } from '@/lib/ai/errors';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

function isValidProviderType(value: unknown): value is AiProviderType {
    return value === 'openai' || value === 'anthropic' || value === 'google';
}

function defaultTestModelForProvider(provider: AiProviderType): string {
    switch (provider) {
        case 'google':
            return 'gemini-2.5-flash';
        case 'anthropic':
            return 'claude-3-5-sonnet-latest';
        case 'openai':
        default:
            return 'gpt-4o-mini';
    }
}

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

        if (provider !== undefined && provider !== null && provider !== '' && !isValidProviderType(provider)) {
            return NextResponse.json({ valid: false, error: 'Invalid provider type' }, { status: 400 });
        }

        let storedProviderMeta: { baseUrl?: string; type?: string } | null = null;
        let resolvedApiKey = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;
        if (providerId) {
            if (!isAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (typeof providerId !== 'string') {
                return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
            }
            const storedProvider = await prisma.aiProvider.findUnique({
                where: { id: providerId },
                select: { apiKey: true, baseUrl: true, type: true },
            });
            storedProviderMeta = storedProvider;
            if (!resolvedApiKey) {
                if (!storedProvider?.apiKey) {
                    return NextResponse.json({ error: 'Stored API key not found for provider' }, { status: 404 });
                }
                resolvedApiKey = tryDecryptAiKey(storedProvider.apiKey, 'test-key-provider', providerId);
            }
        }

        if (!resolvedApiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        const requestedBaseUrl = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : '';
        const explicitProvider: AiProviderType | null = isValidProviderType(provider)
            ? provider
            : isValidProviderType(storedProviderMeta?.type)
                ? storedProviderMeta.type
                : null;

        const effectiveBaseUrl =
            requestedBaseUrl ||
            storedProviderMeta?.baseUrl?.trim() ||
            (explicitProvider === 'google'
                ? 'https://generativelanguage.googleapis.com'
                : explicitProvider === 'anthropic'
                    ? 'https://api.anthropic.com'
                    : 'https://api.openai.com/v1');

        const adminAllowedUrls =
            isAdmin && effectiveBaseUrl.startsWith('https://') ? [effectiveBaseUrl] : [];
        if (!validateBaseUrl(effectiveBaseUrl, adminAllowedUrls)) {
            return NextResponse.json({ valid: false, error: 'Base URL must be a valid HTTPS AI provider endpoint' }, { status: 400 });
        }

        const effectiveProvider: AiProviderType = explicitProvider ?? detectByokProviderType(effectiveBaseUrl);

        if (typeof model !== 'undefined' && model !== null && model !== '' && (typeof model !== 'string' || !/^[A-Za-z0-9._:/-]+$/.test(model) || model.includes('..'))) {
            return NextResponse.json({ valid: false, error: 'Invalid model identifier' }, { status: 400 });
        }
        const effectiveModel =
            typeof model === 'string' && model.trim()
                ? model.trim()
                : defaultTestModelForProvider(effectiveProvider);
        if (!/^[A-Za-z0-9._:/-]+$/.test(effectiveModel) || effectiveModel.includes('..')) {
            return NextResponse.json({ valid: false, error: 'Invalid model identifier' }, { status: 400 });
        }

        const parsedKeys = parseApiKeys(resolvedApiKey);
        const config: AiConfig = {
            provider: effectiveProvider,
            apiKey: parsedKeys[0] || resolvedApiKey,
            apiKeys: parsedKeys.length > 0 ? parsedKeys : [resolvedApiKey],
            baseUrl: effectiveBaseUrl,
            model: effectiveModel,
        };

        const result = await testAiConfig(config, {
            statusOnly: true,
            allowedUrls: isAdmin && effectiveBaseUrl ? [effectiveBaseUrl] : undefined,
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                valid: true,
                message: 'API key is valid!',
                model: result.model || config.model
            });
        } else {
            const safeError = result.error ? sanitizeErrorMessage(result.error) : '';
            return NextResponse.json({
                success: false,
                valid: false,
                error: safeError || 'API key validation failed. Please check your key, base URL, and model.',
                ...(result.errorCode ? { errorCode: result.errorCode } : {}),
            });
        }

    } catch (error: unknown) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, valid: false, error: 'Invalid request payload' },
                { status: 400 }
            );
        }
        const safe = toSafeUserError(error);
        return NextResponse.json({
            success: false,
            valid: false,
            error: safe.message,
            errorCode: safe.code,
        });
    }
}
