
import { prisma } from '@/lib/db';
import { Activity } from '@prisma/client';
import { calculateTrimpFromZones } from './trimp';
import { DAY_MS } from '@/lib/constants';
import {
    calculateRunningTss,
    getActivityContribution
} from './fitness';

// Constants need to match fitness.ts
const CTL_TIME_CONSTANT = 42;
const ATL_TIME_CONSTANT = 7;

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

        const startDate = dates[0];

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
            }
        }

        // 4. Fetch All Activities from Start Date onwards
        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: startDate }
            },
            orderBy: { startDate: 'asc' }
        });

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

            for (const a of dailyActivities) {
                // TRIMP: Prefer stored value, fallback to zone calculation, then duration estimate
                let trimp = a.trimp ?? 0;

                if (trimp === 0 || trimp === null) {
                    // Try zone-based calculation
                    trimp = calculateTrimpFromZones(
                        a.hrZone1Time, a.hrZone2Time, a.hrZone3Time,
                        a.hrZone4Time, a.hrZone5Time
                    );
                }

                if (trimp === 0 && a.movingTime > 0) {
                    // Fallback: duration-based estimate
                    trimp = (a.movingTime / 60) * 2.5;
                }

                // Running TSS
                const contribution = getActivityContribution(a.type);
                const runningTss = contribution.contributesToRunningTss && a.type === 'RUN' && a.distance > 0
                    ? calculateRunningTss(a.movingTime, a.distance, 300)
                    : 0;

                dailyTrimp += trimp;
                dailyRunningTss += runningTss;
            }

            // Apply EMA formula: newValue = oldValue * decay + todayLoad * (1 - decay)
            currentCtl = currentCtl * ctlDecay + dailyTrimp * (1 - ctlDecay);
            currentAtl = currentAtl * atlDecay + dailyTrimp * (1 - atlDecay);
            currentCtlRunning = currentCtlRunning * ctlDecay + dailyRunningTss * (1 - ctlDecay);
            const tsb = currentCtl - currentAtl;

            updates.push({
                userId,
                date: new Date(d),
                ctl: currentCtl,
                atl: currentAtl,
                tsb: tsb,
                ctlRunning: currentCtlRunning,
                trimp: dailyTrimp,
                runningTss: dailyRunningTss
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
                    data: updates
                })
            ]);
        }

        console.log(`[FitnessCache] Updated ${updates.length} days for user ${userId}. Latest CTL: ${currentCtl.toFixed(1)}, ATL: ${currentAtl.toFixed(1)}`);
    } catch (error) {
        // Log error but don't throw - fitness cache updates are non-critical
        console.error('[FitnessCache] Error updating fitness cache:', error);
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
        console.error('[FitnessCache] Error retrieving cached fitness history:', error);
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
        const latest = await prisma.dailyFitness.findFirst({
            where: { userId },
            orderBy: { date: 'desc' }
        });

        if (!latest) return null;

        const latestDate = toUtcMidnight(new Date(latest.date));

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

        const inputs: Array<{
            userId: string;
            date: Date;
            ctl: number;
            atl: number;
            tsb: number;
            ctlRunning: number;
            trimp: number;
            runningTss: number;
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
            currentTsb = currentCtl - currentAtl;

            inputs.push({
                userId,
                date: new Date(timestamp),
                ctl: currentCtl,
                atl: currentAtl,
                tsb: currentTsb,
                ctlRunning: currentCtlRunning,
                trimp: 0,
                runningTss: 0
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
            console.log(`[FitnessCache] Auto-filled ${inputs.length} gap days for user ${userId}`);
        }

        // Return the values for today (last item in inputs, or calculated)
        return inputs.length > 0 ? inputs[inputs.length - 1] : latest;

    } catch (error) {
        console.error('[FitnessCache] Error ensuring fitness cache update:', error);
        // Fallback to whatever we can find
        return prisma.dailyFitness.findFirst({
            where: { userId },
            orderBy: { date: 'desc' }
        });
    }
}
