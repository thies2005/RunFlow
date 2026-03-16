import { prisma } from '@/lib/db';
import {
    getAiConfigForModel,
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
 */
async function generateFeedback(
    promptStr: string,
    userContext: string,
    activityContext: string,
    providerConfig: AiConfig,
    signal?: AbortSignal
): Promise<string> {
    const systemPromptMessage: string = `You are a running coach analyzing an athlete's activity.\n\n${promptStr}\n\n--- Athlete Profile ---\n${userContext}`;
    const userMessage: string = `Here's the activity to analyze:\n\n${activityContext}`;

    const { generateCompletion } = await import('@/lib/ai/providers');
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPromptMessage },
        { role: 'user', content: userMessage },
    ];

    return generateCompletion(providerConfig, messages, signal);
}

/**
 * Main service function to generate, save, and return Activity AI Feedback.
 */
export async function generateAndSaveActivityFeedback(
    activityId: string,
    userId: string,
    regenerate: boolean = false,
    signal?: AbortSignal
) {
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

    const activityFeedbackModel = globalSettings?.activityFeedbackModel || 'gemini-1.5-flash';
    const providerConfig = await getAiConfigForModel(userId, activityFeedbackModel);

    if (!providerConfig) {
        throw new Error('AI features not enabled or no provider configured that supports the requested model');
    }

    // Generate the 3 feedback components in parallel
    const [plannedComparison, progressAnalysis, goalTrajectory] = await Promise.all([
        generateFeedback(ACTIVITY_FEEDBACK_PROMPTS.plannedComparison, baseContext, activityStr, providerConfig, signal),
        generateFeedback(ACTIVITY_FEEDBACK_PROMPTS.progressAnalysis, baseContext, activityStr, providerConfig, signal),
        generateFeedback(ACTIVITY_FEEDBACK_PROMPTS.goalTrajectory, baseContext, activityStr, providerConfig, signal),
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
