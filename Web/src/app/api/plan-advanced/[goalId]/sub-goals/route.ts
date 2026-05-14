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
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const subGoals = await prisma.goal.findMany({
            where: { parentGoalId: goalId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { workouts: true } },
            },
        });

        return NextResponse.json({ subGoals });
    } catch (error) {
        console.error('Sub-goals list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: RouteContext) {
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

        const body = await req.json();
        const { name, raceType, raceDate, priority, sport } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Sub-goal name is required' }, { status: 400 });
        }

        await createSnapshot(goalId, 'Before adding sub-goal', 'add_sub_goal');

        const subGoal = await prisma.goal.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                parentGoalId: goalId,
                sport: sport || goal.sport,
                raceType: raceType || null,
                raceDate: raceDate ? new Date(raceDate) : null,
                priority: priority || 'SECONDARY',
                planSource: 'advanced',
                creationMode: 'EXPERT_MANUAL',
            },
        });

        return NextResponse.json({ subGoal }, { status: 201 });
    } catch (error) {
        console.error('Sub-goal create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
