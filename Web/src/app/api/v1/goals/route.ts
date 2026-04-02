import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { analyzeRace, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { calculateProjectedGoalTime, calculateWeeksUntilRace, type PlanSettings } from '@/lib/metrics/goalProjection';
import { startOfWeek, endOfWeek } from 'date-fns';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { goalSchema } from '@/lib/validation/schemas';
import { setApiVersionHeaders } from '@/lib/api/version';
import { RaceType, WorkoutType } from '@/generated/prisma/browser';
import type { ActivityForShape } from '@/lib/metrics/runalyze';
import { logger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();

        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
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

        const response = cachedResponse({ goals }, { maxAge: 60, staleWhileRevalidate: 30 });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        logger.error('List goals error:', { error });
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();

        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const validation = await validateBody(goalSchema, request);
        if (!validation.success) {
            const errorResponse = validation.error;
            setApiVersionHeaders(errorResponse.headers);
            return errorResponse;
        }

        const {
            name, raceType, raceDate, targetTime, weeklyMileageGoal, planWeeks,
            runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
            taperWeeks, peakWeeks, buildWeeks,
            maxLongRunKm,
            longRunDay, workoutDay,
            calibrationTime, calibrationDistance, calibrationFactor,
            planStartDate
        } = validation.data;

        const userUpdatePromise = calibrationFactor ? prisma.user.update({
            where: { id: session.user.id },
            data: { vdotCorrectionFactor: calibrationFactor }
        }).then(res => ({ result: res, error: null }))
          .catch(err => ({ result: null, error: err }))
        : Promise.resolve({ result: null, error: null });

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
                planStartDate: planStartDate ? new Date(planStartDate) : null,
                targetTime: targetTime || calculatedTargetTime || null,
                weeklyMileageGoal: weeklyMileageGoal || null,
                planWeeks: planWeeks || 12,
                runsPerWeek: runsPerWeek ?? 4,
                ridesPerWeek: ridesPerWeek ?? 0,
                strengthPerWeek: strengthPerWeek ?? 0,
                swimsPerWeek: swimsPerWeek ?? 0,
                taperWeeks: taperWeeks ?? 2,
                peakWeeks: peakWeeks ?? 4,
                buildWeeks: buildWeeks ?? 4,
                longRunDay: longRunDay ?? 0,
                workoutDay: workoutDay ?? 3,
                currentVdot,
                predictedTime,
            },
        });

        if (!currentVdot) {
            const updateResult = await userUpdatePromise;
            if (updateResult.error) throw updateResult.error;

            const user = updateResult.result || (await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { hrMax: true, vdotCorrectionFactor: true }
            }));

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

            const runActivities = await prisma.activity.findMany({
                where: {
                    userId: session.user.id,
                    type: 'RUN',
                    startDate: { gte: sixMonthsAgo },
                },
                select: {
                    startDate: true,
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
                const { effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities as ActivityForShape[], maxHR, correctionFactor);
                if (effectiveVO2max > 0) {
                    currentVdot = effectiveVO2max;
                }
            }
        }

        if (!currentVdot) {
            if (targetTime) {
                const raceDistanceMap: Record<string, RaceDistance> = {
                    'FIVE_K': '5K',
                    'TEN_K': '10K',
                    'HALF_MARATHON': 'HALF',
                    'MARATHON': 'MARATHON',
                };
                const dist = raceDistanceMap[raceType] || 'MARATHON';
                const result = analyzeRace({
                    distance: dist,
                    timeSeconds: targetTime,
                });
                currentVdot = result.vdot;
            } else {
                currentVdot = 30.0;
            }

            await prisma.goal.update({
                where: { id: goal.id },
                data: { currentVdot }
            });
        }

        if (currentVdot) {
            const { generateTrainingPlan } = await import('@/lib/plans');

            try {
                const workouts = generateTrainingPlan({
                    vdot: currentVdot,
                    raceType: raceType as RaceType,
                    raceDate: new Date(raceDate),
                    startDate: goal.planStartDate ?? new Date(),
                    runsPerWeek: runsPerWeek ?? 4,
                    ridesPerWeek: ridesPerWeek ?? 0,
                    strengthPerWeek: strengthPerWeek ?? 0,
                    swimsPerWeek: swimsPerWeek ?? 0,
                    weeklyMileageGoal: weeklyMileageGoal || null,
                    taperWeeks: taperWeeks ?? 2,
                    peakWeeks: peakWeeks ?? 4,
                    buildWeeks: buildWeeks ?? 4,
                    maxLongRunKm,
                    longRunDay: longRunDay ?? 0,
                    workoutDay: workoutDay ?? 3,
                });

                if (workouts.length > 0) {
                    await prisma.workout.createMany({
                        data: workouts.map(w => ({
                            goalId: goal.id,
                            scheduledDate: w.date,
                            workoutType: w.type as WorkoutType,
                            description: w.description,
                            targetDistance: w.totalDistance,
                            targetPace: w.targetPace || 0,
                            targetDuration: w.targetDuration || 0,
                            isCompleted: false
                        })),
                    });
                }
            } catch (error) {
                logger.error('Failed to generate training plan:', { error });
            }
        }

        const finalUpdateResult = await userUpdatePromise;
        if (finalUpdateResult.error) throw finalUpdateResult.error;

        const response = NextResponse.json({ goal }, { headers: rateLimitHeaders(rateLimitResult) });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        logger.error('Create goal error:', { error });
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
