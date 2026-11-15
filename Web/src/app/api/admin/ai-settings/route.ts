/**
 * Admin AI Settings API
 * GET/PUT /api/admin/ai-settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type GlobalAiSettings } from '@/generated/prisma/client';
import { encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { handleError } from '@/lib/errors/handler';
import { isEnvSignupsAllowed } from '@/lib/auth/signupSettings';
import {
    parseRoutingConfig,
    TierRoutingConfigSchema,
    type TierRoutingConfig,
} from '@/lib/ai/routing';

function extractRoutingProviderIds(config: TierRoutingConfig): string[] {
    const ids = new Set<string>();
    for (const tierConfig of Object.values(config.tiers)) {
        if (!tierConfig) continue;
        if (tierConfig.defaultPrimary?.providerId) {
            ids.add(tierConfig.defaultPrimary.providerId);
        }
        for (const fb of tierConfig.defaultFallbacks ?? []) {
            if (fb.providerId) ids.add(fb.providerId);
        }
        if (tierConfig.functions) {
            for (const fnConfig of Object.values(tierConfig.functions)) {
                if (!fnConfig) continue;
                if (fnConfig.primary?.providerId) {
                    ids.add(fnConfig.primary.providerId);
                }
                for (const fb of fnConfig.fallbacks ?? []) {
                    if (fb.providerId) ids.add(fb.providerId);
                }
            }
        }
    }
    return Array.from(ids);
}

function serializeGlobalAiSettings(settings: GlobalAiSettings, envAllowSignups: boolean) {
    return {
        defaultBaseUrl: settings.defaultBaseUrl,
        hasDefaultApiKey: !!settings.defaultApiKey, // Don't return the key itself
        defaultModel: settings.defaultModel,
        activeProviderId: settings.activeProviderId,
        fallbackProviderId: settings.fallbackProviderId,
        routingConfig: parseRoutingConfig(settings.routingConfig),

        // Tier settings
        tier1Name: settings.tier1Name,
        tier1DailyLimit: settings.tier1DailyLimit,
        tier1MonthlyLimit: settings.tier1MonthlyLimit,
        tier1DailyTokenLimit: settings.tier1DailyTokenLimit,
        tier1MonthlyTokenLimit: settings.tier1MonthlyTokenLimit,

        tier2Name: settings.tier2Name,
        tier2DailyLimit: settings.tier2DailyLimit,
        tier2MonthlyLimit: settings.tier2MonthlyLimit,
        tier2DailyTokenLimit: settings.tier2DailyTokenLimit,
        tier2MonthlyTokenLimit: settings.tier2MonthlyTokenLimit,

        tier3Name: settings.tier3Name,
        tier3DailyLimit: settings.tier3DailyLimit,
        tier3MonthlyLimit: settings.tier3MonthlyLimit,
        tier3DailyTokenLimit: settings.tier3DailyTokenLimit,
        tier3MonthlyTokenLimit: settings.tier3MonthlyTokenLimit,

        // CalorieSnap limits & Config
        calorieSnapModel: settings.calorieSnapModel,
        tier1CalorieSnapLimit: settings.tier1CalorieSnapLimit,
        tier2CalorieSnapLimit: settings.tier2CalorieSnapLimit,
        tier3CalorieSnapLimit: settings.tier3CalorieSnapLimit,

        tier1MealSuggestLimit: settings.tier1MealSuggestLimit,
        tier2MealSuggestLimit: settings.tier2MealSuggestLimit,
        tier3MealSuggestLimit: settings.tier3MealSuggestLimit,

        tier1ActivityFeedbackLimit: settings.tier1ActivityFeedbackLimit,
        tier2ActivityFeedbackLimit: settings.tier2ActivityFeedbackLimit,
        tier3ActivityFeedbackLimit: settings.tier3ActivityFeedbackLimit,

        // Non-realtime AI Feature Models
        mealSuggestModel: settings.mealSuggestModel,
        activityFeedbackModel: settings.activityFeedbackModel,
        planBuilderModel: settings.planBuilderModel,
        planMaxTokensPerAnalysis: settings.planMaxTokensPerAnalysis,

        // Legacy (deprecated)
        dailyMessageLimit: settings.dailyMessageLimit,
        monthlyMessageLimit: settings.monthlyMessageLimit,
        systemPrompt: settings.systemPrompt,

        // Signups
        allowSignups: settings.allowSignups ?? true,
        envAllowSignups,
        effectiveAllowSignups: envAllowSignups && (settings.allowSignups ?? true),
    };
}

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
            settings: serializeGlobalAiSettings(globalSettings, isEnvSignupsAllowed()),
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
            fallbackProviderId,
            routingConfig,
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

            // Non-realtime AI Feature Models
            mealSuggestModel,
            tier1MealSuggestLimit, tier2MealSuggestLimit, tier3MealSuggestLimit,
            activityFeedbackModel,
            tier1ActivityFeedbackLimit, tier2ActivityFeedbackLimit, tier3ActivityFeedbackLimit,
            planBuilderModel,
            planMaxTokensPerAnalysis,



            // Legacy
            dailyMessageLimit,
            monthlyMessageLimit,
            systemPrompt,

            // Signups
            allowSignups,
        } = body;

        const envAllowSignups = isEnvSignupsAllowed();
        if (allowSignups !== undefined && !envAllowSignups && Boolean(allowSignups) === true && Object.keys(body).length === 1) {
            return NextResponse.json(
                { error: 'Signups are disabled by the ALLOW_SIGNUPS environment variable and cannot be enabled.' },
                { status: 403 }
            );
        }

        const updateData: Prisma.GlobalAiSettingsUncheckedCreateInput = {};

        if (defaultBaseUrl !== undefined) updateData.defaultBaseUrl = defaultBaseUrl;
        if (activeProviderId !== undefined) updateData.activeProviderId = activeProviderId || null;
        if (fallbackProviderId !== undefined) updateData.fallbackProviderId = fallbackProviderId || null;

        if (routingConfig !== undefined) {
            if (routingConfig === null) {
                updateData.routingConfig = Prisma.DbNull;
            } else {
                const parsedRouting = TierRoutingConfigSchema.safeParse(routingConfig);
                if (!parsedRouting.success) {
                    return NextResponse.json(
                        {
                            error: 'Invalid routingConfig schema',
                            details: parsedRouting.error.issues.slice(0, 5),
                        },
                        { status: 400 }
                    );
                }

                const referencedIds = extractRoutingProviderIds(parsedRouting.data);
                if (referencedIds.length > 0 && typeof prisma.aiProvider?.findMany === 'function') {
                    const existingProviders = await prisma.aiProvider.findMany({
                        where: { id: { in: referencedIds } },
                        select: { id: true },
                    });
                    const existingIds = new Set(existingProviders.map((p) => p.id));
                    const missingIds = referencedIds.filter((id) => !existingIds.has(id));
                    if (missingIds.length > 0) {
                        return NextResponse.json(
                            {
                                error: `Unknown provider ID(s) in routingConfig: ${missingIds.join(', ')}`,
                            },
                            { status: 400 }
                        );
                    }
                }

                updateData.routingConfig = parsedRouting.data as unknown as Prisma.InputJsonValue;
            }
        }

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

        // Non-realtime AI Feature Models
        if (mealSuggestModel !== undefined) updateData.mealSuggestModel = mealSuggestModel;
        if (tier1MealSuggestLimit !== undefined) updateData.tier1MealSuggestLimit = parseInt(tier1MealSuggestLimit) || 0;
        if (tier2MealSuggestLimit !== undefined) updateData.tier2MealSuggestLimit = parseInt(tier2MealSuggestLimit) || 0;
        if (tier3MealSuggestLimit !== undefined) updateData.tier3MealSuggestLimit = parseInt(tier3MealSuggestLimit) || 0;
        
        if (activityFeedbackModel !== undefined) updateData.activityFeedbackModel = activityFeedbackModel;
        if (tier1ActivityFeedbackLimit !== undefined) updateData.tier1ActivityFeedbackLimit = parseInt(tier1ActivityFeedbackLimit) || 0;
        if (tier2ActivityFeedbackLimit !== undefined) updateData.tier2ActivityFeedbackLimit = parseInt(tier2ActivityFeedbackLimit) || 0;
        if (tier3ActivityFeedbackLimit !== undefined) updateData.tier3ActivityFeedbackLimit = parseInt(tier3ActivityFeedbackLimit) || 0;
        if (planBuilderModel !== undefined) updateData.planBuilderModel = planBuilderModel;
        if (planMaxTokensPerAnalysis !== undefined) updateData.planMaxTokensPerAnalysis = parseInt(planMaxTokensPerAnalysis) || 8000;

        // Legacy (deprecated)
        if (dailyMessageLimit !== undefined) updateData.dailyMessageLimit = parseInt(dailyMessageLimit) || 50;
        if (monthlyMessageLimit !== undefined) updateData.monthlyMessageLimit = parseInt(monthlyMessageLimit) || 500;
        if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;

        // Signups
        if (allowSignups !== undefined && envAllowSignups) {
            updateData.allowSignups = Boolean(allowSignups);
        }

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
            settings: serializeGlobalAiSettings(settings, envAllowSignups),
        });

        await logAdminAction(request, 'MODIFY_AI_SETTINGS', { type: 'SETTINGS' }, {
            updatedFields: Object.keys(updateData)
        }, authResult.admin.username);

        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Admin AI settings PUT error:', error);
        return handleError(error);
    }
}
