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
import { startOfWeek, endOfWeek } from 'date-fns';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

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

        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });

        const goals = await prisma.goal.findMany({
            where: { userId: user.id },
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

        // Serialize dates
        const serialized = goals.map(g => ({
            ...g,
            raceDate: g.raceDate.toISOString(),
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
                targetTime: targetTime || null,
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

        // Generate training plan if we have VDOT
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
                console.error('[Mobile API] Failed to generate training plan:', error);
            }
        }

        return NextResponse.json({
            goal: {
                ...goal,
                raceDate: goal.raceDate.toISOString(),
                createdAt: goal.createdAt.toISOString(),
                updatedAt: goal.updatedAt.toISOString(),
                completedAt: null
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/goals'
        });
    }
}
