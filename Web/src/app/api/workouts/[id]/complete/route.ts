import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { logger } from '@/lib/logging/logger';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: { isCompleted: true, completedAt: new Date() }
        });

        // Adapt the plan in the background (fire-and-forget). A failure here
        // must never break the workout-completion response. Adaptivity is
        // conservative: it only re-derives paces for future, incomplete
        // workouts when the runner's effective VDOT has shifted meaningfully.
        if (workout.goalId) {
            void adaptPlanAfterCompletion(workout.goalId, session.user.id).catch((err) => {
                logger.error('Plan adaptivity failed after workout completion', {
                    goalId: workout.goalId ?? undefined,
                    workoutId: id,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Complete workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
