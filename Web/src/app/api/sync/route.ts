import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSyncProgress, getSyncStatus } from '@/lib/strava/sync';
import { startStravaSync } from '@/lib/strava/startSync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.sync);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();

        if (!session?.user?.id) {
            return handleError(new Error('Unauthorized'));
        }

        const body = await request.json().catch(() => null);
        const result = await startStravaSync(session.user.id, body?.range, body?.automatic === true);
        if (result.status === 'busy') {
            return NextResponse.json({ ...result, error: 'Sync already in progress' }, { status: 409 });
        }

        return NextResponse.json({ success: true, status: result.status }, {
            headers: rateLimitHeaders(rateLimitResult),
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return handleError(new Error('Unauthorized'));
        }

        const status = request.nextUrl.searchParams.get('progress') === '1'
            ? await getSyncProgress(session.user.id)
            : await getSyncStatus(session.user.id);
        return NextResponse.json(status, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return handleError(error);
    }
}
