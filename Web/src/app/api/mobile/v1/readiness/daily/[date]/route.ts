import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';
import { serializeDailyRecord, parseDateOnly } from '@/lib/readiness/serialization';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ date: string }> }
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

        const { date: dateStr } = await params;
        const date = parseDateOnly(dateStr);

        const existing = await prisma.dailyReadinessRecord.findUnique({
            where: { userId_date: { userId: authUser.id, date } },
        });

        if (!existing) {
            return errorResponses.notFound('DailyReadinessRecord');
        }

        const body = await request.json();

        const record = await prisma.dailyReadinessRecord.update({
            where: { id: existing.id },
            data: {
                overrideJson: body.overrideJson,
                syncedAt: new Date(),
            },
        });

        return NextResponse.json(serializeDailyRecord(record), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
