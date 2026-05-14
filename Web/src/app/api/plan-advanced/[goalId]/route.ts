import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
            include: {
                workouts: {
                    orderBy: { scheduledDate: 'asc' },
                    include: {
                        linkedActivity: {
                            select: {
                                id: true,
                                stravaId: true,
                                type: true,
                                name: true,
                                startDate: true,
                                distance: true,
                                movingTime: true,
                                averageSpeed: true,
                                averageHr: true,
                                totalElevation: true,
                            },
                        },
                    },
                },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        _count: { select: { workouts: true } },
                    },
                },
                paceProfile: true,
                snapshots: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: { id: true, description: true, operation: true, createdAt: true },
                },
            },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const transformedWorkouts = goal.workouts.map(w => ({
            ...w,
            linkedActivity: w.linkedActivity
                ? {
                      ...w.linkedActivity,
                      stravaId: w.linkedActivity.stravaId.toString(),
                  }
                : null,
        }));

        return NextResponse.json({
            plan: {
                ...goal,
                workouts: transformedWorkouts,
            },
        });
    } catch (error) {
        console.error('Advanced plan get error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;
        const body = await req.json();
        const { planSource } = body;

        if (!planSource || planSource !== 'advanced') {
            return NextResponse.json({ error: 'Invalid planSource' }, { status: 400 });
        }

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        await prisma.goal.update({
            where: { id: goalId },
            data: { planSource: 'advanced' },
        });

        return NextResponse.json({ success: true, plan: goal });
    } catch (error) {
        console.error('Advanced plan patch error:', error);
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

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        await createSnapshot(goalId, 'Before soft delete', 'delete_plan');

        await prisma.goal.update({
            where: { id: goalId },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Advanced plan delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
