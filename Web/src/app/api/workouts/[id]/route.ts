import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { logger } from '@/lib/logging/logger';

// Valid workout type enum values for validation
const VALID_WORKOUT_TYPES: WorkoutType[] = [
    'EASY',
    'LONG_RUN',
    'TEMPO',
    'INTERVALS',
    'FARTLEK',
    'REPETITIONS',
    'RECOVERY',
    'RACE',
    'REST',
    'CROSS_TRAIN',
    'RIDE',
    'SWIM',
    'STRENGTH',
    'OTHER',
    'BRICK',
    'OPEN_WATER_SWIM',
    'LONG_RIDE',
    'RIDE_INTERVALS',
    'SWIM_DRILL',
    'TRANSITION_PRACTICE',
    'DOUBLE_DAY',
];

function isValidWorkoutType(value: string): value is WorkoutType {
    return VALID_WORKOUT_TYPES.includes(value as WorkoutType);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const user = await getAuthenticatedUser(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();

        // Validate workout type if provided
        if (body.workoutType !== undefined && !isValidWorkoutType(body.workoutType)) {
            return NextResponse.json(
                { error: `Invalid workout type. Must be one of: ${VALID_WORKOUT_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        // Verify ownership
        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (typeof body.subGoalId === 'string' && body.subGoalId.trim() !== '') {
            const subGoal = await prisma.goal.findFirst({
                where: { id: String(body.subGoalId), userId: user.id, parentGoalId: workout.goalId },
                select: { id: true },
            });
            if (!subGoal) return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
        }

        // If linking an activity, verify ownership
        if (body.linkedActivityId) {
            const activity = await prisma.activity.findUnique({ where: { id: body.linkedActivityId } });
            if (!activity || activity.userId !== user.id) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }
        }

        const allowedFields = [
            'scheduledDate', 'workoutType', 'description', 'displayDesc', 'phase', 'order', 'notes',
            'targetDistance', 'targetDuration', 'targetPace', 'targetPaceMinSecondsPerKm', 'targetPaceMaxSecondsPerKm',
            'targetPaceZoneLabel', 'targetHrZone', 'targetHrMinBpm', 'targetHrMaxBpm', 'targetHrZoneLabel',
            'targetPowerWatts', 'targetPowerMinWatts', 'targetPowerMaxWatts', 'targetPowerZone', 'targetFtpPercent',
            'targetCadenceRpm', 'targetRpe', 'intensityZone', 'plannedTss', 'sport', 'isCompleted', 'completedAt',
            'linkedActivityId', 'customName', 'color', 'structuredSteps', 'groupId', 'subGoalId',
        ];

        const updateData: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === 'scheduledDate') {
                    updateData[field] = body[field] ? new Date(body[field]) : undefined;
                } else if (field === 'completedAt') {
                    updateData[field] = body[field] ? new Date(body[field]) : null;
                } else {
                    updateData[field] = body[field];
                }
            }
        }

        if (body.isCompleted !== undefined) {
            if (body.completedAt === undefined) {
                updateData.completedAt = body.isCompleted ? (workout.completedAt ?? new Date()) : null;
            }
            if (!body.isCompleted) {
                updateData.linkedActivityId = null;
            }
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: updateData,
        });

        const justCompleted = body.isCompleted === true && !workout.isCompleted;
        if (justCompleted) {
            void adaptPlanAfterCompletion(workout.goalId, user.id).catch((err) => {
                logger.error('Plan adaptivity failed after workout completion', {
                    goalId: workout.goalId,
                    workoutId: workout.id,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const user = await getAuthenticatedUser(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.workout.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
