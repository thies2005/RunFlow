import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { createPlanWithWorkouts } from '@/lib/services/plan-creation';
import { enrichWorkoutForResponse } from '@/lib/api/workoutSerializer';
import { z } from 'zod';
import { RaceType, PlanSport } from '@/generated/prisma/browser';

const dateStringSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
});

const createPlanSchema = z.object({
    name: z.string().min(1).max(255),
    raceType: z.nativeEnum(RaceType),
    raceDate: dateStringSchema,
    targetTime: z.number().int().positive().nullable().optional(),
    weeklyMileageGoal: z.number().positive().nullable().optional(),
    planWeeks: z.number().int().positive().nullable().optional(),
    runsPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    ridesPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    strengthPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    swimsPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    taperWeeks: z.number().int().nonnegative().nullable().optional(),
    peakWeeks: z.number().int().nonnegative().nullable().optional(),
    buildWeeks: z.number().int().nonnegative().nullable().optional(),
    maxLongRunKm: z.number().min(6).max(200).nullable().optional(),
    longRunDay: z.number().int().min(0).max(6).nullable().optional(),
    workoutDay: z.number().int().min(0).max(6).nullable().optional(),
    swimDay: z.number().int().min(0).max(6).nullable().optional(),
    restDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    calibrationTime: z.number().int().positive().nullable().optional(),
    calibrationDistance: z.enum(['5K', '10K', 'HALF', 'MARATHON']).nullable().optional(),
    calibrationFactor: z.number().min(0.5).max(2.0).nullable().optional(),
    planStartDate: dateStringSchema.nullable().optional(),
    sport: z.nativeEnum(PlanSport).nullable().optional(),
    planSource: z.string().nullable().optional(),
    backyardLoopDistM: z.number().positive().nullable().optional(),
    backyardLoopTimeS: z.number().int().positive().nullable().optional(),
    targetLaps: z.number().int().positive().nullable().optional(),
    customDistanceM: z.number().positive().nullable().optional(),
    customSwimDistM: z.number().positive().nullable().optional(),
    customBikeDistM: z.number().positive().nullable().optional(),
    customRunDistM: z.number().positive().nullable().optional(),
});

async function authenticate(request: NextRequest): Promise<string | null> {
    const session = await auth();
    if (session?.user?.id) return session.user.id;

    const mobileUser = await getAuthenticatedUser(request);
    if (mobileUser) return mobileUser.id;

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const userId = await authenticate(request);
        if (!userId) {
            return errorResponses.unauthorized();
        }

        const url = new URL(request.url);
        const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

        const goals = await prisma.goal.findMany({
            where: {
                userId,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
            orderBy: { raceDate: 'asc' },
            include: {
                workouts: {
                    orderBy: { scheduledDate: 'asc' },
                },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        const enrichedGoals = goals.map(goal => ({
            ...goal,
            workouts: goal.workouts.map(enrichWorkoutForResponse),
        }));

        return NextResponse.json({ goals: enrichedGoals }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/plans' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const userId = await authenticate(request);
        if (!userId) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const parsed = createPlanSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponses.validation('Validation failed', parsed.error.flatten());
        }

        const data = parsed.data;
        const { goal } = await createPlanWithWorkouts({
            userId,
            name: data.name,
            raceType: data.raceType,
            raceDate: data.raceDate,
            targetTime: data.targetTime ?? null,
            weeklyMileageGoal: data.weeklyMileageGoal ?? null,
            planWeeks: data.planWeeks ?? null,
            runsPerWeek: data.runsPerWeek ?? null,
            ridesPerWeek: data.ridesPerWeek ?? null,
            strengthPerWeek: data.strengthPerWeek ?? null,
            swimsPerWeek: data.swimsPerWeek ?? null,
            taperWeeks: data.taperWeeks ?? null,
            peakWeeks: data.peakWeeks ?? null,
            buildWeeks: data.buildWeeks ?? null,
            maxLongRunKm: data.maxLongRunKm ?? null,
            longRunDay: data.longRunDay ?? null,
            workoutDay: data.workoutDay ?? null,
            swimDay: data.swimDay ?? null,
            restDays: data.restDays ?? null,
            calibrationTime: data.calibrationTime ?? null,
            calibrationDistance: data.calibrationDistance ?? null,
            calibrationFactor: data.calibrationFactor ?? null,
            planStartDate: data.planStartDate ?? null,
            sport: data.sport ?? undefined,
            planSource: data.planSource ?? undefined,
            backyardLoopDistM: data.backyardLoopDistM ?? null,
            backyardLoopTimeS: data.backyardLoopTimeS ?? null,
            targetLaps: data.targetLaps ?? null,
            customDistanceM: data.customDistanceM ?? null,
            customSwimDistM: data.customSwimDistM ?? null,
            customBikeDistM: data.customBikeDistM ?? null,
            customRunDistM: data.customRunDistM ?? null,
        });

        const enrichedGoal = {
            ...goal,
            ...(goal.workouts && { workouts: goal.workouts.map(enrichWorkoutForResponse) }),
        };

        return NextResponse.json({ goal: enrichedGoal }, {
            status: 201,
            headers: rateLimitHeaders(rateLimitResult),
        });
    } catch (error) {
        return handleApiError(error, { path: '/api/plans' });
    }
}
