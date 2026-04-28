import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { formatUtcDayKey, getCurrentUtcDayKey, parseUtcDayKey, shiftUtcDayKey, toUtcDayKey } from '@/lib/health/dates';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';
import { handleError } from '@/lib/errors/handler';

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

        const userId = authUser.id;

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '1Y';

        const todayDayKey = getCurrentUtcDayKey();
        let cutoffDayKey = todayDayKey;

        switch (range) {
            case '1W':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -7);
                break;
            case '1M':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -30);
                break;
            case '6M':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -183);
                break;
            case '1Y':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -365);
                break;
            case 'ALL':
                cutoffDayKey = '2000-01-01';
                break;
            default:
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -365);
        }

        const cutoffDate = parseUtcDayKey(cutoffDayKey);

        const history = await prisma.dailyHealthLog.findMany({
            where: {
                userId,
                date: {
                    gte: cutoffDate
                }
            },
            select: {
                date: true,
                steps: true,
                weight: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        const formattedHistory = history.map((log: { date: Date; steps: number | null; weight: number | null }) => ({
            ...log,
            dateStr: toUtcDayKey(log.date),
            dateLabel: formatUtcDayKey(toUtcDayKey(log.date), { month: 'short', day: 'numeric' })
        }));

        return NextResponse.json({
            range,
            history: formattedHistory
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleError(error);
    }
}
