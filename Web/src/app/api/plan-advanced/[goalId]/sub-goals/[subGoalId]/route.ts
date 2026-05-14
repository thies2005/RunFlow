import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

type RouteContext = { params: Promise<{ goalId: string; subGoalId: string }> };

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

        const { goalId, subGoalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const subGoal = await prisma.goal.findFirst({
            where: { id: subGoalId, parentGoalId: goalId },
        });

        if (!subGoal) {
            return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
        }

        const body = await req.json();
        const allowedFields = ['name', 'raceType', 'raceDate', 'priority', 'sport'];
        const updateData: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = field === 'raceDate' ? new Date(body[field]) : body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        await createSnapshot(goalId, 'Before sub-goal update', 'update_sub_goal');

        const updated = await prisma.goal.update({
            where: { id: subGoalId },
            data: updateData,
        });

        return NextResponse.json({ subGoal: updated });
    } catch (error) {
        console.error('Sub-goal update error:', error);
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

        const { goalId, subGoalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const subGoal = await prisma.goal.findFirst({
            where: { id: subGoalId, parentGoalId: goalId },
        });

        if (!subGoal) {
            return NextResponse.json({ error: 'Sub-goal not found' }, { status: 404 });
        }

        await createSnapshot(goalId, 'Before sub-goal delete', 'delete_sub_goal');

        await prisma.workout.deleteMany({ where: { subGoalId } });

        await prisma.goal.update({
            where: { id: subGoalId },
            data: { deletedAt: new Date(), isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Sub-goal delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
