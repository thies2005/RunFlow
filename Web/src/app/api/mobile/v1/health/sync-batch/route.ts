import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { getStravaAthleteWeight } from '@/lib/strava/fetch';
import { logger } from '@/lib/logging/logger';
import { upsertDailyHealthLog } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';
import { healthDataConsentWithdrawn, HEALTH_DATA_WITHDRAWN_MESSAGE } from '@/lib/health/consent-gate';
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

/**
 * Cap on client-controlled entries per sync batch (p3:
 * UNBOUNDED_HEALTH_SYNC_BATCH). Each entry costs two sequential DB round
 * trips (findUnique + upsert) inside one interactive transaction with a 5s
 * default timeout, so an unbounded array pins a connection and burns DB
 * CPU/WAL linearly with attacker-controlled length. 500 matches the JSON
 * plan-import workout cap and comfortably exceeds a day's worth of daily
 * health entries.
 */
const MAX_HEALTH_SYNC_BATCH_ENTRIES = 500;

/**
 * Structural validation per entry (date shape + numeric types) before the
 * transaction. Wrong-shaped entries previously surfaced as mid-transaction
 * Prisma 500s; they are now a 400 before any DB work.
 */
function isValidSyncEntry(entry: unknown, numericKeys: readonly string[]): boolean {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.date !== 'string' || !e.date.trim()) return false;
    if (Number.isNaN(new Date(e.date).getTime())) return false;
    for (const key of numericKeys) {
        const value = e[key];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    }
    return true;
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

        if (data.length > MAX_HEALTH_SYNC_BATCH_ENTRIES) {
            return errorResponses.badRequest(
                `Sync batch too large: ${data.length} entries (max ${MAX_HEALTH_SYNC_BATCH_ENTRIES} per request). Please split the data into smaller batches.`
            );
        }

        const invalidEntryIndex = data.findIndex(
            (entry) => !isValidSyncEntry(entry, ['steps', 'weight', 'activeCalories'])
        );
        if (invalidEntryIndex !== -1) {
            return errorResponses.badRequest(
                `Invalid entry at index ${invalidEntryIndex}: expected { date: string, steps?: number, weight?: number, activeCalories?: number }`
            );
        }

        const userId = authUser.id;

        // Re-ingestion gate for withdrawn HEALTH_DATA consent (p3:
        // HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE): withdrawal deletes the
        // user's health rows, so silently re-upserting them must be refused.
        if (await healthDataConsentWithdrawn(userId)) {
            return errorResponses.badRequest(HEALTH_DATA_WITHDRAWN_MESSAGE);
        }

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
