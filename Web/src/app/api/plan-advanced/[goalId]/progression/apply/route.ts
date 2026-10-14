import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { PlanPhase, Prisma, WorkoutType } from '@/generated/prisma/client';
import { parseStructuredWorkout, summarizeStructuredWorkout } from '@/lib/plans/structured';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import { estimateBikeFtpFromVdot } from '@/lib/plans/bike-zones';
import { inferSport } from '@/lib/plans/descriptions';

type RouteContext = { params: Promise<{ goalId: string }> };

/**
 * Builder week shape (`ProgressionWeekData` from the Progression Builder UI —
 * the only writer of `IntervalProgression.weeks`). Stored as JSON on the
 * progression row or posted inline.
 */
type ProgressionSegment = { distance: number; pace: string };

type ProgressionWeek = {
    weekOffset: number;
    warmup?: ProgressionSegment | null;
    main?: Array<{ reps: number; distance: number; pace: string; restSeconds: number }>;
    cooldown?: ProgressionSegment | null;
};

const MAX_DESCRIPTION_LENGTH = 500;

function asSegment(value: unknown): ProgressionSegment | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const seg = value as Record<string, unknown>;
    if (typeof seg.distance !== 'number' || !(seg.distance > 0)) return null;
    if (typeof seg.pace !== 'string' || !seg.pace.trim()) return null;
    return { distance: seg.distance, pace: seg.pace };
}

function asProgressionWeek(value: unknown): ProgressionWeek | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const main = Array.isArray(raw.main)
        ? raw.main
            .map((item) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
                const s = item as Record<string, unknown>;
                if (typeof s.reps !== 'number' || !(s.reps > 0)) return null;
                if (typeof s.distance !== 'number' || !(s.distance > 0)) return null;
                if (typeof s.pace !== 'string' || !s.pace.trim()) return null;
                const restSeconds = typeof s.restSeconds === 'number' && s.restSeconds > 0 ? s.restSeconds : 0;
                return { reps: s.reps, distance: s.distance, pace: s.pace, restSeconds };
            })
            .filter((item): item is { reps: number; distance: number; pace: string; restSeconds: number } => item !== null)
        : [];
    const warmup = asSegment(raw.warmup);
    const cooldown = asSegment(raw.cooldown);
    if (main.length === 0 && !warmup && !cooldown) return null;
    return {
        weekOffset: typeof raw.weekOffset === 'number' ? raw.weekOffset : 0,
        warmup,
        main: main.length > 0 ? main : undefined,
        cooldown,
    };
}

/** Total meters of a builder week (mirrors the UI's `weekTotalDistance`). */
function weekTotalDistanceMeters(week: ProgressionWeek): number {
    let total = (week.warmup?.distance ?? 0) + (week.cooldown?.distance ?? 0);
    for (const s of week.main ?? []) total += s.reps * s.distance;
    return total;
}

/** Clean, bounded one-line description for the generated workout. */
function buildWeekDescription(progressionName: string, weekLabel: string, week: ProgressionWeek): string {
    const mainText = (week.main ?? [])
        .map((s) => {
            const distance = s.distance >= 1000 ? `${Number((s.distance / 1000).toFixed(2))}km` : `${Math.round(s.distance)}m`;
            return `${s.reps}x${distance} @ ${s.pace}`;
        })
        .join(', ');
    const text = `${progressionName} - ${weekLabel}${mainText ? `: ${mainText}` : ''}`.trim();
    return text.length > MAX_DESCRIPTION_LENGTH ? `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…` : text;
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
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        const {
            progressionId,
            planStartDate,
            inlineWorkoutType,
            inlineStartWeek,
            inlineEndWeek,
            inlineWeeks,
        } = body as Record<string, unknown>;

        if (!planStartDate || isNaN(new Date(String(planStartDate)).getTime())) {
            return NextResponse.json({ error: 'Valid planStartDate is required' }, { status: 400 });
        }

        // Two accepted request shapes:
        //  1. { progressionId, planStartDate }       — apply a saved progression
        //  2. { workoutType, startWeek, endWeek, weeks, planStartDate } — apply inline
        let workoutType: WorkoutType;
        let startWeek: number;
        let endWeek: number;
        let name: string;
        let rawWeeks: unknown[];
        let appliedProgressionId: string | null = null;

        if (typeof progressionId === 'string' && progressionId.trim()) {
            const progression = await prisma.intervalProgression.findFirst({
                where: { id: progressionId, goalId, goal: { userId: session.user.id } },
            });
            if (!progression) {
                return NextResponse.json({ error: 'Progression not found' }, { status: 404 });
            }
            appliedProgressionId = progression.id;
            workoutType = progression.workoutType;
            startWeek = progression.startWeek;
            endWeek = progression.endWeek;
            name = progression.name;
            rawWeeks = Array.isArray(progression.weeks) ? (progression.weeks as unknown[]) : [];
        } else if (
            typeof inlineWorkoutType === 'string' && inlineWorkoutType.trim() &&
            typeof inlineStartWeek === 'number' && inlineStartWeek >= 1 &&
            Array.isArray(inlineWeeks)
        ) {
            workoutType = inlineWorkoutType.trim() as WorkoutType;
            startWeek = inlineStartWeek;
            endWeek = typeof inlineEndWeek === 'number' ? inlineEndWeek : startWeek + inlineWeeks.length - 1;
            name = typeof inlineEndWeek === 'number' ? `${workoutType} W${inlineStartWeek}-${inlineEndWeek}` : `${workoutType} W${inlineStartWeek}+`;
            rawWeeks = inlineWeeks;
        } else {
            return NextResponse.json(
                { error: 'Either progressionId or (workoutType, startWeek, weeks) is required' },
                { status: 400 },
            );
        }

        if (
            typeof startWeek !== 'number' ||
            typeof endWeek !== 'number' ||
            startWeek < 1 ||
            endWeek < startWeek ||
            endWeek > 52 ||
            (endWeek - startWeek) > 26
        ) {
            return NextResponse.json(
                { error: 'Invalid week bounds: startWeek and endWeek must satisfy 1 <= startWeek <= endWeek <= 52 and endWeek - startWeek <= 26' },
                { status: 400 },
            );
        }

        const weeks = rawWeeks
            .map(asProgressionWeek)
            .filter((week): week is ProgressionWeek => week !== null)
            .sort((a, b) => a.weekOffset - b.weekOffset);
        if (weeks.length === 0) {
            return NextResponse.json({ error: 'Progression has no valid weeks data' }, { status: 400 });
        }

        await createSnapshot(goalId, 'Before apply progression', 'apply_progression');

        const planStart = new Date(String(planStartDate));
        const workoutDay = goal.workoutDay ?? 3;
        const vdot = goal.currentVdot && goal.currentVdot > 0 ? goal.currentVdot : 45;
        const ftpWatts = goal.ftpAtCreation ?? estimateBikeFtpFromVdot(vdot);
        const paces = calculateTrainingPaces(vdot);
        const fallbackPaceSec = Math.round((paces.easy.min + paces.easy.max) / 2);
        let createdCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const weekData of weeks) {
                const planWeekIndex = startWeek - 1 + Math.max(0, Math.round(weekData.weekOffset));
                const weekLabel = `W${planWeekIndex + 1}`;
                const scheduledDate = new Date(planStart);
                scheduledDate.setDate(scheduledDate.getDate() + planWeekIndex * 7 + workoutDay);

                // Canonical v2 structured steps (source: 'progression') from the
                // builder week — pace letters resolve against the plan VDOT.
                const structuredSteps = parseStructuredWorkout(weekData, workoutType, vdot, ftpWatts);

                // Numeric targets derived from the v2 tree (distance/duration),
                // with a distance-weighted average target pace in sec/km.
                const targetDistance = Math.round(weekTotalDistanceMeters(weekData));
                let targetDuration = 0;
                let targetPace = 0;
                if (structuredSteps) {
                    const summary = summarizeStructuredWorkout(structuredSteps, fallbackPaceSec, ftpWatts);
                    targetDuration = summary.totalDurationSeconds;
                    if (summary.totalDistanceMeters > 0 && targetDuration > 0) {
                        targetPace = Math.round(targetDuration / (summary.totalDistanceMeters / 1000));
                    }
                }
                if (targetDuration <= 0 && targetDistance > 0 && targetPace > 0) {
                    targetDuration = Math.round((targetDistance / 1000) * targetPace);
                }
                const plannedTss = calculateWorkoutPlannedTss({
                    workoutType,
                    sport: inferSport(workoutType),
                    targetDistance,
                    targetDuration: targetDuration > 0 ? targetDuration : null,
                    targetPace: targetPace > 0 ? targetPace : null,
                    structuredSteps,
                    ftpWatts,
                });

                const description = buildWeekDescription(name, weekLabel, weekData);

                const sharedData = {
                    workoutType,
                    sport: inferSport(workoutType),
                    description,
                    phase: PlanPhase.BUILD,
                    targetDistance: targetDistance > 0 ? targetDistance : null,
                    targetDuration,
                    targetPace,
                    plannedTss,
                    ...(structuredSteps && { structuredSteps: structuredSteps as unknown as Prisma.InputJsonValue }),
                    intervalProgressionId: appliedProgressionId,
                };

                const existing = await tx.workout.findFirst({
                    where: {
                        goalId,
                        scheduledDate: {
                            gte: new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()),
                            lt: new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate() + 1),
                        },
                        workoutType,
                    },
                });

                if (existing) {
                    await tx.workout.update({
                        where: { id: existing.id },
                        data: sharedData,
                    });
                } else {
                    await tx.workout.create({
                        data: {
                            goalId,
                            scheduledDate,
                            order: workoutDay,
                            ...sharedData,
                        },
                    });
                }
                createdCount++;
            }
        });

        return NextResponse.json({ success: true, created: createdCount });
    } catch (error) {
        console.error('Apply progression error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
