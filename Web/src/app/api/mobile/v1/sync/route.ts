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
import { syncUserActivities, getSyncStatus } from '@/lib/strava/sync';
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

        // Check if sync already in progress
        const status = await getSyncStatus(user.id);
        if (status.syncInProgress) {
            return errorResponses.conflict(
                'Sync already in progress',
                status
            );
        }

        // Get options
        const body = await request.json().catch(() => ({}));
        const range = body.range || 'SINCE_LAST_ACTIVITY';

        // Start sync
        console.log(`[Mobile API] Starting background sync for user ${user.id} with range: ${range}`);
        syncUserActivities(user.id, range).catch((err) => {
            console.error(`[Mobile API] Background sync failed for user ${user.id}:`, err);
        });

        // Get updated sync status for response
        const updatedStatus = await getSyncStatus(user.id);

        return NextResponse.json({
            success: true,
            // Android QuickSyncResponse compatibility
            syncStarted: true,
            activitiesSynced: 0, // Not available synchronously
            lastSyncAt: updatedStatus.lastSyncAt?.toISOString() || null,
            // Original fields for backward compatibility
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

        const status = await getSyncStatus(user.id);
        return NextResponse.json(status);

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/sync'
        });
    }
}
