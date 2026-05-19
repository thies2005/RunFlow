import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { checkFieldConsistency, deriveMissingField } from '@/lib/plans/validate-workout';

type RouteContext = { params: Promise<{ goalId: string; workoutId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
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
            where: { id: goalId, userId: session.user.id },
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
        const allowedFields = ['scheduledDate', 'workoutType', 'description', 'phase', 'order', 'notes', 'targetDistance', 'targetDuration', 'targetPace', 'targetHrZone', 'customName', 'color', 'structuredSteps', 'groupId', 'subGoalId', 'isCompleted'];
        const updateData: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = field === 'scheduledDate' ? new Date(body[field]) : body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const merged = {
            targetDistance: updateData.targetDistance !== undefined ? updateData.targetDistance as number | null : workout.targetDistance,
            targetPace: updateData.targetPace !== undefined ? updateData.targetPace as number | null : workout.targetPace,
            targetDuration: updateData.targetDuration !== undefined ? updateData.targetDuration as number | null : workout.targetDuration,
        };

        const derived = deriveMissingField(merged);
        if (derived.targetDuration !== undefined) updateData.targetDuration = derived.targetDuration;
        if (derived.targetPace !== undefined) updateData.targetPace = derived.targetPace;
        if (derived.targetDistance !== undefined) updateData.targetDistance = derived.targetDistance;

        const finalValues = {
            targetDistance: updateData.targetDistance !== undefined ? updateData.targetDistance as number | null : workout.targetDistance,
            targetPace: updateData.targetPace !== undefined ? updateData.targetPace as number | null : workout.targetPace,
            targetDuration: updateData.targetDuration !== undefined ? updateData.targetDuration as number | null : workout.targetDuration,
        };
        const warnings = checkFieldConsistency(finalValues);

        await createSnapshot(goalId, 'Before workout update', 'update_workout');

        const updated = await prisma.workout.update({
            where: { id: workoutId },
            data: updateData,
        });

        return NextResponse.json({ workout: updated, warnings });
    } catch (error) {
        console.error('Advanced plan workout update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
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
            where: { id: goalId, userId: session.user.id },
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
