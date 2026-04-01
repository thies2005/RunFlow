import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { analyzeRace, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { type ActivityForShape } from '@/lib/metrics/runalyze';
import { calculateProjectedGoalTime, calculateWeeksUntilRace, type PlanSettings } from '@/lib/metrics/goalProjection';
import { startOfWeek, endOfWeek } from 'date-fns';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { goalSchema } from '@/lib/validation/schemas';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';
import { WorkoutType } from '@/generated/prisma/browser';

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

        const session = await auth();

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

        return cachedResponse({ goals }, { maxAge: 60, staleWhileRevalidate: 30 });
    } catch (error) {
        return handleError(error);
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

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const validation = await validateBody(goalSchema, request);
        if (!validation.success) {
            return validation.error;
        }

        const {
            name, raceType, raceDate, targetTime, weeklyMileageGoal, planWeeks,
            runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
            taperWeeks, peakWeeks, buildWeeks,
            longRunDay, workoutDay,
            calibrationTime, calibrationDistance, calibrationFactor,
            planStartDate
        } = validation.data;

        await prisma.goal.updateMany({
            where: { userId: session.user.id, isActive: true },
            data: { isActive: false, completedAt: new Date() },
        });

        const resolvedPlanWeeks = Math.max(4, planWeeks || calculateWeeksUntilRace(new Date(raceDate)));

        let safeTaper = taperWeeks ?? 2;
        let safePeak = peakWeeks ?? 4;
        let safeBuild = buildWeeks ?? 4;

        if (safeTaper + safePeak + safeBuild > resolvedPlanWeeks) {
            const proportion = resolvedPlanWeeks / (safeTaper + safePeak + safeBuild);
            safeTaper = Math.max(1, Math.round(safeTaper * proportion));
            safePeak = Math.max(1, Math.round(safePeak * proportion));
            safeBuild = Math.max(0, resolvedPlanWeeks - safeTaper - safePeak);

            if (safeBuild < 0) {
                safeBuild = 0;
                safePeak = Math.max(1, resolvedPlanWeeks - safeTaper);
                if (safeTaper + safePeak > resolvedPlanWeeks) {
                    safeTaper = Math.max(0, resolvedPlanWeeks - safePeak);
                }
            }
        }

        // If calibration factor is provided, update global user settings immediately
        // We start this operation but don't await it yet to allow parallel execution
        // We catch errors to prevent unhandled rejections if the main flow fails elsewhere
        const userUpdatePromise = calibrationFactor ? prisma.user.update({
            where: { id: session.user.id },
            data: { vdotCorrectionFactor: calibrationFactor }
        }).then(res => ({ result: res, error: null }))
            .catch(err => ({ result: null, error: err }))
            : Promise.resolve({ result: null, error: null });

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

            const planSettings: PlanSettings = {
                durationWeeks: resolvedPlanWeeks,
                runsPerWeek: runsPerWeek ?? 4,
                weeklyMileageGoal: (weeklyMileageGoal || 40000) / 1000,
                raceDistance: projectionDistance,
                taperWeeks: safeTaper,
                peakWeeks: safePeak,
                buildWeeks: safeBuild,
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
                planWeeks: resolvedPlanWeeks,
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
            const updateResult = await userUpdatePromise;
            if (updateResult.error) throw updateResult.error;

            // If we have a successful update, use its result instead of fetching again
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
                // M-06 fix: Use proper ActivityForShape[] type instead of any
                const { effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities as ActivityForShape[], maxHR, correctionFactor);
                if (effectiveVO2max > 0) {
                    currentVdot = effectiveVO2max;
                }
            }
        }

        // Failsafe: If VDOT is still missing, calculate from Target Time or default to 30
        if (!currentVdot) {
            if (targetTime) {
                // Reverse engineer VDOT from the user's target time
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
                // Absolute fallback: Default to VDOT 30 (Beginner)
                // This ensures a plan is ALWAYS generated
                logger.info('No VDOT data available. Defaulting to VDOT 30.', { userId: session.user.id });
                currentVdot = 30.0;
            }

            // Update the goal with the determined VDOT
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
                    raceType: raceType,
                    raceDate: new Date(raceDate),
                    startDate: goal.planStartDate ?? new Date(),
                    runsPerWeek: runsPerWeek ?? 4,
                    ridesPerWeek: ridesPerWeek ?? 0,
                    strengthPerWeek: strengthPerWeek ?? 0,
                    swimsPerWeek: swimsPerWeek ?? 0,
                    taperWeeks: safeTaper,
                    peakWeeks: safePeak,
                    buildWeeks: safeBuild,
                    longRunDay: longRunDay ?? 0,
                    workoutDay: workoutDay ?? 3,
                });

                if (workouts.length > 0) {
                    await prisma.workout.createMany({
                        data: workouts.map(w => ({
                            goalId: goal.id,
                            scheduledDate: w.date,
                            // M-06 fix: workoutType is WorkoutType from generateTrainingPlan
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
                logger.error('Failed to generate training plan', { userId: session.user.id, goalId: goal.id, error: error instanceof Error ? error.message : String(error) });
            }
        }

        // Ensure any pending user update is completed and check for errors
        const finalUpdateResult = await userUpdatePromise;
        if (finalUpdateResult.error) throw finalUpdateResult.error;

        return NextResponse.json({ goal }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

// DELETE - Delete active plan (pending workouts + deactivate goal)
export async function DELETE(request: NextRequest) {
    try {
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

        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        if (!activeGoal) {
            return NextResponse.json({ error: 'No active plan found' }, { status: 404 });
        }

        const now = new Date();

        const deletedCount = await prisma.workout.deleteMany({
            where: {
                goalId: activeGoal.id,
                isCompleted: false,
                scheduledDate: { gte: now },
            },
        });

        await prisma.goal.update({
            where: { id: activeGoal.id },
            data: { isActive: false, completedAt: now },
        });

        return NextResponse.json({
            success: true,
            deletedWorkouts: deletedCount.count,
            goalId: activeGoal.id,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
