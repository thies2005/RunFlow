import { prisma } from '@/lib/db';

export interface SafetyAdvisory {
    level: 'info' | 'warning' | 'critical';
    rule: 'weekly_volume_spike' | 'long_run_cap' | 'consecutive_hard_days' | 'projected_tsb_overload';
    message: string;
}

const HARD_WORKOUT_TYPES = new Set<string>([
    'INTERVALS',
    'TEMPO',
    'REPETITIONS',
    'RIDE_INTERVALS',
    'RACE',
]);

function toDateKey(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function addDays(dateKey: string, days: number): string {
    const d = new Date(`${dateKey}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}

/**
 * Evaluates plan safety across 4 core exercise science rules:
 * 1. weekly_volume_spike: >10% weekly distance or TSS increase vs prior week AND vs 4-week rolling avg
 * 2. long_run_cap: single long run >35% of weekly running distance
 * 3. consecutive_hard_days: back-to-back hard workouts (INTERVALS, TEMPO, REPETITIONS, RIDE_INTERVALS, RACE)
 * 4. projected_tsb_overload: projected TSB drops below -30
 */
export async function evaluatePlanSafety(
    goalId: string,
    tx?: any
): Promise<SafetyAdvisory[]> {
    if (!goalId) return [];

    const db = tx || prisma;

    const goal = await db.goal.findUnique({
        where: { id: goalId },
        include: {
            workouts: {
                orderBy: { scheduledDate: 'asc' },
            },
        },
    });

    if (!goal || !goal.workouts || goal.workouts.length === 0) {
        return [];
    }

    const advisories: SafetyAdvisory[] = [];
    const workouts = goal.workouts;

    // ---------------------------------------------------------
    // Rule 3: Consecutive hard days
    // ---------------------------------------------------------
    const hardDays = new Set<string>();
    for (const w of workouts) {
        const typeStr = String(w.workoutType || '').toUpperCase();
        if (HARD_WORKOUT_TYPES.has(typeStr)) {
            hardDays.add(toDateKey(w.scheduledDate));
        }
    }

    const sortedHardDays = Array.from(hardDays).sort();
    for (let i = 0; i < sortedHardDays.length - 1; i++) {
        const currentDay = sortedHardDays[i];
        const nextDay = sortedHardDays[i + 1];
        if (addDays(currentDay, 1) === nextDay) {
            advisories.push({
                level: 'critical',
                rule: 'consecutive_hard_days',
                message: `Consecutive hard workout days detected on ${currentDay} and ${nextDay}. Consider placing a recovery or rest day between hard sessions.`,
            });
        }
    }

    // ---------------------------------------------------------
    // Weekly Aggregation (7-day buckets starting from earliest workout)
    // ---------------------------------------------------------
    const firstDate = new Date(workouts[0].scheduledDate);
    // Align anchor to Monday or start of week
    const anchor = new Date(firstDate);
    anchor.setUTCHours(0, 0, 0, 0);

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    interface WeekData {
        weekIndex: number;
        totalDistanceMeters: number;
        runningDistanceMeters: number;
        maxRunDistanceMeters: number;
        totalPlannedTss: number;
        runCount: number;
    }

    const weeksMap = new Map<number, WeekData>();

    for (const w of workouts) {
        const wDate = new Date(w.scheduledDate);
        const diffMs = wDate.getTime() - anchor.getTime();
        const weekIndex = Math.max(0, Math.floor(diffMs / WEEK_MS));

        let week = weeksMap.get(weekIndex);
        if (!week) {
            week = {
                weekIndex,
                totalDistanceMeters: 0,
                runningDistanceMeters: 0,
                maxRunDistanceMeters: 0,
                totalPlannedTss: 0,
                runCount: 0,
            };
            weeksMap.set(weekIndex, week);
        }

        const dist = Number(w.targetDistance || 0);
        const tss = Number(w.plannedTss || 0);
        const sport = String(w.sport || 'RUN').toUpperCase();
        const isRun = sport === 'RUN' || !['BIKE', 'RIDE', 'SWIM', 'STRENGTH'].includes(sport);

        week.totalDistanceMeters += dist;
        week.totalPlannedTss += tss;

        if (isRun && dist > 0) {
            week.runningDistanceMeters += dist;
            week.runCount += 1;
            if (dist > week.maxRunDistanceMeters) {
                week.maxRunDistanceMeters = dist;
            }
        }
    }

    const sortedWeekIndices = Array.from(weeksMap.keys()).sort((a, b) => a - b);

    // ---------------------------------------------------------
    // Rule 2: Long Run Cap (>35% of weekly running distance)
    // ---------------------------------------------------------
    for (const idx of sortedWeekIndices) {
        const week = weeksMap.get(idx)!;
        if (week.runningDistanceMeters > 0 && week.runCount > 1) {
            const longRunRatio = week.maxRunDistanceMeters / week.runningDistanceMeters;
            if (longRunRatio > 0.35) {
                const longRunKm = (week.maxRunDistanceMeters / 1000).toFixed(1);
                const totalRunKm = (week.runningDistanceMeters / 1000).toFixed(1);
                const pct = Math.round(longRunRatio * 100);
                advisories.push({
                    level: 'warning',
                    rule: 'long_run_cap',
                    message: `Long run in week ${idx + 1} (${longRunKm} km) accounts for ${pct}% of total weekly running volume (${totalRunKm} km), exceeding the 35% recommended threshold.`,
                });
            }
        }
    }

    // ---------------------------------------------------------
    // Rule 1: Weekly Volume Spike (>10% vs prior week AND vs 4-week rolling avg)
    // ---------------------------------------------------------
    for (let i = 1; i < sortedWeekIndices.length; i++) {
        const currentIdx = sortedWeekIndices[i];
        const prevIdx = sortedWeekIndices[i - 1];
        const currentWeek = weeksMap.get(currentIdx)!;
        const prevWeek = weeksMap.get(prevIdx)!;

        // Calculate 4-week rolling average of prior weeks
        const priorWeeks: WeekData[] = [];
        for (let k = Math.max(0, i - 4); k < i; k++) {
            priorWeeks.push(weeksMap.get(sortedWeekIndices[k])!);
        }

        const avgPriorDistance = priorWeeks.reduce((acc, w) => acc + w.totalDistanceMeters, 0) / priorWeeks.length;
        const avgPriorTss = priorWeeks.reduce((acc, w) => acc + w.totalPlannedTss, 0) / priorWeeks.length;

        const distanceSpike =
            prevWeek.totalDistanceMeters > 0 &&
            avgPriorDistance > 0 &&
            currentWeek.totalDistanceMeters > prevWeek.totalDistanceMeters * 1.10 &&
            currentWeek.totalDistanceMeters > avgPriorDistance * 1.10;

        const tssSpike =
            prevWeek.totalPlannedTss > 0 &&
            avgPriorTss > 0 &&
            currentWeek.totalPlannedTss > prevWeek.totalPlannedTss * 1.10 &&
            currentWeek.totalPlannedTss > avgPriorTss * 1.10;

        if (distanceSpike || tssSpike) {
            const reason = distanceSpike && tssSpike
                ? 'distance and TSS'
                : distanceSpike
                ? 'distance'
                : 'TSS';
            advisories.push({
                level: 'warning',
                rule: 'weekly_volume_spike',
                message: `Weekly ${reason} spike detected in week ${currentIdx + 1} (>10% increase vs prior week and 4-week rolling average).`,
            });
        }
    }

    // ---------------------------------------------------------
    // Rule 4: Projected TSB Overload (TSB drops below -30)
    // ---------------------------------------------------------
    const latestFitness = await db.dailyFitness.findFirst({
        where: { userId: goal.userId },
        orderBy: { date: 'desc' },
    });

    let currentCtl = latestFitness ? Number(latestFitness.ctl || 0) : 0;
    let currentAtl = latestFitness ? Number(latestFitness.atl || 0) : 0;

    // Group TSS by calendar day
    const dailyTssMap = new Map<string, number>();
    for (const w of workouts) {
        const dayKey = toDateKey(w.scheduledDate);
        const tss = Number(w.plannedTss || 0);
        dailyTssMap.set(dayKey, (dailyTssMap.get(dayKey) || 0) + tss);
    }

    const sortedDays = Array.from(dailyTssMap.keys()).sort();
    let minTsb = 0;
    let worstDay = '';

    for (const day of sortedDays) {
        const dayTss = dailyTssMap.get(day) || 0;
        currentCtl = currentCtl + (dayTss - currentCtl) / 42;
        currentAtl = currentAtl + (dayTss - currentAtl) / 7;
        const projectedTsb = currentCtl - currentAtl;

        if (projectedTsb < minTsb) {
            minTsb = projectedTsb;
            worstDay = day;
        }
    }

    if (minTsb < -30) {
        advisories.push({
            level: 'critical',
            rule: 'projected_tsb_overload',
            message: `Projected Training Stress Balance (TSB) drops below safe threshold to ${Math.round(minTsb)} on ${worstDay} (threshold: -30), indicating acute fatigue or overtraining risk.`,
        });
    }

    return advisories;
}
