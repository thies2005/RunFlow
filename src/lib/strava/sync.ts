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

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const MAX_PER_PAGE = 200;
const RATE_LIMIT_REQUESTS = 95; // 5% buffer under Strava's 100 req/15min limit
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
            console.log(`Rate limit reached, waiting ${waitTime / 1000}s`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requests = 0;
            this.windowStart = Date.now();
        }

        this.requests++;
    },
};

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
    average_heartrate?: number;
    max_heartrate?: number;
    has_heartrate: boolean;
    total_elevation_gain: number;
    elev_high?: number;
    elev_low?: number;
    description?: string;
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
 * Fetch activities with pagination and rate limiting
 */
async function fetchActivities(
    accessToken: string,
    page: number = 1,
    after?: number
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
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '900');
        console.log(`Rate limited by Strava, waiting ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchActivities(accessToken, page, after);
    }

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

/**
 * Fetch activity streams (heartrate, time)
 */
async function fetchActivityStreams(
    accessToken: string,
    activityId: number
): Promise<{ time: number[]; heartrate: number[] } | null> {
    await rateLimiter.checkAndWait();

    const response = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=time,heartrate&key_by_type=true`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '900');
        console.log(`Rate limited fetching streams, waiting ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchActivityStreams(accessToken, activityId);
    }

    if (!response.ok) return null;

    const streams = await response.json();
    if (!streams.time || !streams.heartrate) return null;

    return {
        time: streams.time.data,
        heartrate: streams.heartrate.data,
    };
}

/**
 * Calculate time in zones based on HR stream and user max HR
 */
function calculateZoneTimes(
    heartrates: number[],
    times: number[],
    hrMax: number
): { z1: number; z2: number; z3: number; z4: number; z5: number } {
    const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

    // Default percentages if not customized (matching User model defaults)
    const z1Ceil = Math.floor(hrMax * 0.60);
    const z2Ceil = Math.floor(hrMax * 0.70);
    const z3Ceil = Math.floor(hrMax * 0.80);
    const z4Ceil = Math.floor(hrMax * 0.90);

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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                hrMax: true,
                hrRest: true,
                sex: true,
                lastSyncAt: true,
            },
        });

        const accessToken = await refreshStravaToken(userId);
        if (!accessToken) {
            throw new Error('Failed to get Strava access token');
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


        while (hasMore) {
            const activities = await fetchActivities(accessToken, page, after);

            console.log(`Sync page ${page}: Fetched ${activities.length} activities from Strava (after=${after})`);

            if (activities.length === 0) {
                hasMore = false;
                break;
            }

            for (const activity of activities) {
                try {
                    // Check if already exists
                    const existing = await prisma.activity.findUnique({
                        where: { stravaId: BigInt(activity.id) },
                    });

                    // Determine if we need to process this activity
                    // Process if: New OR (Existing but missing Zone data AND has HR)
                    const isNew = !existing;
                    const needsUpdate = existing && existing.hasHeartrate && existing.hrZone1Time === null;

                    if (page === 1 && skipped < 3) {
                        console.log(`Activity ${activity.id}: isNew=${isNew}, needsUpdate=${needsUpdate}, hasHr=${activity.has_heartrate}, existingZone1=${existing?.hrZone1Time}`);
                    }

                    if (!isNew && !needsUpdate) {
                        skipped++;
                        continue;
                    }

                    // --- Fetch Streams & Calculate Zones (Expensive operation) ---
                    let zoneTimes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

                    if (activity.has_heartrate && user?.hrMax) {
                        const streams = await fetchActivityStreams(accessToken, activity.id);
                        if (streams) {
                            zoneTimes = calculateZoneTimes(streams.heartrate, streams.time, user.hrMax);
                        }
                    }

                    // Calculate TRIMP
                    let trimp: number | null = null;
                    if (activity.has_heartrate && activity.average_heartrate && user?.hrMax && user?.hrRest) {
                        const result = calculateTrimp({
                            durationMinutes: activity.moving_time / 60,
                            averageHr: activity.average_heartrate,
                            hrMax: user.hrMax,
                            hrRest: user.hrRest,
                            sex: (user.sex || 'MALE') as Sex,
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
                    };

                    if (isNew) {
                        await prisma.activity.create({
                            data: {
                                userId,
                                stravaId: BigInt(activity.id),
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
                console.warn('Reached max pages limit');
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

    return {
        syncInProgress: user?.syncInProgress ?? false,
        lastSyncAt: user?.lastSyncAt ?? null,
        totalActivities: user?._count?.activities ?? 0,
    };
}
