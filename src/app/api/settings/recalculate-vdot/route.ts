import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { calculateVdot, predictRaceTime, type RaceDistance } from '@/lib/metrics/vdot';

/**
 * POST /api/settings/recalculate-vdot
 * Recalculates VDOT from best recent race efforts and updates active goal.
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

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

    const targetInfo = raceDistanceMap[goal.raceType] || raceDistanceMap['FIVE_K'];

    // Find best recent run of similar distance (within 10%)
    const recentRuns = await prisma.activity.findMany({
        where: {
            userId: session.user.id,
            type: 'RUN',
            distance: {
                gte: targetInfo.meters * 0.9,
                lte: targetInfo.meters * 1.1,
            },
            startDate: {
                gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 6 months
            },
        },
        orderBy: { movingTime: 'asc' }, // Fastest first
        take: 5,
    });

    let bestVdot = 0;
    let bestPredictedTime: number | null = null;

    if (recentRuns.length > 0) {
        // Calculate VDOT from fastest effort
        const bestRun = recentRuns[0];
        bestVdot = calculateVdot({
            distance: targetInfo.distance,
            timeSeconds: bestRun.movingTime,
        });

        if (bestVdot > 0) {
            bestPredictedTime = predictRaceTime(bestVdot, targetInfo.distance);
        }
    }

    // If no matching runs, try to estimate from any recent run
    if (bestVdot <= 0) {
        const anyRecentRun = await prisma.activity.findFirst({
            where: {
                userId: session.user.id,
                type: 'RUN',
                distance: { gte: 3000 }, // At least 3km
                startDate: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { startDate: 'desc' },
        });

        if (anyRecentRun) {
            // Approximate distance to standard race
            const distKm = anyRecentRun.distance / 1000;
            let approxDistance: RaceDistance = '5K';
            if (distKm >= 40) approxDistance = 'MARATHON';
            else if (distKm >= 18) approxDistance = 'HALF';
            else if (distKm >= 8) approxDistance = '10K';

            bestVdot = calculateVdot({
                distance: approxDistance,
                timeSeconds: anyRecentRun.movingTime,
            });

            if (bestVdot > 0) {
                bestPredictedTime = predictRaceTime(bestVdot, targetInfo.distance);
            }
        }
    }

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
