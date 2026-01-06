import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

// PATCH - Reorder workouts (update scheduledDate)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
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

        // Verify workout belongs to user's goal
        const workout = await prisma.workout.findUnique({
            where: { id: workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Workout not found or unauthorized' },
                { status: 404 }
            );
        }

        // Update the scheduled date
        const updatedWorkout = await prisma.workout.update({
            where: { id: workoutId },
            data: {
                scheduledDate: new Date(newDate),
            },
        });

        return NextResponse.json({ success: true, workout: updatedWorkout });
    } catch (error) {
        console.error('Workout reorder error:', error);
        return NextResponse.json(
            { error: 'Failed to reorder workout' },
            { status: 500 }
        );
    }
}
