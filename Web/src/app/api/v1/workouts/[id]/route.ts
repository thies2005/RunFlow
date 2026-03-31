import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { setApiVersionHeaders } from '@/lib/api/version';

const VALID_WORKOUT_TYPES: WorkoutType[] = [
    'EASY',
    'LONG_RUN',
    'TEMPO',
    'INTERVALS',
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
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const body = await req.json();
        const { workoutType, description, targetDistance, targetDuration, scheduledDate, isCompleted, linkedActivityId } = body;

        if (workoutType !== undefined && !isValidWorkoutType(workoutType)) {
            const response = NextResponse.json(
                { error: `Invalid workout type. Must be one of: ${VALID_WORKOUT_TYPES.join(', ')}` },
                { status: 400 }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (linkedActivityId) {
            const activity = await prisma.activity.findUnique({ where: { id: linkedActivityId } });
            if (!activity || activity.userId !== session.user.id) {
                const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
                setApiVersionHeaders(response.headers);
                return response;
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

        const response = NextResponse.json(updated);
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Update workout error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        await prisma.workout.delete({ where: { id } });

        const response = NextResponse.json({ success: true });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Delete workout error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
