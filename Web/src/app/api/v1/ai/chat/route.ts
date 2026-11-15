import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setApiVersionHeaders } from '@/lib/api/version';
import { executeAiChatPipeline } from '@/lib/ai/chatPipeline';

export const dynamic = 'force-dynamic';

function withVersionHeaders<T extends Response>(response: T): T {
    setApiVersionHeaders(response.headers);
    return response;
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return withVersionHeaders(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        );
    }

    return executeAiChatPipeline({
        request,
        userId: session.user.id,
        applyHeaders: withVersionHeaders,
        useHandleErrorOnUnknown: false,
    });
}
