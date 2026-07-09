import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { workoutToZwo } from '@/lib/plans/zwo-export';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ goalId: string; workoutId: string }> };

/**
 * Export a single workout's structured steps as a Zwift Workout (.zwo) XML file.
 * Mirrors the auth + ownership pattern of the workout PATCH/DELETE route: the
 * goal must belong to the authenticated user and the workout must belong to the
 * goal.
 */
export async function GET(_req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId, workoutId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, deletedAt: null },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const workout = await prisma.workout.findFirst({
            where: { id: workoutId, goalId },
        });

        if (!workout) {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
        }

        const xml = workoutToZwo({
            customName: workout.customName,
            description: workout.description,
            workoutType: workout.workoutType,
            structuredSteps: workout.structuredSteps as unknown as Parameters<typeof workoutToZwo>[0]['structuredSteps'],
        });

        const baseName = (workout.customName?.trim() || workout.workoutType || 'workout')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'workout';

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Content-Disposition': `attachment; filename="${baseName}.zwo"`,
            },
        });
    } catch (error) {
        console.error('ZWO export error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
