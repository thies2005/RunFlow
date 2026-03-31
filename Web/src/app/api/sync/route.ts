import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncUserActivities, getSyncStatus } from '@/lib/strava/sync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';
import { enqueueFeedbackJobsForActivities } from '@/lib/ai/feedback';
import { runBackgroundTask } from '@/lib/utils/backgroundTask';

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
        logger.info('Starting sync (background mode)', { userId: session.user.id, range });
        runBackgroundTask(async () => {
            try {
                const result = await syncUserActivities(session.user.id, range);
                logger.info('Sync completed, checking for feedback jobs to enqueue', {
                    userId: session.user.id,
                    synced: result.synced,
                    activityCount: result.syncedActivityIds.length
                });
                try {
                    await enqueueFeedbackJobsForActivities(session.user.id, result.syncedActivityIds);
                } catch (err) {
                    logger.error('Failed to enqueue feedback jobs after sync', { userId: session.user.id, error: err instanceof Error ? err.message : String(err) });
                }
            } catch (err) {
                logger.error('Background sync failed', { userId: session.user.id, error: err instanceof Error ? err.message : String(err) });
            }
        });

        return NextResponse.json({
            success: true,
            status: 'started',
            message: 'Sync started in background'
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return handleError(new Error('Unauthorized'));
        }

        const status = await getSyncStatus(session.user.id);
        return NextResponse.json(status);
    } catch (error) {
        return handleError(error);
    }
}
