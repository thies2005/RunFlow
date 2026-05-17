import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { inferSport } from '@/lib/plans/descriptions';

const INTENSITY_NOTE_PREFIX = '[auto] intensity:';

function extractIntensityZone(notes?: string | null): string | null {
    if (!notes) return null;
    if (!notes.startsWith(INTENSITY_NOTE_PREFIX)) return null;
    return notes.slice(INTENSITY_NOTE_PREFIX.length).trim() || null;
}

function mapWorkoutForResponse<T extends { customName?: string | null; notes?: string | null; workoutType: string }>(
    workout: T,
) {
    return {
        ...workout,
        displayDesc: workout.customName ?? null,
        intensityZone: extractIntensityZone(workout.notes),
        sport: inferSport(workout.workoutType),
    };
}

async function authenticate(request: NextRequest): Promise<string | null> {
    const session = await auth();
    if (session?.user?.id) return session.user.id;

    const mobileUser = await getAuthenticatedUser(request);
    if (mobileUser) return mobileUser.id;

    return null;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> },
) {
    try {
        const { goalId } = await params;
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const userId = await authenticate(request);
        if (!userId) {
            return errorResponses.unauthorized();
        }

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId, deletedAt: null },
            include: {
                workouts: { orderBy: { scheduledDate: 'asc' } },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!goal) {
            return errorResponses.notFound('Plan');
        }

        const enrichedGoal = goal
            ? { ...goal, workouts: goal.workouts.map(mapWorkoutForResponse) }
            : goal;

        return NextResponse.json({ goal: enrichedGoal }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/plans/[goalId]' });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> },
) {
    try {
        const { goalId } = await params;
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const userId = await authenticate(request);
        if (!userId) {
            return errorResponses.unauthorized();
        }

        const existing = await prisma.goal.findFirst({
            where: { id: goalId, userId },
        });

        if (!existing) {
            return errorResponses.notFound('Plan');
        }

        const body = await request.json();

        const updateData: Record<string, unknown> = {};
        const allowedFields = [
            'name', 'targetTime', 'weeklyMileageGoal', 'runsPerWeek',
            'ridesPerWeek', 'strengthPerWeek', 'swimsPerWeek',
            'taperWeeks', 'peakWeeks', 'buildWeeks', 'longRunDay',
            'workoutDay', 'swimDay', 'restDays', 'currentVdot',
            'isActive', 'maxLongRunKm',
        ];

        for (const field of allowedFields) {
            if (field in body) {
                updateData[field] = body[field];
            }
        }

        if ('raceDate' in body && body.raceDate) {
            updateData.raceDate = new Date(body.raceDate);
        }
        if ('planStartDate' in body) {
            updateData.planStartDate = body.planStartDate ? new Date(body.planStartDate) : null;
        }

        const goal = await prisma.goal.update({
            where: { id: goalId },
            data: updateData,
            include: {
                workouts: { orderBy: { scheduledDate: 'asc' } },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        const enrichedGoal = {
            ...goal,
            workouts: goal.workouts.map(mapWorkoutForResponse),
        };

        return NextResponse.json({ goal: enrichedGoal }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/plans/[goalId]' });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> },
) {
    try {
        const { goalId } = await params;
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const userId = await authenticate(request);
        if (!userId) {
            return errorResponses.unauthorized();
        }

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId, deletedAt: null },
        });

        if (!goal) {
            return errorResponses.notFound('Plan');
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
        return handleApiError(error, { path: '/api/plans/[goalId]' });
    }
}
