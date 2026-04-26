import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { encryptToken } from '@/lib/crypto';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const userId = authUser.id;

        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                weight: true,
                height: true,
                birthDate: true,
                sex: true
            }
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: thirtyDaysAgo }
            },
            select: { calories: true }
        });

        let totalActiveCals = 0;
        for (const act of activities) {
            if (act.calories) {
                totalActiveCals += act.calories;
            }
        }
        const avgActiveCalories = totalActiveCals / 30;

        const returnTarget = target || {
            dailyCalories: 2000,
            proteinPercent: 30,
            carbsPercent: 40,
            fatsPercent: 30,
            exerciseCalorieFactor: 0.5,
            exerciseCalorieSource: 'strava',
            waterTrackingEnabled: false,
            waterGoalMl: 2500,
            aiInsightProvider: 'gemini',
            aiInsightApiKey: null,
            fastingEnabled: false,
            fastingGoalHours: 16
        };

        return NextResponse.json({
            ...returnTarget,
            userProfile: user,
            avgActiveCalories,
            isDefault: !target
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/target' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const {
            dailyCalories,
            proteinPercent,
            carbsPercent,
            fatsPercent,
            exerciseCalorieFactor,
            exerciseCalorieSource,
            waterTrackingEnabled,
            waterGoalMl,
            aiInsightProvider,
            aiInsightApiKey,
            fastingEnabled,
            fastingGoalHours
        } = body;

        const encryptedApiKey = aiInsightApiKey ? encryptToken(aiInsightApiKey) : undefined;
        const userId = authUser.id;

        const target = await prisma.userNutritionTarget.upsert({
            where: { userId },
            update: {
                dailyCalories,
                proteinPercent,
                carbsPercent,
                fatsPercent,
                ...(exerciseCalorieFactor !== undefined && { exerciseCalorieFactor }),
                ...(exerciseCalorieSource !== undefined && { exerciseCalorieSource }),
                ...(waterTrackingEnabled !== undefined && { waterTrackingEnabled }),
                ...(waterGoalMl !== undefined && { waterGoalMl }),
                ...(aiInsightProvider !== undefined && { aiInsightProvider }),
                ...(encryptedApiKey !== undefined && { aiInsightApiKey: encryptedApiKey }),
                ...(fastingEnabled !== undefined && { fastingEnabled }),
                ...(fastingGoalHours !== undefined && { fastingGoalHours })
            },
            create: {
                userId,
                dailyCalories,
                proteinPercent,
                carbsPercent,
                fatsPercent,
                ...(exerciseCalorieFactor !== undefined && { exerciseCalorieFactor }),
                ...(exerciseCalorieSource !== undefined && { exerciseCalorieSource }),
                ...(waterTrackingEnabled !== undefined && { waterTrackingEnabled }),
                ...(waterGoalMl !== undefined && { waterGoalMl }),
                ...(aiInsightProvider !== undefined && { aiInsightProvider }),
                ...(encryptedApiKey !== undefined && { aiInsightApiKey: encryptedApiKey }),
                ...(fastingEnabled !== undefined && { fastingEnabled }),
                ...(fastingGoalHours !== undefined && { fastingGoalHours })
            }
        });

        return NextResponse.json(target, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/target' });
    }
}
