import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { createPlanWithWorkouts, PlanCreateInputSchema, normalizePlanInput } from '@/lib/services/plan-creation';
import { enrichWorkoutForResponse } from '@/lib/api/workoutSerializer';

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
        const planSource = url.searchParams.get('planSource');
        const parentOnly = url.searchParams.get('parentOnly') === 'true';

        const goals = await prisma.goal.findMany({
            where: {
                userId,
                ...(includeDeleted ? {} : { deletedAt: null }),
                ...(planSource && { planSource }),
                ...(parentOnly && { parentGoalId: null }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                workouts: {
                    orderBy: { scheduledDate: 'asc' },
                },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: { workouts: true, snapshots: true },
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
        const parsed = PlanCreateInputSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponses.validation('Validation failed', parsed.error.flatten());
        }

        const normalized = normalizePlanInput(parsed.data, userId);
        const { goal } = await createPlanWithWorkouts(normalized);

        const enrichedGoal = {
            ...goal,
            ...(goal.workouts && { workouts: goal.workouts.map(enrichWorkoutForResponse) }),
        };

        // Return aliased as both goal and plan for backward compatibility
        return NextResponse.json({ goal: enrichedGoal, plan: enrichedGoal }, {
            status: 201,
            headers: rateLimitHeaders(rateLimitResult),
        });
    } catch (error) {
        return handleApiError(error, { path: '/api/plans' });
    }
}
