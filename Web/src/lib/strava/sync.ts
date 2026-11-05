/**
 * Strava Activity Sync Service - Orchestration Module
 * 
 * Coordinates the sync workflow using specialized modules:
 * - fetch.ts: API communication
 * - transform.ts: Data transformation
 * - persistence.ts: Database operations
 * - fitness.ts: Metrics calculation
 * 
 * Features:
 * - Paginated fetch (200 per page maximum)
 * - Rate limiting: 100 requests per 15 minutes
 * - Exponential backoff on 429 errors
 * - Stores raw JSON + parsed metrics
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { refreshStravaToken } from './oauth';
import { fetchStravaActivities, fetchSingleActivity, fetchActivityStreams, fetchAthleteProfile, shouldFetchActivityStreams, MAX_PER_PAGE } from './fetch';
import { DAY_MS } from '@/lib/constants';
import { enrichActivityMetrics, transformActivityData, type MetricsInput } from './transform';
import { upsertActivity, createNewActivityNotification, updateUserProfile, fetchExistingActivities, getLastActivityDate } from './persistence';
import { calculateAndSaveFitnessMetrics, type ModifiedActivity } from './fitness';
import { logger } from '@/lib/logging/logger';
import { bestEffortVdot } from '@/lib/metrics/effectiveVdot';
import { calculatePowerCurve, estimateFtpFromPowerCurve } from '@/lib/metrics/power';
import pLimit from 'p-limit';

const HR_MAX_UPPER_BOUND = 220;
const SYNC_CONCURRENCY = 10;

function getRangeStartTimestamp(range?: string): number | undefined {
    if (!range || range === 'ALL') return undefined;

    const now = Date.now();
    const day = DAY_MS;

    switch (range) {
        case '1_MONTH': return Math.floor((now - 30 * day) / 1000);
        case '3_MONTHS': return Math.floor((now - 90 * day) / 1000);
        case '6_MONTHS': return Math.floor((now - 180 * day) / 1000);
        case '1_YEAR': return Math.floor((now - 365 * day) / 1000);
        case '2_YEARS': return Math.floor((now - 730 * day) / 1000);
        default: return undefined;
    }
}

export async function syncUserActivities(
    userId: string, range?: string, assertLease: () => void = () => {}, recovering = false,
): Promise<{
    synced: number;
    skipped: number;
    errors: number;
    syncedActivityIds: string[];
}> {
    const syncStartedAt = new Date();
    try {
        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                hrMax: true,
                hrRest: true,
                sex: true,
                weight: true,
                birthDate: true,
                lastSyncAt: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                ftpWatts: true,
                autoEstimateFtp: true,
                goals: {
                    where: { isActive: true },
                    select: { currentVdot: true, isActive: true },
                    take: 1
                },
            },
        });

        let accessToken;
        try {
            accessToken = await refreshStravaToken(userId);
        } catch (tokenErr: unknown) {
            logger.error('Sync failed: Token refresh error', { userId, error: tokenErr instanceof Error ? tokenErr.message : 'Unknown error' });
            throw new Error(`Authentication failed: ${tokenErr instanceof Error ? tokenErr.message : 'Unknown error'}`);
        }

        if (!accessToken) {
            logger.error('Sync failed: No access token available', { userId });
            throw new Error('Failed to get Strava access token - user may need to re-authenticate');
        }

        if (!user?.hrMax || !user?.sex) {
            try {
                const profile = await fetchAthleteProfile(accessToken);
                if (profile) {
                    type UserProfileUpdate = { sex?: 'FEMALE' | 'MALE' | 'OTHER'; hrMax?: number };
                    const updateData: UserProfileUpdate = {};
                    if (!user?.sex && profile.sex) updateData.sex = profile.sex === 'F' ? 'FEMALE' : 'MALE';
                    if (!user?.hrMax && profile.max_heart_rate) updateData.hrMax = profile.max_heart_rate;

                    if (Object.keys(updateData).length > 0) {
                        const updatedUser = await prisma.user.update({
                            where: { id: userId },
                            data: updateData,
                            include: {
                                goals: {
                                    where: { isActive: true },
                                    select: { currentVdot: true, isActive: true },
                                    take: 1
                                }
                            }
                        });
                        user = {
                            ...user,
                            ...updatedUser,
                            hrZone1Max: user?.hrZone1Max ?? updatedUser.hrZone1Max,
                            hrZone2Max: user?.hrZone2Max ?? updatedUser.hrZone2Max,
                            hrZone3Max: user?.hrZone3Max ?? updatedUser.hrZone3Max,
                            hrZone4Max: user?.hrZone4Max ?? updatedUser.hrZone4Max,
                        };
                        logger.info('Updated user profile from Strava', { updateData });
                    }
                }
            } catch (err) {
                logger.warn('Error fetching/updating athlete profile', { error: err instanceof Error ? err.message : String(err) });
            }
        }

        let after: number | undefined;

        if (range) {
            if (range === 'ALL') {
                after = undefined;
            } else if (range === 'SINCE_LAST_ACTIVITY') {
                // Webhooks can insert a newer activity before a delayed or
                // missed one. Base catch-up on the last successful scan, and
                // overlap to recover uploads dated before that scan.
                const watermark = user?.lastSyncAt ?? await getLastActivityDate(userId);
                if (watermark) after = Math.floor((watermark.getTime() - 2 * DAY_MS) / 1000);
            } else {
                after = getRangeStartTimestamp(range);
            }
        } else {
            after = user?.lastSyncAt
                ? Math.floor(user.lastSyncAt.getTime() / 1000)
                : undefined;
        }

        let synced = 0;
        let skipped = 0;
        let errors = 0;
        const syncedActivityIds: string[] = [];
        let page = 1;
        let hasMore = true;
        const modifiedActivities: ModifiedActivity[] = [];
        let earliestRecoveredActivity: Date | undefined;
        let currentHrMax = user?.hrMax || null;

        while (hasMore) {
            assertLease();
            const activities = await fetchStravaActivities(accessToken, page, after);
            assertLease();

            logger.info('Sync page fetched', { page, activityCount: activities.length, after });

            if (activities.length === 0) {
                hasMore = false;
                break;
            }

            // A crashed worker may have saved activities without rebuilding
            // fitness. Rebuild from the oldest row in the replay window even
            // when every activity already has its metrics.
            if (recovering) {
                for (const activity of activities) {
                    const date = new Date(activity.start_date);
                    if (Number.isFinite(+date) && (!earliestRecoveredActivity || date < earliestRecoveredActivity)) {
                        earliestRecoveredActivity = date;
                    }
                }
            }

            const stravaIds = activities.map(a => BigInt(a.id));
            const existingMap = await fetchExistingActivities(stravaIds, userId);

            const limit = pLimit(SYNC_CONCURRENCY);

            const results = await Promise.all(activities.map((activity, index) => limit(async () => {
                try {
                    const existing = existingMap.get(BigInt(activity.id).toString()) || null;

                    const isNew = !existing;
                    let needsUpdate = existing && existing.hasHeartrate && (existing.hrZone1Time === null || existing.hrZone6Time === null);

                    if (existing && !needsUpdate) {
                        if (['RIDE', 'VIRTUAL_RIDE'].includes(existing.type)) {
                            if ((existing.averageWatts !== null || activity.average_watts) && existing.npWatts === null) {
                                needsUpdate = true;
                            }
                        }

                        const calorieActivityTypes = ['RUN', 'RIDE', 'VIRTUAL_RIDE'];
                        if (calorieActivityTypes.includes(existing.type) && existing.calories === null) {
                            needsUpdate = true;
                        }

                        if (existing.type === 'RUN' && existing.hasHeartrate && existing.estimatedVdot === null) {
                            needsUpdate = true;
                        }

                        if (existing.hasHeartrate) {
                            const totalZoneTime = (existing.hrZone1Time || 0) + (existing.hrZone2Time || 0) +
                                (existing.hrZone3Time || 0) + (existing.hrZone4Time || 0) +
                                (existing.hrZone5Time || 0);
                            if (totalZoneTime === 0) {
                                needsUpdate = true;
                            }
                        }
                    }

                    if (page === 1 && (skipped + index) < 3) {
                        logger.info('Activity sync status', {
                            activityId: activity.id,
                            isNew,
                            needsUpdate,
                            hasHeartrate: activity.has_heartrate,
                            existingZone1: existing?.hrZone1Time
                        });
                    }

                    if (!isNew && !needsUpdate) {
                        return { status: 'skipped' as const };
                    }

                    // H-04 + spike guard: only trust max_heartrate as an hrMax upgrade
                    // candidate when the activity itself was a real high-effort effort.
                    // A single optical-sensor cadence-lock spike (low avg HR, very high
                    // max HR) must not permanently ratchet up hrMax.
                    if (activity.max_heartrate &&
                        activity.max_heartrate > (currentHrMax || 0) + 5 &&
                        activity.max_heartrate < HR_MAX_UPPER_BOUND &&
                        activity.average_heartrate && activity.average_heartrate >= 135 &&
                        (activity.max_heartrate - activity.average_heartrate) <= 45) {

                        // Track highest observed HR max; persist after the loop (H-04)
                        currentHrMax = activity.max_heartrate;
                        logger.info('Auto-detected new HR Max candidate', { userId, hrMax: currentHrMax });
                    }

                    let streams = null;

                    if (shouldFetchActivityStreams(activity)) {
                        streams = await fetchActivityStreams(accessToken, activity.id, true);
                    }

                    assertLease();
                    const metricsInput: MetricsInput = {
                        activity,
                        user: {
                            hrMax: user?.hrMax ?? null,
                            hrRest: user?.hrRest ?? null,
                            sex: user?.sex ?? null,
                            weight: user?.weight ?? null,
                            birthDate: user?.birthDate ?? null,
                            hrZone1Max: user?.hrZone1Max ?? null,
                            hrZone2Max: user?.hrZone2Max ?? null,
                            hrZone3Max: user?.hrZone3Max ?? null,
                            hrZone4Max: user?.hrZone4Max ?? null,
                            hrZone5Max: user?.hrZone5Max ?? null,
                            hrZone6Max: user?.hrZone6Max ?? null,
                            ftpWatts: user?.ftpWatts ?? null,
                        },
                        currentHrMax,
                        streams,
                        goals: user?.goals,
                    };

                    const metrics = enrichActivityMetrics(metricsInput);
                    const activityData = transformActivityData(activity, metrics);
                    activityData.streams = streams ?? Prisma.JsonNull;

                    if (streams?.watts && streams.watts.length > 0) {
                        const powerCurve = calculatePowerCurve(streams.watts, streams.time);
                        const eFtp = estimateFtpFromPowerCurve(powerCurve, activity.weighted_average_watts ?? activity.average_watts);
                        if (user?.autoEstimateFtp && eFtp && eFtp > (user.ftpWatts || 0)) {
                            await prisma.user.update({
                                where: { id: userId },
                                data: { ftpWatts: eFtp },
                            });
                            logger.info('Auto-estimated higher cycling FTP', { userId, oldFtp: user.ftpWatts, newFtp: eFtp });
                            user.ftpWatts = eFtp;
                        }
                    }

                    if (isNew) {
                        const createdActivity = await prisma.activity.create({
                            data: {
                                userId,
                                stravaId: BigInt(activity.id),
                                ...activityData
                            },
                        });
                        syncedActivityIds.push(createdActivity.id);
                    } else if (needsUpdate) {
                        const updatedActivity = await prisma.activity.update({
                            where: { id: existing.id },
                            data: {
                                ...activityData,
                                updatedAt: new Date()
                            }
                        });
                        syncedActivityIds.push(updatedActivity.id);
                    }

                    if (isNew || needsUpdate) {
                        return { status: 'synced' as const, modifiedDate: new Date(activity.start_date) };
                    }

                    return { status: 'skipped' as const };

                } catch (err) {
                    logger.error('Error syncing activity', { activityId: activity.id, error: err instanceof Error ? err.message : String(err) });
                    return { status: 'error' as const };
                }
            })));

            for (const result of results) {
                if (result.status === 'synced') {
                    synced++;
                    if (result.modifiedDate) {
                        modifiedActivities.push({ startDate: result.modifiedDate });
                    }
                } else if (result.status === 'skipped') {
                    skipped++;
                } else if (result.status === 'error') {
                    errors++;
                }
            }

            if (activities.length < MAX_PER_PAGE) break;
            page++;

            if (page > 50) {
                logger.warn('Reached max pages limit', { userId, page });
                errors++;
                break;
            }
        }

        // Commit derived maximum heart rate if we detected a new one (H-04 fix)
        assertLease();
        if (currentHrMax !== null && currentHrMax > (user?.hrMax || 0)) {
            await updateUserProfile(userId, { hrMax: currentHrMax });
        }

        assertLease();
        if (earliestRecoveredActivity) modifiedActivities.push({ startDate: earliestRecoveredActivity });
        if (modifiedActivities.length > 0) {
            await recomputeStravaFitness(userId, modifiedActivities);
        }
        assertLease();
        // Publish completion after dependent metrics are ready. Failed pages
        // retain the previous successful catch-up timestamp.
        if (errors === 0) {
            await prisma.user.update({ where: { id: userId }, data: { lastSyncAt: syncStartedAt } });
        } else {
            logger.warn('Sync completed with errors; not advancing lastSyncAt', { userId, errors });
        }
        return { synced, skipped, errors, syncedActivityIds };
    } catch (error) {
        logger.error('Strava activity scan failed', { userId, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}

export async function recomputeStravaFitness(userId: string, activities: ModifiedActivity[], throwOnError = false) {
    if (activities.length === 0) return;
    await calculateAndSaveFitnessMetrics(userId, activities, throwOnError);
    await updateAutoRevolvingVo2max(userId, throwOnError);
}

async function updateAutoRevolvingVo2max(userId: string, throwOnError: boolean): Promise<void> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { vdotCorrectionFactor: true }
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const runActivities = await prisma.activity.findMany({
            where: {
                userId,
                type: 'RUN',
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                startDate: true,
                distance: true,
                movingTime: true,
                type: true,
            },
            orderBy: { startDate: 'desc' },
        });

        if (runActivities.length === 0) return;

        // Persist the best-effort (performance) VDOT so the stored value is
        // never the HR-based aerobic-fitness number. bestEffortVdot filters to
        // runs >= 5 km within the last 90 days itself.
        const correctionFactor = user?.vdotCorrectionFactor || 1.0;
        const vdot = bestEffortVdot(runActivities, correctionFactor);

        if (vdot > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    autoRevolvingVo2max: vdot,
                    autoRevolvingCalculatedAt: new Date(),
                }
            });
        }
    } catch (err) {
        logger.error('Failed to update auto revolving VO2max', { userId, error: err instanceof Error ? err.message : String(err) });
        if (throwOnError) throw err;
    }
}

function leaseIsActive(expiresAt: Date | null | undefined): boolean {
    return Boolean(expiresAt && expiresAt.getTime() > Date.now());
}

export async function getSyncProgress(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stravaSyncExpiresAt: true, stravaSyncRange: true, lastSyncAt: true },
    });
    return { syncInProgress: Boolean(user?.stravaSyncRange) || leaseIsActive(user?.stravaSyncExpiresAt), lastSyncAt: user?.lastSyncAt ?? null };
}

export async function getSyncStatus(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stravaSyncExpiresAt: true, stravaSyncRange: true, lastSyncAt: true, _count: { select: { activities: true } } },
    });
    return {
        syncInProgress: Boolean(user?.stravaSyncRange) || leaseIsActive(user?.stravaSyncExpiresAt),
        lastSyncAt: user?.lastSyncAt ?? null,
        totalActivities: user?._count?.activities ?? 0,
    };
}

export async function syncActivityById(userId: string, activityId: number, assertLease: () => void) {
    const accessToken = await refreshStravaToken(userId);
    if (!accessToken) {
        throw new Error('Strava access token unavailable');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            hrMax: true,
            hrRest: true,
            sex: true,
            weight: true,
            birthDate: true,
            hrZone1Max: true,
            hrZone2Max: true,
            hrZone3Max: true,
            hrZone4Max: true,
            hrZone5Max: true,
            hrZone6Max: true,
            ftpWatts: true,
            autoEstimateFtp: true,
        },
    });

    if (!user) {
        throw new Error('Strava user unavailable');
    }

    const activity = await fetchSingleActivity(accessToken, activityId);

    let streams = null;

    if (shouldFetchActivityStreams(activity)) {
        streams = await fetchActivityStreams(accessToken, activity.id, true);
    }
    assertLease();

    const metricsInput: MetricsInput = {
        activity,
        user: {
            hrMax: user.hrMax,
            hrRest: user.hrRest,
            sex: user.sex,
            weight: user.weight,
            birthDate: user.birthDate,
            hrZone1Max: user.hrZone1Max,
            hrZone2Max: user.hrZone2Max,
            hrZone3Max: user.hrZone3Max,
            hrZone4Max: user.hrZone4Max,
            hrZone5Max: user.hrZone5Max,
            hrZone6Max: user.hrZone6Max,
            ftpWatts: user.ftpWatts ?? null,
        },
        currentHrMax: user.hrMax,
        streams,
    };

    const metrics = enrichActivityMetrics(metricsInput);
    const activityData = transformActivityData(activity, metrics);
    activityData.streams = streams ?? Prisma.JsonNull;

    if (streams?.watts && streams.watts.length > 0) {
        const powerCurve = calculatePowerCurve(streams.watts, streams.time);
        const eFtp = estimateFtpFromPowerCurve(powerCurve, activity.weighted_average_watts ?? activity.average_watts);
        if (user.autoEstimateFtp && eFtp && eFtp > (user.ftpWatts || 0)) {
            await prisma.user.update({
                where: { id: userId },
                data: { ftpWatts: eFtp },
            });
            logger.info('Auto-estimated higher cycling FTP (syncActivityById)', { userId, oldFtp: user.ftpWatts, newFtp: eFtp });
            user.ftpWatts = eFtp;
        }
    }

    assertLease();
    const { created, id } = await upsertActivity(userId, activity.id, activityData);
    if (created) await createNewActivityNotification(userId, activityData.name);
    return { id, startDate: activityData.startDate };
}
