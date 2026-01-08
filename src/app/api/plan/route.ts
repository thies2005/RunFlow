import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export async function GET(req: Request) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse optional date-range query parameters
        const url = new URL(req.url);
        const fromParam = url.searchParams.get('from');
        const toParam = url.searchParams.get('to');

        // Build workout filter with optional date range
        const workoutWhere: { scheduledDate?: { gte?: Date; lte?: Date } } = {};
        if (fromParam) {
            const fromDate = new Date(fromParam);
            if (!isNaN(fromDate.getTime())) {
                workoutWhere.scheduledDate = { ...workoutWhere.scheduledDate, gte: fromDate };
            }
        }
        if (toParam) {
            const toDate = new Date(toParam);
            if (!isNaN(toDate.getTime())) {
                workoutWhere.scheduledDate = { ...workoutWhere.scheduledDate, lte: toDate };
            }
        }

        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
            include: {
                workouts: {
                    where: Object.keys(workoutWhere).length > 0 ? workoutWhere : undefined,
                    orderBy: { scheduledDate: 'asc' }
                }
            }
        });

        if (!activeGoal) {
            return NextResponse.json({ goal: null });
        }

        // Fetch linked activities for completed workouts
        const linkedActivityIds = activeGoal.workouts
            .filter(w => w.linkedActivityId)
            .map(w => w.linkedActivityId as string);

        const linkedActivities = linkedActivityIds.length > 0
            ? await prisma.activity.findMany({
                where: { id: { in: linkedActivityIds } },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    distance: true,
                    movingTime: true,
                    averageHr: true,
                    averageSpeed: true,
                    type: true
                }
            })
            : [];

        // Map activities by ID for quick lookup
        const activityMap = new Map(linkedActivities.map(a => [a.id, a]));

        // Enhance workouts with linked activity data
        const enhancedWorkouts = activeGoal.workouts.map(w => ({
            ...w,
            linkedActivity: w.linkedActivityId ? activityMap.get(w.linkedActivityId) ?? null : null
        }));

        return NextResponse.json({
            goal: {
                ...activeGoal,
                workouts: enhancedWorkouts
            }
        });
    } catch (error) {
        console.error('Plan fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
