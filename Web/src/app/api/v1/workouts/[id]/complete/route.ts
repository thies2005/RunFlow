import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { setApiVersionHeaders } from '@/lib/api/version';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workoutId = params.id;

        const workout = await prisma.workout.findUnique({
            where: { id: workoutId },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const updated = await prisma.workout.update({
            where: { id: workoutId },
            data: { isCompleted: true, completedAt: new Date() }
        });

        const response = NextResponse.json(updated);
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Complete workout error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
