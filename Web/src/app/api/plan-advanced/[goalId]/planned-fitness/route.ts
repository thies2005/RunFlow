import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import {
    calculatePlanPlannedTss,
    calculateProjectedFitness,
    type WorkoutForPlannedTss,
} from '@/lib/metrics/plannedTss';

type RouteContext = { params: Promise<{ goalId: string }> };

/**
 * GET /api/plan-advanced/[goalId]/planned-fitness
 *
 * Returns a Planned-vs-Actual PMC curve (audit item G3): a combined fitness
 * projection where completed days use actual TSS (from DailyFitness) and future
 * days use planned TSS (estimated from workout targets via
 * `calculateWorkoutPlannedTss`).
 */
export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, deletedAt: null },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        // All workouts for the goal, ordered chronologically.
        const workouts = await prisma.workout.findMany({
            where: { goalId },
            orderBy: { scheduledDate: 'asc' },
            select: {
                workoutType: true,
                sport: true,
                scheduledDate: true,
                targetDistance: true,
                targetDuration: true,
                targetPace: true,
                targetPaceMinSecondsPerKm: true,
                targetPaceMaxSecondsPerKm: true,
                structuredSteps: true,
                isCompleted: true,
                plannedTss: true,
            },
        });

        // Existing actual fitness (DailyFitness) across the goal's date range.
        // We derive the range from the workouts themselves so we always include
        // planned days even when the goal lacks explicit start/race dates.
        const plannedDateRange = deriveDateRange(workouts, goal.raceDate);
        const dailyFitnessRecords = await prisma.dailyFitness.findMany({
            where: {
                userId: session.user.id,
                ...(plannedDateRange
                    ? { date: { gte: plannedDateRange.start, lte: plannedDateRange.end } }
                    : {}),
            },
            orderBy: { date: 'asc' },
            select: { date: true, trimp: true, runningTss: true },
        });

        // Actual TSS per day. Prefer runningTss (sport-specific) when present,
        // otherwise fall back to TRIMP as a CTL-equivalent load.
        const actualByDay = new Map<string, number>();
        for (const d of dailyFitnessRecords) {
            const key = d.date.toISOString().split('T')[0];
            const load = d.runningTss > 0 ? d.runningTss : d.trimp;
            actualByDay.set(key, Math.round(load * 10) / 10);
        }

        // Planned TSS per day (completed workouts are skipped inside the helper).
        const plannedByDay = calculatePlanPlannedTss(workouts as WorkoutForPlannedTss[]);

        // Build the combined, contiguous day list.
        const dayKeys = new Set<string>([...plannedByDay.keys(), ...actualByDay.keys()]);
        if (dayKeys.size === 0) {
            return NextResponse.json({
                curve: [],
                summary: {
                    peakPlannedCtl: null,
                    raceWeekPlannedTsb: null,
                    plannedDays: 0,
                    actualDays: 0,
                },
            });
        }

        const sortedKeys = [...dayKeys].sort();
        const loads = sortedKeys.map(key => ({
            date: new Date(key + 'T00:00:00.000Z'),
            plannedTss: plannedByDay.get(key) ?? 0,
            actualTss: actualByDay.get(key) ?? 0,
        }));

        // Seed the projection with the latest known actual CTL/ATL so the curve
        // connects smoothly onto real history rather than restarting from zero.
        // Use the latest actual at or before the FIRST projected day, but fall back
        // to the latest actual overall when the plan starts before any actual history
        // (common for new plans) — otherwise the seed would be null and the projection
        // would restart from CTL/ATL = 0.
        const firstProjectedDay = new Date(sortedKeys[0] + 'T00:00:00.000Z');
        const lastActual = await prisma.dailyFitness.findFirst({
            where: {
                userId: session.user.id,
                date: { lte: firstProjectedDay },
            },
            orderBy: { date: 'desc' },
            select: { ctl: true, atl: true },
        }) ?? await prisma.dailyFitness.findFirst({
            where: { userId: session.user.id },
            orderBy: { date: 'desc' },
            select: { ctl: true, atl: true },
        });

        const curve = calculateProjectedFitness(loads, {
            initialCtl: lastActual?.ctl ?? 0,
            initialAtl: lastActual?.atl ?? 0,
        });

        // Summary metrics: peak planned CTL across the projection, and the
        // planned TSB on race week (7 days before the race date, or the final
        // projected point when no race date is set).
        let peakPlannedCtl = 0;
        for (const p of curve) {
            if (p.plannedCtl > peakPlannedCtl) peakPlannedCtl = p.plannedCtl;
        }

        let raceWeekPlannedTsb: number | null = null;
        if (goal.raceDate) {
            const raceKey = goal.raceDate.toISOString().split('T')[0];
            const racePoint = curve.find(
                p => p.date.toISOString().split('T')[0] === raceKey
            );
            if (racePoint) raceWeekPlannedTsb = racePoint.plannedTsb;
        }
        if (raceWeekPlannedTsb === null && curve.length > 0) {
            raceWeekPlannedTsb = curve[curve.length - 1].plannedTsb;
        }

        const actualDays = loads.filter(l => l.actualTss > 0).length;
        const plannedDays = loads.filter(l => l.plannedTss > 0).length;

        return NextResponse.json({
            curve: curve.map(p => ({
                date: p.date.toISOString().split('T')[0],
                plannedCtl: p.plannedCtl,
                plannedAtl: p.plannedAtl,
                plannedTsb: p.plannedTsb,
                actualTss: p.actualTss,
                plannedTss: p.plannedTss,
            })),
            summary: {
                peakPlannedCtl: Math.round(peakPlannedCtl * 10) / 10,
                raceWeekPlannedTsb:
                    raceWeekPlannedTsb !== null
                        ? Math.round(raceWeekPlannedTsb * 10) / 10
                        : null,
                plannedDays,
                actualDays,
                raceDate: goal.raceDate,
            },
        });
    } catch (error) {
        console.error('Planned fitness error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Derive a contiguous date range covering all workouts (and the race date when
 * known) so the DailyFitness query can be bounded. Returns null when there are
 * no workouts.
 */
function deriveDateRange(
    workouts: { scheduledDate: Date }[],
    raceDate: Date | null | undefined
): { start: Date; end: Date } | null {
    const timestamps = workouts.map(w => new Date(w.scheduledDate).getTime());
    if (raceDate) timestamps.push(new Date(raceDate).getTime());
    if (timestamps.length === 0) return null;

    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));
    return { start, end };
}
