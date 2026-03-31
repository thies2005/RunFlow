/**
 * Test API Key Endpoint
 * POST /api/ai/test-key
 * 
 * Tests if an API key works by making a simple completion request
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { testAiConfig, AiConfig } from '@/lib/ai/providers';

export async function POST(request: NextRequest) {
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

        const config: AiConfig = {
            provider: provider || 'openai',
            apiKey,
            apiKeys: [apiKey],
            baseUrl: baseUrl || (provider === 'google' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1'), // default base url
            model: model || 'gpt-4o-mini',
        };

        const result = await testAiConfig(config);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'API key is valid!',
                model: result.model || config.model
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Unknown error'
            });
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({
            success: false,
            error: message,
        });
    }
}
