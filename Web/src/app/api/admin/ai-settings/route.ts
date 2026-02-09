/**
 * Admin AI Settings API
 * GET/PUT /api/admin/ai-settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';

// Simple admin check (reusing existing pattern from admin routes)
async function isAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_session');
    return adminToken?.value === process.env.ADMIN_SESSION_TOKEN;
}

/**
 * GET - Fetch global AI settings and user AI stats
 */
export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            defaultBaseUrl,
            defaultApiKey,
            defaultModel,
            dailyMessageLimit,
            monthlyMessageLimit,
            systemPrompt,
        } = body;

        const updateData: Record<string, unknown> = {};

        if (defaultBaseUrl !== undefined) updateData.defaultBaseUrl = defaultBaseUrl;

        // Encrypt API key if provided
        if (defaultApiKey !== undefined) {
            if (defaultApiKey) {
                updateData.defaultApiKey = encryptToken(defaultApiKey);
            } else {
                updateData.defaultApiKey = null;
            }
        }

        if (defaultModel !== undefined) updateData.defaultModel = defaultModel;
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
                dailyMessageLimit: settings.dailyMessageLimit,
                monthlyMessageLimit: settings.monthlyMessageLimit,
                systemPrompt: settings.systemPrompt,
            },
        });
    } catch (error) {
        console.error('Admin AI settings PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
