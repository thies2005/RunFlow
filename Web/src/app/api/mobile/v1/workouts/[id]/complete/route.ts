/**
 * Mobile Workout Complete Endpoint
 * 
 * POST /api/mobile/v1/workouts/{id}/complete
 * 
 * Links an activity to a workout, marking it as completed.
 * 
 * Request body:
 * {
 *   activityId: string // The activity ID to link to this workout
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        // Parse request body
        const body = await request.json();
        const { activityId } = body;

        if (!activityId) {
            return NextResponse.json(
                { error: 'activityId is required' },
                { status: 400, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        // Verify workout ownership
        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout) {
            return errorResponses.notFound('Workout');
        }

        if (workout.goal.userId !== user.id) {
            return errorResponses.forbidden();
        }

        // Verify activity ownership
        const activity = await prisma.activity.findUnique({
            where: { id: activityId }
        });

        if (!activity) {
            return errorResponses.notFound('Activity');
        }

        if (activity.userId !== user.id) {
            return errorResponses.forbidden();
        }

        // Update workout with linked activity
        const updated = await prisma.workout.update({
            where: { id },
            data: {
                isCompleted: true,
                completedAt: new Date(),
                linkedActivityId: activityId
            }
        });

        // Serialize dates
        const serialized = {
            ...updated,
            scheduledDate: updated.scheduledDate.toISOString(),
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            completedAt: updated.completedAt?.toISOString() || null
        };

        return NextResponse.json(serialized, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/workouts/${id}/complete`
        });
    }
}
