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
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { getSyncStatus } from '@/lib/strava/sync';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';
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
                },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
            }
        });

        const recentActivitiesPromise = prisma.activity.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
            take: 30,
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
                averageWatts: true,
                weightedAverageWatts: true,
                deviceWatts: true,
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

        // Use cached fitness with gap filling (real-time decay)
        const currentFitness = await ensureFitnessCacheUpToDate(userId);
        const ctl = currentFitness ? Math.round(currentFitness.ctl) : 0;
        const atl = currentFitness ? Math.round(currentFitness.atl) : 0;
        const tsb = currentFitness ? Math.round(currentFitness.tsb) : 0;
        const workloadRatio = currentFitness && currentFitness.ctl > 0
            ? parseFloat((currentFitness.atl / currentFitness.ctl).toFixed(2)) : 0;

        const easyTrimp = AnalyticsService.calculateEasyTrimp(runActivities);

        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
        const threeMonthRunDist = runActivities
            .filter(a => new Date(a.startDate) >= twelveWeeksAgo)
            .reduce((sum, a) => sum + (a.distance || 0), 0);
        const monday = (date: Date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d;
        };
        const threeMonthPeriodStart = monday(twelveWeeksAgo);
        const threeMonthPeriodEnd = monday(new Date());
        const weeksInThreeMonths = Math.max(1, Math.round((threeMonthPeriodEnd.getTime() - threeMonthPeriodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const avgWeeklyKmLast3Months = Math.round(((threeMonthRunDist / weeksInThreeMonths / 1000) * 10)) / 10;

        // Serialize BigInt for activities
        const serializedActivities = recentActivities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString(),
            startDate: a.startDate.toISOString()
        }));

        // Serialize goals
        const serializedGoals = goals.map(g => ({
            ...g,
            raceDate: g.raceDate?.toISOString() ?? null,
            createdAt: g.createdAt.toISOString(),
            updatedAt: g.updatedAt.toISOString(),
            completedAt: g.completedAt?.toISOString() || null,
            workouts: g.workouts.map(w => ({
                ...w,
                scheduledDate: w.scheduledDate.toISOString(),
                createdAt: w.createdAt.toISOString(),
                updatedAt: w.updatedAt.toISOString(),
                completedAt: w.completedAt?.toISOString() || null
            })),
            subGoals: (g.subGoals ?? []).map((s: any) => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
                updatedAt: s.updatedAt.toISOString(),
                completedAt: s.completedAt?.toISOString() || null,
                raceDate: s.raceDate?.toISOString() ?? null,
            })),
        }));

        // Find today's workout (first incomplete workout for today, or first incomplete workout of the week)
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        
        // First, look for any workout scheduled for today
        let todayWorkout = null;
        for (const goal of goals) {
            const todayScheduledWorkout = goal.workouts.find(w => {
                const workoutDate = new Date(w.scheduledDate);
                return workoutDate >= todayStart && workoutDate <= todayEnd && !w.isCompleted;
            });
            if (todayScheduledWorkout) {
                todayWorkout = todayScheduledWorkout;
                break;
            }
        }
        
        // If no workout for today, get the first pending workout of the week
        if (!todayWorkout) {
            for (const goal of goals) {
                const pendingWorkouts = goal.workouts
                    .filter(w => !w.isCompleted)
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
                if (pendingWorkouts.length > 0) {
                    todayWorkout = pendingWorkouts[0];
                    break;
                }
            }
        }
        
        // Serialize today's workout if found
        const serializedTodayWorkout = todayWorkout ? {
            ...todayWorkout,
            scheduledDate: todayWorkout.scheduledDate.toISOString(),
            createdAt: todayWorkout.createdAt.toISOString(),
            updatedAt: todayWorkout.updatedAt.toISOString(),
            completedAt: todayWorkout.completedAt?.toISOString() || null
        } : null;

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
                avgWeeklyKmLast3Months,
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
            },
            todayWorkout: serializedTodayWorkout
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/dashboard'
        });
    }
}
