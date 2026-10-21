/**
 * Test API Key Endpoint
 * POST /api/ai/test-key
 * 
 * Tests if an API key works by making a simple completion request
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { testAiConfig, AiConfig, validateBaseUrl } from '@/lib/ai/providers';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    const clientId = getClientIdentifier(request);
    const rl = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
    if (!rl.allowed) return NextResponse.json({ valid: false, error: 'Too many requests' }, { status: 429 });

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { apiKey, baseUrl, model, provider } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        let isAdmin = Boolean((session.user as { isAdmin?: boolean })?.isAdmin);
        if (!isAdmin) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { isAdmin: true },
            });
            isAdmin = Boolean(user?.isAdmin);
        }

        const effectiveBaseUrl = baseUrl || (provider === 'google' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1');
        if (!isAdmin) {
            if (!validateBaseUrl(effectiveBaseUrl)) {
                return NextResponse.json({ valid: false, error: 'Base URL must be a supported HTTPS AI provider endpoint' }, { status: 400 });
            }
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
            apiKey,
            apiKeys: [apiKey],
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
