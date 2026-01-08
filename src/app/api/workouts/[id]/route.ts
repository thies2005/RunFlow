import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@prisma/client';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = params;
        const body = await req.json();
        // Allow updating type, desc, targets, date, completed
        const { workoutType, description, targetDistance, targetDuration, scheduledDate, isCompleted, linkedActivityId } = body;

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
                workoutType: workoutType as WorkoutType,
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = params;

        // Verify ownership
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
