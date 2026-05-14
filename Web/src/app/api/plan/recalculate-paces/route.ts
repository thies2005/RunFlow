import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const { goalId, newVdot } = body;

        if (!goalId || !newVdot || typeof newVdot !== 'number' || newVdot < 20 || newVdot > 85) {
            return NextResponse.json(
                { error: 'Invalid goalId or newVdot' },
                { status: 400 }
            );
        }

        // Verify the goal belongs to the authenticated user
        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        const result = await recalculateWorkoutPaces(goalId, newVdot);

        return NextResponse.json(result, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        console.error('Error recalculating paces:', error);
        return NextResponse.json(
            { error: 'Failed to recalculate paces' },
            { status: 500 }
        );
    }
}
