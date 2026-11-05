/**
 * Mobile Sync Endpoint
 * 
 * POST /api/mobile/v1/sync
 * GET /api/mobile/v1/sync
 * 
 * Triggers Strava sync or gets sync status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { getSyncProgress, getSyncStatus } from '@/lib/strava/sync';
import { startStravaSync } from '@/lib/strava/startSync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.sync);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const body = await request.json().catch(() => null);
        const result = await startStravaSync(user.id, body?.range, body?.automatic === true);
        if (result.status === 'busy') return errorResponses.conflict('Sync already in progress', result);

        return NextResponse.json({
            success: true,
            syncStarted: result.status === 'started',
            activitiesSynced: 0, // Background imports are not available synchronously.
            lastSyncAt: result.lastSyncAt?.toISOString() ?? null,
            synced: 0,
            skipped: 0,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/sync'
        });
    }
}

export async function GET(request: NextRequest) {
    try {
        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const status = request.nextUrl.searchParams.get('progress') === '1'
            ? await getSyncProgress(user.id)
            : await getSyncStatus(user.id);
        return NextResponse.json(status, { headers: { 'Cache-Control': 'private, no-store' } });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/sync'
        });
    }
}
