import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { predictRaceTime, type RaceDistance } from '@/lib/metrics/vdot';
import { bestEffortVdot } from '@/lib/metrics/effectiveVdot';
import { updateFitnessCache } from '@/lib/metrics/fitnessCache';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

/**
 * POST /api/settings/recalculate-vdot
 * Refreshes the DailyFitness cache, recalculates VDOT from the best recent
 * effort (>= 5 km runs, last 90 days, Daniels-Gilbert) and updates the active
 * goal when one exists. Works without an active goal so it can also serve as
 * the analytics "Refresh" action. Rate-limited because a full-history cache
 * rebuild is expensive for long activity histories.
 */
export async function POST(request: NextRequest) {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Rebuild the fitness cache from the first activity so the PMC/CTL/ATL
    // series pick up stored trimp/bikeTss/runningTss values.
    const firstActivity = await prisma.activity.findFirst({
        where: { userId },
        orderBy: { startDate: 'asc' },
        select: { startDate: true },
    });
    if (firstActivity) {
        await updateFitnessCache(userId, [{ startDate: firstActivity.startDate }]);
    }

    // Find active goal (optional — VDOT recalculation works without one)
    const goal = await prisma.goal.findFirst({
        where: { userId, isActive: true },
    });

    // Map race types
    const raceDistanceMap: Record<string, { distance: RaceDistance; meters: number }> = {
        'FIVE_K': { distance: '5K', meters: 5000 },
        'TEN_K': { distance: '10K', meters: 10000 },
        'HALF_MARATHON': { distance: 'HALF', meters: 21097 },
        'MARATHON': { distance: 'MARATHON', meters: 42195 },
    };

    const targetInfo = raceDistanceMap[goal?.raceType || 'FIVE_K'] || raceDistanceMap['FIVE_K'];

    // Best-effort VDOT from raw run performances (>= 5 km within 90 days)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vdotCorrectionFactor: true },
    });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentRuns = await prisma.activity.findMany({
        where: {
            userId,
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

    // Update goal with new VDOT only when both a goal and a valid VDOT exist
    if (goal && bestVdot > 0) {
        await prisma.goal.update({
            where: { id: goal.id },
            data: {
                currentVdot: bestVdot,
                predictedTime: bestPredictedTime,
            },
        });
    }

    return NextResponse.json({
        success: true,
        vdot: bestVdot,
        predictedTime: bestPredictedTime,
        goalUpdated: !!(goal && bestVdot > 0),
    });
}
