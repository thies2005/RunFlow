/**
 * Strava Activity Sync Service
 * 
 * Features:
 * - Paginated fetch (200 per page maximum)
 * - Rate limiting: 100 requests per 15 minutes
 * - Exponential backoff on 429 errors
 * - Stores raw JSON + parsed metrics
 */

import { prisma } from '@/lib/db';
import { refreshStravaToken } from './oauth';
import { calculateTrimp, type Sex } from '@/lib/metrics/trimp';
import { calculateRunningTss, getActivityContribution } from '@/lib/metrics/fitness';
import { WorkoutType } from '@/lib/types';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const MAX_PER_PAGE = 200;
const RATE_LIMIT_REQUESTS = 95; // 5% buffer under Strava's 100 req/15min limit
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RETRIES = 3; // Maximum retry attempts for rate-limited requests

// Conditional logger - suppresses in production
const logger = {
    info: (...args: unknown[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[Strava]', ...args);
        }
    },
    warn: (...args: unknown[]) => console.warn('[Strava]', ...args),
    error: (...args: unknown[]) => console.error('[Strava]', ...args),
};

// Simple in-memory rate limiter
const rateLimiter = {
    requests: 0,
    windowStart: Date.now(),

    async checkAndWait(): Promise<void> {
        const now = Date.now();

        // Reset window if expired
        if (now - this.windowStart > RATE_LIMIT_WINDOW_MS) {
            this.requests = 0;
            this.windowStart = now;
        }

        // If at limit, wait for window to reset
        if (this.requests >= RATE_LIMIT_REQUESTS) {
            const waitTime = RATE_LIMIT_WINDOW_MS - (now - this.windowStart) + 1000;
            logger.info(`Rate limit reached, waiting ${waitTime / 1000}s`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requests = 0;
            this.windowStart = Date.now();
        }

        this.requests++;
    },
};

/**
 * Safely convert a value to BigInt, handling edge cases
 */
function safeBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    if (typeof value === 'string') return BigInt(value);
    throw new Error(`Cannot convert ${typeof value} to BigInt`);
}

export interface StravaActivity {
    id: number;
    name: string;
    type: string;
    sport_type: string;
    start_date: string;
    timezone: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    average_speed: number;
    max_speed: number;
    average_grade_adjusted_speed?: number; // Added GAP
    average_heartrate?: number;
    max_heartrate?: number;
    has_heartrate: boolean;
    total_elevation_gain: number;
    elev_high?: number;
    elev_low?: number;
    description?: string;
    workout_type?: number;
}

/**
 * Map Strava activity type to our enum
 */
function mapActivityType(stravaType: string): string {
    const typeMap: Record<string, string> = {
        'Run': 'RUN',
        'VirtualRun': 'RUN',
        'TrailRun': 'RUN',
        'Ride': 'RIDE',
        'VirtualRide': 'VIRTUAL_RIDE',
        'Walk': 'WALK',
        'Hike': 'HIKE',
        'Swim': 'SWIM',
        'Workout': 'WORKOUT',
    };
    return typeMap[stravaType] || 'OTHER';
}

/**
 * Determine workout type based on Strava data and heuristics
 */
function determineWorkoutType(activity: StravaActivity): WorkoutType {
    // 0: Run (default)
    // 1: Race
    // 2: Long Run
    // 3: Workout
    if (activity.workout_type === 1) return 'RACE';
    if (activity.workout_type === 2) return 'LONG_RUN';
    if (activity.workout_type === 3) return 'INTERVALS'; // Strava calls it 'workout'

    // Heuristics for untagged runs
    if (activity.type === 'Run' || activity.type === 'VirtualRun') {
        const distKm = activity.distance / 1000;

        // Long run classification if not explicitly tagged
        if (distKm >= 15) return 'LONG_RUN'; // Simple threshold for now

        return 'EASY';
    }

    if (activity.type === 'Ride' || activity.type === 'VirtualRide') return 'RIDE';
    if (activity.type === 'Swim') return 'SWIM';
    if (activity.type === 'WeightTraining') return 'STRENGTH';

    return 'OTHER';
}

/**
 * Fetch activities with pagination and rate limiting
 * @param accessToken - Strava OAuth access token
 * @param page - Page number (1-indexed)
 * @param after - Only fetch activities after this Unix timestamp
 * @param retryCount - Current retry attempt (for rate limiting)
 */
async function fetchActivities(
    accessToken: string,
    page: number = 1,
    after?: number,
    retryCount: number = 0
): Promise<StravaActivity[]> {
    await rateLimiter.checkAndWait();

    const params = new URLSearchParams({
        page: page.toString(),
        per_page: MAX_PER_PAGE.toString(),
    });

    if (after) {
        params.append('after', after.toString());
    }

    const response = await fetch(
        `${STRAVA_API_BASE}/athlete/activities?${params}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (response.status === 429) {
        if (retryCount >= MAX_RETRIES) {
            throw new Error(`Strava rate limit exceeded after ${MAX_RETRIES} retries`);
        }
        const retryAfter = parseInt(response.headers.get('Retry-After') || '900');
        logger.warn(`Rate limited by Strava, waiting ${retryAfter}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchActivities(accessToken, page, after, retryCount + 1);
    }

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

/**
 * Fetch activity streams (heartrate, time)
 * @param accessToken - Strava OAuth access token
 * @param activityId - Strava activity ID
 * @param retryCount - Current retry attempt (for rate limiting)
 */
async function fetchActivityStreams(
    accessToken: string,
    activityId: number,
    retryCount: number = 0
): Promise<{ time: number[]; heartrate?: number[]; velocity_smooth?: number[]; altitude?: number[]; cadence?: number[] } | null> {
    await rateLimiter.checkAndWait();

    const response = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=time,heartrate,velocity_smooth,altitude,cadence&key_by_type=true`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (response.status === 429) {
        if (retryCount >= MAX_RETRIES) {
            logger.warn(`Strava rate limit exceeded for streams after ${MAX_RETRIES} retries`);
            return null; // Return null instead of throwing to not break full sync
        }
        const retryAfter = parseInt(response.headers.get('Retry-After') || '900');
        logger.warn(`Rate limited fetching streams, waiting ${retryAfter}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchActivityStreams(accessToken, activityId, retryCount + 1);
    }

    if (!response.ok) return null;

    const streams = await response.json();
    if (!streams.time) return null;

    return {
        time: streams.time.data,
        heartrate: streams.heartrate?.data,
        velocity_smooth: streams.velocity_smooth?.data,
        altitude: streams.altitude?.data,
        cadence: streams.cadence?.data,
    };
}

/**
 * Calculate time in zones based on HR stream and user-configured zone thresholds
 * @param heartrates - Array of heart rate values from stream
 * @param times - Array of timestamps from stream
 * @param hrMax - User's maximum heart rate
 * @param zoneThresholds - User-configured zone thresholds (% of hrMax)
 */
function calculateZoneTimes(
    heartrates: number[],
    times: number[],
    hrMax: number,
    zoneThresholds: { z1: number; z2: number; z3: number; z4: number } = { z1: 60, z2: 70, z3: 80, z4: 90 }
): { z1: number; z2: number; z3: number; z4: number; z5: number } {
    const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

    // Use user-configured percentages or defaults
    const z1Ceil = Math.floor(hrMax * (zoneThresholds.z1 / 100));
    const z2Ceil = Math.floor(hrMax * (zoneThresholds.z2 / 100));
    const z3Ceil = Math.floor(hrMax * (zoneThresholds.z3 / 100));
    const z4Ceil = Math.floor(hrMax * (zoneThresholds.z4 / 100));

    for (let i = 0; i < heartrates.length; i++) {
        // Calculate duration of this point
        // Stream time is cumulative relative to start
        // We assume constant sampling or take diff to next point?
        // Strava streams usually align. Let's take diff to next, or 1s if last
        // Actually, just assumed 1s for simplicity usually works, but streams can be sparse.
        // Better: (nextTime - currTime)
        const duration = (i < times.length - 1)
            ? Math.min(times[i + 1] - times[i], 10) // Cap gaps at 10s to avoid paused time skew
            : 1;

        const hr = heartrates[i];

        if (hr <= z1Ceil) zones.z1 += duration;
        else if (hr <= z2Ceil) zones.z2 += duration;
        else if (hr <= z3Ceil) zones.z3 += duration;
        else if (hr <= z4Ceil) zones.z4 += duration;
        else zones.z5 += duration;
    }

    return zones;
}

/**
 * Calculate timestamp for range
 */
function getRangeStartTimestamp(range?: string): number | undefined {
    if (!range || range === 'ALL') return undefined;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    switch (range) {
        case '1_MONTH': return Math.floor((now - 30 * day) / 1000);
        case '3_MONTHS': return Math.floor((now - 90 * day) / 1000);
        case '6_MONTHS': return Math.floor((now - 180 * day) / 1000);
        case '1_YEAR': return Math.floor((now - 365 * day) / 1000);
        case '2_YEARS': return Math.floor((now - 730 * day) / 1000);
        default: return undefined;
    }
}

/**
 * Sync all activities for a user
 */
/**
 * Fetch detailed athlete profile
 */
async function fetchAthleteProfile(accessToken: string) {
    await rateLimiter.checkAndWait();
    const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        logger.warn(`Failed to fetch athlete profile: ${response.status}`);
        return null; // Non-fatal
    }

    return response.json();
}

/**
 * Sync all activities for a user
 */
export async function syncUserActivities(userId: string, range?: string): Promise<{
    synced: number;
    skipped: number;
    errors: number;
}> {
    // Mark sync in progress
    await prisma.user.update({
        where: { id: userId },
        data: { syncInProgress: true },
    });

    try {
        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                hrMax: true,
                hrRest: true,
                sex: true,
                lastSyncAt: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
            },
        });

        const accessToken = await refreshStravaToken(userId);
        if (!accessToken) {
            throw new Error('Failed to get Strava access token');
        }

        // 1. Fetch Athlete Profile to fill missing user data
        if (!user?.hrMax || !user?.sex) {
            try {
                const profile = await fetchAthleteProfile(accessToken);
                if (profile) {
                    const updateData: any = {};
                    if (!user?.sex && profile.sex) updateData.sex = profile.sex === 'F' ? 'FEMALE' : 'MALE';
                    // Strava might not return max_heart_rate in basic profile, but we check
                    if (!user?.hrMax && profile.max_heart_rate) updateData.hrMax = profile.max_heart_rate;

                    if (Object.keys(updateData).length > 0) {
                        user = await prisma.user.update({
                            where: { id: userId },
                            data: updateData,
                        });
                        logger.info(`Updated user profile from Strava: ${JSON.stringify(updateData)}`);
                    }
                }
            } catch (err) {
                logger.warn('Error fetching/updating athlete profile:', err);
            }
        }

        // Calculate "after" timestamp
        // If range is 'ALL', we force undefined (full history)
        // If range is specific, use that timestamp
        // If range is undefined (auto/incremental), use lastSyncAt
        let after: number | undefined;

        if (range) {
            if (range === 'ALL') {
                after = undefined;
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

        // Keep track of max HR seen during this sync to auto-detect provided logic
        let currentHrMax = user?.hrMax || null;

        while (hasMore) {
            const activities = await fetchActivities(accessToken, page, after);

            logger.info(`Sync page ${page}: Fetched ${activities.length} activities from Strava (after=${after})`);

            if (activities.length === 0) {
                hasMore = false;
                break;
            }

            for (const activity of activities) {
                try {
                    // Check if already exists
                    const existing = await prisma.activity.findUnique({
                        where: { stravaId: safeBigInt(activity.id) },
                    });

                    // Determine if we need to process this activity
                    // Process if: New OR (Existing but missing Zone data AND has HR)
                    // We also check for sum of zones being 0, which implies failed calculation previously
                    const isNew = !existing;
                    let needsUpdate = existing && existing.hasHeartrate && existing.hrZone1Time === null;

                    if (existing && existing.hasHeartrate && !needsUpdate) {
                        const totalZoneTime = (existing.hrZone1Time || 0) + (existing.hrZone2Time || 0) +
                            (existing.hrZone3Time || 0) + (existing.hrZone4Time || 0) +
                            (existing.hrZone5Time || 0);
                        if (totalZoneTime === 0) {
                            needsUpdate = true;
                        }
                    }

                    if (page === 1 && skipped < 3) {
                        logger.info(`Activity ${activity.id}: isNew=${isNew}, needsUpdate=${needsUpdate}, hasHr=${activity.has_heartrate}, existingZone1=${existing?.hrZone1Time}`);
                    }

                    if (!isNew && !needsUpdate) {
                        skipped++;
                        continue;
                    }

                    // Auto-detect HR Max if missing or found higher
                    if (activity.max_heartrate && activity.max_heartrate > (currentHrMax || 0)) {
                        // Reasonable upper bound check (e.g. < 250) to avoid spikes? 
                        // Strava max_heartrate is usually reliable enough.
                        if (activity.max_heartrate < 240) {
                            currentHrMax = activity.max_heartrate;

                            // Update DB asynchronously to remember for next time
                            // We don't await this to keep sync fast, just fire and forget (or await if safety needed)
                            await prisma.user.update({
                                where: { id: userId },
                                data: { hrMax: currentHrMax }
                            }).catch(e => logger.warn('Failed to auto-update hrMax', e));

                            logger.info(`Auto-detected new HR Max: ${currentHrMax}`);
                        }
                    }

                    // --- Fetch Streams & Calculate Zones (Expensive operation) ---
                    let zoneTimes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
                    let streams = null;

                    // Always fetch streams for analysis if we can (limit to runs/rides involving HR or heavy data?)
                    // For now, fetch for all runs to enable analysis
                    if (['Run', 'VirtualRun', 'Ride', 'VirtualRide'].includes(activity.type)) {
                        streams = await fetchActivityStreams(accessToken, activity.id);

                        // Use currentHrMax (auto-detected or user set) or fallback
                        // Fallback to 190 if absolutely nothing known so we at least populate zones
                        const effectiveHrMax = currentHrMax || 190;

                        if (streams && streams.heartrate) {
                            // Use user-configured zone thresholds or defaults
                            const zoneThresholds = {
                                z1: user?.hrZone1Max ?? 60,
                                z2: user?.hrZone2Max ?? 70,
                                z3: user?.hrZone3Max ?? 80,
                                z4: user?.hrZone4Max ?? 90,
                            };
                            zoneTimes = calculateZoneTimes(streams.heartrate, streams.time, effectiveHrMax, zoneThresholds);
                        }
                    }

                    // Calculate TRIMP
                    let trimp: number | null = null;
                    const effectiveHrMax = currentHrMax || 190;
                    const effectiveHrRest = user?.hrRest || 60; // Default rest HR

                    if (activity.has_heartrate && activity.average_heartrate) {
                        const result = calculateTrimp({
                            durationMinutes: activity.moving_time / 60,
                            averageHr: activity.average_heartrate,
                            hrMax: effectiveHrMax,
                            hrRest: effectiveHrRest,
                            sex: (user?.sex || 'MALE') as Sex,
                        });
                        trimp = result.trimp;
                    }

                    // Calculate running TSS
                    let runningTss: number | null = null;
                    const contribution = getActivityContribution(activity.type);
                    if (contribution.contributesToRunningTss && activity.distance > 0) {
                        const thresholdPace = 300; // Default 5:00/km
                        runningTss = calculateRunningTss(
                            activity.moving_time,
                            activity.distance,
                            thresholdPace
                        );
                    }

                    const activityData = {
                        name: activity.name,
                        description: activity.description,
                        type: mapActivityType(activity.type) as any,
                        sportType: activity.sport_type,
                        startDate: new Date(activity.start_date),
                        timezone: activity.timezone,
                        distance: activity.distance,
                        movingTime: activity.moving_time,
                        elapsedTime: activity.elapsed_time,
                        averageSpeed: activity.average_speed,
                        maxSpeed: activity.max_speed,
                        gradeAdjustedSpeed: activity.average_grade_adjusted_speed ?? null,
                        averageHr: activity.average_heartrate ?? null,
                        maxHr: activity.max_heartrate ?? null,
                        hasHeartrate: activity.has_heartrate,
                        totalElevation: activity.total_elevation_gain,
                        elevHigh: activity.elev_high ?? null,
                        elevLow: activity.elev_low ?? null,
                        trimp,
                        runningTss,
                        hrZone1Time: zoneTimes.z1,
                        hrZone2Time: zoneTimes.z2,
                        hrZone3Time: zoneTimes.z3,
                        hrZone4Time: zoneTimes.z4,
                        hrZone5Time: zoneTimes.z5,

                        rawJson: activity as any,
                        streams: streams as any,
                        trainingType: determineWorkoutType(activity),
                    };

                    if (isNew) {
                        await prisma.activity.create({
                            data: {
                                userId,
                                stravaId: safeBigInt(activity.id),
                                ...activityData
                            },
                        });
                        synced++;
                    } else if (needsUpdate) {
                        await prisma.activity.update({
                            where: { id: existing.id },
                            data: {
                                ...activityData,
                                updatedAt: new Date() // force update
                            }
                        });
                        synced++; // Count updates as synced
                    }

                } catch (err) {
                    console.error(`Error syncing activity ${activity.id}:`, err);
                    errors++;
                }
            }

            page++;

            // Safety check - don't fetch more than 50 pages (10,000 activities)
            if (page > 50) {
                logger.warn('Reached max pages limit');
                break;
            }
        }

        // Update last sync time
        await prisma.user.update({
            where: { id: userId },
            data: {
                lastSyncAt: new Date(),
                syncInProgress: false,
            },
        });

        return { synced, skipped, errors };
    } catch (err) {
        // Reset sync flag on error
        await prisma.user.update({
            where: { id: userId },
            data: { syncInProgress: false },
        });
        throw err;
    }
}

/**
 * Get sync status for a user
 */
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

    // Auto-reset stuck sync flag after 10 minutes
    const SYNC_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    if (syncInProgress && user?.lastSyncAt) {
        const timeSinceLastSync = Date.now() - user.lastSyncAt.getTime();
        if (timeSinceLastSync > SYNC_TIMEOUT_MS) {
            // Sync has been "in progress" for too long - reset the flag
            await prisma.user.update({
                where: { id: userId },
                data: { syncInProgress: false },
            });
            syncInProgress = false;
            logger.warn(`Auto-reset stuck syncInProgress flag for user ${userId} after ${Math.round(timeSinceLastSync / 1000 / 60)} minutes`);
        }
    }

    return {
        syncInProgress,
        lastSyncAt: user?.lastSyncAt ?? null,
        totalActivities: user?._count?.activities ?? 0,
    };
}
