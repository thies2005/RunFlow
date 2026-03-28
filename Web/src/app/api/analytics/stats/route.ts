import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { getActivityContribution } from '@/lib/metrics/fitness';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { cachedResponse } from '@/lib/api/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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

        // 1. Fetch User Settings & Active Goal
        const [user, activeGoal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { hrMax: true, vdotCorrectionFactor: true, includeCrossTraining: true }
            }),
            prisma.goal.findFirst({
                where: { userId, isActive: true },
            })
        ]);

        const maxHR = user?.hrMax || 185;
        const vdotCorrectionFactor = user?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = user?.includeCrossTraining ?? true;
        const currentVdot = activeGoal?.currentVdot || null;
        // The original code used marathonShapeFactor as 'calibrationFactor' passed to VO2max calc.
        // We will pass 1.0 to raw calculation and handle correction separately as per service.

        // 2. Fetch Data (Optimized Selection)
        // We need 6 months for Shape, but simpler metrics might need less.
        // fetching 6 months is fine for now, but we select only needed fields.
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const activities = await prisma.activity.findMany({
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

        // 3. Split activities efficiently in single pass (O(n) instead of O(2n))
        const runActivities: typeof activities = [];
        const crossTrainingActivities: typeof activities = [];
        const crossTrainingTypes = new Set(['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT']);

        for (const activity of activities) {
            if (activity.type === 'RUN') {
                runActivities.push(activity);
            } else if (crossTrainingTypes.has(activity.type)) {
                crossTrainingActivities.push(activity);
            }
        }

        // 4. Compute Metrics via Service
        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHR, vdotCorrectionFactor);
        // Conditionally include cross-training based on user preference
        const marathonShape = AnalyticsService.calculateShape(
            runActivities,
            includeCrossTraining ? crossTrainingActivities : [],
            effectiveVO2max
        );

        // --- Fitness Metrics Logic Updated ---
        // Instead of calculating on the fly (which misses long-term history and causes divergence),
        // we fetch the latest cached "DailyFitness" record which is the source of truth for the graph.

        let ctl = 0;
        let atl = 0;
        let tsb = 0;
        let workloadRatio = 0;
        let maxCtl = 0;
        let maxAtl = 0;

        // Fetch latest fitness AND historical maximums in parallel
        const [latestFitness, maxFitnessValues] = await Promise.all([
            prisma.dailyFitness.findFirst({
                where: { userId },
                orderBy: { date: 'desc' }
            }),
            prisma.dailyFitness.aggregate({
                where: { userId },
                _max: {
                    ctl: true,
                    atl: true
                }
            })
        ]);

        if (latestFitness) {
            ctl = Math.round(latestFitness.ctl);
            atl = Math.round(latestFitness.atl);
            tsb = Math.round(latestFitness.tsb);
            // Re-calculate ratio from the source values to ensure precision
            workloadRatio = latestFitness.ctl > 0 ? parseFloat((latestFitness.atl / latestFitness.ctl).toFixed(2)) : 0;
        } else {
            // Fallback for brand new users with no history cache yet: Calculate on fly
            // This generally only happens before the first graph load
            const fitnessActivities = activities.filter(a => getActivityContribution(a.type).contributesToCtl);
            const metrics = AnalyticsService.calculateFitnessMetrics(fitnessActivities);
            ctl = metrics.ctl;
            atl = metrics.atl;
            tsb = metrics.tsb;
            workloadRatio = metrics.workloadRatio;
        }

        // Ensure max values are at least the current values
        maxCtl = Math.max(Math.round(maxFitnessValues._max.ctl || 0), ctl);
        maxAtl = Math.max(Math.round(maxFitnessValues._max.atl || 0), atl);

        const easyTrimp = AnalyticsService.calculateEasyTrimp(runActivities);

        return cachedResponse({
            currentWeekMileage,
            effectiveVO2max,
            rawVO2max,
            vdotCorrectionFactor,
            marathonShape,
            currentVdot,
            ctl,
            atl,
            tsb,
            workloadRatio,
            easyTrimp,
            hrMax: maxHR,
            maxCtl,
            maxAtl
        }, { maxAge: 300, staleWhileRevalidate: 60 });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
