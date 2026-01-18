/**
 * Mobile Dashboard Endpoint
 * 
 * GET /api/mobile/v1/dashboard
 * 
 * Returns combined dashboard data optimized for mobile:
 * - Training stats (VO2max, CTL, ATL, TSB, etc.)
 * - Recent activities (last 10)
 * - Active goals with current week workouts
 * - Sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { startOfWeek, endOfWeek } from 'date-fns';
import { getSyncStatus } from '@/lib/strava/sync';
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

        // Authenticate user (supports both session and JWT)
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const userId = user.id;

        // Parallel data fetching
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
                            gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
                            lte: endOfWeek(new Date(), { weekStartsOn: 1 }),
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
                stravaId: true,
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
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
            },
            orderBy: { startDate: 'desc' },
        });

        const syncStatusPromise = getSyncStatus(userId);

        const [userData, goals, recentActivities, statsActivities, syncStatus] = await Promise.all([
            userPromise,
            activeGoalsPromise,
            recentActivitiesPromise,
            statsActivitiesPromise,
            syncStatusPromise
        ]);

        // Calculate metrics
        const maxHR = userData?.hrMax || 185;
        const vdotCorrectionFactor = userData?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = userData?.includeCrossTraining ?? true;

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
        const { ctl, atl, tsb, workloadRatio } = AnalyticsService.calculateFitnessMetrics(runActivities);
        const easyTrimp = AnalyticsService.calculateEasyTrimp(runActivities);

        // Serialize BigInt for activities
        const serializedActivities = recentActivities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString(),
            startDate: a.startDate.toISOString()
        }));

        // Serialize goals
        const serializedGoals = goals.map(g => ({
            ...g,
            raceDate: g.raceDate.toISOString(),
            createdAt: g.createdAt.toISOString(),
            updatedAt: g.updatedAt.toISOString(),
            completedAt: g.completedAt?.toISOString() || null,
            workouts: g.workouts.map(w => ({
                ...w,
                scheduledDate: w.scheduledDate.toISOString(),
                createdAt: w.createdAt.toISOString(),
                updatedAt: w.updatedAt.toISOString(),
                completedAt: w.completedAt?.toISOString() || null
            }))
        }));

        return NextResponse.json({
            stats: {
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
            },
            recentActivities: serializedActivities,
            goals: serializedGoals,
            syncStatus,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/dashboard'
        });
    }
}
