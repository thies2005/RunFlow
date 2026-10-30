import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function GET(
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

    const workout = await prisma.workout.findUnique({
      where: { id },
      include: { goal: true },
    });

    if (!workout || workout.goal.userId !== user.id) {
      return errorResponses.notFound('Workout');
    }

    let fitBytes: Uint8Array | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fitModule = require('@/lib/plans/fit-export');
      if (typeof fitModule?.exportWorkoutFit === 'function') {
        fitBytes = fitModule.exportWorkoutFit(workout);
      }
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fitModule = require('../../../../../../lib/plans/fit-export');
        if (typeof fitModule?.exportWorkoutFit === 'function') {
          fitBytes = fitModule.exportWorkoutFit(workout);
        }
      } catch {
        // fit-export may be loaded in parallel
      }
    }

    if (!fitBytes) {
      return errorResponses.badRequest('FIT exporter not available for this workout');
    }

    const filename = `${workout.customName || workout.workoutType || 'workout'}.fit`.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(fitBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        ...rateLimitHeaders(rateLimitResult),
        'Content-Type': 'application/vnd.ant.fit',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      path: `/api/mobile/v1/workouts/${id}/export/fit`,
    });
  }
}
