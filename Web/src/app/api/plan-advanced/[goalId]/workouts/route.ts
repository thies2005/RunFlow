import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { WorkoutType as WT, PlanPhase } from '@/generated/prisma/client';

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;
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
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { scheduledDate, workoutType, description, phase, order, notes, targetDistance, targetDuration, targetPace, targetHrZone, customName, color, structuredSteps, groupId, subGoalId } = body;

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

        if (!description || typeof description !== 'string') {
            return NextResponse.json({ error: 'description is required' }, { status: 400 });
        }

        await createSnapshot(goalId, 'Before workout create', 'create_workout');

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: new Date(scheduledDate),
                workoutType: workoutType as WT,
                description,
                phase: (phase as PlanPhase) || PlanPhase.BASE,
                order: order ?? 0,
                notes: notes || null,
                targetDistance: targetDistance ?? null,
                targetDuration: targetDuration ?? null,
                targetPace: targetPace ?? null,
                targetHrZone: targetHrZone ?? null,
                customName: customName || null,
                color: color || null,
                structuredSteps: structuredSteps ?? null,
                groupId: groupId || null,
                subGoalId: subGoalId || null,
            },
        });

        return NextResponse.json({ workout }, { status: 201 });
    } catch (error) {
        console.error('Advanced plan workout create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
