import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { ActivityType } from '@/generated/prisma/browser';
import { cachedResponse } from '@/lib/api/apiResponse';
import { validateBody } from '@/lib/validation/validator';
import { activitySchema } from '@/lib/validation/schemas';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';
import { recordMetric } from '@/lib/monitoring/metrics';
import { MINUTE_MS } from '@/lib/constants';

// Type for Prisma where clause with optional filters
type ActivityWhereClause = {
    userId: string;
    type?: ActivityType;
    distance?: { gte: number };
    startDate?: { gte: Date };
};

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    let isError = false;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            logger.error('Activities GET: No session or user ID', { path: request.nextUrl.pathname });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const type = searchParams.get('type');
        const raceEligible = searchParams.get('raceEligible') === 'true';

        const where: ActivityWhereClause = { userId: session.user.id };
        if (type) {
            // Validate type against allowed values to prevent Prisma errors
            const validTypes: ActivityType[] = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
            const upperType = type.toUpperCase() as ActivityType;
            if (validTypes.includes(upperType)) {
                where.type = upperType;
            }
        }

        // Race-eligible filter: runs >= 4.5km from last 6 months
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

        // Convert BigInt to string and add isLinked flag
        const serialized = activities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString(),
            isLinked: linkedActivityIds.has(a.id)
        }));

        return cachedResponse({
            activities: serialized,
            total,
            limit,
            offset,
        }, { maxAge: 120, staleWhileRevalidate: 60 });
    } catch (error) {
        isError = true;
        return handleError(error);
    } finally {
        const duration = Date.now() - startTime;
        recordMetric('api.activities.get.response_time', duration);
        recordMetric('api.activities.get.error', isError ? 1 : 0);
    }
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let isError = false;

    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.activities);

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

        const validation = await validateBody(activitySchema, request);
        if (!validation.success) {
            return validation.error;
        }

        const { name, date, type, distance, duration, hr, hrZones } = validation.data;

        const parsedDate = new Date(date);
        const parsedDistance = distance;
        const parsedDuration = duration;
        const parsedHr = hr;
        const activityType = type || 'RUN';

        // === Duplicate Check ===
        // Check if an activity with the same start date (within 5 minutes) and type already exists
        const activityTimestamp = parsedDate.getTime();
        const fiveMinutes = 5 * MINUTE_MS;

        const existingActivity = await prisma.activity.findFirst({
            where: {
                userId: session.user.id,
                type: activityType as ActivityType,
                startDate: {
                    gte: new Date(activityTimestamp - fiveMinutes),
                    lte: new Date(activityTimestamp + fiveMinutes),
                }
            }
        });

        if (existingActivity) {
            // Return the existing activity instead of creating a duplicate
            return NextResponse.json({
                ...existingActivity,
                stravaId: existingActivity.stravaId.toString(),
                duplicate: true,
                message: 'Activity already exists'
            });
        }

        // Generate manual activity ID using negative BigInt
        // Negative IDs will never collide with real Strava IDs (which are positive)
        // Combine timestamp with random component for uniqueness across concurrent requests
        const randomSuffix = crypto.randomInt(0, 1000000);
        const stravaId = BigInt(-1) * BigInt(`${Date.now()}${randomSuffix.toString().padStart(6, '0')}`);

        const activity = await prisma.activity.create({
            data: {
                userId: session.user.id,
                stravaId,
                name: name.trim().substring(0, 200), // Sanitize
                type: activityType as ActivityType,
                startDate: parsedDate,
                distance: parsedDistance * 1000, // km -> meters
                movingTime: parsedDuration * 60,   // min -> seconds
                elapsedTime: parsedDuration * 60,
                averageHr: parsedHr,
                hasHeartrate: parsedHr !== null,

                // HR Zones
                hrZone1Time: hrZones?.z1,
                hrZone2Time: hrZones?.z2,
                hrZone3Time: hrZones?.z3,
                hrZone4Time: hrZones?.z4,
                hrZone5Time: hrZones?.z5,
                hrZone6Time: hrZones?.z6,
                hrZone7Time: hrZones?.z7,

                // Defaults for manual entry
                totalElevation: 0,
            },
        });

        // Convert BigInt for response
        return NextResponse.json({
            ...activity,
            stravaId: activity.stravaId.toString(),
        });

    } catch (error) {
        isError = true;
        return handleError(error);
    } finally {
        const duration = Date.now() - startTime;
        recordMetric('api.activities.post.response_time', duration);
        recordMetric('api.activities.post.error', isError ? 1 : 0);
    }
}

