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
import { refreshStravaToken } from './oauth';
import { fetchStravaActivities, fetchSingleActivity, fetchActivityStreams, fetchAthleteProfile } from './fetch';
import { DAY_MS } from '@/lib/constants';
import { enrichActivityMetrics, transformActivityData, type MetricsInput } from './transform';
import { upsertActivity, createNewActivityNotification, updateUserProfile, updateSyncStatus, fetchExistingActivities, getLastActivityDate } from './persistence';
import { calculateAndSaveFitnessMetrics, type ModifiedActivity } from './fitness';
import { logger } from '@/lib/logging/logger';
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

export async function syncUserActivities(userId: string, range?: string): Promise<{
    synced: number;
    skipped: number;
    errors: number;
}> {
    await updateSyncStatus(userId, { syncInProgress: true });

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
                const lastActivity = await getLastActivityDate(userId);
                if (lastActivity) {
                    after = Math.floor(lastActivity.getTime() / 1000);
                } else {
                    after = undefined;
                }
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
        let page = 1;
        let hasMore = true;
        const modifiedActivities: ModifiedActivity[] = [];
        let currentHrMax = user?.hrMax || null;

        while (hasMore) {
            const activities = await fetchStravaActivities(accessToken, page, after);

            logger.info('Sync page fetched', { page, activityCount: activities.length, after });

            if (activities.length === 0) {
                hasMore = false;
                break;
            }

            const stravaIds = activities.map(a => BigInt(a.id));
            const existingMap = await fetchExistingActivities(stravaIds);

            const limit = pLimit(SYNC_CONCURRENCY);

            const results = await Promise.all(activities.map((activity, index) => limit(async () => {
                try {
                    const existing = existingMap.get(BigInt(activity.id).toString()) || null;

                    const isNew = !existing;
                    let needsUpdate = existing && existing.hasHeartrate && (existing.hrZone1Time === null || existing.hrZone6Time === null);

                    if (existing && !needsUpdate) {
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

                    if (activity.max_heartrate &&
                        activity.max_heartrate > (currentHrMax || 0) + 5 &&
                        activity.max_heartrate < HR_MAX_UPPER_BOUND) {

                        // Note: This might have race conditions in parallel execution,
                        // but worst case is multiple redundant updates.
                        currentHrMax = activity.max_heartrate;

                        await updateUserProfile(userId, { hrMax: currentHrMax });

                        logger.info('Auto-detected new HR Max', { userId, hrMax: currentHrMax });
                    }

                    let streams = null;

                    if (['Run', 'VirtualRun', 'Ride', 'VirtualRide'].includes(activity.type)) {
                        streams = await fetchActivityStreams(accessToken, activity.id);
                    }

                    const metricsInput: MetricsInput = {
                        activity,
                        user: {
                            hrMax: user?.hrMax || null,
                            hrRest: user?.hrRest || null,
                            sex: user?.sex || null,
                            weight: user?.weight || null,
                            birthDate: user?.birthDate || null,
                            hrZone1Max: user?.hrZone1Max || null,
                            hrZone2Max: user?.hrZone2Max || null,
                            hrZone3Max: user?.hrZone3Max || null,
                            hrZone4Max: user?.hrZone4Max || null,
                            hrZone5Max: user?.hrZone5Max || null,
                            hrZone6Max: user?.hrZone6Max || null,
                        },
                        currentHrMax,
                        streams,
                        goals: user?.goals,
                    };

                    const metrics = enrichActivityMetrics(metricsInput);
                    const activityData = transformActivityData(activity, metrics);
                    activityData.streams = streams;

                    let resultStatus: 'synced' = 'synced';

                    if (isNew) {
                        await prisma.activity.create({
                            data: {
                                userId,
                                stravaId: BigInt(activity.id),
                                ...activityData
                            },
                        });
                    } else if (needsUpdate) {
                        await prisma.activity.update({
                            where: { id: existing.id },
                            data: {
                                ...activityData,
                                updatedAt: new Date()
                            }
                        });
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

            page++;

            if (page > 50) {
                logger.warn('Reached max pages limit', { userId, page });
                break;
            }
        }

        await updateSyncStatus(userId, {
            lastSyncAt: new Date(),
            syncInProgress: false,
        });

        if (modifiedActivities.length > 0) {
            await calculateAndSaveFitnessMetrics(userId, modifiedActivities);
            logger.info('Updated fitness cache', { userId, activityCount: modifiedActivities.length });
        }

        return { synced, skipped, errors };
    } catch (err) {
        try {
            await updateSyncStatus(userId, { syncInProgress: false });
        } catch (resetErr) {
            logger.error('Failed to reset syncInProgress flag', { userId, error: resetErr instanceof Error ? resetErr.message : String(resetErr) });
        }
        throw err;
    }
}

export async function getSyncStatus(userId: string): Promise<{
    syncInProgress: boolean;
    lastSyncAt: Date | null;
    totalActivities: number;
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            syncInProgress: true,
            lastSyncAt: true,
            _count: {
                select: { activities: true },
            },
        },
    });

    let syncInProgress = user?.syncInProgress ?? false;

    const SYNC_TIMEOUT_MS = 10 * 60 * 1000;
    if (syncInProgress && user?.lastSyncAt) {
        const timeSinceLastSync = Date.now() - user.lastSyncAt.getTime();
        if (timeSinceLastSync > SYNC_TIMEOUT_MS) {
            await prisma.user.update({
                where: { id: userId },
                data: { syncInProgress: false },
            });
            syncInProgress = false;
            logger.warn('Auto-reset stuck syncInProgress flag', { userId, minutesSinceLastSync: Math.round(timeSinceLastSync / 1000 / 60) });
        }
    }

    return {
        syncInProgress,
        lastSyncAt: user?.lastSyncAt ?? null,
        totalActivities: user?._count?.activities ?? 0,
    };
}

export async function syncActivityById(userId: string, activityId: number): Promise<void> {
    try {
        const accessToken = await refreshStravaToken(userId);
        if (!accessToken) {
            logger.error('syncActivityById: Failed to refresh token', { userId });
            return;
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
            },
        });

        if (!user) {
            logger.error('syncActivityById: User not found', { userId });
            return;
        }

        const activity = await fetchSingleActivity(accessToken, activityId);

        let streams = null;

        if (['Run', 'VirtualRun', 'Ride', 'VirtualRide'].includes(activity.type)) {
            streams = await fetchActivityStreams(accessToken, activity.id);
        }

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
            },
            currentHrMax: user.hrMax,
            streams,
        };

        const metrics = enrichActivityMetrics(metricsInput);
        const activityData = transformActivityData(activity, metrics);
        activityData.streams = streams;

        const { created } = await upsertActivity(userId, activity.id, activityData);

        if (created) {
            await createNewActivityNotification(userId, activityData.name);
        }

        logger.info('syncActivityById: Successfully synced activity', { userId, activityId });

        await calculateAndSaveFitnessMetrics(userId, [{ startDate: new Date(activity.start_date) }]);

    } catch (error) {
        logger.error('syncActivityById: Error syncing activity', { userId, activityId, error: error instanceof Error ? error.message : String(error) });
    }
}
