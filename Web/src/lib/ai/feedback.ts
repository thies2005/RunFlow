import { prisma } from '@/lib/db';
import {
    getAiConfig,
    buildUserContext,
    buildActivityContext,
    formatContextForAi,
    checkUsageLimit,
    incrementUsage,
    ACTIVITY_FEEDBACK_PROMPTS,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import { AiConfig } from '@/lib/ai/providers';

/**
 * Formats activity details into a string block for the AI prompt.
 */
export function formatActivityForAi(ctx: NonNullable<Awaited<ReturnType<typeof buildActivityContext>>>): string {
    const a = ctx.activity;
    let str = `Activity: ${a.name}\n`;
    str += `Date: ${a.date}\n`;
    str += `Type: ${a.type}\n`;
    str += `Distance: ${(a.distance / 1000).toFixed(2)}km\n`;
    str += `Duration: ${Math.floor(a.duration / 60)}:${(a.duration % 60).toString().padStart(2, '0')}\n`;
    str += `Pace: ${Math.floor(a.pace / 60)}:${Math.floor(a.pace % 60).toString().padStart(2, '0')}/km\n`;

    if (a.avgHr) str += `Avg HR: ${a.avgHr.toFixed(0)} bpm\n`;
    if (a.maxHr) str += `Max HR: ${a.maxHr} bpm\n`;
    if (a.elevationGain) str += `Elevation Gain: ${a.elevationGain.toFixed(0)}m\n`;
    if (a.trimp) str += `TRIMP: ${a.trimp.toFixed(1)}\n`;
    if (a.tss) str += `TSS: ${a.tss.toFixed(1)}\n`;

    if (a.hrZones && a.hrZones.length > 0) {
        str += `HR Zone breakdown: ${a.hrZones.map(z => `Z${z.zone}: ${Math.round(z.seconds / 60)}min`).join(', ')}\n`;
    }

    if (ctx.plannedWorkout) {
        str += `\nPlanned workout for this day:\n`;
        str += `Type: ${ctx.plannedWorkout.type}\n`;
        str += `Description: ${ctx.plannedWorkout.description}\n`;
        if (ctx.plannedWorkout.targetDistance) str += `Target distance: ${(ctx.plannedWorkout.targetDistance / 1000).toFixed(1)}km\n`;
        if (ctx.plannedWorkout.targetPace) str += `Target pace: ${Math.floor(ctx.plannedWorkout.targetPace / 60)}:${Math.floor(ctx.plannedWorkout.targetPace % 60).toString().padStart(2, '0')}/km\n`;
    } else {
        str += `\nNo specific workout was planned for this day.\n`;
    }

    return str;
}

/**
 * Generates feedback using the appropriate AI provider.
 * Accepts pre-resolved provider config to avoid redundant DB queries.
 */
async function generateFeedback(
    promptStr: string,
    userContext: string,
    activityContext: string,
    geminiConfig: { url: string } | null,
    fallbackConfig: AiConfig
): Promise<string> {
    const systemPromptMessage = `You are a running coach analyzing an athlete's activity.\n\n${promptStr}\n\n--- Athlete Profile ---\n${userContext}`;
    const userMessage = `Here's the activity to analyze:\n\n${activityContext}`;

    // 1. Try to use the non-realtime Google Provider (calorieSnapModel)
    if (geminiConfig) {
        try {
            const fullPrompt = `${systemPromptMessage}\n\n${userMessage}`;
            const res = await fetch(geminiConfig.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: { temperature: 0.5 },
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) return content;
            } else {
                logger.warn('[Activity Feedback] Google non-realtime provider failed, falling back', {
                    status: res.status,
                });
            }
        } catch (e) {
            logger.warn('[Activity Feedback] Error using non-realtime provider, falling back', { error: String(e) });
        }
    }

    // 2. Fall back to the active realtime provider (via generateCompletion)
    const { generateCompletion } = await import('@/lib/ai/providers');
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPromptMessage },
        { role: 'user', content: userMessage },
    ];

    return generateCompletion(fallbackConfig, messages);
}

/**
 * Main service function to generate, save, and return Activity AI Feedback.
 */
export async function generateAndSaveActivityFeedback(activityId: string, userId: string, regenerate: boolean = false) {
    const activity = await prisma.activity.findFirst({
        where: { id: activityId, userId },
    });

    if (!activity) {
        throw new Error('Activity not found');
    }

    if (!regenerate) {
        const existing = await prisma.activityAiFeedback.findUnique({
            where: { activityId },
        });

        if (existing) {
            return { feedback: existing, cached: true };
        }
    }

    // This config is used if the primary non-realtime provider is unavailable
    const fallbackConfig = await getAiConfig(userId);
    if (!fallbackConfig) {
        throw new Error('AI features not enabled or no provider configured');
    }

    const usageStatus = await checkUsageLimit(userId);
    if (!usageStatus.canUse) {
        throw new Error(usageStatus.reason || 'Usage limit reached');
    }

    const userSettings = await prisma.userAiSettings.findUnique({ where: { userId } });
    const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
    const userTier = userSettings?.usageTier || 'none';

    if (userTier !== 'none' && userSettings) {
        const userLevelLimits = {
            tier1: globalSettings?.tier1ActivityFeedbackLimit ?? 1,
            tier2: globalSettings?.tier2ActivityFeedbackLimit ?? 3,
            tier3: globalSettings?.tier3ActivityFeedbackLimit ?? 6,
        };
        const dailyLimit = userLevelLimits[userTier as keyof typeof userLevelLimits] || userLevelLimits.tier1;
        
        const now = new Date();
        const lastReset = new Date(userSettings.lastUsageReset);
        let usedToday = userSettings.activityFeedbackUsedToday;
        
        if (now.toDateString() !== lastReset.toDateString()) {
            usedToday = 0;
        }

        if (usedToday >= dailyLimit) {
            throw new Error(`Daily limit of ${dailyLimit} activity analyses reached for your tier.`);
        }
    }

    const userContext = await buildUserContext(userId);
    const activityContext = await buildActivityContext(activityId);

    if (!activityContext) {
        throw new Error('Could not load activity context');
    }

    const baseContext = formatContextForAi(userContext);
    const activityStr = formatActivityForAi(activityContext);

    // Resolve Google provider once so generateFeedback doesn't repeat 3x DB queries
    let geminiConfig: { url: string } | null = null;
    try {
        const googleProvider = await prisma.aiProvider.findFirst({ where: { type: 'google', isActive: true } });
        if (googleProvider) {
            const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
            const model = globalSettings?.activityFeedbackModel || 'gemini-1.5-flash';
            const rawDecryptedKey = decryptToken(googleProvider.apiKey);
            const geminiKey = rawDecryptedKey ? rawDecryptedKey.split(/[,;\n]+/)[0].trim() : null;
            if (geminiKey) {
                geminiConfig = {
                    url: `${googleProvider.baseUrl}/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                };
            }
        }
    } catch (e) {
        logger.warn('[Activity Feedback] Could not resolve non-realtime provider, will use fallback', { error: String(e) });
    }

    // Generate the 3 feedback components in parallel
    const [plannedComparison, progressAnalysis, goalTrajectory] = await Promise.all([
        generateFeedback(ACTIVITY_FEEDBACK_PROMPTS.plannedComparison, baseContext, activityStr, geminiConfig, fallbackConfig),
        generateFeedback(ACTIVITY_FEEDBACK_PROMPTS.progressAnalysis, baseContext, activityStr, geminiConfig, fallbackConfig),
        generateFeedback(ACTIVITY_FEEDBACK_PROMPTS.goalTrajectory, baseContext, activityStr, geminiConfig, fallbackConfig),
    ]);

    // Upsert into DB
    const feedback = await prisma.activityAiFeedback.upsert({
        where: { activityId },
        create: {
            activityId,
            plannedComparison,
            progressAnalysis,
            goalTrajectory,
        },
        update: {
            plannedComparison,
            progressAnalysis,
            goalTrajectory,
            generatedAt: new Date(),
        },
    });

    if (userTier !== 'none') {
        const updatedSettings = await prisma.userAiSettings.findUnique({ where: { userId } });
        if (updatedSettings) {
            const now = new Date();
            const lastReset = new Date(updatedSettings.lastUsageReset);
            let usedToday = updatedSettings.activityFeedbackUsedToday;
            
            if (now.toDateString() !== lastReset.toDateString()) {
                usedToday = 0;
            }
            
            await prisma.userAiSettings.update({
                where: { userId },
                data: {
                    activityFeedbackUsedToday: usedToday + 1,
                    lastUsageReset: now
                }
            });
        }
    }

    return { feedback, cached: false };
}
