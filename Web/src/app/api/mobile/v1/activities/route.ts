import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { ActivityType } from '@/generated/prisma/browser';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { enrichActivityMetrics, type MetricsInput } from '@/lib/strava/transform';
import { MINUTE_MS } from '@/lib/constants';

type ActivityWhereClause = {
    userId: string;
    type?: ActivityType;
    distance?: { gte: number };
    startDate?: { gte: Date };
};

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.activities);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        const type = searchParams.get('type');

        const where: ActivityWhereClause = { userId: user.id };

        if (type) {
            const validTypes: ActivityType[] = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
            const upperType = type.toUpperCase() as ActivityType;
            if (validTypes.includes(upperType)) {
                where.type = upperType;
            }
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
                    startDate: true,
                    distance: true,
                    movingTime: true,
                    averageSpeed: true,
                    averageHr: true,
                    maxHr: true,
                    averageCadence: true,
                    hasHeartrate: true,
                    totalElevation: true,
                    trimp: true,
                    runningTss: true,
                    estimatedVdot: true,
                    trainingType: true,
                },
            }),
            prisma.activity.count({ where }),
        ]);

        const serialized = activities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString(),
            startDate: a.startDate.toISOString()
        }));

        return NextResponse.json({
            activities: serialized,
            total,
            limit,
            offset,
            hasMore: offset + activities.length < total
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/activities'
        });
    }
}

const streamsSchema = z.object({
    time: z.array(z.number()).optional(),
    latlng: z.array(z.tuple([z.number(), z.number()])).optional(),
    altitude: z.array(z.number()).optional(),
    heartrate: z.array(z.number()).optional(),
    cadence: z.array(z.number()).optional(),
    velocity_smooth: z.array(z.number()).optional(),
}).optional();

const createActivitySchema = z.object({
    name: z.string().min(1).max(200),
    type: z.enum(['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER']),
    startDate: z.string().datetime(),
    distance: z.number().min(0),
    movingTime: z.number().int().min(0),
    elapsedTime: z.number().int().min(0),
    averageSpeed: z.number().optional(),
    maxSpeed: z.number().optional(),
    averageHr: z.number().optional(),
    maxHr: z.number().int().optional(),
    averageCadence: z.number().optional(),
    hasHeartrate: z.boolean().optional().default(false),
    totalElevation: z.number().optional(),
    calories: z.number().optional(),
    trainingType: z.enum(['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE', 'OTHER']).optional(),
    streams: streamsSchema,
    hrZone1Time: z.number().int().optional(),
    hrZone2Time: z.number().int().optional(),
    hrZone3Time: z.number().int().optional(),
    hrZone4Time: z.number().int().optional(),
    hrZone5Time: z.number().int().optional(),
    hrZone6Time: z.number().int().optional(),
    hrZone7Time: z.number().int().optional(),
});

const VALID_ACTIVITY_TYPES: ActivityType[] = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];

const STRAVA_TYPE_MAP: Record<string, string> = {
    'RUN': 'Run',
    'RIDE': 'Ride',
    'VIRTUAL_RIDE': 'VirtualRide',
    'WALK': 'Walk',
    'HIKE': 'Hike',
    'SWIM': 'Swim',
    'WORKOUT': 'Workout',
    'OTHER': 'Workout',
};

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.activities);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const parsed = createActivitySchema.safeParse(body);

        if (!parsed.success) {
            return errorResponses.validation('Invalid request body', parsed.error.flatten());
        }

        const data = parsed.data;
        const startDate = new Date(data.startDate);
        const activityType = data.type as ActivityType;

        if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
            return errorResponses.validation('Invalid activity type');
        }

        const fiveMinutes = 5 * MINUTE_MS;
        const existingActivity = await prisma.activity.findFirst({
            where: {
                userId: user.id,
                type: activityType,
                startDate: {
                    gte: new Date(startDate.getTime() - fiveMinutes),
                    lte: new Date(startDate.getTime() + fiveMinutes),
                },
            },
        });

        if (existingActivity) {
            return NextResponse.json({
                activity: {
                    ...existingActivity,
                    stravaId: existingActivity.stravaId.toString(),
                    startDate: existingActivity.startDate.toISOString(),
                },
                duplicate: true,
            });
        }

        const randomSuffix = crypto.randomInt(0, 1000000);
        const stravaId = BigInt(-1) * BigInt(`${Date.now()}${randomSuffix.toString().padStart(6, '0')}`);

        const createData = {
            userId: user.id,
            stravaId,
            name: data.name.trim().substring(0, 200),
            type: activityType,
            startDate,
            distance: data.distance,
            movingTime: data.movingTime,
            elapsedTime: data.elapsedTime,
            averageSpeed: data.averageSpeed ?? null,
            maxSpeed: data.maxSpeed ?? null,
            averageHr: data.averageHr ?? null,
            maxHr: data.maxHr ?? null,
            averageCadence: data.averageCadence ?? null,
            hasHeartrate: data.hasHeartrate ?? false,
            totalElevation: data.totalElevation ?? null,
            calories: data.calories ?? null,
            trainingType: data.trainingType ?? null,
            streams: data.streams ?? undefined,
            hrZone1Time: data.hrZone1Time ?? null,
            hrZone2Time: data.hrZone2Time ?? null,
            hrZone3Time: data.hrZone3Time ?? null,
            hrZone4Time: data.hrZone4Time ?? null,
            hrZone5Time: data.hrZone5Time ?? null,
            hrZone6Time: data.hrZone6Time ?? null,
            hrZone7Time: data.hrZone7Time ?? null,
        };

        const activity = await prisma.activity.create({ data: createData });

        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    hrMax: true,
                    hrRest: true,
                    sex: true,
                    weight: true,
                    birthDate: true,
                    hrZone1Max: true,
                    hrZone2Max: true,
                    hrZone3Max: true,
                    hrZone4Max: true,
                    hrZone5Max: true,
                    hrZone6Max: true,
                },
            });

            if (dbUser) {
                const stravaType = STRAVA_TYPE_MAP[data.type] ?? 'Workout';
                const metricsInput: MetricsInput = {
                    activity: {
                        moving_time: data.movingTime,
                        distance: data.distance,
                        average_speed: data.averageSpeed ?? 0,
                        type: stravaType,
                        has_heartrate: data.hasHeartrate ?? false,
                        average_heartrate: data.averageHr ?? null,
                        calories: data.calories ?? null,
                    } as MetricsInput['activity'],
                    user: {
                        hrMax: dbUser.hrMax,
                        hrRest: dbUser.hrRest,
                        sex: dbUser.sex,
                        weight: dbUser.weight,
                        birthDate: dbUser.birthDate,
                        hrZone1Max: dbUser.hrZone1Max,
                        hrZone2Max: dbUser.hrZone2Max,
                        hrZone3Max: dbUser.hrZone3Max,
                        hrZone4Max: dbUser.hrZone4Max,
                        hrZone5Max: dbUser.hrZone5Max,
                        hrZone6Max: dbUser.hrZone6Max,
                    },
                    currentHrMax: dbUser.hrMax,
                    streams: data.streams
                        ? { time: data.streams.time ?? [], heartrate: data.streams.heartrate, velocity_smooth: data.streams.velocity_smooth, altitude: data.streams.altitude, cadence: data.streams.cadence }
                        : null,
                };

                const metrics = enrichActivityMetrics(metricsInput);

                await prisma.activity.update({
                    where: { id: activity.id },
                    data: {
                        trimp: metrics.trimp,
                        runningTss: metrics.runningTss,
                        estimatedVdot: metrics.estimatedVdot,
                        calories: metrics.calculatedCalories,
                        hrZone1Time: data.hrZone1Time ?? (metrics.zoneTimes.z1 || null),
                        hrZone2Time: data.hrZone2Time ?? (metrics.zoneTimes.z2 || null),
                        hrZone3Time: data.hrZone3Time ?? (metrics.zoneTimes.z3 || null),
                        hrZone4Time: data.hrZone4Time ?? (metrics.zoneTimes.z4 || null),
                        hrZone5Time: data.hrZone5Time ?? (metrics.zoneTimes.z5 || null),
                        hrZone6Time: data.hrZone6Time ?? (metrics.zoneTimes.z6 || null),
                        hrZone7Time: data.hrZone7Time ?? (metrics.zoneTimes.z7 || null),
                    },
                });
            }
        } catch {
        }

        const enriched = await prisma.activity.findUnique({
            where: { id: activity.id },
        });

        const serialized = enriched
            ? { ...enriched, stravaId: enriched.stravaId.toString(), startDate: enriched.startDate.toISOString() }
            : { ...activity, stravaId: activity.stravaId.toString(), startDate: activity.startDate.toISOString() };

        return NextResponse.json({ activity: serialized }, { status: 201 });

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/activities' });
    }
}
