import { prisma } from '@/lib/db';
import {
    getAiConfigForModel,
    buildUserContext,
    buildActivityContext,
    formatContextForAi,
    checkUsageLimit,
    ACTIVITY_FEEDBACK_PROMPTS,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { logger } from '@/lib/logging/logger';
import { fenceUntrusted } from '@/lib/ai/prompts';

async function canAutoGenerateFeedback(userId: string): Promise<boolean> {
    const aiSettings = await prisma.userAiSettings.findUnique({
        where: { userId }
    });

    if (!aiSettings || !aiSettings.aiEnabled || !aiSettings.adminAllowed) {
        return false;
    }

    return aiSettings.feedbackMode === 'auto' || aiSettings.feedbackMode === 'both';
}

export async function enqueueFeedbackJobsForActivities(userId: string, activityIds: string[], priority: number = 5): Promise<number> {
    if (activityIds.length === 0) {
        return 0;
    }

    if (!(await canAutoGenerateFeedback(userId))) {
        return 0;
    }

    const activitiesWithoutFeedback = await prisma.activity.findMany({
        where: {
            id: { in: activityIds },
            userId,
            aiFeedback: { is: null }
        },
        select: {
            id: true,
            feedbackJob: {
                select: {
                    id: true,
                    status: true
                }
            }
        }
    });

    if (activitiesWithoutFeedback.length === 0) {
        return 0;
    }

    let enqueuedCount = 0;

    for (const activity of activitiesWithoutFeedback) {
        if (!activity.feedbackJob) {
            await prisma.feedbackJob.create({
                data: {
                    userId,
                    activityId: activity.id,
                    priority,
                    status: 'PENDING'
                }
            });
            enqueuedCount++;
            continue;
        }

        if (activity.feedbackJob.status === 'FAILED' || activity.feedbackJob.status === 'DONE') {
            await prisma.feedbackJob.update({
                where: { id: activity.feedbackJob.id },
                data: {
                    status: 'PENDING',
                    priority,
                    retryCount: 0,
                    nextRunAt: new Date(),
                    startedAt: null,
                    completedAt: null,
                    errorLog: null
                }
            });
            enqueuedCount++;
        }
    }

    if (enqueuedCount > 0) {
        logger.info(`Enqueued ${enqueuedCount} feedback jobs for user ${userId}`);
    }

    return enqueuedCount;
}

/**
 * Enqueue feedback jobs for a user's activities that don't have feedback yet.
 * Only enqueues if user's feedbackMode is 'auto' or 'both'.
 *
 * @param userId - The user ID
 * @param afterDate - Optional date to filter activities updated/created after this time
 */
export async function enqueueFeedbackJobsForUser(userId: string, afterDate?: Date): Promise<void> {
    if (!(await canAutoGenerateFeedback(userId))) {
        return;
    }

    const whereClause: {
        userId: string;
        aiFeedback: { is: null };
        OR?: Array<{ createdAt: { gte: Date } } | { updatedAt: { gte: Date } }>;
    } = {
        userId,
        aiFeedback: { is: null }
    };

    if (afterDate) {
        whereClause.OR = [
            { createdAt: { gte: afterDate } },
            { updatedAt: { gte: afterDate } }
        ];
    }

    const activitiesWithoutFeedback = await prisma.activity.findMany({
        where: whereClause,
        select: { id: true },
        orderBy: { startDate: 'desc' },
        take: 50
    });

    if (activitiesWithoutFeedback.length === 0) {
        return;
    }

    await enqueueFeedbackJobsForActivities(
        userId,
        activitiesWithoutFeedback.map((activity) => activity.id)
    );
}

/**
 * Formats activity details into a string block for the AI prompt.
 */
export function formatActivityForAi(ctx: NonNullable<Awaited<ReturnType<typeof buildActivityContext>>>): string {
    const a = ctx.activity;
    let str = `Activity: ${fenceUntrusted(a.name)}\n`;
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
        str += `Description: ${fenceUntrusted(ctx.plannedWorkout.description)}\n`;
        if (ctx.plannedWorkout.targetDistance) str += `Target distance: ${(ctx.plannedWorkout.targetDistance / 1000).toFixed(1)}km\n`;
        if (ctx.plannedWorkout.targetPace) str += `Target pace: ${Math.floor(ctx.plannedWorkout.targetPace / 60)}:${Math.floor(ctx.plannedWorkout.targetPace % 60).toString().padStart(2, '0')}/km\n`;
    } else {
        str += `\nNo specific workout was planned for this day.\n`;
    }

    return str;
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

    // Generate all feedback in a single AI request
    const systemPromptMessage: string = `You are a running coach analyzing an athlete's activity.\n\n--- Athlete Profile ---\n${baseContext}\n\n${ACTIVITY_FEEDBACK_PROMPTS.combined}`;
    const userMessage: string = `Here's the activity to analyze:\n\n${activityStr}`;

    const { generateCompletion } = await import('@/lib/ai/providers');
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPromptMessage },
        { role: 'user', content: userMessage },
    ];

    const raw = await generateCompletion(providerConfig, messages, signal);

    // Strip <think> blocks that some models (e.g. DeepSeek) emit before parsing.
    // These blocks often echo back the prompt including section names, which confuses
    // the section parser if left in.
    let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Also handle unclosed <think> tags (model cut off mid-thought)
    const openThinkIdx = cleaned.indexOf('<think>');
    if (openThinkIdx !== -1) {
        cleaned = cleaned.substring(0, openThinkIdx).trim();
    }
    // If stripping removed everything, fall back to raw
    if (!cleaned) {
        cleaned = raw;
    }

    // Parse the combined response into the 3 sections using markdown headers.
    // We look for ## headers first, then fall back to keyword search.
    const sections: Record<string, string> = {};
    const lowerCleaned = cleaned.toLowerCase();

    // Strategy 1: Look for markdown headers (## Planned Comparison, etc.)
    const headerPatterns = [
        { key: 'plannedComparison', pattern: /^#{1,3}\s*(?:planned\s+comparison|vs\.?\s*planned\s*workout)/gim },
        { key: 'progressAnalysis', pattern: /^#{1,3}\s*(?:progress\s+(?:analysis|&\s*execution)|progress\s+and\s+execution)/gim },
        { key: 'goalTrajectory', pattern: /^#{1,3}\s*goal\s+trajectory/gim },
    ];

    // Find header positions
    let headerPositions: { key: string; index: number; matchEnd: number }[] = [];
    for (const hp of headerPatterns) {
        const match = hp.pattern.exec(cleaned);
        if (match) {
            headerPositions.push({ key: hp.key, index: match.index, matchEnd: match.index + match[0].length });
        }
    }
    headerPositions.sort((a, b) => a.index - b.index);

    if (headerPositions.length >= 2) {
        // Use header-based parsing
        for (let i = 0; i < headerPositions.length; i++) {
            const contentStart = headerPositions[i].matchEnd;
            const contentEnd = i + 1 < headerPositions.length ? headerPositions[i + 1].index : cleaned.length;
            let sectionContent = cleaned.slice(contentStart, contentEnd).trim();
            // Remove leading colons, dashes, newlines
            sectionContent = sectionContent.replace(/^[:\s\-*>]+/, '').trim();
            // Remove trailing markdown noise
            sectionContent = sectionContent.replace(/[#*>\-\s:]+$/, '').trim();
            sections[headerPositions[i].key] = sectionContent;
        }
    } else {
        // Strategy 2: Fall back to keyword search (for models that don't use markdown headers)
        const markers = [
            { key: 'plannedComparison', label: 'planned comparison' },
            { key: 'progressAnalysis', label: 'progress analysis' },
            { key: 'goalTrajectory', label: 'goal trajectory' }
        ];

        const found = markers
            .map(m => ({ ...m, index: lowerCleaned.indexOf(m.label) }))
            .filter(m => m.index !== -1)
            .sort((a, b) => a.index - b.index);

        if (found.length > 0) {
            for (let i = 0; i < found.length; i++) {
                const start = found[i].index + found[i].label.length;
                let actualStart = start;
                while (actualStart < cleaned.length && /[:\s#*>\-]/.test(cleaned[actualStart])) {
                    actualStart++;
                }
                const end = i + 1 < found.length ? found[i + 1].index : cleaned.length;
                let sectionContent = cleaned.slice(actualStart, end).trim();
                sectionContent = sectionContent.replace(/[#*>\-\s:]+$/, '').trim();
                sections[found[i].key as string] = sectionContent;
            }
        }
    }

    // Fallback: If no sections were parsed, or they are all empty, put the entire cleaned response in progressAnalysis
    let plannedComparison = sections.plannedComparison || '';
    let progressAnalysis = sections.progressAnalysis || '';
    let goalTrajectory = sections.goalTrajectory || '';

    if (!plannedComparison && !progressAnalysis && !goalTrajectory && cleaned.trim()) {
        progressAnalysis = cleaned.trim();
    }

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
