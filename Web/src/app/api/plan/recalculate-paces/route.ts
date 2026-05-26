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

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                hrMax: true,
                hrRest: true,
                thresholdHeartRate: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
            },
        });

        const result = await recalculateWorkoutPaces(goalId, newVdot, {
            thresholdHeartRate: user?.thresholdHeartRate ?? null,
            hrZone1Max: user?.hrZone1Max ?? null,
            hrZone2Max: user?.hrZone2Max ?? null,
            hrZone3Max: user?.hrZone3Max ?? null,
            hrZone4Max: user?.hrZone4Max ?? null,
            hrZone5Max: user?.hrZone5Max ?? null,
            hrZone6Max: user?.hrZone6Max ?? null,
            hrMax: user?.hrMax ?? null,
            hrRest: user?.hrRest ?? null,
        });

        return NextResponse.json(result, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        console.error('Error recalculating paces:', error);
        return NextResponse.json(
            { error: 'Failed to recalculate paces' },
            { status: 500 }
        );
    }
}
