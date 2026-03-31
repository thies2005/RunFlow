import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { setApiVersionHeaders } from '@/lib/api/version';
import { UnlinkedActivity } from '@/lib/types';

export async function GET(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const url = new URL(req.url);
        const fromParam = url.searchParams.get('from');
        const toParam = url.searchParams.get('to');
        const includeUnlinked = url.searchParams.get('includeUnlinked') === 'true';

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
            const response = NextResponse.json({ goal: null, unlinkedActivities: [] });
            setApiVersionHeaders(response.headers);
            return response;
        }

        let unlinkedActivities: UnlinkedActivity[] = [];
        if (includeUnlinked) {
            const planStartDate = activeGoal.createdAt;
            const planEndDate = activeGoal.raceDate;

            const allLinkedActivityIds = await prisma.workout.findMany({
                where: { goalId: activeGoal.id, linkedActivityId: { not: null } },
                select: { linkedActivityId: true }
            }).then(workouts => workouts.map(w => w.linkedActivityId as string));

            // Cast prisma result to UnlinkedActivity[]
            // Note: startDate in Prisma is Date, which is compatible with UnlinkedActivity (string | Date)
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
            }) as unknown as UnlinkedActivity[];
        }

        const response = cachedResponse({
            goal: activeGoal,
            unlinkedActivities
        }, { maxAge: 60, staleWhileRevalidate: 30 });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Plan fetch error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
