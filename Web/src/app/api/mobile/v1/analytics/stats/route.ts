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
import { cachedResponse, errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { getRedisClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 300; // 5 minutes

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

        // Fetch checks for caching (User settings, Goal, Last Activity Update)
        const [userData, activeGoal, lastActivityUpdate, activityCount, redis] = await Promise.all([
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    hrMax: true,
                    vdotCorrectionFactor: true,
                    includeCrossTraining: true,
                    updatedAt: true
                }
            }),
            prisma.goal.findFirst({
                where: { userId: user.id, isActive: true },
                select: {
                    currentVdot: true,
                    updatedAt: true,
                    isActive: true
                }
            }),
            prisma.activity.findFirst({
                where: { userId: user.id },
                orderBy: { updatedAt: 'desc' },
                select: { updatedAt: true }
            }),
            prisma.activity.count({
                where: { userId: user.id }
            }),
            getRedisClient()
        ]);

        const maxHR = userData?.hrMax || 185;
        const vdotCorrectionFactor = userData?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = userData?.includeCrossTraining ?? true;
        const currentVdot = activeGoal?.currentVdot || null;

        // Try Cache
        // Cache key includes update timestamps and count to ensure validity (even on deletion)
        const userUpdate = userData?.updatedAt?.getTime() || 0;
        const goalUpdate = activeGoal?.updatedAt?.getTime() || 0;
        const activityUpdate = lastActivityUpdate?.updatedAt?.getTime() || 0;

        const cacheKey = `analytics:stats:${user.id}:v1:${userUpdate}:${goalUpdate}:${activityUpdate}:${activityCount}`;

        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return NextResponse.json(JSON.parse(cached), { headers: rateLimitHeaders(rateLimitResult) });
                }
            } catch (e) {
                // Ignore cache errors and proceed to calculation
                console.error('Cache read error:', e);
            }
        }

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

        const responseData = {
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
        };

        // Update Cache
        if (redis) {
            try {
                // Cache for 24 hours (key invalidation handles updates)
                await redis.set(cacheKey, JSON.stringify(responseData), { ex: 86400 });
            } catch (e) {
                console.error('[Mobile Stats Cache] Cache write error:', e);
            }
        }

        const response = cachedResponse(responseData, {
            maxAge: CACHE_TTL,
            staleWhileRevalidate: 60,
            private: true
        });

        // Add rate limit headers
        const headers = rateLimitHeaders(rateLimitResult);
        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/analytics/stats'
        });
    }
}
