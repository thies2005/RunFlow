import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const workoutId = params.id;

        // Verify ownership
        const workout = await prisma.workout.findUnique({
            where: { id: workoutId },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updated = await prisma.workout.update({
            where: { id: workoutId },
            data: { isCompleted: true, completedAt: new Date() }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Complete workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
