import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { startOfWeek, endOfWeek } from 'date-fns';
import { getSyncStatus } from '@/lib/strava/sync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

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
        // 1. User Settings & Active Goals
        const userPromise = prisma.user.findUnique({
            where: { id: userId },
            select: { hrMax: true, vdotCorrectionFactor: true }
        });

        const activeGoalsPromise = prisma.goal.findMany({
            where: { userId, isActive: true },
            orderBy: { raceDate: 'asc' },
            include: {
                // Optimized: Fetch workouts only for current week
                workouts: {
                    where: {
                        scheduledDate: {
                            gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
                            lte: endOfWeek(new Date(), { weekStartsOn: 1 }),
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
                name: true,
                startDate: true,
                distance: true,
                movingTime: true,
                averageSpeed: true,
                averageHr: true,
                hasHeartrate: true,
                totalElevation: true,
                trainingType: true,
                trimp: true,
                runningTss: true,
                stravaId: true, // Needed for ID
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

        // Split for stats logic
        const runActivities = statsActivities.filter(a => a.type === 'RUN');
        const crossTrainingActivities = statsActivities.filter(a =>
            ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type)
        );

        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHR, vdotCorrectionFactor);
        const marathonShape = AnalyticsService.calculateShape(runActivities, crossTrainingActivities, effectiveVO2max);
        const { ctl, atl, tsb, workloadRatio } = AnalyticsService.calculateFitnessMetrics(runActivities);
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
            hrMax: maxHR
        };

        // Serialize BigInt for recent activities
        const serializedActivities = recentActivities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString()
        }));

        return NextResponse.json({
            stats,
            recentActivities: { activities: serializedActivities }, // Match expected format or simplfy? Keeping nested for compatibility
            goals: { goals },
            syncStatus
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
