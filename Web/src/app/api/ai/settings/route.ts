/**
 * User AI Settings API
 * GET/PUT /api/ai/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { testAiConfig, getUsageStats } from '@/lib/ai';
import { encryptToken } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * GET - Get user's AI settings
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user settings
        const settings = await prisma.userAiSettings.findUnique({
            where: { userId },
        });

        // Don't return the full API key for security
        const safeSettings = settings ? {
            ...settings,
            customApiKey: settings.customApiKey ? `••••••••${settings.customApiKey.slice(-4)}` : null,
        } : null;

        // Get usage stats
        const usage = await getUsageStats(userId);

        // Get global limits for display
        const globalSettings = await prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
        });

        return NextResponse.json({
            settings: safeSettings,
            usage,
            limits: {
                daily: globalSettings?.dailyMessageLimit || 50,
                monthly: globalSettings?.monthlyMessageLimit || 500,
            }
        });
    } catch (error) {
        console.error('AI settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT - Update user's AI settings
 */
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Validate input
        if (body.customApiKey) {
            // Basic validation
            if (typeof body.customApiKey !== 'string' || body.customApiKey.length < 10) {
                return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
            }
        }

        const updateData: any = {
            aiEnabled: body.aiEnabled,
            feedbackMode: body.feedbackMode,
            accessFitnessMetrics: body.accessFitnessMetrics,
            accessActivityHistory: body.accessActivityHistory,
            accessHeartRateData: body.accessHeartRateData,
            accessGoals: body.accessGoals,
            accessTrainingPlan: body.accessTrainingPlan,
            accessPerformance: body.accessPerformance,
            accessBiometrics: body.accessBiometrics,
            customPromptAddition: body.customPromptAddition,
        };

        // Get current settings to check adminAllowed
        const currentSettings = await prisma.userAiSettings.findUnique({
            where: { userId: session.user.id }
        });

        // Enforce adminAllowed
        if (body.aiEnabled === true && (!currentSettings || !currentSettings.adminAllowed)) {
            return NextResponse.json({
                error: 'AI access not allowed by administrator. Please contact support.'
            }, { status: 403 });
        }

        // Only update API key if provided (encrypt it)
        if (body.customApiKey !== undefined) {
            if (body.customApiKey) {
                updateData.customApiKey = encryptToken(body.customApiKey);
                updateData.customBaseUrl = body.customBaseUrl;
                updateData.customModel = body.customModel;
            } else {
                updateData.customApiKey = null;
                updateData.customBaseUrl = null;
                updateData.customModel = null;
            }
        } else {
            // If just updating settings and not API key, we might still want to update URL/Model
            if (body.customBaseUrl !== undefined) updateData.customBaseUrl = body.customBaseUrl;
            if (body.customModel !== undefined) updateData.customModel = body.customModel;
        }

        const settings = await prisma.userAiSettings.upsert({
            where: { userId: session.user.id },
            create: {
                userId: session.user.id,
                ...updateData,
            },
            update: updateData,
        });

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('AI settings PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
