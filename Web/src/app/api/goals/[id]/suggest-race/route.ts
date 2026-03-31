import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { subDays, addDays, differenceInDays } from 'date-fns';

const RACE_DISTANCE_MAP: Record<string, number> = {
    FIVE_K: 5000,
    TEN_K: 10000,
    HALF_MARATHON: 21097,
    MARATHON: 42195,
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const goal = await prisma.goal.findUnique({
            where: { id },
        });

        if (!goal || goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        const raceDate = new Date(goal.raceDate);
        const expectedDistance = RACE_DISTANCE_MAP[goal.raceType] || 10000;
        const startDate = subDays(raceDate, 3);
        const endDate = addDays(raceDate, 3);

        const activities = await prisma.activity.findMany({
            where: {
                userId: session.user.id,
                type: 'RUN',
                startDate: { gte: startDate, lte: endDate },
            },
            select: {
                id: true,
                name: true,
                startDate: true,
                distance: true,
                movingTime: true,
                averageSpeed: true,
                averageHr: true,
                totalElevation: true,
            },
            orderBy: { startDate: 'asc' },
        });

        const scored = activities.map(activity => {
            const distanceMatch = 1 - Math.abs(activity.distance - expectedDistance) / expectedDistance;
            const daysDiff = Math.abs(differenceInDays(activity.startDate, raceDate));
            const dateMatch = 1 - daysDiff / 3;
            const score = (distanceMatch * 0.6) + (dateMatch * 0.4);
            return {
                id: activity.id,
                name: activity.name,
                startDate: activity.startDate.toISOString(),
                distance: activity.distance,
                movingTime: activity.movingTime,
                averageSpeed: activity.averageSpeed,
                averageHr: activity.averageHr,
                totalElevation: activity.totalElevation,
                distanceMatch: Math.round(distanceMatch * 100) / 100,
                dateMatch: Math.round(dateMatch * 100) / 100,
                score: Math.round(score * 100) / 100,
            };
        });

        scored.sort((a, b) => b.score - a.score);
        const topSuggestions = scored.slice(0, 3);
        const exactMatch = topSuggestions.length > 0 && topSuggestions[0].distanceMatch >= 0.95;

        return NextResponse.json({
            suggestions: topSuggestions,
            exactMatch,
            raceDate: raceDate.toISOString(),
            expectedDistance,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
