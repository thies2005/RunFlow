import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { getStravaAthleteWeight } from '@/lib/strava/fetch';
import { logger } from '@/lib/logging/logger';
import { upsertDailyHealthLog } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';

/**
 * Request body for batch health data sync
 */
interface BatchHealthData {
    date: string; // YYYY-MM-DD format
    steps?: number;
    weight?: number;
}

interface BatchSyncRequest {
    data: BatchHealthData[];
}

/**
 * Response for batch sync
 */
interface BatchSyncResponse {
    success: boolean;
    synced: number;
    stravaFallbackUsed: boolean;
    message?: string;
}

/**
 * POST /api/health/sync-batch
 *
 * Batch upsert daily health data (steps and weight) from Health Connect.
 * If no weight data is provided, falls back to fetching weight from Strava profile.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as BatchSyncRequest;
        const { data } = body;

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format, expected array' }, { status: 400 });
        }

        // Check if we have any weight data in the incoming payload
        const hasWeightData = data.some((entry) => entry.weight !== undefined && entry.weight !== null);

        let recordsToSync = [...data];
        let stravaFallbackUsed = false;

        // Strava Fallback: No weight data found, try to fetch from Strava
        if (!hasWeightData) {
            logger.info('No weight data in Health Connect payload, attempting Strava fallback', {
                userId: session.user.id
            });

            const stravaWeight = await getStravaAthleteWeight(session.user.id);

            if (stravaWeight !== null && stravaWeight > 0) {
                // Add current day's weight from Strava
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

                // Check if we already have an entry for today
                const todayEntry = recordsToSync.find((entry) => entry.date === todayStr);

                if (todayEntry) {
                    todayEntry.weight = stravaWeight;
                } else {
                    recordsToSync.push({
                        date: todayStr,
                        weight: stravaWeight
                    });
                }

                stravaFallbackUsed = true;
                logger.info('Strava weight fallback successful', {
                    userId: session.user.id,
                    weight: stravaWeight
                });
            } else {
                logger.info('Strava weight fallback failed - no weight available', {
                    userId: session.user.id
                });
            }
        }

        // Batch upsert all records using a transaction for efficiency
        let syncedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const entry of recordsToSync) {
                const { date, steps, weight } = entry;

                if (!date) continue;

                const dayKey = toUtcDayKey(date);
                const dateObj = parseUtcDayKey(dayKey);

                if (steps == null && weight == null) continue;

                await upsertDailyHealthLog({
                    db: tx,
                    userId: session.user.id,
                    date: dateObj,
                    source: weight != null && stravaFallbackUsed && dayKey === toUtcDayKey(new Date()) ? 'strava' : 'health_connect',
                    steps: steps ?? undefined,
                    weight,
                });

                syncedCount++;
            }
        });

        const response: BatchSyncResponse = {
            success: true,
            synced: syncedCount,
            stravaFallbackUsed
        };

        return NextResponse.json(response);
    } catch (error) {
        logger.error('Batch health sync error', { error: error instanceof Error ? error.message : String(error) });
        return handleError(error);
    }
}
