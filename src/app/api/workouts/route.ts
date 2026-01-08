import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@prisma/client';
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

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { goalId, scheduledDate, type, description, targetDistance, targetDuration } = body;

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
                scheduledDate: new Date(scheduledDate),
                workoutType: type as WorkoutType,
                description,
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
