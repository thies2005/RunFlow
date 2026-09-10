import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { checkFieldConsistency, deriveMissingField } from '@/lib/plans/validate-workout';

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

    const merged = {
      targetDistance: body.targetDistance !== undefined ? body.targetDistance : workout.targetDistance,
      targetPace: body.targetPace !== undefined ? body.targetPace : workout.targetPace,
      targetDuration: body.targetDuration !== undefined ? body.targetDuration : workout.targetDuration,
    };

    const derived = deriveMissingField(merged);

    const derivedTargetDuration = derived.targetDuration !== undefined ? derived.targetDuration : (body.targetDuration !== undefined ? body.targetDuration : undefined);
    const derivedTargetPace = derived.targetPace !== undefined ? derived.targetPace : (body.targetPace !== undefined ? body.targetPace : undefined);
    const derivedTargetDistance = derived.targetDistance !== undefined ? derived.targetDistance : (body.targetDistance !== undefined ? body.targetDistance : undefined);

    const finalValues = {
      targetDistance: derivedTargetDistance !== undefined ? derivedTargetDistance : merged.targetDistance,
      targetPace: derivedTargetPace !== undefined ? derivedTargetPace : merged.targetPace,
      targetDuration: derivedTargetDuration !== undefined ? derivedTargetDuration : merged.targetDuration,
    };
    const warnings = checkFieldConsistency(finalValues);

    // Builder fields: undefined = untouched, null = cleared (same semantics as
    // the targets above). Types are validated so malformed payloads fail fast
    // instead of poisoning the row; structuredSteps must be a JSON object or
    // array (Prisma Json input), never a primitive.
    const optionalInt = (v: unknown) => v === undefined || v === null || (typeof v === 'number' && Number.isInteger(v));
    const optionalNumber = (v: unknown) => v === undefined || v === null || (typeof v === 'number' && Number.isFinite(v));
    const optionalString = (v: unknown) => v === undefined || v === null || typeof v === 'string';
    const builderFieldsValid =
      optionalInt(body.targetHrZone) &&
      optionalInt(body.targetHrMinBpm) &&
      optionalInt(body.targetHrMaxBpm) &&
      optionalNumber(body.targetPaceMinSecondsPerKm) &&
      optionalNumber(body.targetPaceMaxSecondsPerKm) &&
      optionalString(body.customName) &&
      (body.structuredSteps === undefined || body.structuredSteps === null || typeof body.structuredSteps === 'object');
    if (!builderFieldsValid) {
      return errorResponses.badRequest('Invalid builder field type');
    }

    const updated = await prisma.workout.update({
      where: { id },
      data: {
        ...(body.workoutType && { workoutType: body.workoutType }),
        ...(body.description && { description: body.description }),
        ...(body.customName !== undefined && { customName: body.customName }),
        ...(body.targetHrZone !== undefined && { targetHrZone: body.targetHrZone }),
        ...(body.targetHrMinBpm !== undefined && { targetHrMinBpm: body.targetHrMinBpm }),
        ...(body.targetHrMaxBpm !== undefined && { targetHrMaxBpm: body.targetHrMaxBpm }),
        ...(body.targetPaceMinSecondsPerKm !== undefined && { targetPaceMinSecondsPerKm: body.targetPaceMinSecondsPerKm }),
        ...(body.targetPaceMaxSecondsPerKm !== undefined && { targetPaceMaxSecondsPerKm: body.targetPaceMaxSecondsPerKm }),
        ...(body.structuredSteps !== undefined && { structuredSteps: body.structuredSteps }),
        ...(body.targetDistance !== undefined
          ? { targetDistance: body.targetDistance }
          : derivedTargetDistance !== undefined
            ? { targetDistance: derivedTargetDistance }
            : {}),
        ...(body.targetPace !== undefined
          ? { targetPace: body.targetPace }
          : derivedTargetPace !== undefined
            ? { targetPace: derivedTargetPace }
            : {}),
        ...(body.targetDuration !== undefined
          ? { targetDuration: body.targetDuration }
          : derivedTargetDuration !== undefined
            ? { targetDuration: derivedTargetDuration }
            : {}),
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

    return NextResponse.json({ ...serialized, warnings }, { headers: rateLimitHeaders(rateLimitResult) });
  } catch (error) {
    return handleApiError(error, {
      path: `/api/mobile/v1/workouts/${id}`,
    });
  }
}
