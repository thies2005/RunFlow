
import { prisma } from '@/lib/db';
import { Activity } from '@/generated/prisma/browser';
import { calculateTrimpFromZones } from './trimp';
import { DAY_MS } from '@/lib/constants';
import { logger } from '@/lib/logging/logger';
import {
    calculateRunningTss,
    getActivityContribution
} from './fitness';

// Constants need to match fitness.ts
const CTL_TIME_CONSTANT = 42;
const ATL_TIME_CONSTANT = 7;

// Structural bound on rebuild cost: updateFitnessCache never iterates further
// back than this, even if a legacy row with an ancient date exists (the API
// schemas reject such dates, but old DB rows may predate that).
const MAX_REBUILD_LOOKBACK_MS = 20 * 365 * DAY_MS;

// Cooldown between full self-healing rebuilds per user. When the rebuild
// cannot clear its own trigger (pathological data, e.g. rides with zero
// watts/HR/duration keeping max ctlBike at 0), this stops every analytics
// request from paying a full delete+rebuild.
const REBUILD_RETRY_COOLDOWN_MS = 10 * 60 * 1000;
const lastRebuildAttemptByUser = new Map<string, number>();

/**
 * Normalize a date to UTC midnight.
 * This is crucial for consistent daily bucketing regardless of timezone.
 */
function toUtcMidnight(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Get date key for activity grouping (YYYY-MM-DD format in UTC)
 */
function getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Updates the fitness cache for a user based on new or modified activities.
 *
 * Strategy:
 * 1. Identify the earliest date among all modified activities.
 * 2. Fetch the latest DailyFitness state BEFORE that earliest date (baseline).
 * 3. Apply decay for any gap days between baseline and start date.
 * 4. Fetch all activities from that earliest date to TODAY.
 * 5. Recalculate daily loads (TRIMP, TSS) and resulting metrics (CTL, ATL) day-by-day.
 * 6. Bulk upsert the new values into the DailyFitness table.
 *
 * @param userId - The user ID
 * @param modifiedActivities - Array of activities that were added/updated
 */
export async function updateFitnessCache(userId: string, modifiedActivities: Partial<Activity>[]) {
    if (modifiedActivities.length === 0) return;

    try {
        // 1. Find earliest date among modified activities (normalized to UTC midnight)
        const dates = modifiedActivities
            .map(a => a.startDate ? toUtcMidnight(new Date(a.startDate)) : toUtcMidnight(new Date()))
            .sort((a, b) => a.getTime() - b.getTime());

        let startDate = dates[0];

        // Bound the rebuild horizon so a single ancient activity date cannot
        // turn this into a multi-decade day-by-day recompute.
        const earliestAllowed = new Date(Date.now() - MAX_REBUILD_LOOKBACK_MS);
        if (startDate.getTime() < earliestAllowed.getTime()) {
            startDate = new Date(earliestAllowed);
        }

        // 2. Get Baseline State (Latest before Start Date)
        // Find the most recent fitness entry before the start date to handle gaps
        const baseline = await prisma.dailyFitness.findFirst({
            where: {
                userId,
                date: { lt: startDate }
            },
            orderBy: { date: 'desc' }
        });

        let currentCtl = baseline?.ctl || 0;
        let currentAtl = baseline?.atl || 0;
        let currentCtlRunning = baseline?.ctlRunning || 0;
        let currentCtlBike = baseline?.ctlBike || 0;
        let currentAtlBike = baseline?.atlBike || 0;

        // 3. Apply decay for any gap between baseline and start date
        if (baseline) {
            const baselineDate = toUtcMidnight(new Date(baseline.date));

            // Gap = number of days from baseline to the day before startDate
            // e.g., Baseline Jan 15, Start Jan 20 -> Days 16, 17, 18, 19 are gap = 4 days
            const msPerDay = DAY_MS;
            const gapDays = Math.round((startDate.getTime() - baselineDate.getTime()) / msPerDay) - 1;

            if (gapDays > 0) {
                const ctlDecay = Math.exp(-1 / CTL_TIME_CONSTANT);
                const atlDecay = Math.exp(-1 / ATL_TIME_CONSTANT);

                // With 0 load during gap days, exponential decay applies:
                // Value_t = Value_0 * (decay ^ t)
                currentCtl = currentCtl * Math.pow(ctlDecay, gapDays);
                currentAtl = currentAtl * Math.pow(atlDecay, gapDays);
                currentCtlRunning = currentCtlRunning * Math.pow(ctlDecay, gapDays);
                currentCtlBike = currentCtlBike * Math.pow(ctlDecay, gapDays);
                currentAtlBike = currentAtlBike * Math.pow(atlDecay, gapDays);
            }
        }

        const [user, activities] = await Promise.all([
            prisma.user?.findUnique
                ? prisma.user.findUnique({
                    where: { id: userId },
                    select: { ftpWatts: true, thresholdPace: true }
                })
                : Promise.resolve(null),
            prisma.activity.findMany({
                where: {
                    userId,
                    startDate: { gte: startDate }
                },
                orderBy: { startDate: 'asc' },
                select: {
                    id: true,
                    type: true,
                    startDate: true,
                    distance: true,
                    movingTime: true,
                    trimp: true,
                    runningTss: true,
                    bikeTss: true,
                    averageWatts: true,
                    weightedAverageWatts: true,
                    npWatts: true,
                    hrZone1Time: true,
                    hrZone2Time: true,
                    hrZone3Time: true,
                    hrZone4Time: true,
                    hrZone5Time: true,
                    hrZone6Time: true,
                    hrZone7Time: true,
                }
            })
        ]);
        const userFtp = user?.ftpWatts;
        const userThresholdPace = user?.thresholdPace;

        // 5. Iterate Day by Day
        const today = toUtcMidnight(new Date());

        const ctlDecay = Math.exp(-1 / CTL_TIME_CONSTANT);
        const atlDecay = Math.exp(-1 / ATL_TIME_CONSTANT);

        const updates: Array<{
            userId: string;
            date: Date;
            ctl: number;
            atl: number;
            tsb: number;
            ctlRunning: number;
            trimp: number;
            runningTss: number;
            bikeTss: number;
            ctlBike: number;
            atlBike: number;
            tsbBike: number;
        }> = [];

        // Group activities by day using consistent UTC date key
        const activityMap = new Map<string, typeof activities>();
        activities.forEach(a => {
            const k = getDateKey(toUtcMidnight(new Date(a.startDate)));
            if (!activityMap.has(k)) activityMap.set(k, []);
            activityMap.get(k)!.push(a);
        });

        // Iterate day by day from startDate to today
        let daysProcessed = 0;
        for (let d = new Date(startDate); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
            const dateKey = getDateKey(d);
            const dailyActivities = activityMap.get(dateKey) || [];

            // Calculate Daily Load
            let dailyTrimp = 0;
            let dailyRunningTss = 0;
            let dailyBikeTss = 0;
            let dailyCombinedLoad = 0;

            for (const a of dailyActivities) {
                // TRIMP: Prefer stored value, fallback to zone calculation, then duration estimate
                let trimp = a.trimp ?? 0;

                if (trimp === 0 || trimp === null) {
                    // Try zone-based calculation
                    trimp = calculateTrimpFromZones(
                        a.hrZone1Time, a.hrZone2Time, a.hrZone3Time,
                        a.hrZone4Time, a.hrZone5Time, a.hrZone6Time,
                        a.hrZone7Time
                    );
                }

                if (trimp === 0 && a.movingTime > 0) {
                    // Fallback: duration-based estimate
                    trimp = (a.movingTime / 60) * 2.5;
                }

                // Running TSS: prefer the stored per-activity value (computed at import
                // time with enrichment) and only recompute when it is missing.
                const contribution = getActivityContribution(a.type);
                const runningTss = contribution.contributesToRunningTss && a.type === 'RUN' && a.distance > 0
                    ? (a.runningTss && a.runningTss > 0
                        ? a.runningTss
                        : calculateRunningTss(a.movingTime, a.distance, userThresholdPace || 300))
                    : 0;

                // Cycling Bike TSS
                const isRide = a.type === 'RIDE' || a.type === 'VIRTUAL_RIDE';
                let bikeTss = 0;
                if (isRide) {
                    if (a.bikeTss && a.bikeTss > 0) {
                        bikeTss = a.bikeTss;
                    } else {
                        const np = a.npWatts ?? a.weightedAverageWatts ?? a.averageWatts;
                        if (np && np > 0) {
                            const ftp = userFtp || 200;
                            const ifFactor = np / ftp;
                            bikeTss = Math.round(((a.movingTime * np * ifFactor) / (ftp * 3600)) * 100);
                        } else {
                            bikeTss = trimp || 0;
                        }
                    }
                }

                dailyTrimp += trimp;
                dailyRunningTss += runningTss;
                dailyBikeTss += bikeTss;

                // For combined fitness load: use bikeTss for rides instead of trimp when present
                const activityCombinedLoad = (isRide && bikeTss > 0) ? bikeTss : trimp;
                dailyCombinedLoad += activityCombinedLoad;
            }

            // Apply EMA formula: newValue = oldValue * decay + todayLoad * (1 - decay)
            currentCtl = currentCtl * ctlDecay + dailyCombinedLoad * (1 - ctlDecay);
            currentAtl = currentAtl * atlDecay + dailyCombinedLoad * (1 - atlDecay);
            currentCtlRunning = currentCtlRunning * ctlDecay + dailyRunningTss * (1 - ctlDecay);
            currentCtlBike = currentCtlBike * ctlDecay + dailyBikeTss * (1 - ctlDecay);
            currentAtlBike = currentAtlBike * atlDecay + dailyBikeTss * (1 - atlDecay);
            const tsb = currentCtl - currentAtl;
            const tsbBike = currentCtlBike - currentAtlBike;

            updates.push({
                userId,
                date: new Date(d),
                ctl: currentCtl,
                atl: currentAtl,
                tsb: tsb,
                ctlRunning: currentCtlRunning,
                trimp: dailyTrimp,
                runningTss: dailyRunningTss,
                bikeTss: dailyBikeTss,
                ctlBike: currentCtlBike,
                atlBike: currentAtlBike,
                tsbBike: tsbBike,
            });

            // Yield event loop every 30 days to avoid blocking
            daysProcessed++;
            if (daysProcessed % 30 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // 6. Batch Update
        if (updates.length > 0) {
            const firstDate = updates[0].date;
            const lastDate = updates[updates.length - 1].date;

            await prisma.$transaction([
                // Delete existing records in the range
                prisma.dailyFitness.deleteMany({
                    where: {
                        userId,
                        date: {
                            gte: firstDate,
                            lte: lastDate
                        }
                    }
                }),
                // Insert calculated records
                prisma.dailyFitness.createMany({
                    data: updates,
                    skipDuplicates: true
                })
            ]);
        }

        logger.info(`[FitnessCache] Updated ${updates.length} days`, {
            userId,
            count: updates.length,
            latestCtl: parseFloat(currentCtl.toFixed(1)),
            latestAtl: parseFloat(currentAtl.toFixed(1))
        });
    } catch (error) {
        // Log error but don't throw - fitness cache updates are non-critical
        logger.error('[FitnessCache] Error updating fitness cache', { error });
    }
}

/**
 * Retrieve fitness history from cache
 */
export async function getCachedFitnessHistory(userId: string, startDate?: Date) {
    try {
        return await prisma.dailyFitness.findMany({
            where: {
                userId,
                date: startDate ? { gte: startDate } : undefined
            },
            orderBy: { date: 'asc' }
        });
    } catch (error) {
        logger.error('[FitnessCache] Error retrieving cached fitness history', { error });
        return [];
    }
}

/**
 * Ensures the fitness cache is calculated up to today (UTC midnight).
 * If the last cached entry is old, it fills the gap days with decayed values (0 load).
 * Returns the fitness metrics for TODAY.
 */
export async function ensureFitnessCacheUpToDate(userId: string) {
    try {
        const today = toUtcMidnight(new Date());

        // 1. Get latest cached entry
        let latest = await prisma.dailyFitness.findFirst({
            where: { userId },
            orderBy: { date: 'desc' }
        });

        if (!latest) {
            const firstActivity = prisma.activity?.findFirst
                ? await prisma.activity.findFirst({
                    where: { userId },
                    orderBy: { startDate: 'asc' },
                    select: { id: true, startDate: true },
                })
                : null;
            if (!firstActivity) return null;
            await updateFitnessCache(userId, [firstActivity]);
            return prisma.dailyFitness.findFirst({
                where: { userId },
                orderBy: { date: 'desc' },
            });
        }

        let latestDate = toUtcMidnight(new Date(latest.date));

        // --- Self-healing: detect a poisoned or partial cache and rebuild from scratch ---
        // A cache written by the legacy /api/analytics/history inline writer can be
        // up-to-date by date but bike-blind (ctlBike = 0) or fully zeroed, which would
        // otherwise make the early-exit below skip the rebuild forever.
        const [earliest, firstActivity, lastActivity, rideCount, bikeAgg] = await Promise.all([
            prisma.dailyFitness.findFirst({
                where: { userId },
                orderBy: { date: 'asc' },
                select: { date: true },
            }),
            prisma.activity.findFirst({
                where: { userId },
                orderBy: { startDate: 'asc' },
                select: { id: true, startDate: true },
            }),
            prisma.activity.findFirst({
                where: { userId },
                orderBy: { startDate: 'desc' },
                select: { id: true },
            }),
            prisma.activity.count({
                where: { userId, type: { in: ['RIDE', 'VIRTUAL_RIDE'] } },
            }),
            prisma.dailyFitness.aggregate({
                where: { userId },
                _max: { ctlBike: true },
            }),
        ]);

        const needsFullRebuild = !!firstActivity && (
            // Activities predate the cache window (cache is missing history)
            (!!earliest && toUtcMidnight(new Date(firstActivity.startDate)).getTime() < toUtcMidnight(new Date(earliest.date)).getTime()) ||
            // Cache exists but the latest row is zeroed while activities exist
            (!!lastActivity && latest.ctl === 0 && latest.atl === 0) ||
            // Rides exist but no bike CTL was ever computed (bike-blind legacy cache)
            (rideCount > 0 && (bikeAgg._max.ctlBike ?? 0) === 0)
        );

        if (needsFullRebuild) {
            const lastAttempt = lastRebuildAttemptByUser.get(userId) || 0;
            if (Date.now() - lastAttempt < REBUILD_RETRY_COOLDOWN_MS) {
                // A recent rebuild did not clear the trigger (pathological
                // data) — do not hammer the DB on every request; fall through
                // with whatever the cache currently holds.
                logger.info('[FitnessCache] Rebuild trigger still active, cooling down', { userId });
            } else {
                lastRebuildAttemptByUser.set(userId, Date.now());
                logger.info('[FitnessCache] Poisoned/partial cache detected, rebuilding from first activity', { userId });
                await prisma.dailyFitness.deleteMany({ where: { userId } });
                await updateFitnessCache(userId, [firstActivity]);
                const rebuiltLatest = await prisma.dailyFitness.findFirst({
                    where: { userId },
                    orderBy: { date: 'desc' },
                });
                if (!rebuiltLatest) return null;
                latest = rebuiltLatest;
                latestDate = toUtcMidnight(new Date(latest.date));
            }
        }

        if (latestDate.getTime() < today.getTime()) {
            const recentActivity = prisma.activity?.findFirst
                ? await prisma.activity.findFirst({
                    where: { userId, startDate: { gte: latestDate } },
                    select: { id: true },
                })
                : null;
            if (recentActivity) {
                await updateFitnessCache(userId, [{ startDate: latestDate }]);
                const refreshedLatest = await prisma.dailyFitness.findFirst({
                    where: { userId },
                    orderBy: { date: 'desc' },
                });
                if (refreshedLatest) {
                    latest = refreshedLatest;
                    latestDate = toUtcMidnight(new Date(latest.date));
                }
            }
        }

        // If cache is already up to date (or in the future??), return it
        if (latestDate.getTime() >= today.getTime()) {
            return latest;
        }

        // 2. Calculate values for gap days
        const ctlDecay = Math.exp(-1 / CTL_TIME_CONSTANT);
        const atlDecay = Math.exp(-1 / ATL_TIME_CONSTANT);

        let currentCtl = latest.ctl;
        let currentAtl = latest.atl;
        let currentCtlRunning = latest.ctlRunning;
        let currentTsb = latest.tsb;
        let currentCtlBike = latest.ctlBike || 0;
        let currentAtlBike = latest.atlBike || 0;
        let currentTsbBike = latest.tsbBike || 0;

        const inputs: Array<{
            userId: string;
            date: Date;
            ctl: number;
            atl: number;
            tsb: number;
            ctlRunning: number;
            trimp: number;
            runningTss: number;
            bikeTss: number;
            ctlBike: number;
            atlBike: number;
            tsbBike: number;
        }> = [];

        // Iterate from day after latest until today (using timestamps for safety)
        const msPerDay = DAY_MS;
        const startTime = latestDate.getTime() + msPerDay;
        const endTime = today.getTime();

        let daysProcessed = 0;
        for (let timestamp = startTime; timestamp <= endTime; timestamp += msPerDay) {
            // Apply decay (0 load for these gap days)
            currentCtl = currentCtl * ctlDecay;
            currentAtl = currentAtl * atlDecay;
            currentCtlRunning = currentCtlRunning * ctlDecay;
            currentCtlBike = currentCtlBike * ctlDecay;
            currentAtlBike = currentAtlBike * atlDecay;
            currentTsb = currentCtl - currentAtl;
            currentTsbBike = currentCtlBike - currentAtlBike;

            inputs.push({
                userId,
                date: new Date(timestamp),
                ctl: currentCtl,
                atl: currentAtl,
                tsb: currentTsb,
                ctlRunning: currentCtlRunning,
                trimp: 0,
                runningTss: 0,
                bikeTss: 0,
                ctlBike: currentCtlBike,
                atlBike: currentAtlBike,
                tsbBike: currentTsbBike,
            });

            // Yield event loop every 30 days to avoid blocking
            daysProcessed++;
            if (daysProcessed % 30 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // 3. Batch Insert
        if (inputs.length > 0) {
            await prisma.dailyFitness.createMany({
                data: inputs,
                skipDuplicates: true
            });
            logger.info(`[FitnessCache] Auto-filled ${inputs.length} gap days`, { userId, count: inputs.length });
        }

        // Return the values for today (last item in inputs, or calculated)
        return inputs.length > 0 ? inputs[inputs.length - 1] : latest;

    } catch (error) {
        logger.error('[FitnessCache] Error ensuring fitness cache update', { error });
        // Fallback to whatever we can find
        return prisma.dailyFitness.findFirst({
            where: { userId },
            orderBy: { date: 'desc' }
        });
    }
}
