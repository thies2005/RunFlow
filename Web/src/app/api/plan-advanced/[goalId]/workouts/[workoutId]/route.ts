import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { checkFieldConsistency, deriveMissingField } from '@/lib/plans/validate-workout';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { logger } from '@/lib/logging/logger';

type RouteContext = { params: Promise<{ goalId: string; workoutId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId, workoutId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const workout = await prisma.workout.findFirst({
            where: { id: workoutId, goalId },
        });

        if (!workout) {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
        }

        const body = await req.json();
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
                } else if (field === 'targetPowerZone') {
                    if (body.targetPowerZone === null || body.targetPowerZone === '') {
                        updateData.targetPowerZone = null;
                    } else if (typeof body.targetPowerZone === 'number') {
                        updateData.targetPowerZone = isNaN(body.targetPowerZone) ? null : Math.round(body.targetPowerZone);
                    } else {
                        const parsed = parseInt(String(body.targetPowerZone).replace(/^Z/i, ''), 10);
                        updateData.targetPowerZone = isNaN(parsed) ? null : parsed;
                    }
                } else {
                    updateData[field] = body[field];
                }
            }
        }

        if (body.linkedActivityId) {
            const activity = await prisma.activity.findFirst({
                where: { id: body.linkedActivityId, userId: user.id },
            });
            if (!activity) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }
        }

        if (typeof body.subGoalId === 'string' && body.subGoalId.trim() !== '') {
            const subGoal = await prisma.goal.findFirst({
                where: { id: String(body.subGoalId), userId: user.id, parentGoalId: goalId },
                select: { id: true },
            });
            if (!subGoal) return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
        }

        if (body.isCompleted !== undefined) {
            if (body.completedAt === undefined) {
                updateData.completedAt = body.isCompleted ? (workout.completedAt ?? new Date()) : null;
            }
            if (!body.isCompleted) updateData.linkedActivityId = null;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const workoutType = updateData.workoutType !== undefined ? updateData.workoutType as string : workout.workoutType;
        const merged = {
            targetDistance: updateData.targetDistance !== undefined ? updateData.targetDistance as number | null : workout.targetDistance,
            targetPace: updateData.targetPace !== undefined ? updateData.targetPace as number | null : workout.targetPace,
            targetDuration: updateData.targetDuration !== undefined ? updateData.targetDuration as number | null : workout.targetDuration,
            workoutType,
        };

        const derived = deriveMissingField(merged);
        if (derived.targetDuration !== undefined) updateData.targetDuration = derived.targetDuration;
        if (derived.targetPace !== undefined) updateData.targetPace = derived.targetPace;
        if (derived.targetDistance !== undefined) updateData.targetDistance = derived.targetDistance;

        const finalValues = {
            targetDistance: updateData.targetDistance !== undefined ? updateData.targetDistance as number | null : workout.targetDistance,
            targetPace: updateData.targetPace !== undefined ? updateData.targetPace as number | null : workout.targetPace,
            targetDuration: updateData.targetDuration !== undefined ? updateData.targetDuration as number | null : workout.targetDuration,
            workoutType,
        };
        const warnings = checkFieldConsistency(finalValues);

        await createSnapshot(goalId, 'Before workout update', 'update_workout');

        const updated = await prisma.workout.update({
            where: { id: workoutId },
            data: updateData,
        });

        // When a workout is being marked complete, adapt the plan in the
        // background (fire-and-forget). Adaptivity is conservative: it only
        // re-derives paces for future, incomplete workouts when the runner's
        // effective VDOT has shifted meaningfully. Failures are logged but
        // never break the update response.
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

        return NextResponse.json({ workout: updated, warnings });
    } catch (error) {
        console.error('Advanced plan workout update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, ctx: RouteContext) {
    try {
        // Dual auth: NextAuth session (web) or mobile JWT Bearer (app).
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId, workoutId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const workout = await prisma.workout.findFirst({
            where: { id: workoutId, goalId },
        });

        if (!workout) {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
        }

        await createSnapshot(goalId, 'Before workout delete', 'delete_workout');

        await prisma.workout.delete({ where: { id: workoutId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Advanced plan workout delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
