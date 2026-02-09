/**
 * Admin AI Settings API
 * GET/PUT /api/admin/ai-settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';

/**
 * GET - Fetch global AI settings and user AI stats
 */
export async function GET(request: NextRequest) {
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

        return NextResponse.json({
            settings: {
                defaultBaseUrl: globalSettings.defaultBaseUrl,
                hasDefaultApiKey: !!globalSettings.defaultApiKey, // Don't return the key itself
                defaultModel: globalSettings.defaultModel,
                activeProviderId: globalSettings.activeProviderId,
                // Tier settings
                tier1Name: globalSettings.tier1Name,
                tier1DailyLimit: globalSettings.tier1DailyLimit,
                tier1MonthlyLimit: globalSettings.tier1MonthlyLimit,
                tier2Name: globalSettings.tier2Name,
                tier2DailyLimit: globalSettings.tier2DailyLimit,
                tier2MonthlyLimit: globalSettings.tier2MonthlyLimit,
                tier3Name: globalSettings.tier3Name,
                tier3DailyLimit: globalSettings.tier3DailyLimit,
                tier3MonthlyLimit: globalSettings.tier3MonthlyLimit,
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
    } catch (error) {
        console.error('Admin AI settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT - Update global AI settings
 */
export async function PUT(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
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
            tier2Name, tier2DailyLimit, tier2MonthlyLimit,
            tier3Name, tier3DailyLimit, tier3MonthlyLimit,
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
        if (tier2Name !== undefined) updateData.tier2Name = tier2Name;
        if (tier2DailyLimit !== undefined) updateData.tier2DailyLimit = parseInt(tier2DailyLimit) || 0;
        if (tier2MonthlyLimit !== undefined) updateData.tier2MonthlyLimit = parseInt(tier2MonthlyLimit) || 0;
        if (tier3Name !== undefined) updateData.tier3Name = tier3Name;
        if (tier3DailyLimit !== undefined) updateData.tier3DailyLimit = parseInt(tier3DailyLimit) || 0;
        if (tier3MonthlyLimit !== undefined) updateData.tier3MonthlyLimit = parseInt(tier3MonthlyLimit) || 0;

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

        return NextResponse.json({
            success: true,
            settings: {
                defaultBaseUrl: settings.defaultBaseUrl,
                hasDefaultApiKey: !!settings.defaultApiKey,
                defaultModel: settings.defaultModel,
                activeProviderId: settings.activeProviderId,
                dailyMessageLimit: settings.dailyMessageLimit,
                monthlyMessageLimit: settings.monthlyMessageLimit,
                systemPrompt: settings.systemPrompt,
            },
        });
    } catch (error) {
        console.error('Admin AI settings PUT error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
