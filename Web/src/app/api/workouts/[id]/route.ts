import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

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

        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        // Allow updating type, desc, targets, date, completed
        const { workoutType, description, targetDistance, targetDuration, scheduledDate, isCompleted, linkedActivityId } = body;

        // Validate workout type if provided
        if (workoutType !== undefined && !isValidWorkoutType(workoutType)) {
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

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // If linking an activity, verify ownership
        if (linkedActivityId) {
            const activity = await prisma.activity.findUnique({ where: { id: linkedActivityId } });
            if (!activity || activity.userId !== session.user.id) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: {
                workoutType: workoutType as WorkoutType | undefined,
                description,
                targetDistance,
                targetDuration,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
                linkedActivityId: linkedActivityId ?? null
            }
        });

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

        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.workout.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
