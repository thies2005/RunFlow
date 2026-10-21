import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { WorkoutType as WT, PlanPhase } from '@/generated/prisma/client';
import { buildStructuredStepsForWorkout } from '@/lib/plans';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import { resolveWorkoutSport } from '@/lib/plans/structured';

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        // Dual auth (web session or mobile JWT), same as the mutations in
        // this file — the GET used to be session-only.
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;

        // Ownership check: without it any authenticated user could read any
        // other user's workout list by guessing goal ids (IDOR).
        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: user.id },
            select: { id: true },
        });
        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const url = new URL(req.url);
        const weekStart = url.searchParams.get('weekStart');
        const weekEnd = url.searchParams.get('weekEnd');

        const workoutWhere: Record<string, unknown> = { goalId };
        if (weekStart || weekEnd) {
            workoutWhere.scheduledDate = {};
            if (weekStart) {
                const from = new Date(weekStart);
                if (!isNaN(from.getTime())) {
                    (workoutWhere.scheduledDate as Record<string, Date>).gte = from;
                }
            }
            if (weekEnd) {
                const to = new Date(weekEnd);
                if (!isNaN(to.getTime())) {
                    (workoutWhere.scheduledDate as Record<string, Date>).lte = to;
                }
            }
        }

        const workouts = await prisma.workout.findMany({
            where: workoutWhere,
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
            include: {
                linkedActivity: {
                    select: {
                        id: true,
                        stravaId: true,
                        type: true,
                        name: true,
                        startDate: true,
                        distance: true,
                        movingTime: true,
                        averageSpeed: true,
                        averageHr: true,
                        totalElevation: true,
                    },
                },
            },
        });

        const transformed = workouts.map(w => ({
            ...w,
            linkedActivity: w.linkedActivity
                ? { ...w.linkedActivity, stravaId: w.linkedActivity.stravaId.toString() }
                : null,
        }));

        return NextResponse.json({ workouts: transformed });
    } catch (error) {
        console.error('Advanced plan workouts list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        // Dual auth: NextAuth session (web) or mobile JWT Bearer (app).
        const user = await getAuthenticatedUser(req);
        if (!user) {
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
            where: { id: goalId, userId: user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const {
            scheduledDate,
            workoutType,
            description,
            displayDesc,
            sport,
            phase,
            order,
            notes,
            targetDistance,
            targetDuration,
            targetPace,
            targetPaceMinSecondsPerKm,
            targetPaceMaxSecondsPerKm,
            targetPaceZoneLabel,
            targetHrZone,
            targetHrMinBpm,
            targetHrMaxBpm,
            targetHrZoneLabel,
            targetPowerWatts,
            targetPowerMinWatts,
            targetPowerMaxWatts,
            targetPowerZone,
            targetFtpPercent,
            targetCadenceRpm,
            targetRpe,
            plannedTss,
            customName,
            color,
            structuredSteps,
            groupId,
            subGoalId,
            isCompleted,
            linkedActivityId,
        } = body;

        if (!scheduledDate || isNaN(new Date(scheduledDate).getTime())) {
            return NextResponse.json({ error: 'Valid scheduledDate is required' }, { status: 400 });
        }

        if (!workoutType || typeof workoutType !== 'string') {
            return NextResponse.json({ error: 'workoutType is required' }, { status: 400 });
        }
        const validWorkoutTypes = ['EASY','LONG_RUN','TEMPO','INTERVALS','FARTLEK','REPETITIONS','RECOVERY','RACE','REST','CROSS_TRAIN','RIDE','SWIM','STRENGTH','OTHER','BRICK','OPEN_WATER_SWIM','LONG_RIDE','RIDE_INTERVALS','SWIM_DRILL','TRANSITION_PRACTICE','DOUBLE_DAY'];
        if (!validWorkoutTypes.includes(workoutType)) {
            return NextResponse.json({ error: 'Invalid workoutType' }, { status: 400 });
        }

        const desc = (typeof description === 'string' && description.trim().length > 0)
            ? description.trim()
            : workoutType.replace(/_/g, ' ');

        const resolvedSport = sport || resolveWorkoutSport(workoutType, sport);

        let normalizedPowerZone: number | null = null;
        if (targetPowerZone !== undefined && targetPowerZone !== null && targetPowerZone !== '') {
            const parsed = typeof targetPowerZone === 'number'
                ? Math.round(targetPowerZone)
                : parseInt(String(targetPowerZone).replace(/^Z/i, ''), 10);
            normalizedPowerZone = isNaN(parsed) ? null : parsed;
        }

        if (linkedActivityId) {
            const activity = await prisma.activity.findFirst({
                where: { id: linkedActivityId, userId: user.id },
            });
            if (!activity) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }
        }

        if (typeof subGoalId === 'string' && subGoalId.trim() !== '') {
            const subGoal = await prisma.goal.findFirst({
                where: { id: String(subGoalId), userId: user.id, parentGoalId: goalId },
                select: { id: true },
            });
            if (!subGoal) return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
        }

        let finalStructuredSteps = structuredSteps ?? null;
        if (!finalStructuredSteps) {
            const vdot = goal.currentVdot || 45;
            const ftpWatts = goal.ftpAtCreation || undefined;
            finalStructuredSteps = buildStructuredStepsForWorkout(
                {
                    type: workoutType as WT,
                    description: desc,
                    totalDistance: targetDistance ?? 0,
                    targetDuration: targetDuration ?? null,
                    targetPace: targetPace ?? null,
                    targetHrZone: targetHrZone ?? null,
                } as any,
                { vdot, ftpWatts }
            );
        }

        const finalPlannedTss = plannedTss !== undefined && plannedTss !== null
            ? plannedTss
            : calculateWorkoutPlannedTss({
                  workoutType: workoutType as WT,
                  sport: resolvedSport,
                  targetDistance: targetDistance || 0,
                  targetDuration: targetDuration || null,
                  targetPace: targetPace || null,
                  structuredSteps: finalStructuredSteps,
                  ftpWatts: goal.ftpAtCreation || undefined,
              });

        await createSnapshot(goalId, 'Before workout create', 'create_workout');

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: new Date(scheduledDate),
                workoutType: workoutType as WT,
                description: desc,
                displayDesc: displayDesc || null,
                sport: resolvedSport,
                phase: (phase as PlanPhase) || PlanPhase.BASE,
                order: order ?? 0,
                notes: notes || null,
                targetDistance: targetDistance ?? null,
                targetDuration: targetDuration ?? null,
                targetPace: targetPace ?? null,
                targetPaceMinSecondsPerKm: targetPaceMinSecondsPerKm ?? null,
                targetPaceMaxSecondsPerKm: targetPaceMaxSecondsPerKm ?? null,
                targetPaceZoneLabel: targetPaceZoneLabel || null,
                targetHrZone: targetHrZone ?? null,
                targetHrMinBpm: targetHrMinBpm ?? null,
                targetHrMaxBpm: targetHrMaxBpm ?? null,
                targetHrZoneLabel: targetHrZoneLabel || null,
                targetPowerWatts: targetPowerWatts ?? null,
                targetPowerMinWatts: targetPowerMinWatts ?? null,
                targetPowerMaxWatts: targetPowerMaxWatts ?? null,
                targetPowerZone: normalizedPowerZone,
                targetFtpPercent: targetFtpPercent ?? null,
                targetCadenceRpm: targetCadenceRpm ?? null,
                targetRpe: targetRpe ?? null,
                plannedTss: finalPlannedTss,
                customName: customName || null,
                color: color || null,
                structuredSteps: finalStructuredSteps ?? undefined,
                groupId: groupId || null,
                subGoalId: subGoalId || null,
                isCompleted: Boolean(isCompleted),
                completedAt: isCompleted ? new Date() : null,
                linkedActivityId: linkedActivityId || null,
            },
        });

        return NextResponse.json({ workout }, { status: 201 });
    } catch (error) {
        console.error('Advanced plan workout create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
