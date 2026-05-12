import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';
import { serializeWeeklyRecord, parseDateOnly } from '@/lib/readiness/serialization';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ weekStart: string }> }
) {
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

        const { weekStart } = await params;
        const weekStartDate = parseDateOnly(weekStart);

        const record = await prisma.weeklyReconciliationRecord.findUnique({
            where: { userId_weekStartDate: { userId: authUser.id, weekStartDate } },
        });

        if (!record) {
            return NextResponse.json(null, { headers: rateLimitHeaders(rateLimitResult) });
        }

        return NextResponse.json(serializeWeeklyRecord(record), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
