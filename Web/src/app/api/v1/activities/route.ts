export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { ActivityType } from '@prisma/client';
import { cachedResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { activitySchema } from '@/lib/validation/schemas';
import { setApiVersionHeaders } from '@/lib/api/version';

type ActivityWhereClause = {
    userId: string;
    type?: ActivityType;
    distance?: { gte: number };
    startDate?: { gte: Date };
};

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('Activities GET: No session or user ID');
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const type = searchParams.get('type');
        const raceEligible = searchParams.get('raceEligible') === 'true';

        const where: ActivityWhereClause = { userId: session.user.id };
        if (type) {
            const validTypes: ActivityType[] = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
            const upperType = type.toUpperCase() as ActivityType;
            if (validTypes.includes(upperType)) {
                where.type = upperType;
            }
        }

        if (raceEligible) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
            where.type = 'RUN';
            where.distance = { gte: 4500 };
            where.startDate = { gte: sixMonthsAgo };
        }

        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where,
                orderBy: { startDate: 'desc' },
                take: limit,
                skip: offset,
                select: {
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
                    averageCadence: true,
                    hasHeartrate: true,
                    totalElevation: true,
                    elevHigh: true,
                    elevLow: true,
                    calories: true,
                    trimp: true,
                    runningTss: true,
                    estimatedVdot: true,
                    trainingType: true,
                    hrZone1Time: true,
                    hrZone2Time: true,
                    hrZone3Time: true,
                    hrZone4Time: true,
                    hrZone5Time: true,
                    hrZone6Time: true,
                    hrZone7Time: true,
                    _count: {
                        select: {
                            laps: true,
                            splits: true,
                        },
                    },
                },
            }),
            prisma.activity.count({ where }),
        ]);

        const activityIds = activities.map(a => a.id);
        const linkedWorkouts = await prisma.workout.findMany({
            where: {
                linkedActivityId: { in: activityIds }
            },
            select: { linkedActivityId: true }
        });
        const linkedActivityIds = new Set(linkedWorkouts.map(w => w.linkedActivityId));

        const serialized = activities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString(),
            isLinked: linkedActivityIds.has(a.id)
        }));

        const response = cachedResponse({
            activities: serialized,
            total,
            limit,
            offset,
        }, { maxAge: 120, staleWhileRevalidate: 60 });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Activities error:', error);
        const response = NextResponse.json(
            { error: 'Failed to fetch activities' },
            { status: 500 }
        );
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.activities);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const validation = await validateBody(activitySchema, request);
        if (!validation.success) {
            const errorResponse = validation.error;
            setApiVersionHeaders(errorResponse.headers);
            return errorResponse;
        }

        const { name, date, type, distance, duration, hr, hrZones } = validation.data;

        const parsedDate = new Date(date);
        const parsedDistance = distance;
        const parsedDuration = duration;
        const parsedHr = hr;
        const activityType = type || 'RUN';

        const startTime = parsedDate.getTime();
        const oneMinute = 60 * 1000;

        const existingActivity = await prisma.activity.findFirst({
            where: {
                userId: session.user.id,
                type: activityType as ActivityType,
                startDate: {
                    gte: new Date(startTime - oneMinute),
                    lte: new Date(startTime + oneMinute),
                }
            }
        });

        if (existingActivity) {
            const response = NextResponse.json({
                ...existingActivity,
                stravaId: existingActivity.stravaId.toString(),
                duplicate: true,
                message: 'Activity already exists'
            });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const randomSuffix = Math.floor(Math.random() * 1000000);
        const stravaId = BigInt(-1) * BigInt(`${Date.now()}${randomSuffix.toString().padStart(6, '0')}`);

        const activity = await prisma.activity.create({
            data: {
                userId: session.user.id,
                stravaId,
                name: name.trim().substring(0, 200),
                type: activityType as ActivityType,
                startDate: parsedDate,
                distance: parsedDistance * 1000,
                movingTime: parsedDuration * 60,
                elapsedTime: parsedDuration * 60,
                averageHr: parsedHr,
                hasHeartrate: parsedHr !== null,
                hrZone1Time: hrZones?.z1,
                hrZone2Time: hrZones?.z2,
                hrZone3Time: hrZones?.z3,
                hrZone4Time: hrZones?.z4,
                hrZone5Time: hrZones?.z5,
                hrZone6Time: hrZones?.z6,
                hrZone7Time: hrZones?.z7,
                totalElevation: 0,
            },
        });

        const response = NextResponse.json({
            ...activity,
            stravaId: activity.stravaId.toString(),
        });
        setApiVersionHeaders(response.headers);
        return response;

    } catch (error) {
        console.error('Create Activity Error:', error);
        const response = NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
