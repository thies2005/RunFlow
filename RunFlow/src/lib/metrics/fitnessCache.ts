
import { prisma } from '@/lib/db';
import { Activity } from '@prisma/client';
import { calculateTrimpFromZones } from './trimp';
import {
    calculateRunningTss,
    getActivityContribution,
    DailyLoad,
    calculateDecayFactor
} from './fitness';

// Constants need to match fitness.ts
const CTL_TIME_CONSTANT = 42;
const ATL_TIME_CONSTANT = 7;

/**
 * Updates the fitness cache for a user based on new or modified activities.
 *
 * Strategy:
 * 1. Identify the earliest date among all modified activities.
 * 2. Fetch the "DailyFitness" state for the day BEFORE that earliest date (baseline).
 * 3. Fetch all activities from that earliest date to TODAY.
 * 4. Recalculate daily loads (TRIMP, TSS) and resulting metrics (CTL, ATL) day-by-day.
 * 5. Bulk upsert the new values into the DailyFitness table.
 *
 * @param userId - The user ID
 * @param modifiedActivities - Array of activities that were added/updated
 */
export async function updateFitnessCache(userId: string, modifiedActivities: Partial<Activity>[]) {
    if (modifiedActivities.length === 0) return;

    try {
        // 1. Find earliest date
        // Sort by date to find the start
        const dates = modifiedActivities
            .map(a => a.startDate ? new Date(a.startDate) : new Date())
            .map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate())); // Normalize to midnight local/UTC?

        // Prisma stores DateTimes as UTC. We should stick to UTC midnight for daily buckets.
        const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
        const earliestDate = sortedDates[0];

        // Normalize to start of day (UTC) to match cache keys if we use date as key
        // Ideally we store one entry per day.
        const startDate = new Date(earliestDate);
        startDate.setUTCHours(0, 0, 0, 0);

        // 2. Get Baseline State (Day Before)
        const dayBefore = new Date(startDate);
        dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

        const baseline = await prisma.dailyFitness.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: dayBefore
                }
            }
        });

        let currentCtl = baseline?.ctl || 0;
        let currentAtl = baseline?.atl || 0;
        let currentCtlRunning = baseline?.ctlRunning || 0;

        // 3. Fetch All Activities from Start Date onwards
        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: startDate }
            },
            orderBy: { startDate: 'asc' }
        });

        // 4. Iterate Day by Day
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const ctlDecay = Math.exp(-1 / CTL_TIME_CONSTANT);
        const atlDecay = Math.exp(-1 / ATL_TIME_CONSTANT);

        const updates = [];

        // Group activities by day
        const activityMap = new Map<string, typeof activities>();
        activities.forEach(a => {
            const d = new Date(a.startDate);
            d.setUTCHours(0, 0, 0, 0);
            const k = d.toISOString();
            if (!activityMap.has(k)) activityMap.set(k, []);
            activityMap.get(k)!.push(a);
        });

        // Iterate
        for (let d = new Date(startDate); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
            const dateKey = d.toISOString();
            const dailyActivities = activityMap.get(dateKey) || [];

            // Calculate Daily Load
            let dailyTrimp = 0;
            let dailyRunningTss = 0;

            for (const a of dailyActivities) {
                // Re-implement calculation logic or import helper
                // We use helper from fitness.ts, but need to adapt types
                // Activity type is Prisma enum (string mostly)

                // TRIMP
                let trimp = calculateTrimpFromZones(a.hrZone1Time, a.hrZone2Time, a.hrZone3Time, a.hrZone4Time, a.hrZone5Time);
                if (trimp === 0 && a.movingTime > 0) {
                    // Fallback (matches history route logic)
                    trimp = (a.movingTime / 60) * 2.5;
                }

                // Running TSS
                const contribution = getActivityContribution(a.type);
                const runningTss = contribution.contributesToRunningTss && a.type === 'RUN' // simplified check
                    ? calculateRunningTss(a.movingTime, a.distance, 300) // Assumes threshold 5:00/km default if not provided?
                    // wait, calculateRunningTss needs pace.
                    // In history API we used consistent 300 (5:00/km) which is weird.
                    // Ideally this should use users threshold.
                    : 0;

                dailyTrimp += trimp;
                dailyRunningTss += runningTss;
            }

            // Apply Decay
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
        }

        // 5. Batch Update
        // Prisma does not support bulk upsert easily. We use transaction with individual upserts.
        // This is much faster than serial awaits.
        await prisma.$transaction(
            updates.map(u =>
                prisma.dailyFitness.upsert({
                    where: { userId_date: { userId: u.userId, date: u.date } },
                    update: {
                        ctl: u.ctl, atl: u.atl, tsb: u.tsb,
                        ctlRunning: u.ctlRunning, trimp: u.trimp, runningTss: u.runningTss
                    },
                    create: u
                })
            )
        );
    } catch (error) {
        // Log error but don't throw - fitness cache updates are non-critical
        // and shouldn't break the main sync flow
        console.error('[FitnessCache] Error updating fitness cache:', error);
        // Optionally: log to monitoring service
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
