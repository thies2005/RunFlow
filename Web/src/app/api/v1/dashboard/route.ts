import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { startOfWeek, endOfWeek } from 'date-fns';
import { getSyncStatus } from '@/lib/strava/sync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';
import { setApiVersionHeaders } from '@/lib/api/version';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;

        const url = new URL(req.url);
        const dateParam = url.searchParams.get('date');
        const refDate = dateParam ? new Date(dateParam) : new Date();

        const validRefDate = !isNaN(refDate.getTime()) ? refDate : new Date();

        const userPromise = prisma.user.findUnique({
            where: { id: userId },
            select: { hrMax: true, vdotCorrectionFactor: true, includeCrossTraining: true }
        });

        const activeGoalsPromise = prisma.goal.findMany({
            where: { userId, isActive: true },
            orderBy: { raceDate: 'asc' },
            include: {
                workouts: {
                    where: {
                        scheduledDate: {
                            gte: startOfWeek(validRefDate, { weekStartsOn: 1 }),
                            lte: endOfWeek(validRefDate, { weekStartsOn: 1 }),
                        }
                    },
                    orderBy: { scheduledDate: 'asc' }
                }
            }
        });

        const recentActivitiesPromise = prisma.activity.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
            take: 10,
            select: {
                id: true,
                type: true,
                sportType: true,
                name: true,
                description: true,
                startDate: true,
                distance: true,
                movingTime: true,
                averageSpeed: true,
                maxSpeed: true,
                gradeAdjustedSpeed: true,
                averageHr: true,
                maxHr: true,
                averageCadence: true,
                hasHeartrate: true,
                totalElevation: true,
                elevHigh: true,
                elevLow: true,
                calories: true,
                trimp: true,
                runningTss: true,
                estimatedVdot: true,
                trainingType: true,
                stravaId: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
            }
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
        const statsActivitiesPromise = prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true,
                averageHr: true,
                hasHeartrate: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
            },
            orderBy: { startDate: 'desc' },
        });

        const syncStatusPromise = getSyncStatus(userId);

        const [user, goals, recentActivities, statsActivities, syncStatus] = await Promise.all([
            userPromise,
            activeGoalsPromise,
            recentActivitiesPromise,
            statsActivitiesPromise,
            syncStatusPromise
        ]);

        const maxHR = user?.hrMax || 185;
        const vdotCorrectionFactor = user?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = user?.includeCrossTraining ?? true;

        const runActivities = statsActivities.filter(a => a.type === 'RUN');
        const crossTrainingActivities = statsActivities.filter(a =>
            ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type)
        );

        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHR, vdotCorrectionFactor);
        const marathonShape = AnalyticsService.calculateShape(
            runActivities,
            includeCrossTraining ? crossTrainingActivities : [],
            effectiveVO2max
        );

        let ctl = 0;
        let atl = 0;
        let tsb = 0;
        let workloadRatio = 0;
        let maxCtl = 0;
        let maxAtl = 0;

        const currentFitness = await ensureFitnessCacheUpToDate(userId);

        const maxFitnessValues = await prisma.dailyFitness.aggregate({
            where: { userId },
            _max: {
                ctl: true,
                atl: true
            }
        });

        if (currentFitness) {
            ctl = Math.round(currentFitness.ctl);
            atl = Math.round(currentFitness.atl);
            tsb = Math.round(currentFitness.tsb);
            workloadRatio = currentFitness.ctl > 0 ? parseFloat((currentFitness.atl / currentFitness.ctl).toFixed(2)) : 0;
        } else {
            const { ctl: calcCtl, atl: calcAtl, tsb: calcTsb, workloadRatio: calcRatio } = AnalyticsService.calculateFitnessMetrics(runActivities);
            ctl = calcCtl;
            atl = calcAtl;
            tsb = calcTsb;
            workloadRatio = calcRatio;
        }

        maxCtl = Math.max(Math.round(maxFitnessValues._max.ctl || 0), ctl);
        maxAtl = Math.max(Math.round(maxFitnessValues._max.atl || 0), atl);

        const easyTrimp = AnalyticsService.calculateEasyTrimp(runActivities);

        const stats = {
            currentWeekMileage,
            effectiveVO2max,
            rawVO2max,
            vdotCorrectionFactor,
            marathonShape,
            currentVdot: goals[0]?.currentVdot || null,
            ctl,
            atl,
            tsb,
            workloadRatio,
            easyTrimp,
            hrMax: maxHR,
            maxCtl,
            maxAtl
        };

        const serializedActivities = recentActivities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString()
        }));

        const response = cachedResponse({
            stats,
            recentActivities: { activities: serializedActivities },
            goals: { goals },
            syncStatus
        }, { maxAge: 60, staleWhileRevalidate: 30 });
        setApiVersionHeaders(response.headers);
        return response;

    } catch (error) {
        console.error('Dashboard API Error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
