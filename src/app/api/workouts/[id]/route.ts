import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = params;
        const body = await req.json();
        // Allow updating type, desc, targets, date, completed
        const { workoutType, description, targetDistance, targetDuration, scheduledDate, isCompleted } = body;

        // Verify ownership
        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: {
                workoutType: workoutType as WorkoutType,
                description,
                targetDistance,
                targetDuration,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                isCompleted
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
