import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { getStravaAthleteWeight } from '@/lib/strava/fetch';
import { logger } from '@/lib/logging/logger';
import { upsertDailyHealthLog } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';

interface BatchHealthData {
    date: string;
    steps?: number;
    weight?: number;
    activeCalories?: number;
}

interface BatchSyncRequest {
    data: BatchHealthData[];
}

interface BatchSyncResponse {
    success: boolean;
    synced: number;
    stravaFallbackUsed: boolean;
    message?: string;
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.sync);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = (await request.json()) as BatchSyncRequest;
        const { data } = body;

        if (!Array.isArray(data)) {
            return errorResponses.badRequest('Invalid data format, expected array');
        }

        const userId = authUser.id;

        const hasWeightData = data.some((entry) => entry.weight !== undefined && entry.weight !== null);

        let recordsToSync = [...data];
        let stravaFallbackUsed = false;

        if (!hasWeightData) {
            logger.info('No weight data in Health Connect payload, attempting Strava fallback', {
                userId
            });

            const stravaWeight = await getStravaAthleteWeight(userId);

            if (stravaWeight !== null && stravaWeight > 0) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

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
                    userId,
                    weight: stravaWeight
                });
            } else {
                logger.info('Strava weight fallback failed - no weight available', {
                    userId
                });
            }
        }

        let syncedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const entry of recordsToSync) {
                const { date, steps, weight, activeCalories } = entry;

                if (!date) continue;

                const dayKey = toUtcDayKey(date);
                const dateObj = parseUtcDayKey(dayKey);

                if (steps == null && weight == null && activeCalories == null) continue;

                await upsertDailyHealthLog({
                    db: tx,
                    userId,
                    date: dateObj,
                    source: weight != null && stravaFallbackUsed && dayKey === toUtcDayKey(new Date()) ? 'strava' : 'health_connect',
                    steps: steps ?? undefined,
                    weight,
                    activeCalories,
                });

                syncedCount++;
            }
        });

        const response: BatchSyncResponse = {
            success: true,
            synced: syncedCount,
            stravaFallbackUsed
        };

        return NextResponse.json(response, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        logger.error('Batch health sync error', { error: error instanceof Error ? error.message : String(error) });
        return handleError(error);
    }
}
