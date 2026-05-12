import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';
import { serializeWeeklyRecord, parseDateOnly } from '@/lib/readiness/serialization';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { weekStartDate: weekStartStr } = body;
        if (!weekStartStr) return errorResponses.badRequest('Missing weekStartDate');

        const weekStartDate = parseDateOnly(weekStartStr);

        const record = await prisma.weeklyReconciliationRecord.upsert({
            where: { userId_weekStartDate: { userId: authUser.id, weekStartDate } },
            create: {
                userId: authUser.id,
                weekStartDate,
                plannedLoad: body.plannedLoad ?? 0,
                actualLoad: body.actualLoad ?? 0,
                adaptedLoad: body.adaptedLoad ?? 0,
                deficitPercent: body.deficitPercent ?? 0,
                surplusPercent: body.surplusPercent ?? 0,
                adjustmentDescription: body.adjustmentDescription,
                isApplied: body.isApplied ?? false,
                raceWeeksRemaining: body.raceWeeksRemaining,
                requiresReview: body.requiresReview ?? false,
                syncedAt: new Date(),
            },
            update: {
                plannedLoad: body.plannedLoad ?? 0,
                actualLoad: body.actualLoad ?? 0,
                adaptedLoad: body.adaptedLoad ?? 0,
                deficitPercent: body.deficitPercent ?? 0,
                surplusPercent: body.surplusPercent ?? 0,
                adjustmentDescription: body.adjustmentDescription,
                isApplied: body.isApplied ?? false,
                raceWeeksRemaining: body.raceWeeksRemaining,
                requiresReview: body.requiresReview ?? false,
                syncedAt: new Date(),
            },
        });

        return NextResponse.json(serializeWeeklyRecord(record), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
