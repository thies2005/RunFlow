import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

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

        // CTL/ATL uses run activities primarily for specificity, or all?
        // Original code used runActivities only. Keeping that behavior.
        const { ctl, atl, tsb, workloadRatio } = AnalyticsService.calculateFitnessMetrics(runActivities);
        const easyTrimp = AnalyticsService.calculateEasyTrimp(runActivities);

        return NextResponse.json({
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
            hrMax: maxHR
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
