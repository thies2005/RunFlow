import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { predictRaceTime, type RaceDistance } from '@/lib/metrics/vdot';
import { bestEffortVdot } from '@/lib/metrics/effectiveVdot';

/**
 * POST /api/settings/recalculate-vdot
 * Recalculates VDOT from the best recent effort (>= 5 km runs, last 90 days,
 * Daniels-Gilbert) and updates the active goal.
 */
export async function POST() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find active goal
    const goal = await prisma.goal.findFirst({
        where: { userId: session.user.id, isActive: true },
    });

    if (!goal) {
        return NextResponse.json({ error: 'No active goal found' }, { status: 404 });
    }

    // Map race types
    const raceDistanceMap: Record<string, { distance: RaceDistance; meters: number }> = {
        'FIVE_K': { distance: '5K', meters: 5000 },
        'TEN_K': { distance: '10K', meters: 10000 },
        'HALF_MARATHON': { distance: 'HALF', meters: 21097 },
        'MARATHON': { distance: 'MARATHON', meters: 42195 },
    };

    const targetInfo = raceDistanceMap[goal.raceType || 'FIVE_K'] || raceDistanceMap['FIVE_K'];

    // Best-effort VDOT from raw run performances (>= 5 km within 90 days)
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { vdotCorrectionFactor: true },
    });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentRuns = await prisma.activity.findMany({
        where: {
            userId: session.user.id,
            type: 'RUN',
            startDate: { gte: ninetyDaysAgo },
        },
        select: {
            startDate: true,
            distance: true,
            movingTime: true,
            type: true,
        },
    });

    const correctionFactor = user?.vdotCorrectionFactor || 1.0;
    const bestVdot = bestEffortVdot(recentRuns, correctionFactor);
    const bestPredictedTime = bestVdot > 0 ? predictRaceTime(bestVdot, targetInfo.distance) : null;

    // Update goal with new VDOT
    if (bestVdot > 0) {
        await prisma.goal.update({
            where: { id: goal.id },
            data: {
                currentVdot: bestVdot,
                predictedTime: bestPredictedTime,
            },
        });

        return NextResponse.json({
            success: true,
            vdot: bestVdot,
            predictedTime: bestPredictedTime,
        });
    }

    return NextResponse.json({
        success: false,
        error: 'Could not calculate VDOT from available activities',
        vdot: 0,
    });
}
