import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { startOfWeek, endOfWeek } from 'date-fns';
import { getSyncStatus } from '@/lib/strava/sync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/apiResponse';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // --- PARALLEL DATA FETCHING ---
        // Parse 'date' query param to anchor "current week"
        const url = new URL(req.url);
        const dateParam = url.searchParams.get('date');
        const refDate = dateParam ? new Date(dateParam) : new Date();

        // Check if refDate is valid
        const validRefDate = !isNaN(refDate.getTime()) ? refDate : new Date();

        // 1. User Settings & Active Goals
        const userPromise = prisma.user.findUnique({
            where: { id: userId },
            select: { hrMax: true, vdotCorrectionFactor: true, includeCrossTraining: true }
        });

        const activeGoalsPromise = prisma.goal.findMany({
            where: { userId, isActive: true },
            orderBy: { raceDate: 'asc' },
            include: {
                // Optimized: Fetch workouts only for current week (anchored to client date)
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

        // 2. Recent Activities (Limit 10)
        // Optimized: Select only necessary fields for dashboard list
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

        // 3. Stats Data Source (Last 6 Months)
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
                trimp: true, // M-01: Include stored TRIMP for fitness calculations
                averageHr: true,
                hasHeartrate: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
            },
            orderBy: { startDate: 'desc' },
        });

        // 4. Sync Status
        const syncStatusPromise = getSyncStatus(userId);

        // Execute all promises in parallel
        const [user, goals, recentActivities, statsActivities, syncStatus] = await Promise.all([
            userPromise,
            activeGoalsPromise,
            recentActivitiesPromise,
            statsActivitiesPromise,
            syncStatusPromise
        ]);

        // --- METRIC CALCULATION (Server-Side) ---
        const maxHR = user?.hrMax || 185;
        const vdotCorrectionFactor = user?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = user?.includeCrossTraining ?? true;

        // Split for stats logic
        const runActivities = statsActivities.filter(a => a.type === 'RUN');
        const crossTrainingActivities = statsActivities.filter(a =>
            ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type)
        );

        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHR, vdotCorrectionFactor);
        // Conditionally include cross-training based on user preference
        const marathonShape = AnalyticsService.calculateShape(
            runActivities,
            includeCrossTraining ? crossTrainingActivities : [],
            effectiveVO2max
        );

        // --- Fitness Metrics Logic Updated ---
        // Use cached DailyFitness for accurate long-term values, consistent with Analytics page.
        let ctl = 0;
        let atl = 0;
        let tsb = 0;
        let workloadRatio = 0;
        let maxCtl = 0;
        let maxAtl = 0;

        // Parallel fetch for latest AND max
        const [currentFitness, maxFitnessValues] = await Promise.all([
            ensureFitnessCacheUpToDate(userId),
            prisma.dailyFitness.aggregate({
                where: { userId },
                _max: {
                    ctl: true,
                    atl: true
                }
            })
        ]);

        if (currentFitness) {
            ctl = Math.round(currentFitness.ctl);
            atl = Math.round(currentFitness.atl);
            tsb = Math.round(currentFitness.tsb);
            // Re-calculate ratio from the source values to ensure precision
            workloadRatio = currentFitness.ctl > 0 ? parseFloat((currentFitness.atl / currentFitness.ctl).toFixed(2)) : 0;
        } else {
            // Fallback for brand new users with no history cache yet
            const { ctl: calcCtl, atl: calcAtl, tsb: calcTsb, workloadRatio: calcRatio } = AnalyticsService.calculateFitnessMetrics(runActivities);
            ctl = calcCtl;
            atl = calcAtl;
            tsb = calcTsb;
            workloadRatio = calcRatio;
        }

        // Ensure max values are at least the current values
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

        // Serialize BigInt for recent activities
        const serializedActivities = recentActivities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString()
        }));

        return cachedResponse({
            stats,
            recentActivities: { activities: serializedActivities }, // Match expected format or simplfy? Keeping nested for compatibility
            goals: { goals },
            syncStatus
        }, { maxAge: 60, staleWhileRevalidate: 30 });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
