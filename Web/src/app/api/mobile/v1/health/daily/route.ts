import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { upsertDailyHealthLog, type DailyHealthWeightSource } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';

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
        const dateStr = searchParams.get('date');
        if (!dateStr) return errorResponses.badRequest('Missing date');

        const requestedDayKey = toUtcDayKey(dateStr);
        const date = parseUtcDayKey(requestedDayKey);

        const dailyHealth = await prisma.dailyHealthLog.findUnique({
            where: {
                userId_date: {
                    userId,
                    date
                }
            }
        });

        const userTarget = await prisma.userNutritionTarget.findUnique({
            where: { userId },
            select: { exerciseCalorieSource: true }
        });
        const calorieSource = userTarget?.exerciseCalorieSource || 'strava';

        let exerciseCalories = 0;

        if (calorieSource === 'health_connect') {
            exerciseCalories = dailyHealth?.activeCalories || 0;
        } else {
            const endOfDay = new Date(date);
            endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

            const todayActivities = await prisma.activity.findMany({
                where: {
                    userId,
                    startDate: {
                        gte: date,
                        lt: endOfDay
                    }
                },
                select: { calories: true, movingTime: true, type: true }
            });

            exerciseCalories = todayActivities.reduce((sum, a) => {
                if (a.calories && a.calories > 0) return sum + a.calories;
                if (a.movingTime > 0) return sum + Math.round((a.movingTime / 60) * 7);
                return sum;
            }, 0);
        }

        let effectiveWeightLog = dailyHealth?.weight != null ? dailyHealth : null;
        if (effectiveWeightLog?.weight == null) {
            effectiveWeightLog = await prisma.dailyHealthLog.findFirst({
                where: {
                    userId,
                    weight: { not: null },
                    date: { lte: date }
                },
                orderBy: {
                    date: 'desc'
                }
            });
        }

        const weightMeasurementDate = effectiveWeightLog?.date ? toUtcDayKey(effectiveWeightLog.date) : null;

        const hasStepHistory = !!(await prisma.dailyHealthLog.findFirst({
            where: {
                userId,
                steps: { not: null }
            },
            select: { id: true }
        }));

        const supplementLogs = await prisma.supplementLog.findMany({
            where: {
                date,
                supplement: {
                    userId
                }
            },
            include: { supplement: true }
        });

        const dStrForFood = requestedDayKey;
        const foodLogs = await prisma.nutritionLog.findMany({
            where: {
                userId,
                date: dStrForFood,
            },
            include: { foodItem: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            dailyHealth: dailyHealth
                ? {
                    ...dailyHealth,
                    weight: effectiveWeightLog?.weight ?? null,
                    weightMeasurementDate,
                    isWeightCarriedForward: !!weightMeasurementDate && weightMeasurementDate !== requestedDayKey,
                }
                : {
                    steps: 0,
                    weight: effectiveWeightLog?.weight ?? null,
                    weightMeasurementDate,
                    isWeightCarriedForward: !!weightMeasurementDate && weightMeasurementDate !== requestedDayKey,
                    waterIntake: 0,
                    date,
                },
            exerciseCalories,
            supplementLogs,
            foodLogs,
            meta: {
                hasStepHistory,
                requestedDayKey,
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });
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

        const userId = authUser.id;

        const body = await request.json();
        const { date: dateStr, action } = body;

        if (!dateStr) return errorResponses.badRequest('Missing date');
        const date = parseUtcDayKey(toUtcDayKey(dateStr));

        if (action === 'toggleSupplement') {
            const { supplementId, taken } = body;

            const supp = await prisma.supplement.findUnique({ where: { id: supplementId } });
            if (!supp || supp.userId !== userId) {
                return errorResponses.notFound('Supplement');
            }

            const log = await prisma.supplementLog.upsert({
                where: {
                    supplementId_date: { supplementId, date }
                },
                update: { taken },
                create: { supplementId, date, taken }
            });
            return NextResponse.json(log, { headers: rateLimitHeaders(rateLimitResult) });
        }

        if (action === 'toggleStack') {
            const { stackId, taken } = body;

            const stack = await prisma.supplementStack.findUnique({
                where: { id: stackId },
                include: { supplements: true }
            });

            if (!stack || stack.userId !== userId) {
                return errorResponses.notFound('Stack');
            }

            const dayOfWeek = date.getUTCDay();
            const activeSupplements = stack.supplements.filter(s => {
                const days = s.daysOfWeek as number[] | null | undefined;
                if (s.isActive === false) return false;
                if (!days || days.length === 0) return true;
                return days.includes(dayOfWeek);
            });

            const supplementIds = activeSupplements.map(s => s.id);
            const existingLogs = await prisma.supplementLog.findMany({
                where: {
                    supplementId: { in: supplementIds },
                    date,
                }
            });
            const existingLogMap = new Map(existingLogs.map(l => [l.supplementId, l]));

            const results = [];
            for (const supp of activeSupplements) {
                const existingLog = existingLogMap.get(supp.id);
                if (existingLog) {
                    const log = await prisma.supplementLog.update({
                        where: { id: existingLog.id },
                        data: { taken }
                    });
                    results.push(log);
                } else {
                    const log = await prisma.supplementLog.create({
                        data: { supplementId: supp.id, date, taken }
                    });
                    results.push(log);
                }
            }

            return NextResponse.json(results, { headers: rateLimitHeaders(rateLimitResult) });
        }

        if (action === 'updateHealth') {
            const { steps, weight, activeCalories, source } = body as {
                steps?: number;
                weight?: number;
                activeCalories?: number;
                source?: DailyHealthWeightSource;
            };

            const health = await upsertDailyHealthLog({
                db: prisma,
                userId,
                date,
                source: source || 'manual',
                steps,
                weight,
                activeCalories,
            });
            return NextResponse.json(health, { headers: rateLimitHeaders(rateLimitResult) });
        }

        if (action === 'updateWater') {
            const { amount } = body;

            const existing = await prisma.dailyHealthLog.findUnique({
                where: {
                    userId_date: { userId, date }
                }
            });

            const newAmount = Math.max(0, (existing?.waterIntake || 0) + amount);

            const health = await prisma.dailyHealthLog.upsert({
                where: {
                    userId_date: { userId, date }
                },
                update: {
                    waterIntake: newAmount
                },
                create: {
                    userId,
                    date,
                    waterIntake: newAmount
                }
            });
            return NextResponse.json(health, { headers: rateLimitHeaders(rateLimitResult) });
        }

        return errorResponses.badRequest('Invalid action');

    } catch (error) {
        return handleError(error);
    }
}
