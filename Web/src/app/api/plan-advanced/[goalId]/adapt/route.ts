import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ goalId: string }> };

/**
 * POST /api/plan-advanced/[goalId]/adapt
 *
 * Manually trigger plan adaptivity for a goal: re-derive the runner's effective
 * VDOT from recent activities and, if it has shifted meaningfully (>= threshold),
 * re-derive paces for the remaining future workouts. Completed workouts are
 * never modified. Auth + ownership are verified.
 */
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

        // Verify the goal belongs to the authenticated user.
        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, deletedAt: null },
            select: { id: true },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const result = await adaptPlanAfterCompletion(goalId, session.user.id);

        return NextResponse.json(result, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        console.error('Adapt plan error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
