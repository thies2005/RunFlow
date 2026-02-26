/**
 * Admin AI Settings API
 * GET/PUT /api/admin/ai-settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        // Get or create global settings
        let globalSettings = await prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
        });

        if (!globalSettings) {
            globalSettings = await prisma.globalAiSettings.create({
                data: { id: 'singleton' },
            });
        }

        // Get user AI stats
        const [totalUsers, enabledUsers, usersWithCustomKey] = await Promise.all([
            prisma.user.count(),
            prisma.userAiSettings.count({ where: { aiEnabled: true } }),
            prisma.userAiSettings.count({ where: { customApiKey: { not: null } } }),
        ]);

        const response = NextResponse.json({
            settings: {
                defaultBaseUrl: globalSettings.defaultBaseUrl,
                hasDefaultApiKey: !!globalSettings.defaultApiKey, // Don't return the key itself
                defaultModel: globalSettings.defaultModel,
                activeProviderId: globalSettings.activeProviderId,
                fallbackProviderId: globalSettings.fallbackProviderId,
                // Tier settings
                tier1Name: globalSettings.tier1Name,
                tier1DailyLimit: globalSettings.tier1DailyLimit,
                tier1MonthlyLimit: globalSettings.tier1MonthlyLimit,
                tier1DailyTokenLimit: globalSettings.tier1DailyTokenLimit,
                tier1MonthlyTokenLimit: globalSettings.tier1MonthlyTokenLimit,

                tier2Name: globalSettings.tier2Name,
                tier2DailyLimit: globalSettings.tier2DailyLimit,
                tier2MonthlyLimit: globalSettings.tier2MonthlyLimit,
                tier2DailyTokenLimit: globalSettings.tier2DailyTokenLimit,
                tier2MonthlyTokenLimit: globalSettings.tier2MonthlyTokenLimit,

                tier3Name: globalSettings.tier3Name,
                tier3DailyLimit: globalSettings.tier3DailyLimit,
                tier3MonthlyLimit: globalSettings.tier3MonthlyLimit,
                tier3DailyTokenLimit: globalSettings.tier3DailyTokenLimit,
                tier3MonthlyTokenLimit: globalSettings.tier3MonthlyTokenLimit,

                // CalorieSnap limits & Config
                calorieSnapModel: globalSettings.calorieSnapModel,
                tier1CalorieSnapLimit: globalSettings.tier1CalorieSnapLimit,
                tier2CalorieSnapLimit: globalSettings.tier2CalorieSnapLimit,
                tier3CalorieSnapLimit: globalSettings.tier3CalorieSnapLimit,

                // Legacy (deprecated)
                dailyMessageLimit: globalSettings.dailyMessageLimit,
                monthlyMessageLimit: globalSettings.monthlyMessageLimit,
                systemPrompt: globalSettings.systemPrompt,
            },
            stats: {
                totalUsers,
                enabledUsers,
                usersWithCustomKey,
            },
        });

        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Admin AI settings GET error:', error);
        return handleError(error);
    }
}

/**
 * PUT - Update global AI settings
 */
export async function PUT(request: NextRequest) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'write');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const body = await request.json();
        const {
            defaultBaseUrl,
            defaultApiKey,
            defaultModel,
            activeProviderId,
            // Tier fields
            tier1Name, tier1DailyLimit, tier1MonthlyLimit,
            tier1DailyTokenLimit, tier1MonthlyTokenLimit,

            tier2Name, tier2DailyLimit, tier2MonthlyLimit,
            tier2DailyTokenLimit, tier2MonthlyTokenLimit,

            tier3Name, tier3DailyLimit, tier3MonthlyLimit,
            tier3DailyTokenLimit, tier3MonthlyTokenLimit,

            // CalorieSnap config
            calorieSnapModel,
            tier1CalorieSnapLimit, tier2CalorieSnapLimit, tier3CalorieSnapLimit,

            // Legacy
            dailyMessageLimit,
            monthlyMessageLimit,
            systemPrompt,
        } = body;

        const updateData: Record<string, unknown> = {};

        if (defaultBaseUrl !== undefined) updateData.defaultBaseUrl = defaultBaseUrl;
        if (activeProviderId !== undefined) updateData.activeProviderId = activeProviderId;

        // Encrypt API key if provided
        if (defaultApiKey !== undefined) {
            if (defaultApiKey) {
                updateData.defaultApiKey = encryptToken(defaultApiKey);
            } else {
                updateData.defaultApiKey = null;
            }
        }

        if (defaultModel !== undefined) updateData.defaultModel = defaultModel;

        // Tier settings
        if (tier1Name !== undefined) updateData.tier1Name = tier1Name;
        if (tier1DailyLimit !== undefined) updateData.tier1DailyLimit = parseInt(tier1DailyLimit) || 0;
        if (tier1MonthlyLimit !== undefined) updateData.tier1MonthlyLimit = parseInt(tier1MonthlyLimit) || 0;
        if (tier1DailyTokenLimit !== undefined) updateData.tier1DailyTokenLimit = parseInt(tier1DailyTokenLimit) || 0;
        if (tier1MonthlyTokenLimit !== undefined) updateData.tier1MonthlyTokenLimit = parseInt(tier1MonthlyTokenLimit) || 0;

        if (tier2Name !== undefined) updateData.tier2Name = tier2Name;
        if (tier2DailyLimit !== undefined) updateData.tier2DailyLimit = parseInt(tier2DailyLimit) || 0;
        if (tier2MonthlyLimit !== undefined) updateData.tier2MonthlyLimit = parseInt(tier2MonthlyLimit) || 0;
        if (tier2DailyTokenLimit !== undefined) updateData.tier2DailyTokenLimit = parseInt(tier2DailyTokenLimit) || 0;
        if (tier2MonthlyTokenLimit !== undefined) updateData.tier2MonthlyTokenLimit = parseInt(tier2MonthlyTokenLimit) || 0;

        if (tier3Name !== undefined) updateData.tier3Name = tier3Name;
        if (tier3DailyLimit !== undefined) updateData.tier3DailyLimit = parseInt(tier3DailyLimit) || 0;
        if (tier3MonthlyLimit !== undefined) updateData.tier3MonthlyLimit = parseInt(tier3MonthlyLimit) || 0;
        if (tier3DailyTokenLimit !== undefined) updateData.tier3DailyTokenLimit = parseInt(tier3DailyTokenLimit) || 0;
        if (tier3MonthlyTokenLimit !== undefined) updateData.tier3MonthlyTokenLimit = parseInt(tier3MonthlyTokenLimit) || 0;

        // CalorieSnap config
        if (calorieSnapModel !== undefined) updateData.calorieSnapModel = calorieSnapModel;
        if (tier1CalorieSnapLimit !== undefined) updateData.tier1CalorieSnapLimit = parseInt(tier1CalorieSnapLimit) || 0;
        if (tier2CalorieSnapLimit !== undefined) updateData.tier2CalorieSnapLimit = parseInt(tier2CalorieSnapLimit) || 0;
        if (tier3CalorieSnapLimit !== undefined) updateData.tier3CalorieSnapLimit = parseInt(tier3CalorieSnapLimit) || 0;

        // Legacy (deprecated)
        if (dailyMessageLimit !== undefined) updateData.dailyMessageLimit = parseInt(dailyMessageLimit) || 50;
        if (monthlyMessageLimit !== undefined) updateData.monthlyMessageLimit = parseInt(monthlyMessageLimit) || 500;
        if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;

        const settings = await prisma.globalAiSettings.upsert({
            where: { id: 'singleton' },
            create: {
                id: 'singleton',
                ...updateData,
            },
            update: updateData,
        });

        const response = NextResponse.json({
            success: true,
            settings: {
                defaultBaseUrl: settings.defaultBaseUrl,
                hasDefaultApiKey: !!settings.defaultApiKey,
                defaultModel: settings.defaultModel,
                activeProviderId: settings.activeProviderId,
                fallbackProviderId: settings.fallbackProviderId,
                dailyMessageLimit: settings.dailyMessageLimit,
                monthlyMessageLimit: settings.monthlyMessageLimit,
                systemPrompt: settings.systemPrompt,

                tier1Name: settings.tier1Name,
                tier1DailyLimit: settings.tier1DailyLimit,
                tier1MonthlyLimit: settings.tier1MonthlyLimit,
                tier1DailyTokenLimit: settings.tier1DailyTokenLimit,
                tier1MonthlyTokenLimit: settings.tier1MonthlyTokenLimit,
                calorieSnapModel: settings.calorieSnapModel,
            },
        });

        await logAdminAction(request, 'MODIFY_AI_SETTINGS', { type: 'SETTINGS' }, {
            updatedFields: Object.keys(updateData)
        });

        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Admin AI settings PUT error:', error);
        return handleError(error);
    }
}
