import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/db';
import { RaceType } from '@/generated/prisma/browser';
import {
    resolvePhaseBudget,
    getPhase,
    getDefaultRunTaperWeeks,
    ULTRA_RACE_TYPES,
    TRIATHLON_RACE_TYPES,
    type PlanConfig,
} from '@/lib/plans';

type RouteContext = { params: Promise<{ goalId: string }> };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekNumberFromDate(date: Date, startDate: Date): number {
    return Math.max(1, Math.ceil((date.getTime() - startDate.getTime()) / WEEK_MS));
}

/**
 * Builds the per-week phase map using the canonical resolvers
 * ({@link resolvePhaseBudget} + {@link getPhase}) so the regenerated phases
 * match the plan generator exactly. Previously this route re-implemented phase
 * computation inline, which diverged from the generator (e.g. it invented a
 * `RECOVERY` phase the generator does not tag for standard plans, contained a
 * dead `cyclePos === cycleLength ? 'BASE' : 'BASE'` branch, and used different
 * phase fractions).
 *
 * The phase set here is the generator's: BASE / BUILD / PEAK / TAPER /
 * RACE_WEEK (plus MAINTAIN for no-race plans). Sub-goal focus overrides below
 * still re-tag weeks to TUNE_UP / RECOVERY to preserve the existing
 * multi-goal behavior.
 */
function buildPhaseMap(goal: {
    raceType: RaceType | null;
    raceDate: Date | null;
    planStartDate: Date | null;
    planWeeks: number | null;
    taperWeeks: number | null;
    peakWeeks: number | null;
    buildWeeks: number | null;
    customDistanceM?: number | null;
    sport?: string | null;
}): Record<number, string> {
    const phaseMap: Record<number, string> = {};
    const { raceType, raceDate } = goal;

    const startDate = goal.planStartDate || new Date();

    if (!raceType || !raceDate) {
        // No-race plan: the generator (generateNoRacePlan) ramps then builds
        // then maintains. Reproduce that BASE/BUILD/MAINTAIN split here so
        // regenerated phases align with what the generator originally tagged.
        const totalWeeks = goal.planWeeks || 12;
        const rampWeeks = Math.max(4, Math.ceil(totalWeeks * 0.4));
        const buildWeeks = Math.max(2, Math.ceil(totalWeeks * 0.3));

        for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
            const weekIndex = weekNum - 1;
            if (weekIndex < rampWeeks) phaseMap[weekNum] = 'BASE';
            else if (weekIndex < rampWeeks + buildWeeks) phaseMap[weekNum] = 'BUILD';
            else phaseMap[weekNum] = 'MAINTAIN';
        }
        return phaseMap;
    }

    const raceMs = new Date(raceDate).getTime();
    const startMs = new Date(startDate).getTime();
    const totalWeeks = Math.max(1, Math.ceil((raceMs - startMs) / WEEK_MS));

    const isTriathlon = goal.sport === 'TRIATHLON' || (raceType ? TRIATHLON_RACE_TYPES.includes(raceType) : false);
    const isUltra = raceType ? ULTRA_RACE_TYPES.includes(raceType) : false;

    // resolvePhaseBudget only reads taperWeeks/peakWeeks/buildWeeks, so a
    // minimal config is enough. customDistanceM feeds the default-taper
    // selection below (via getDefaultRunTaperWeeks) but not resolvePhaseBudget.
    const config: Pick<PlanConfig, 'taperWeeks' | 'peakWeeks' | 'buildWeeks'> = {
        taperWeeks: goal.taperWeeks ?? undefined,
        peakWeeks: goal.peakWeeks ?? undefined,
        buildWeeks: goal.buildWeeks ?? undefined,
    };

    const defaultTaper = getDefaultRunTaperWeeks(raceType, goal.customDistanceM ?? null);
    const budget = resolvePhaseBudget(totalWeeks, config, { isTriathlon, isUltra, defaultTaper });

    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const weeksUntilRace = totalWeeks - weekNum + 1;
        phaseMap[weekNum] = getPhase(weeksUntilRace, {
            taperWeeks: budget.taperWeeks,
            peakWeeks: budget.peakWeeks,
            buildWeeks: budget.buildWeeks,
        });
    }

    return phaseMap;
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
            include: {
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { raceDate: 'asc' },
                },
            },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const startDate = goal.planStartDate || new Date();
        const raceDate = goal.raceDate;
        const raceType = goal.raceType;
        const totalWeeks = goal.planWeeks || 12;

        const phaseMap = buildPhaseMap({
            raceType,
            raceDate,
            planStartDate: goal.planStartDate,
            planWeeks: goal.planWeeks,
            taperWeeks: goal.taperWeeks,
            peakWeeks: goal.peakWeeks,
            buildWeeks: goal.buildWeeks,
            customDistanceM: goal.customDistanceM,
            sport: goal.sport,
        });

        const subGoalsWithPhases = goal.subGoals.map((sg) => {
            if (!sg.raceDate || !raceDate) return { subGoalId: sg.id, affectedWeeks: [] };
            const sgRaceMs = new Date(sg.raceDate).getTime();
            const sgWeek = Math.ceil((sgRaceMs - new Date(startDate).getTime()) / WEEK_MS);
            const priority = sg.priority as string;
            const focusWeeks = priority === 'SECONDARY' ? 3 : priority === 'TUNE_UP' ? 1 : 0;
            const affectedWeeks: number[] = [];
            for (let w = Math.max(1, sgWeek - Math.floor(focusWeeks / 2)); w <= Math.min(totalWeeks, sgWeek + Math.ceil(focusWeeks / 2)); w++) {
                affectedWeeks.push(w);
                if (priority === 'SECONDARY' || priority === 'TUNE_UP') {
                    if (w === sgWeek) phaseMap[w] = 'TUNE_UP';
                    else if (w > sgWeek && priority === 'SECONDARY') phaseMap[w] = 'RECOVERY';
                }
            }
            return { subGoalId: sg.id, affectedWeeks };
        });

        await prisma.$transaction(async (tx) => {
            await tx.workout.updateMany({
                where: { goalId, scheduledDate: { gte: startDate } },
                data: { phase: 'BASE' as never },
            });

            const workouts = await tx.workout.findMany({
                where: { goalId, scheduledDate: { gte: startDate } },
                orderBy: { scheduledDate: 'asc' },
            });

            for (const workout of workouts) {
                const d = new Date(workout.scheduledDate);
                const weekNum = weekNumberFromDate(d, startDate);
                const phase = phaseMap[weekNum] || 'BASE';
                await tx.workout.update({
                    where: { id: workout.id },
                    data: { phase: phase as never },
                });
            }
        });

        return NextResponse.json({
            success: true,
            phases: phaseMap,
            subGoals: subGoalsWithPhases,
            totalWeeks,
        });
    } catch (error) {
        console.error('Regenerate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
