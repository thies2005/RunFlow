import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { getCyclingAnalytics } from '@/lib/metrics/cyclingAnalytics';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const rawRange = request.nextUrl.searchParams.get('range') || '90d';
        const allowedRanges = ['42d', '90d', '180d', '365d', 'all'];
        const range = allowedRanges.includes(rawRange.toLowerCase()) ? rawRange.toLowerCase() : '90d';
        const analytics = await getCyclingAnalytics(user.id, range);

        return NextResponse.json(analytics, {
            headers: rateLimitHeaders(rateLimitResult),
        });
    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/analytics/cycling',
        });
    }
}
