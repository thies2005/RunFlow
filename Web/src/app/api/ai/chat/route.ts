/**
 * AI Chat API - Streaming chat endpoint
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { executeAiChatPipeline } from '@/lib/ai/chatPipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const user = await getAuthenticatedUser(request);
    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return executeAiChatPipeline({
        request,
        userId: user.id,
        useHandleErrorOnUnknown: true,
    });
}
