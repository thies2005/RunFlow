import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { analyzeRace, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { calculateProjectedGoalTime, calculateWeeksUntilRace, type PlanSettings } from '@/lib/metrics/goalProjection';

import { startOfWeek, endOfWeek } from 'date-fns';

// GET - List goals
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const goals = await prisma.goal.findMany({
        where: { userId: session.user.id },
        orderBy: { raceDate: 'asc' },
        include: {
            workouts: {
                where: {
                    scheduledDate: {
                        gte: start,
                        lte: end,
                    },
                },
                orderBy: { scheduledDate: 'asc' },
            },
        },
    });

    return NextResponse.json({ goals });
}

// POST - Create goal
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
        name, raceType, raceDate, targetTime, weeklyMileageGoal, planWeeks,
        runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
        taperWeeks, peakWeeks, buildWeeks,
        longRunDay, workoutDay, // L-03: Flexible Days
        calibrationTime, calibrationDistance, calibrationFactor,
        planStartDate // Optional custom start date
    } = body;

    // If calibration factor is provided, update global user settings immediately
    if (calibrationFactor) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { vdotCorrectionFactor: calibrationFactor }
        });
    }

    if (!name || !raceType || !raceDate) {
        return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
        );
    }

    // Calculate current VDOT from calibration data if provided
    let currentVdot: number | null = null;
    let predictedTime: number | null = null;

    // If calibration time was provided from the form, use it
    if (calibrationTime && calibrationTime > 0 && calibrationDistance) {
        const calibDistanceMap: Record<string, RaceDistance> = {
            '5K': '5K',
            '10K': '10K',
            'HALF': 'HALF',
            'MARATHON': 'MARATHON',
        };
        const calDist = calibDistanceMap[calibrationDistance] || '5K';
        const result = analyzeRace({
            distance: calDist,
            timeSeconds: calibrationTime,
        });
        currentVdot = result.vdot;
        predictedTime = result.predictions[calDist];
        console.log(`Calculated VDOT ${currentVdot} from calibration time ${calibrationTime}s at ${calibrationDistance}`);
    }

    // Only look for race-like activity if no calibration VDOT was provided
    if (!currentVdot) {
        // Look for a recent "race-like" run (similar distance, high effort)
        const distanceMap: Record<string, number> = {
            'FIVE_K': 5000,
            'TEN_K': 10000,
            'HALF_MARATHON': 21097,
            'MARATHON': 42195,
        };

        const targetDistance = distanceMap[raceType];

        const recentRaceEffort = await prisma.activity.findFirst({
            where: {
                userId: session.user.id,
                type: 'RUN',
                distance: {
                    gte: targetDistance * 0.9,
                    lte: targetDistance * 1.1,
                },
                startDate: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
                },
            },
            orderBy: { startDate: 'desc' },
        });

        if (recentRaceEffort) {
            // Map database enum to RaceDistance type
            const raceDistanceMap: Record<string, RaceDistance> = {
                'FIVE_K': '5K',
                'TEN_K': '10K',
                'HALF_MARATHON': 'HALF',
                'MARATHON': 'MARATHON',
            };

            const targetRaceDistance = raceDistanceMap[raceType] || '5K';
            const result = analyzeRace({
                distance: targetRaceDistance,
                timeSeconds: recentRaceEffort.movingTime,
            });
            currentVdot = result.vdot;
            predictedTime = result.predictions[targetRaceDistance];
        }
    }

    // Calculate projected target time if not manually provided
    let calculatedTargetTime: number | null = null;
    if (!targetTime && currentVdot) {
        // Map raceType to RaceDistance for projection
        const projectionDistanceMap: Record<string, RaceDistance> = {
            'FIVE_K': '5K',
            'TEN_K': '10K',
            'HALF_MARATHON': 'HALF',
            'MARATHON': 'MARATHON',
        };
        const projectionDistance = projectionDistanceMap[raceType] || 'MARATHON';

        // Calculate weeks until race
        const weeksUntilRace = calculateWeeksUntilRace(new Date(raceDate));

        // Build plan settings
        const planSettings: PlanSettings = {
            durationWeeks: weeksUntilRace,
            runsPerWeek: runsPerWeek ?? 4,
            weeklyMileageGoal: (weeklyMileageGoal || 40000) / 1000, // Convert to km
            raceDistance: projectionDistance,
            taperWeeks: taperWeeks ?? 2,
            peakWeeks: peakWeeks ?? 4,
            buildWeeks: buildWeeks ?? 4,
        };

        // Calculate projection (assume 70% starting shape if not known)
        const projection = calculateProjectedGoalTime(currentVdot, planSettings, 70);
        calculatedTargetTime = projection.projectedTime;

        console.log(`Calculated projected target time: ${calculatedTargetTime}s (VDOT ${currentVdot} -> ${projection.projectedVdot})`);
    }

    const goal = await prisma.goal.create({
        data: {
            userId: session.user.id,
            name,
            raceType,
            raceDate: new Date(raceDate),
            targetTime: targetTime || calculatedTargetTime || null,
            weeklyMileageGoal: weeklyMileageGoal || null,
            planWeeks: planWeeks || 12,
            runsPerWeek: runsPerWeek ?? 4,
            ridesPerWeek: ridesPerWeek ?? 0,
            strengthPerWeek: strengthPerWeek ?? 0,
            swimsPerWeek: swimsPerWeek ?? 0,
            longRunDay: longRunDay ?? 0,
            workoutDay: workoutDay ?? 3,
            currentVdot,
            predictedTime,
        },
    });

    // Generate Training Plan Workouts
    // Fallback: Calculate weighted effective VO2max from all activities if no race effort found
    if (!currentVdot) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { hrMax: true, vdotCorrectionFactor: true }
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const runActivities = await prisma.activity.findMany({
            where: {
                userId: session.user.id,
                type: 'RUN',
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                distance: true,
                movingTime: true,
                averageHr: true,
                hasHeartrate: true,
            },
            orderBy: { startDate: 'desc' },
        });

        if (runActivities.length > 0) {
            const maxHR = user?.hrMax || 185;
            const correctionFactor = user?.vdotCorrectionFactor || 1.0;
            const { effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities as any, maxHR, correctionFactor);
            if (effectiveVO2max > 0) {
                currentVdot = effectiveVO2max;
                // Update the goal with the calculated VDOT
                await prisma.goal.update({
                    where: { id: goal.id },
                    data: { currentVdot }
                });
                console.log(`Calculated fallback VDOT ${currentVdot} from ${runActivities.length} activities`);
            }
        }
    }

    if (currentVdot) {
        // Import dynamically to avoid circular dependencies if any (though here it's fine)
        const { generateTrainingPlan } = await import('@/lib/plans');

        try {
            const workouts = generateTrainingPlan({
                vdot: currentVdot,
                raceType: raceType as any,
                raceDate: new Date(raceDate),
                startDate: planStartDate ? new Date(planStartDate) : new Date(),
                runsPerWeek: runsPerWeek ?? 4,
                ridesPerWeek: ridesPerWeek ?? 0,
                strengthPerWeek: strengthPerWeek ?? 0,
                swimsPerWeek: swimsPerWeek ?? 0,
                taperWeeks: taperWeeks ?? 2,
                peakWeeks: peakWeeks ?? 4,
                buildWeeks: buildWeeks ?? 4,
                longRunDay: longRunDay ?? 0,
                workoutDay: workoutDay ?? 3,
            });

            if (workouts.length > 0) {
                await prisma.workout.createMany({
                    data: workouts.map(w => ({
                        goalId: goal.id,
                        scheduledDate: w.date,
                        workoutType: w.type,
                        description: w.description,
                        targetDistance: w.totalDistance,
                        targetPace: w.targetPace,
                    })),
                });
                console.log(`Generated ${workouts.length} workouts for goal ${goal.id}`);
            }
        } catch (error) {
            console.error('Failed to generate training plan:', error);
            // Don't fail the request, just log it. Plan can be regenerated later.
        }
    }

    return NextResponse.json({ goal });
}
