import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export async function POST(req: Request) {
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
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { goalId, scheduledDate, type, workoutType, description, targetDistance, targetDuration } = body;
        const resolvedType = workoutType || type;

        const validWorkoutTypes = new Set<string>(Object.values(WorkoutType));
        if (typeof resolvedType !== 'string' || !validWorkoutTypes.has(resolvedType)) {
            return NextResponse.json({ error: 'Invalid workoutType' }, { status: 400 });
        }

        const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(NaN);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid scheduledDate' }, { status: 400 });
        }

        if (targetDistance !== undefined && targetDistance !== null && (typeof targetDistance !== 'number' || !Number.isFinite(targetDistance) || targetDistance < 0 || targetDistance > 500000)) {
            return NextResponse.json({ error: 'Invalid targetDistance (must be between 0 and 500000 meters)' }, { status: 400 });
        }

        if (targetDuration !== undefined && targetDuration !== null && (typeof targetDuration !== 'number' || !Number.isFinite(targetDuration) || targetDuration < 0 || targetDuration > 604800)) {
            return NextResponse.json({ error: 'Invalid targetDuration (must be between 0 and 604800 seconds)' }, { status: 400 });
        }

        // Verify ownership of goal
        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: parsedDate,
                workoutType: resolvedType as WorkoutType,
                description: typeof description === 'string' ? description : '',
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || 0,
                isCompleted: false
            }
        });

        return NextResponse.json(workout);
    } catch (error) {
        console.error('Create workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
