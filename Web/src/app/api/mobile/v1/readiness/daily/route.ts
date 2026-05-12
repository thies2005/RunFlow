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
        const dateStr = searchParams.get('date');
        if (!dateStr) return errorResponses.badRequest('Missing date');

        const date = parseDateOnly(dateStr);

        const record = await prisma.dailyReadinessRecord.findUnique({
            where: { userId_date: { userId: authUser.id, date } },
        });

        if (!record) {
            return NextResponse.json(null, { headers: rateLimitHeaders(rateLimitResult) });
        }

        return NextResponse.json(serializeDailyRecord(record), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

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
        const { date: dateStr } = body;
        if (!dateStr) return errorResponses.badRequest('Missing date');

        const date = parseDateOnly(dateStr);

        const record = await prisma.dailyReadinessRecord.upsert({
            where: { userId_date: { userId: authUser.id, date } },
            create: {
                userId: authUser.id,
                date,
                compositeScore: body.compositeScore ?? 0,
                state: body.state ?? 'unavailable',
                confidence: body.confidence ?? 'unavailable',
                componentScores: body.componentScores ?? [],
                reasons: body.reasons ?? [],
                rhrJson: body.rhrJson,
                sleepJson: body.sleepJson,
                loadJson: body.loadJson,
                subjectiveJson: body.subjectiveJson,
                overrideJson: body.overrideJson,
                computedAt: body.computedAt ? new Date(body.computedAt) : null,
                syncedAt: new Date(),
                maxHr: body.maxHr,
                restingHr: body.restingHr,
            },
            update: {
                compositeScore: body.compositeScore ?? 0,
                state: body.state ?? 'unavailable',
                confidence: body.confidence ?? 'unavailable',
                componentScores: body.componentScores ?? [],
                reasons: body.reasons ?? [],
                rhrJson: body.rhrJson,
                sleepJson: body.sleepJson,
                loadJson: body.loadJson,
                subjectiveJson: body.subjectiveJson,
                overrideJson: body.overrideJson,
                computedAt: body.computedAt ? new Date(body.computedAt) : null,
                syncedAt: new Date(),
                maxHr: body.maxHr,
                restingHr: body.restingHr,
            },
        });

        return NextResponse.json(serializeDailyRecord(record), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
