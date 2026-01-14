
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        // Parse params
        const searchParams = request.nextUrl.searchParams;
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        if (!startDateParam || !endDateParam) {
            return errorResponses.badRequest('startDate and endDate are required');
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return errorResponses.badRequest('Invalid date format');
        }

        // Fetch data with 90 days buffer for accurate ATL/CTL calculation
        // CTL (fitness) has a time constant of 42 days, so 90 days (~2x) is sufficient for stabilization
        const bufferDays = 90;
        const fetchStartDate = new Date(startDate);
        fetchStartDate.setDate(fetchStartDate.getDate() - bufferDays);

        const activities = await prisma.activity.findMany({
            where: {
                userId: user.id,
                startDate: {
                    gte: fetchStartDate,
                    lte: endDate
                }
            },
            select: {
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true,
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        // Calculate history
        const history = AnalyticsService.calculateHistory(
            activities,
            startDate,
            endDate
        );

        return NextResponse.json(history, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/analytics/history'
        });
    }
}
