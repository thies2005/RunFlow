/**
 * Mobile Goals Endpoint
 * 
 * GET /api/mobile/v1/goals - List all goals
 * POST /api/mobile/v1/goals - Create new goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { RaceType } from '@/generated/prisma/browser';
import { createPlanWithWorkouts } from '@/lib/services/plan-creation';

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
            sport, swimDay, restDays,
            backyardLoopDistM, targetLaps, customDistanceM, planSource,
            calibrationTime, calibrationDistance, calibrationFactor,
            planStartDate
        } = body;

        if (!name || !raceType || !raceDate) {
            return errorResponses.validation(
                'Missing required fields: name, raceType, raceDate',
                { missingFields: !name ? ['name'] : [], ...(!raceType ? ['raceType'] : []), ...(!raceDate ? ['raceDate'] : []) }
            );
        }

        const validRaceTypes = Object.values(RaceType);
        if (!validRaceTypes.includes(raceType)) {
            return errorResponses.validation(
                'Invalid raceType. Must be one of: ' + validRaceTypes.join(', '),
                { provided: raceType, validValues: validRaceTypes }
            );
        }

        const { goal } = await createPlanWithWorkouts({
            userId: user.id,
            name,
            raceType,
            raceDate,
            targetTime: targetTime || null,
            weeklyMileageGoal: weeklyMileageGoal || null,
            planWeeks: planWeeks || null,
            runsPerWeek: runsPerWeek ?? null,
            ridesPerWeek: ridesPerWeek ?? null,
            strengthPerWeek: strengthPerWeek ?? null,
            swimsPerWeek: swimsPerWeek ?? null,
            taperWeeks: taperWeeks ?? null,
            peakWeeks: peakWeeks ?? null,
            buildWeeks: buildWeeks ?? null,
            maxLongRunKm: maxLongRunKm ?? null,
            longRunDay: longRunDay ?? null,
            workoutDay: workoutDay ?? null,
            sport: sport ?? undefined,
            swimDay: swimDay ?? null,
            restDays: restDays ?? null,
            backyardLoopDistM: backyardLoopDistM ?? null,
            targetLaps: targetLaps ?? null,
            customDistanceM: customDistanceM ?? null,
            planSource: planSource ?? undefined,
            calibrationTime: calibrationTime ?? null,
            calibrationDistance: calibrationDistance ?? null,
            calibrationFactor: calibrationFactor ?? null,
            planStartDate: planStartDate ?? null,
            deactivateExisting: true,
        });

        const responseGoal = await prisma.goal.findUnique({
            where: { id: goal.id },
        });

        const serializedGoal = responseGoal ? {
            ...responseGoal,
            raceDate: responseGoal.raceDate?.toISOString() ?? null,
            createdAt: responseGoal.createdAt.toISOString(),
            updatedAt: responseGoal.updatedAt.toISOString(),
            completedAt: responseGoal.completedAt?.toISOString() || null
        } : {
            ...goal,
            raceDate: (goal as any).raceDate?.toISOString?.() ?? null,
            createdAt: (goal as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
            updatedAt: (goal as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
            completedAt: null,
        };

        return NextResponse.json({
            goal: serializedGoal
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/goals'
        });
    }
}
