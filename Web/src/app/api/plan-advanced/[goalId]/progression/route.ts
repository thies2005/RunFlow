import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { WorkoutType as WT } from '@/generated/prisma/client';

async function checkPremium(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, aiSettings: { select: { usageTier: true } } },
    });
    const tier = user?.aiSettings?.usageTier || 'none';
    if (tier !== 'tier2' && tier !== 'tier3' && !user?.isAdmin) {
        return false;
    }
    return true;
}

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const progressions = await prisma.intervalProgression.findMany({
            where: { goalId },
            orderBy: { startWeek: 'asc' },
        });

        return NextResponse.json({ progressions });
    } catch (error) {
        console.error('List interval progressions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
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

        const body = await req.json();
        const { name, workoutType, startWeek, endWeek, weeks } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        if (!workoutType || typeof workoutType !== 'string') {
            return NextResponse.json({ error: 'workoutType is required' }, { status: 400 });
        }

        if (typeof startWeek !== 'number' || startWeek < 1) {
            return NextResponse.json({ error: 'startWeek must be a positive number' }, { status: 400 });
        }

        if (typeof endWeek !== 'number' || endWeek < startWeek) {
            return NextResponse.json({ error: 'endWeek must be >= startWeek' }, { status: 400 });
        }

        if (!Array.isArray(weeks)) {
            return NextResponse.json({ error: 'weeks must be an array' }, { status: 400 });
        }

        const progression = await prisma.intervalProgression.create({
            data: {
                goalId,
                name: name.trim(),
                workoutType: workoutType as WT,
                startWeek,
                endWeek,
                weeks,
            },
        });

        return NextResponse.json({ progression }, { status: 201 });
    } catch (error) {
        console.error('Create interval progression error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
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

        const body = await req.json();
        const { id, name, workoutType, startWeek, endWeek, weeks } = body;

        if (!id) {
            return NextResponse.json({ error: 'Progression id is required' }, { status: 400 });
        }

        const existing = await prisma.intervalProgression.findFirst({
            where: { id, goalId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Progression not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
            }
            updateData.name = name.trim();
        }
        if (workoutType !== undefined) updateData.workoutType = workoutType as WT;
        if (startWeek !== undefined) {
            if (typeof startWeek !== 'number' || startWeek < 1) {
                return NextResponse.json({ error: 'startWeek must be a positive number' }, { status: 400 });
            }
            updateData.startWeek = startWeek;
        }
        if (endWeek !== undefined) {
            if (typeof endWeek !== 'number') {
                return NextResponse.json({ error: 'endWeek must be a number' }, { status: 400 });
            }
            updateData.endWeek = endWeek;
        }
        if (weeks !== undefined) {
            if (!Array.isArray(weeks)) {
                return NextResponse.json({ error: 'weeks must be an array' }, { status: 400 });
            }
            updateData.weeks = weeks;
        }

        const updated = await prisma.intervalProgression.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ progression: updated });
    } catch (error) {
        console.error('Update interval progression error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Progression id query parameter is required' }, { status: 400 });
        }

        await prisma.workout.updateMany({
            where: { intervalProgressionId: id },
            data: { intervalProgressionId: null },
        });

        await prisma.intervalProgression.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete interval progression error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
