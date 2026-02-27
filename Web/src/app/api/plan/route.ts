import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/apiResponse';
import { UnlinkedActivity } from '@/lib/types';

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
        const includeUnlinked = url.searchParams.get('includeUnlinked') === 'true';

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
                    orderBy: { scheduledDate: 'asc' },
                    include: {
                        linkedActivity: {
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
                        }
                    }
                }
            }
        });

        if (!activeGoal) {
            return NextResponse.json({ goal: null, unlinkedActivities: [] });
        }

        // Fetch unlinked activities within the plan period (if requested)
        // M-06 fix: Define proper type for unlinked activities
        let unlinkedActivities: UnlinkedActivity[] = [];
        if (includeUnlinked) {
            const planStartDate = activeGoal.createdAt;
            const planEndDate = activeGoal.raceDate;

            // Get all activity IDs that are linked to workouts for this goal
            const allLinkedActivityIds = await prisma.workout.findMany({
                where: { goalId: activeGoal.id, linkedActivityId: { not: null } },
                select: { linkedActivityId: true }
            }).then(workouts => workouts.map(w => w.linkedActivityId as string));

            unlinkedActivities = await prisma.activity.findMany({
                where: {
                    userId: session.user.id,
                    startDate: {
                        gte: planStartDate,
                        lte: planEndDate
                    },
                    id: allLinkedActivityIds.length > 0
                        ? { notIn: allLinkedActivityIds }
                        : undefined
                },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    distance: true,
                    movingTime: true,
                    averageHr: true,
                    averageSpeed: true,
                    type: true
                },
                orderBy: { startDate: 'asc' }
            });
        }

        return cachedResponse({
            goal: activeGoal,
            unlinkedActivities
        }, { maxAge: 60, staleWhileRevalidate: 30 });
    } catch (error) {
        console.error('Plan fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

