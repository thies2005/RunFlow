import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { checkFieldConsistency, deriveMissingField } from '@/lib/plans/validate-workout';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { logger } from '@/lib/logging/logger';

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

    const workoutType = body.workoutType ?? workout.workoutType;
    const merged = {
      targetDistance: body.targetDistance !== undefined ? body.targetDistance : workout.targetDistance,
      targetPace: body.targetPace !== undefined ? body.targetPace : workout.targetPace,
      targetDuration: body.targetDuration !== undefined ? body.targetDuration : workout.targetDuration,
      workoutType,
    };

    const derived = deriveMissingField(merged);

    const derivedTargetDuration = derived.targetDuration !== undefined ? derived.targetDuration : (body.targetDuration !== undefined ? body.targetDuration : undefined);
    const derivedTargetPace = derived.targetPace !== undefined ? derived.targetPace : (body.targetPace !== undefined ? body.targetPace : undefined);
    const derivedTargetDistance = derived.targetDistance !== undefined ? derived.targetDistance : (body.targetDistance !== undefined ? body.targetDistance : undefined);

    const finalValues = {
      targetDistance: derivedTargetDistance !== undefined ? derivedTargetDistance : merged.targetDistance,
      targetPace: derivedTargetPace !== undefined ? derivedTargetPace : merged.targetPace,
      targetDuration: derivedTargetDuration !== undefined ? derivedTargetDuration : merged.targetDuration,
      workoutType,
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

    if (body.linkedActivityId && prisma.activity) {
      const activity = await prisma.activity.findFirst({
        where: { id: body.linkedActivityId, userId: user.id },
      });
      if (!activity) {
        return errorResponses.notFound('Activity');
      }
    }

    const allowedFields = [
      'scheduledDate', 'workoutType', 'description', 'displayDesc', 'phase', 'order', 'notes',
      'targetDistance', 'targetDuration', 'targetPace', 'targetPaceMinSecondsPerKm', 'targetPaceMaxSecondsPerKm',
      'targetPaceZoneLabel', 'targetHrZone', 'targetHrMinBpm', 'targetHrMaxBpm', 'targetHrZoneLabel',
      'targetPowerWatts', 'targetPowerMinWatts', 'targetPowerMaxWatts', 'targetPowerZone', 'targetFtpPercent',
      'targetCadenceRpm', 'targetRpe', 'intensityZone', 'plannedTss', 'sport', 'isCompleted', 'completedAt',
      'linkedActivityId', 'customName', 'color', 'structuredSteps', 'groupId', 'subGoalId',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'scheduledDate') {
          updateData[field] = body[field] ? new Date(body[field]) : undefined;
        } else if (field === 'completedAt') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (body.targetDistance === undefined && derivedTargetDistance !== undefined) {
      updateData.targetDistance = derivedTargetDistance;
    }
    if (body.targetPace === undefined && derivedTargetPace !== undefined) {
      updateData.targetPace = derivedTargetPace;
    }
    if (body.targetDuration === undefined && derivedTargetDuration !== undefined) {
      updateData.targetDuration = derivedTargetDuration;
    }

    if (body.isCompleted !== undefined) {
      if (body.completedAt === undefined) {
        updateData.completedAt = body.isCompleted ? (workout.completedAt ?? new Date()) : null;
      }
      if (!body.isCompleted) {
        updateData.linkedActivityId = null;
      }
    }

    const updated = await prisma.workout.update({
      where: { id },
      data: updateData,
    });

    const justCompleted = body.isCompleted === true && !workout.isCompleted;
    if (justCompleted) {
      void adaptPlanAfterCompletion(workout.goalId, user.id).catch((err) => {
        logger.error('Plan adaptivity failed after workout completion', {
          goalId: workout.goalId,
          workoutId: workout.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

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
