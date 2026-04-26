import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { upsertDailyHealthLog } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

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

        const measurements = await prisma.bodyMeasurement.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        });

        const formatted = measurements.map((m: any) => ({
            ...m,
            dateStr: toUtcDayKey(m.date)
        }));

        return NextResponse.json({ measurements: formatted }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/body-composition' });
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

        const userId = authUser.id;
        const body = await request.json();
        const { dateStr, weight, bodyFat, muscleMass, chest, waist, hips, arms, thighs } = body;

        if (!dateStr) {
            return errorResponses.badRequest('Missing date (yyyy-mm-dd)');
        }

        const date = parseUtcDayKey(toUtcDayKey(dateStr));

        const record = await prisma.bodyMeasurement.upsert({
            where: {
                userId_date: {
                    userId,
                    date
                }
            },
            update: {
                weight: weight !== undefined ? weight : undefined,
                bodyFat: bodyFat !== undefined ? bodyFat : undefined,
                muscleMass: muscleMass !== undefined ? muscleMass : undefined,
                chest: chest !== undefined ? chest : undefined,
                waist: waist !== undefined ? waist : undefined,
                hips: hips !== undefined ? hips : undefined,
                arms: arms !== undefined ? arms : undefined,
                thighs: thighs !== undefined ? thighs : undefined,
            },
            create: {
                userId,
                date,
                weight,
                bodyFat,
                muscleMass,
                chest,
                waist,
                hips,
                arms,
                thighs
            }
        });

        if (weight !== undefined && weight !== null) {
            await upsertDailyHealthLog({
                db: prisma,
                userId,
                date,
                weight,
                source: 'manual',
            });
        }

        return NextResponse.json({ success: true, record }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/body-composition' });
    }
}
