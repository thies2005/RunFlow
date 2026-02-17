import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { syncUserActivities, getSyncStatus } from '@/lib/strava/sync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';

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

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return handleError(new Error('Unauthorized'));
        }

        // Check if sync already in progress
        const status = await getSyncStatus(session.user.id);
        if (status.syncInProgress) {
            return NextResponse.json({
                error: 'Sync already in progress',
                ...status,
            }, { status: 409 });
        }

        // Get options
        const body = await request.json().catch(() => ({}));
        const range = body.range || 'SINCE_LAST_ACTIVITY'; // Default to incremental sync to save API calls

        // Start sync
        logger.info('Starting sync', { userId: session.user.id, range });
        const result = await syncUserActivities(session.user.id, range);
        logger.info('Sync complete', { userId: session.user.id, result });

        return NextResponse.json({
            success: true,
            ...result,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return handleError(new Error('Unauthorized'));
        }

        const status = await getSyncStatus(session.user.id);
        return NextResponse.json(status);
    } catch (error) {
        return handleError(error);
    }
}
