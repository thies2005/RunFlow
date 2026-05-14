/**
 * Mobile Goals Endpoint
 * 
 * GET /api/mobile/v1/goals - List all goals
 * POST /api/mobile/v1/goals - Create new goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { analyzeRace, type RaceDistance } from '@/lib/metrics/vdot';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { RaceType, WorkoutType } from '@/generated/prisma/browser';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const goals = await prisma.goal.findMany({
            where: { userId: user.id },
            orderBy: { raceDate: 'asc' },
            include: {
                workouts: {
                    orderBy: { scheduledDate: 'asc' },
                },
            },
        });

        // Serialize dates
        const serialized = goals.map(g => ({
            ...g,
            raceDate: g.raceDate?.toISOString() ?? null,
            createdAt: g.createdAt.toISOString(),
            updatedAt: g.updatedAt.toISOString(),
            completedAt: g.completedAt?.toISOString() || null,
            workouts: g.workouts.map(w => ({
                ...w,
                scheduledDate: w.scheduledDate.toISOString(),
                createdAt: w.createdAt.toISOString(),
                updatedAt: w.updatedAt.toISOString(),
                completedAt: w.completedAt?.toISOString() || null
            }))
        }));

        return NextResponse.json({ goals: serialized }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/goals'
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const {
            name, raceType, raceDate, targetTime, weeklyMileageGoal, planWeeks,
            runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
            taperWeeks, peakWeeks, buildWeeks,
            maxLongRunKm,
            longRunDay, workoutDay,
            calibrationTime, calibrationDistance, calibrationFactor,
            planStartDate
        } = body;

        // Update calibration factor if provided
        if (calibrationFactor) {
            await prisma.user.update({
                where: { id: user.id },
                data: { vdotCorrectionFactor: calibrationFactor }
            });
        }

        if (!name || !raceType || !raceDate) {
            return errorResponses.validation(
                'Missing required fields: name, raceType, raceDate',
                { missingFields: !name ? ['name'] : [], ...(!raceType ? ['raceType'] : []), ...(!raceDate ? ['raceDate'] : []) }
            );
        }

        const validRaceTypes = ['FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON'];
        if (!validRaceTypes.includes(raceType)) {
            return errorResponses.validation(
                'Invalid raceType. Must be one of: FIVE_K, TEN_K, HALF_MARATHON, MARATHON',
                { provided: raceType, validValues: validRaceTypes }
            );
        }

        // Calculate VDOT from calibration if provided
        let currentVdot: number | null = null;
        let predictedTime: number | null = null;

        if (calibrationTime && calibrationTime > 0 && calibrationDistance) {
            const calibDistanceMap: Record<string, RaceDistance> = {
                '5K': '5K', '10K': '10K', 'HALF': 'HALF', 'MARATHON': 'MARATHON',
            };
            const calDist = calibDistanceMap[calibrationDistance] || '5K';
            const result = analyzeRace({
                distance: calDist,
                timeSeconds: calibrationTime,
            });
            currentVdot = result.vdot;
            predictedTime = result.predictions[calDist];
        }

        // Create goal
        const goal = await prisma.goal.create({
            data: {
                userId: user.id,
                name,
                raceType,
                raceDate: new Date(raceDate),
                planStartDate: planStartDate ? new Date(planStartDate) : null,
                targetTime: targetTime || null,
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

        let responseGoal = goal;

        // Fallback: determine VDOT if not set from calibration
        if (!currentVdot) {
            // (a) Try recent RUN activity within 90 days matching race distance ±10%
            const distanceMap: Record<string, number> = {
                'FIVE_K': 5000,
                'TEN_K': 10000,
                'HALF_MARATHON': 21097,
                'MARATHON': 42195,
            };
            const targetDistance = distanceMap[raceType];

            if (targetDistance) {
                const recentRaceEffort = await prisma.activity.findFirst({
                    where: {
                        userId: user.id,
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

            // (b) Reverse-engineer VDOT from targetTime + raceType
            if (!currentVdot && targetTime) {
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
            }

            // (c) Default to VDOT 30 (Beginner)
            if (!currentVdot) {
                currentVdot = 30.0;
            }

            // (e) Update the goal with the determined VDOT
            responseGoal = await prisma.goal.update({
                where: { id: goal.id },
                data: { currentVdot, predictedTime },
            });
        }

        // (d) Generate training plan — always runs since VDOT is guaranteed
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
                        targetPace: w.targetPace ?? 0,
                        targetDuration: w.targetDuration ?? 0,
                        targetHrZone: w.targetHrZone ?? null,
                        phase: w.phase ?? 'BASE',
                        isCompleted: false
                    })),
                });
            }
        } catch (error) {
            console.error('[Mobile API] Failed to generate training plan:', error);
        }

        return NextResponse.json({
            goal: {
                ...responseGoal,
                raceDate: responseGoal.raceDate?.toISOString() ?? null,
                createdAt: responseGoal.createdAt.toISOString(),
                updatedAt: responseGoal.updatedAt.toISOString(),
                completedAt: responseGoal.completedAt?.toISOString() || null
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/goals'
        });
    }
}
