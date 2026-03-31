import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import type { ActivityListItem } from '@/lib/types';

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

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse optional date-range query parameters
        const url = new URL(req.url);
        const fromParam = url.searchParams.get('from');
        const toParam = url.searchParams.get('to');
        const includeUnlinked = url.searchParams.get('includeUnlinked') === 'true';
        const goalIdParam = url.searchParams.get('goalId');

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

        // Common select for ActivityListItem fields
        const activitySelect = {
            id: true,
            stravaId: true,
            type: true,
            sportType: true,
            name: true,
            description: true,
            startDate: true,
            distance: true,
            movingTime: true,
            averageSpeed: true,
            maxSpeed: true,
            gradeAdjustedSpeed: true,
            averageHr: true,
            maxHr: true,
            hasHeartrate: true,
            totalElevation: true,
            elevHigh: true,
            elevLow: true,
            calories: true,
            trimp: true,
            runningTss: true,
            estimatedVdot: true,
            averageCadence: true,
            trainingType: true,
            hrZone1Time: true,
            hrZone2Time: true,
            hrZone3Time: true,
            hrZone4Time: true,
            hrZone5Time: true,
            hrZone6Time: true,
            hrZone7Time: true,
        };

        const goalWhere: { userId: string; isActive?: boolean; id?: string } = { userId: session.user.id };
        if (goalIdParam) {
            goalWhere.id = goalIdParam;
        } else {
            goalWhere.isActive = true;
        }

        const activeGoal = await prisma.goal.findFirst({
            where: goalWhere,
            include: {
                workouts: {
                    where: Object.keys(workoutWhere).length > 0 ? workoutWhere : undefined,
                    orderBy: { scheduledDate: 'asc' },
                    include: {
                        linkedActivity: {
                            select: activitySelect
                        }
                    }
                }
            }
        });

        if (!activeGoal) {
            return NextResponse.json({ goal: null, unlinkedActivities: [] });
        }


        // Fetch unlinked activities within the plan period (if requested)
        let unlinkedActivities: ActivityListItem[] = [];
        if (includeUnlinked) {
            const planStartDate = activeGoal.createdAt;
            const planEndDate = activeGoal.raceDate;

            // Get all activity IDs that are linked to workouts for this goal
            const allLinkedActivityIds = await prisma.workout.findMany({
                where: { goalId: activeGoal.id, linkedActivityId: { not: null } },
                select: { linkedActivityId: true }
            }).then(workouts => workouts.map(w => w.linkedActivityId as string));

            const rawUnlinkedActivities = await prisma.activity.findMany({
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
                select: activitySelect,
                orderBy: { startDate: 'asc' }
            });

            // Cast bigint stravaId to string
            unlinkedActivities = rawUnlinkedActivities.map(a => ({
                ...a,
                stravaId: a.stravaId.toString(),
                startDate: a.startDate.toISOString() // Ensure Date is string for client consistency if needed, though JSON serialization handles Date
            })) as unknown as ActivityListItem[];
        }

        // Transform goal workouts to handle BigInt serialization for linkedActivity
        const transformedWorkouts = activeGoal.workouts.map(w => ({
            ...w,
            linkedActivity: w.linkedActivity ? {
                ...w.linkedActivity,
                stravaId: w.linkedActivity.stravaId.toString(),
                startDate: w.linkedActivity.startDate.toISOString()
            } : null
        }));

        return cachedResponse({
            goal: {
                ...activeGoal,
                workouts: transformedWorkouts
            },
            unlinkedActivities
        }, { maxAge: 60, staleWhileRevalidate: 30 });
    } catch (error) {
        console.error('Plan fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
