/**
 * Test API Key Endpoint
 * POST /api/ai/test-key
 * 
 * Tests if an API key works by making a simple completion request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { apiKey, baseUrl = 'https://api.openai.com/v1', model = 'gpt-4o-mini' } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        // Make a minimal test request
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
                max_tokens: 5,
            }),
        });

        if (!response.ok) {
            let errorMessage = `API returned ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData?.error?.message || errorMessage;
            } catch {
                // Ignore JSON parse errors
            }
            return NextResponse.json({
                success: false,
                error: errorMessage
            });
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';

        return NextResponse.json({
            success: true,
            message: 'API key is valid and working!',
            response: content.substring(0, 50),
            model: data?.model || model,
        });

    } catch (error) {
        console.error('API key test error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Connection failed',
        });
    }
}
