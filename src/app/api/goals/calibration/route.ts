import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

/**
 * POST /api/goals/calibration
 * Updates the marathonShapeFactor for the active goal.
 * Expects: { shapeFactor: number }
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { shapeFactor } = body;

        if (typeof shapeFactor !== 'number' || shapeFactor < 0.5 || shapeFactor > 2.0) {
            return NextResponse.json({ error: 'Invalid shape factor (must be 0.5 - 2.0)' }, { status: 400 });
        }

        const goal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        if (!goal) {
            return NextResponse.json({ error: 'No active goal found' }, { status: 404 });
        }

        // Update the factor
        const updatedGoal = await prisma.goal.update({
            where: { id: goal.id },
            data: { marathonShapeFactor: shapeFactor },
        });

        return NextResponse.json({
            success: true,
            marathonShapeFactor: updatedGoal.marathonShapeFactor
        });

    } catch (error) {
        console.error('Calibration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
