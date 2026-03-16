import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { upsertDailyHealthLog, type DailyHealthWeightSource } from '@/lib/health/dailyHealth';
import { parseUtcDayKey, toUtcDayKey } from '@/lib/health/dates';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // e.g. ?date=2023-10-01
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

        const requestedDayKey = toUtcDayKey(dateStr);
        const date = parseUtcDayKey(requestedDayKey);

        const dailyHealth = await prisma.dailyHealthLog.findUnique({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date
                }
            }
        });

        // Determine the exercise calorie source preference
        const userTarget = await prisma.userNutritionTarget.findUnique({
            where: { userId: session.user.id },
            select: { exerciseCalorieSource: true }
        });
        const calorieSource = userTarget?.exerciseCalorieSource || 'strava';

        let exerciseCalories = 0;

        if (calorieSource === 'health_connect') {
            // Use active calories from Health Connect (synced to DailyHealthLog)
            exerciseCalories = dailyHealth?.activeCalories || 0;
        } else {
            // Use Strava activity calories (default)
            const endOfDay = new Date(date);
            endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

            const todayActivities = await prisma.activity.findMany({
                where: {
                    userId: session.user.id,
                    startDate: {
                        gte: date,
                        lt: endOfDay
                    }
                },
                select: { calories: true, movingTime: true, type: true }
            });

            // Sum calories, using a fallback estimation for activities without calorie data
            exerciseCalories = todayActivities.reduce((sum, a) => {
                if (a.calories && a.calories > 0) return sum + a.calories;
                // Fallback: estimate ~7 kcal/min for moderate exercise if Strava didn't provide calories
                if (a.movingTime > 0) return sum + Math.round((a.movingTime / 60) * 7);
                return sum;
            }, 0);
        }

        // Get the latest weight if not in dailyHealth
        let effectiveWeightLog = dailyHealth?.weight != null ? dailyHealth : null;
        if (effectiveWeightLog?.weight == null) {
            effectiveWeightLog = await prisma.dailyHealthLog.findFirst({
                where: {
                    userId: session.user.id,
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
                userId: session.user.id,
                steps: { not: null }
            },
            select: { id: true }
        }));

        // Get supplement logs for this date (for this user's supplements)
        const supplementLogs = await prisma.supplementLog.findMany({
            where: {
                date,
                supplement: {
                    userId: session.user.id
                }
            },
            include: { supplement: true }
        });

        // Get nutrition logs for this date (using the string date formatted as yyyy-MM-dd)
        const dStrForFood = requestedDayKey;
        const foodLogs = await prisma.nutritionLog.findMany({
            where: {
                userId: session.user.id,
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
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date: dateStr, action } = body;

        if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 });
        const date = parseUtcDayKey(toUtcDayKey(dateStr));

        // Action routing based on requested operation
        if (action === 'toggleSupplement') {
            const { supplementId, taken } = body;

            // Verify ownership
            const supp = await prisma.supplement.findUnique({ where: { id: supplementId } });
            if (!supp || supp.userId !== session.user.id) {
                return NextResponse.json({ error: 'Supplement not found' }, { status: 404 });
            }

            const log = await prisma.supplementLog.upsert({
                where: {
                    supplementId_date: { supplementId, date }
                },
                update: { taken },
                create: { supplementId, date, taken }
            });
            return NextResponse.json(log);
        }

        if (action === 'toggleStack') {
            const { stackId, taken } = body;

            // Verify ownership
            const stack = await prisma.supplementStack.findUnique({
                where: { id: stackId },
                include: { supplements: true }
            });

            if (!stack || stack.userId !== session.user.id) {
                return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
            }

            const dayOfWeek = date.getUTCDay();
            const activeSupplements = stack.supplements.filter(s => {
                const days = s.daysOfWeek as number[] | null | undefined;
                if (s.isActive === false) return false;
                if (!days || days.length === 0) return true;
                return days.includes(dayOfWeek);
            });

            // Upsert logs for all active supplements in the stack
            const results = [];
            for (const supp of activeSupplements) {
                const log = await prisma.supplementLog.upsert({
                    where: {
                        supplementId_date: { supplementId: supp.id, date }
                    },
                    update: { taken },
                    create: { supplementId: supp.id, date, taken }
                });
                results.push(log);
            }

            return NextResponse.json(results);
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
                userId: session.user.id,
                date,
                source: source || 'manual',
                steps,
                weight,
                activeCalories,
            });
            return NextResponse.json(health);
        }

        if (action === 'updateWater') {
            const { amount } = body; // Can be + or -

            const existing = await prisma.dailyHealthLog.findUnique({
                where: {
                    userId_date: { userId: session.user.id, date }
                }
            });

            const newAmount = Math.max(0, (existing?.waterIntake || 0) + amount);

            const health = await prisma.dailyHealthLog.upsert({
                where: {
                    userId_date: { userId: session.user.id, date }
                },
                update: {
                    waterIntake: newAmount
                },
                create: {
                    userId: session.user.id,
                    date,
                    waterIntake: newAmount
                }
            });
            return NextResponse.json(health);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return handleError(error);
    }
}
