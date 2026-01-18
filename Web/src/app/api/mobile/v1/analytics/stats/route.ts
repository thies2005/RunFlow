/**
 * Mobile Analytics Stats Endpoint
 * 
 * GET /api/mobile/v1/analytics/stats
 * 
 * Returns training analytics and fitness metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        // Fetch user settings and active goal
        const [userData, activeGoal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: user.id },
                select: { hrMax: true, vdotCorrectionFactor: true, includeCrossTraining: true }
            }),
            prisma.goal.findFirst({
                where: { userId: user.id, isActive: true },
            })
        ]);

        const maxHR = userData?.hrMax || 185;
        const vdotCorrectionFactor = userData?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = userData?.includeCrossTraining ?? true;
        const currentVdot = activeGoal?.currentVdot || null;

        // Fetch activities for last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const activities = await prisma.activity.findMany({
            where: {
                userId: user.id,
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
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
            },
            orderBy: { startDate: 'desc' },
        });

        // Split activities
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

        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHR, vdotCorrectionFactor);
        // Conditionally include cross-training based on user preference
        const marathonShape = AnalyticsService.calculateShape(
            runActivities,
            includeCrossTraining ? crossTrainingActivities : [],
            effectiveVO2max
        );
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
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/analytics/stats'
        });
    }
}
