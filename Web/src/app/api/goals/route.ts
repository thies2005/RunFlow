import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { analyzeRace, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { calculateProjectedGoalTime, calculateWeeksUntilRace, type PlanSettings } from '@/lib/metrics/goalProjection';
import { startOfWeek, endOfWeek } from 'date-fns';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

// GET - List goals
export async function GET(request: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

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

        return NextResponse.json({ goals }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        console.error('List goals error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create goal
export async function POST(request: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, raceType, raceDate, targetTime, weeklyMileageGoal, planWeeks,
            runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
            taperWeeks, peakWeeks, buildWeeks,
            longRunDay, workoutDay,
            calibrationTime, calibrationDistance, calibrationFactor,
            planStartDate
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
        }

        if (!currentVdot) {
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
                        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    },
                },
                orderBy: { startDate: 'desc' },
            });

            if (recentRaceEffort) {
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

        let calculatedTargetTime: number | null = null;
        if (!targetTime && currentVdot) {
            const projectionDistanceMap: Record<string, RaceDistance> = {
                'FIVE_K': '5K',
                'TEN_K': '10K',
                'HALF_MARATHON': 'HALF',
                'MARATHON': 'MARATHON',
            };
            const projectionDistance = projectionDistanceMap[raceType] || 'MARATHON';
            const weeksUntilRace = calculateWeeksUntilRace(new Date(raceDate));

            const planSettings: PlanSettings = {
                durationWeeks: weeksUntilRace,
                runsPerWeek: runsPerWeek ?? 4,
                weeklyMileageGoal: (weeklyMileageGoal || 40000) / 1000,
                raceDistance: projectionDistance,
                taperWeeks: taperWeeks ?? 2,
                peakWeeks: peakWeeks ?? 4,
                buildWeeks: buildWeeks ?? 4,
            };

            const projection = calculateProjectedGoalTime(currentVdot, planSettings, 70);
            calculatedTargetTime = projection.projectedTime;
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
                    await prisma.goal.update({
                        where: { id: goal.id },
                        data: { currentVdot }
                    });
                }
            }
        }

        if (currentVdot) {
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
                            workoutType: w.type as any,
                            description: w.description,
                            targetDistance: w.totalDistance,
                            targetPace: w.targetPace || 0,
                            targetDuration: w.targetDuration || 0,
                            isCompleted: false
                        })),
                    });
                }
            } catch (error) {
                console.error('Failed to generate training plan:', error);
            }
        }

        return NextResponse.json({ goal }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        console.error('Create goal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
