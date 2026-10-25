/**
 * Mobile Activity Detail Endpoint
 * 
 * GET /api/mobile/v1/activities/[id]
 * 
 * Returns full activity details including streams data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const activity = await prisma.activity.findFirst({
            where: {
                id,
                userId: user.id
            }
        });

        if (!activity) {
            return errorResponses.notFound('Activity');
        }

        // Serialize
        const serialized = {
            ...activity,
            stravaId: activity.stravaId.toString(),
            startDate: activity.startDate.toISOString(),
            createdAt: activity.createdAt.toISOString(),
            updatedAt: activity.updatedAt.toISOString(),
            averageWatts: activity.averageWatts ?? null,
            weightedAverageWatts: activity.weightedAverageWatts ?? null,
            deviceWatts: activity.deviceWatts ?? false,
            maxWatts: activity.maxWatts ?? null,
            kilojoules: activity.kilojoules ?? null,
            npWatts: activity.npWatts ?? null,
            intensityFactor: activity.intensityFactor ?? null,
            variabilityIndex: activity.variabilityIndex ?? null,
            bikeTss: activity.bikeTss ?? null,
            efficiencyFactor: activity.efficiencyFactor ?? null,
            aerobicDecoupling: activity.aerobicDecoupling ?? null,
            powerZone1Time: activity.powerZone1Time ?? null,
            powerZone2Time: activity.powerZone2Time ?? null,
            powerZone3Time: activity.powerZone3Time ?? null,
            powerZone4Time: activity.powerZone4Time ?? null,
            powerZone5Time: activity.powerZone5Time ?? null,
            powerZone6Time: activity.powerZone6Time ?? null,
            powerZone7Time: activity.powerZone7Time ?? null,
        };

        return NextResponse.json({
            activity: serialized
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/activities/${id}`
        });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const { name, type, trainingType, averageWatts, maxWatts, npWatts, bikeTss } = body;

        const VALID_ACTIVITY_TYPES = new Set(['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER']);
        const VALID_WORKOUT_TYPES = new Set([
            'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS', 'RECOVERY', 'RACE',
            'REST', 'CROSS_TRAIN', 'RIDE', 'SWIM', 'STRENGTH', 'OTHER', 'BRICK', 'OPEN_WATER_SWIM',
            'LONG_RIDE', 'RIDE_INTERVALS', 'SWIM_DRILL', 'TRANSITION_PRACTICE', 'DOUBLE_DAY'
        ]);
        const isValidBoundedNum = (v: unknown, max: number) =>
            v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max);

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 200)) {
            return errorResponses.badRequest('Activity name must be a non-empty string up to 200 characters');
        }
        if (type !== undefined && (typeof type !== 'string' || !VALID_ACTIVITY_TYPES.has(type))) {
            return errorResponses.badRequest('Invalid activity type');
        }
        if (trainingType !== undefined && trainingType !== null && (typeof trainingType !== 'string' || !VALID_WORKOUT_TYPES.has(trainingType))) {
            return errorResponses.badRequest('Invalid trainingType');
        }
        if (averageWatts !== undefined && !isValidBoundedNum(averageWatts, 2500)) {
            return errorResponses.badRequest('averageWatts must be between 0 and 2500');
        }
        if (maxWatts !== undefined && !isValidBoundedNum(maxWatts, 5000)) {
            return errorResponses.badRequest('maxWatts must be between 0 and 5000');
        }
        if (npWatts !== undefined && !isValidBoundedNum(npWatts, 2500)) {
            return errorResponses.badRequest('npWatts must be between 0 and 2500');
        }
        if (bikeTss !== undefined && !isValidBoundedNum(bikeTss, 2000)) {
            return errorResponses.badRequest('bikeTss must be between 0 and 2000');
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name.trim();
        if (type !== undefined) data.type = type;
        if (trainingType !== undefined) data.trainingType = trainingType;
        if (averageWatts !== undefined) data.averageWatts = averageWatts;
        if (maxWatts !== undefined) data.maxWatts = maxWatts;
        if (npWatts !== undefined) data.npWatts = npWatts;
        if (bikeTss !== undefined) data.bikeTss = bikeTss;

        if (Object.keys(data).length === 0) {
            return errorResponses.badRequest('No fields to update');
        }

        const existing = await prisma.activity.findFirst({
            where: { id, userId: user.id }
        });

        if (!existing) {
            return errorResponses.notFound('Activity');
        }

        const activity = await prisma.activity.update({
            where: { id },
            data,
        });

        const serialized = {
            ...activity,
            stravaId: activity.stravaId.toString(),
            startDate: activity.startDate.toISOString(),
            createdAt: activity.createdAt.toISOString(),
            updatedAt: activity.updatedAt.toISOString(),
            averageWatts: activity.averageWatts ?? null,
            weightedAverageWatts: activity.weightedAverageWatts ?? null,
            deviceWatts: activity.deviceWatts ?? false,
            maxWatts: activity.maxWatts ?? null,
            kilojoules: activity.kilojoules ?? null,
            npWatts: activity.npWatts ?? null,
            intensityFactor: activity.intensityFactor ?? null,
            variabilityIndex: activity.variabilityIndex ?? null,
            bikeTss: activity.bikeTss ?? null,
            efficiencyFactor: activity.efficiencyFactor ?? null,
            aerobicDecoupling: activity.aerobicDecoupling ?? null,
            powerZone1Time: activity.powerZone1Time ?? null,
            powerZone2Time: activity.powerZone2Time ?? null,
            powerZone3Time: activity.powerZone3Time ?? null,
            powerZone4Time: activity.powerZone4Time ?? null,
            powerZone5Time: activity.powerZone5Time ?? null,
            powerZone6Time: activity.powerZone6Time ?? null,
            powerZone7Time: activity.powerZone7Time ?? null,
        };

        return NextResponse.json({
            activity: serialized
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/activities/${id}`
        });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const existing = await prisma.activity.findFirst({
            where: { id, userId: user.id },
            select: { id: true },
        });

        if (!existing) {
            return errorResponses.notFound('Activity');
        }

        await prisma.activity.delete({
            where: { id },
        });

        return NextResponse.json(
            { success: true },
            { headers: rateLimitHeaders(rateLimitResult) }
        );
    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/activities/${id}`
        });
    }
}
