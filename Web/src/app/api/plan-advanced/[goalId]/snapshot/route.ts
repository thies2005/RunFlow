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
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const snapshots = await prisma.planSnapshot.findMany({
            where: { goalId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                description: true,
                operation: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ snapshots });
    } catch (error) {
        console.error('Snapshots list error:', error);
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
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { description } = body;

        const snapshot = await createSnapshot(goalId, description || 'Manual snapshot', 'manual_snapshot');

        return NextResponse.json({ snapshot: { id: snapshot.id, description: snapshot.description, operation: snapshot.operation, createdAt: snapshot.createdAt } }, { status: 201 });
    } catch (error) {
        console.error('Snapshot create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
