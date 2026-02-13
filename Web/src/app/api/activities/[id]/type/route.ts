import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { WorkoutType } from '@/lib/types';
import { logger } from '@/lib/logging/logger';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { trainingType } = body;

        // Validate type
        const validTypes: WorkoutType[] = [
            'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS',
            'REPETITIONS', 'RECOVERY', 'RACE',
            'REST', 'CROSS_TRAIN', 'RIDE', 'SWIM',
            'STRENGTH', 'OTHER'
        ];

        if (!validTypes.includes(trainingType)) {
            return NextResponse.json({ error: 'Invalid training type' }, { status: 400 });
        }

        const activity = await prisma.activity.findUnique({
            where: { id: params.id },
            select: { userId: true }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        if (activity.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedActivity = await prisma.activity.update({
            where: { id: params.id },
            data: { trainingType },
        });

        return NextResponse.json(updatedActivity);
    } catch (error) {
        logger.error('Error updating activity type', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
