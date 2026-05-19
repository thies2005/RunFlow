import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { WorkoutType as WT, PlanPhase } from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';

type RouteContext = { params: Promise<{ goalId: string }> };

const VALID_WORKOUT_TYPES = new Set(Object.values(WT));

function resolveWorkoutType(rawType: string | undefined): WT | null {
    if (!rawType) return null;
    const upper = rawType.trim().toUpperCase();
    if (VALID_WORKOUT_TYPES.has(upper as WT)) return upper as WT;

    const map: Record<string, WT> = {
        'REST_DAY': 'REST',
        'REST': 'REST',
        'EASY_RUN': 'EASY',
        'LONG_RUN': 'LONG_RUN',
        'TEMPO_RUN': 'TEMPO',
        'INTERVAL': 'INTERVALS',
        'FARTLEK': 'FARTLEK',
        'REPS': 'REPETITIONS',
        'RECOVERY_RUN': 'RECOVERY',
        'CROSS_TRAIN': 'CROSS_TRAIN',
        'BIKE': 'RIDE',
        'RIDE': 'RIDE',
        'SWIM': 'SWIM',
        'STRENGTH': 'STRENGTH',
        'OTHER': 'OTHER',
        'BRICK': 'BRICK',
        'OPEN_WATER': 'OPEN_WATER_SWIM',
        'LONG_RIDE': 'LONG_RIDE',
        'RIDE_INTERVAL': 'RIDE_INTERVALS',
        'SWIM_DRILL': 'SWIM_DRILL',
        'TRANSITION': 'TRANSITION_PRACTICE',
    };

    return map[upper] || null;
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

        const body = await req.json();
        const { templateId, weekStartIndex, weekEndIndex, planStartDate } = body;

        if (!templateId) {
            return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
        }

        if (typeof weekStartIndex !== 'number' || weekStartIndex < 1) {
            return NextResponse.json({ error: 'weekStartIndex must be a positive number (1-based)' }, { status: 400 });
        }

        if (typeof weekEndIndex !== 'number' || weekEndIndex < weekStartIndex) {
            return NextResponse.json({ error: 'weekEndIndex must be >= weekStartIndex' }, { status: 400 });
        }

        if (!planStartDate || isNaN(new Date(planStartDate).getTime())) {
            return NextResponse.json({ error: 'Valid planStartDate is required' }, { status: 400 });
        }

        const template = await prisma.weekTemplate.findFirst({
            where: { id: templateId, userId: session.user.id },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const days = template.days as Array<Record<string, unknown>>;

        await createSnapshot(goalId, 'Before apply template', 'apply_template');

        const planStart = new Date(planStartDate);
        let createdCount = 0;

        await prisma.$transaction(async (tx) => {
            for (let weekIdx = weekStartIndex; weekIdx <= weekEndIndex; weekIdx++) {
                const weekOffset = (weekIdx - 1) * 7;
                const weekStart = new Date(planStart);
                weekStart.setDate(weekStart.getDate() + weekOffset);

                for (const day of days) {
                    const dayIndex = typeof day.dayIndex === 'number' ? day.dayIndex : 0;
                    const workoutTypeRaw = typeof day.workoutType === 'string' ? day.workoutType : undefined;
                    const workoutType = resolveWorkoutType(workoutTypeRaw);

                    if (!workoutType || workoutType === 'REST') continue;

                    const scheduledDate = new Date(weekStart);
                    scheduledDate.setDate(scheduledDate.getDate() + dayIndex);

                    const description = typeof day.description === 'string' ? day.description : (typeof workoutTypeRaw === 'string' ? workoutTypeRaw : 'Workout');
                    const customName = typeof day.name === 'string' ? day.name : null;
                    const targetDistance = typeof day.distanceM === 'number' ? day.distanceM : null;
                    const targetDuration = typeof day.durationS === 'number' ? day.durationS : null;
                    const targetPace = typeof day.paceSKm === 'number' ? day.paceSKm : null;
                    const targetHrZone = typeof day.hrZone === 'number' ? day.hrZone : null;
                    const structuredSteps = day.structuredSteps ?? Prisma.DbNull;
                    const phase = typeof day.phase === 'string' ? day.phase : PlanPhase.BASE;

                    await tx.workout.create({
                        data: {
                            goalId,
                            scheduledDate,
                            workoutType,
                            description,
                            phase: phase as PlanPhase,
                            order: dayIndex,
                            customName,
                            targetDistance,
                            targetDuration,
                            targetPace,
                            targetHrZone,
                            structuredSteps,
                        },
                    });
                    createdCount++;
                }
            }
        });

        return NextResponse.json({ success: true, created: createdCount, weeksAffected: weekEndIndex - weekStartIndex + 1 });
    } catch (error) {
        console.error('Apply template error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
