/**
 * External API - Activities Endpoint
 * 
 * GET /api/external/v1/activities
 * 
 * Read-only access to user activities for external AI assistants.
 * Requires API key authentication via Bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getExternalApiUser } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';
import { validateOrigin, setCorsHeaders } from '@/lib/security/cors';
import { ActivityType } from '@prisma/client';

// Rate limit for external API: 100 requests per minute
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external' };

export async function OPTIONS(request: NextRequest) {
    if (!validateOrigin(request)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(request, response.headers);
    return response;
}

export async function GET(request: NextRequest) {
    try {
        if (!validateOrigin(request)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, EXTERNAL_API_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests', code: 'RATE_LIMITED' },
                { status: 429 }
            );
            setCorsHeaders(request, response.headers);
            Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

        // Authenticate via API key
        const authResult = await getExternalApiUser(request);
        if (!authResult) {
            const response = NextResponse.json(
                { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
                { status: 401 }
            );
            setCorsHeaders(request, response.headers);
            return response;
        }

        const { userId } = authResult;
        const { searchParams } = new URL(request.url);

        // Pagination
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        // Optional filters
        const type = searchParams.get('type')?.toUpperCase() as ActivityType | undefined;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build where clause
        const where: any = { userId };

        if (type) {
            const validTypes: ActivityType[] = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
            if (validTypes.includes(type)) {
                where.type = type;
            }
        }

        if (startDate) {
            where.startDate = { ...where.startDate, gte: new Date(startDate) };
        }
        if (endDate) {
            where.startDate = { ...where.startDate, lte: new Date(endDate) };
        }

        // Fetch activities
        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where,
                orderBy: { startDate: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    type: true,
                    sportType: true,
                    name: true,
                    description: true,
                    startDate: true,
                    timezone: true,
                    distance: true,
                    movingTime: true,
                    elapsedTime: true,
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
                },
            }),
            prisma.activity.count({ where }),
        ]);

        const response = NextResponse.json(
            {
                activities,
                pagination: {
                    offset,
                    limit,
                    total,
                    hasMore: offset + activities.length < total,
                },
            }
        );
        setCorsHeaders(request, response.headers);
        Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    } catch (error) {
        console.error('External API activities error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
        setCorsHeaders(request, response.headers);
        return response;
    }
}
