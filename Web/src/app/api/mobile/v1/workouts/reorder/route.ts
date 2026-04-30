import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { getAuthenticatedUser } from '@/lib/mobile/auth';

export async function PATCH(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { workoutId, newDate } = body;

        if (!workoutId || !newDate) {
            return NextResponse.json(
                { error: 'Missing required fields: workoutId and newDate' },
                { status: 400 }
            );
        }

        const workout = await prisma.workout.findUnique({
            where: { id: workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== user.id) {
            return NextResponse.json(
                { error: 'Workout not found or unauthorized' },
                { status: 404 }
            );
        }

        const updatedWorkout = await prisma.workout.update({
            where: { id: workoutId },
            data: { scheduledDate: new Date(newDate) },
        });

        return NextResponse.json({ success: true, workout: updatedWorkout });
    } catch (error) {
        console.error('Mobile workout reorder error:', error);
        return NextResponse.json({ error: 'Failed to reorder workout' }, { status: 500 });
    }
}
