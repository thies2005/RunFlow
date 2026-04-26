import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

    if (!rateLimitResult.allowed) {
      return errorResponses.rateLimited(rateLimitResult.retryAfter);
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponses.unauthorized();
    }

    const body = await request.json();

    const workout = await prisma.workout.findUnique({
      where: { id },
      include: { goal: true },
    });

    if (!workout || workout.goal.userId !== user.id) {
      return errorResponses.notFound('Workout');
    }

    const updated = await prisma.workout.update({
      where: { id },
      data: {
        ...(body.workoutType && { workoutType: body.workoutType }),
        ...(body.description && { description: body.description }),
        ...(body.targetDistance !== undefined && { targetDistance: body.targetDistance }),
        ...(body.targetPace !== undefined && { targetPace: body.targetPace }),
        ...(body.targetDuration !== undefined && { targetDuration: body.targetDuration }),
        ...(body.scheduledDate && { scheduledDate: new Date(body.scheduledDate) }),
        ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted, completedAt: body.isCompleted ? new Date() : null }),
      },
    });

    const serialized = {
      ...updated,
      scheduledDate: updated.scheduledDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      completedAt: updated.completedAt?.toISOString() || null,
    };

    return NextResponse.json(serialized, { headers: rateLimitHeaders(rateLimitResult) });
  } catch (error) {
    return handleApiError(error, {
      path: `/api/mobile/v1/workouts/${id}`,
    });
  }
}
