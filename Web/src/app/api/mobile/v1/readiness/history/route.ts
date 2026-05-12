import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';
import { serializeDailyRecord, parseDateOnly } from '@/lib/readiness/serialization';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const startStr = searchParams.get('start');
        const endStr = searchParams.get('end');
        if (!startStr || !endStr) return errorResponses.badRequest('Missing start or end');

        const startDate = parseDateOnly(startStr);
        const endDate = parseDateOnly(endStr);

        const records = await prisma.dailyReadinessRecord.findMany({
            where: {
                userId: authUser.id,
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json(
            records.map(serializeDailyRecord),
            { headers: rateLimitHeaders(rateLimitResult) }
        );
    } catch (error) {
        return handleError(error);
    }
}
