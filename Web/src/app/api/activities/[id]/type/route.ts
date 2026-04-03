import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { WorkoutType } from '@/lib/types';
import { logger } from '@/lib/logging/logger';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { trainingType } = body;

        const validTypes: WorkoutType[] = [
            'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS',
            'FARTLEK',
            'REPETITIONS', 'RECOVERY', 'RACE',
            'REST', 'CROSS_TRAIN', 'RIDE', 'SWIM',
            'STRENGTH', 'OTHER'
        ];

        if (!validTypes.includes(trainingType)) {
            return NextResponse.json({ error: 'Invalid training type' }, { status: 400 });
        }

        const activity = await prisma.activity.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        if (activity.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: { trainingType },
        });

        return NextResponse.json(updatedActivity);
    } catch (error) {
        logger.error('Error updating activity type', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
