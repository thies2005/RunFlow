/**
 * Mobile Activities List Endpoint
 *
 * GET /api/mobile/v1/activities
 *
 * Returns paginated list of user activities.
 * Query params: limit, offset, type
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { ActivityType } from '@prisma/client';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

type ActivityWhereClause = {
    userId: string;
    type?: ActivityType;
    distance?: { gte: number };
    startDate?: { gte: Date };
};

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.activities);

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

        // Serialize
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
