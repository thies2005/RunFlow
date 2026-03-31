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
            updatedAt: activity.updatedAt.toISOString()
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
