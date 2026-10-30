import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import {
    calculateProjectedFitness,
    calculateWorkoutPlannedTss,
} from '@/lib/metrics/plannedTss';

function estimateTss(w: any): number {
    if (w.plannedTss && w.plannedTss > 0) return w.plannedTss;
    const calc = calculateWorkoutPlannedTss(w);
    if (calc && calc > 0) return calc;
    if (w.targetDuration && w.targetDuration > 0) {
        return Math.round((w.targetDuration / 3600) * 55);
    }
    if (w.targetDistance && w.targetDistance > 0) {
        return Math.round((w.targetDistance / 1000) * 4);
    }
    return 0;
}

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
            select: { date: true, trimp: true, runningTss: true, bikeTss: true, ctlBike: true, atlBike: true },
        });

        const todayKey = new Date().toISOString().split('T')[0];

        // Actual TSS per day. Include runningTss, bikeTss, swimTss, falling back to TRIMP
        const actualByDay = new Map<string, number>();
        for (const row of dailyFitnessRecords) {
            const key = row.date.toISOString().split('T')[0];
            const tss = (row.runningTss && row.runningTss > 0 ? row.runningTss : 0)
                + (row.bikeTss && row.bikeTss > 0 ? row.bikeTss : 0)
                + ((row as any).swimTss && (row as any).swimTss > 0 ? (row as any).swimTss : 0);
            actualByDay.set(key, Math.round((tss > 0 ? tss : (row.trimp ?? 0)) * 10) / 10);
        }

        // For completed workouts in workouts that are marked isCompleted: true on dates up to todayKey
        // where actualByDay.get(key) is 0 or undefined, add the workout's plannedTss || estimateTss(w) into actualByDay
        for (const w of workouts) {
            if (!w.isCompleted || !w.scheduledDate) continue;
            const key = w.scheduledDate.toISOString().split('T')[0];
            if (key <= todayKey) {
                const currentActual = actualByDay.get(key) ?? 0;
                if (currentActual === 0) {
                    const wTss = estimateTss(w);
                    if (wTss > 0) {
                        actualByDay.set(key, wTss);
                    }
                }
            }
        }

        // Planned TSS per day (cycling workouts use plannedTss first before estimating from targetDuration).
        const plannedByDay = new Map<string, number>();
        for (const w of workouts) {
            if (w.isCompleted) continue;
            if (!w.scheduledDate) continue;
            const tss = w.plannedTss && w.plannedTss > 0 ? w.plannedTss : estimateTss(w);
            if (tss <= 0) continue;
            const key = w.scheduledDate.toISOString().split('T')[0];
            plannedByDay.set(key, Math.round(((plannedByDay.get(key) ?? 0) + tss) * 10) / 10);
        }

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
        const isCyclingPlan = workouts.some(
            w => w.sport === 'BIKE' || ['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS'].includes(w.workoutType)
        );

        const firstProjectedDay = new Date(sortedKeys[0] + 'T00:00:00.000Z');
        const lastActual = await prisma.dailyFitness.findFirst({
            where: {
                userId: session.user.id,
                date: { lte: firstProjectedDay },
            },
            orderBy: { date: 'desc' },
            select: { ctl: true, atl: true, ctlBike: true, atlBike: true },
        }) ?? await prisma.dailyFitness.findFirst({
            where: { userId: session.user.id },
            orderBy: { date: 'desc' },
            select: { ctl: true, atl: true, ctlBike: true, atlBike: true },
        });

        const initialCtl = (isCyclingPlan && (lastActual?.ctlBike ?? 0) > 0)
            ? lastActual!.ctlBike!
            : (lastActual?.ctl ?? 0);
        const initialAtl = (isCyclingPlan && (lastActual?.atlBike ?? 0) > 0)
            ? lastActual!.atlBike!
            : (lastActual?.atl ?? 0);

        const curve = calculateProjectedFitness(loads, {
            initialCtl,
            initialAtl,
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
