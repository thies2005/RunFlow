import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek } from 'date-fns';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { goalSchema } from '@/lib/validation/schemas';
import { handleError } from '@/lib/errors/handler';
import { createPlanWithWorkouts } from '@/lib/services/plan-creation';

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
                    take: 400,
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
            maxLongRunKm,
            longRunDay, workoutDay, restDays, swimDay,
            sport, backyardLoopDistM, targetLaps, customDistanceM, planSource,
            calibrationTime, calibrationDistance, calibrationFactor,
            planStartDate
        } = validation.data;

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                hrMax: true,
                hrRest: true,
                thresholdHeartRate: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
            },
        });

        const { goal } = await createPlanWithWorkouts({
            userId: session.user.id,
            name,
            raceType,
            raceDate,
            targetTime: targetTime ?? null,
            weeklyMileageGoal: weeklyMileageGoal ?? null,
            planWeeks: planWeeks ?? null,
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
            swimDay: swimDay ?? null,
            restDays: restDays ?? null,
            sport: sport ?? undefined,
            backyardLoopDistM: backyardLoopDistM ?? null,
            targetLaps: targetLaps ?? null,
            customDistanceM: customDistanceM ?? null,
            planSource: planSource ?? undefined,
            calibrationTime: calibrationTime ?? null,
            calibrationDistance: calibrationDistance ?? null,
            calibrationFactor: calibrationFactor ?? null,
            planStartDate: planStartDate ?? null,
            deactivateExisting: true,
            thresholdHeartRate: user?.thresholdHeartRate ?? null,
            hrZoneMethod: 'CUSTOM',
            hrZone1Max: user?.hrZone1Max ?? null,
            hrZone2Max: user?.hrZone2Max ?? null,
            hrZone3Max: user?.hrZone3Max ?? null,
            hrZone4Max: user?.hrZone4Max ?? null,
            hrZone5Max: user?.hrZone5Max ?? null,
            hrZone6Max: user?.hrZone6Max ?? null,
            hrMax: user?.hrMax ?? null,
            hrRest: user?.hrRest ?? null,
        });

        return NextResponse.json({ goal }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

// DELETE - Delete plan (pending workouts + deactivate goal)
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

        const url = new URL(request.url);
        const goalIdParam = url.searchParams.get('goalId');

        let goal;
        if (goalIdParam) {
            goal = await prisma.goal.findFirst({
                where: { id: goalIdParam, userId: session.user.id, deletedAt: null },
            });
        } else {
            goal = await prisma.goal.findFirst({
                where: { userId: session.user.id, isActive: true },
            });
        }

        if (!goal) {
            return NextResponse.json({ error: 'No plan found' }, { status: 404 });
        }

        const now = new Date();

        const deletedCount = await prisma.workout.deleteMany({
            where: {
                goalId: goal.id,
                isCompleted: false,
                scheduledDate: { gte: now },
            },
        });

        await prisma.goal.update({
            where: { id: goal.id },
            data: { isActive: false, completedAt: now, deletedAt: now },
        });

        return NextResponse.json({
            success: true,
            deletedWorkouts: deletedCount.count,
            goalId: goal.id,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
