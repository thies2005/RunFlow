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
import { ActivityType } from '@prisma/client';

// Rate limit for external API: 100 requests per minute
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external' };

// CORS headers for external access
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, EXTERNAL_API_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests', code: 'RATE_LIMITED' },
                { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
            );
        }

        // Authenticate via API key
        const authResult = await getExternalApiUser(request);
        if (!authResult) {
            return NextResponse.json(
                { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
                { status: 401, headers: corsHeaders }
            );
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

        return NextResponse.json(
            {
                activities,
                pagination: {
                    offset,
                    limit,
                    total,
                    hasMore: offset + activities.length < total,
                },
            },
            { headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
        );
    } catch (error) {
        console.error('External API activities error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500, headers: corsHeaders }
        );
    }
}
