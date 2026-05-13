import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { handleError } from '@/lib/errors/handler';

const activitySelect = {
    id: true,
    stravaId: true,
    type: true,
    sportType: true,
    name: true,
    description: true,
    startDate: true,
    distance: true,
    movingTime: true,
    averageSpeed: true,
    maxSpeed: true,
    gradeAdjustedSpeed: true,
    averageHr: true,
    maxHr: true,
    hasHeartrate: true,
    totalElevation: true,
    elevHigh: true,
    elevLow: true,
    calories: true,
    trimp: true,
    runningTss: true,
    estimatedVdot: true,
    averageCadence: true,
    trainingType: true,
    hrZone1Time: true,
    hrZone2Time: true,
    hrZone3Time: true,
    hrZone4Time: true,
    hrZone5Time: true,
    hrZone6Time: true,
    hrZone7Time: true,
};

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const completedGoals = await prisma.goal.findMany({
            where: {
                userId: session.user.id,
                isActive: false,
                completedAt: { not: null },
                deletedAt: null,
                raceResult: { isNot: null },
            },
            orderBy: { completedAt: 'desc' },
            include: {
                raceResult: {
                    include: {
                        raceActivity: { select: activitySelect },
                    },
                },
                workouts: {
                    select: { isCompleted: true },
                },
            },
        });

        const goals = completedGoals.map(goal => {
            const totalWorkouts = goal.workouts.length;
            const completedWorkouts = goal.workouts.filter(w => w.isCompleted).length;
            const completionRate = totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0;

            const raceResult = goal.raceResult ? {
                ...goal.raceResult,
                raceActivity: goal.raceResult.raceActivity ? {
                    ...goal.raceResult.raceActivity,
                    stravaId: goal.raceResult.raceActivity.stravaId.toString(),
                    startDate: goal.raceResult.raceActivity.startDate.toISOString(),
                } : null,
            } : null;

            return {
                id: goal.id,
                name: goal.name,
                raceType: goal.raceType ?? null,
                raceDate: goal.raceDate ?? null,
                targetTime: goal.targetTime,
                planWeeks: goal.planWeeks,
                runsPerWeek: goal.runsPerWeek,
                weeklyMileageGoal: goal.weeklyMileageGoal,
                raceResult,
                workoutStats: {
                    total: totalWorkouts,
                    completed: completedWorkouts,
                    completionRate: Math.round(completionRate * 100) / 100,
                },
                createdAt: goal.createdAt,
                completedAt: goal.completedAt,
            };
        });

        return cachedResponse({ goals }, { maxAge: 120, staleWhileRevalidate: 60 });
    } catch (error) {
        return handleError(error);
    }
}
