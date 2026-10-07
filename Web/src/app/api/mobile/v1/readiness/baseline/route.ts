import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';
import { serializeBaseline } from '@/lib/readiness/serialization';
import { healthDataConsentWithdrawn, HEALTH_DATA_WITHDRAWN_MESSAGE } from '@/lib/health/consent-gate';

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

        const baseline = await prisma.readinessBaseline.findUnique({
            where: { userId: authUser.id },
        });

        if (!baseline) {
            return NextResponse.json(null, { headers: rateLimitHeaders(rateLimitResult) });
        }

        return NextResponse.json(serializeBaseline(baseline), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(request: NextRequest) {
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

        // Re-ingestion gate for withdrawn HEALTH_DATA consent (p3:
        // HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE): withdrawal deletes the
        // user's readiness baseline, so silently re-upserting it must be
        // refused.
        if (await healthDataConsentWithdrawn(authUser.id)) {
            return errorResponses.badRequest(HEALTH_DATA_WITHDRAWN_MESSAGE);
        }

        const body = await request.json();

        const baseline = await prisma.readinessBaseline.upsert({
            where: { userId: authUser.id },
            create: {
                userId: authUser.id,
                rhrMedian30Day: body.rhrMedian30Day,
                sleepAverage28Day: body.sleepAverage28Day,
                lastUpdated: new Date(),
            },
            update: {
                rhrMedian30Day: body.rhrMedian30Day,
                sleepAverage28Day: body.sleepAverage28Day,
                lastUpdated: new Date(),
            },
        });

        return NextResponse.json(serializeBaseline(baseline), { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
