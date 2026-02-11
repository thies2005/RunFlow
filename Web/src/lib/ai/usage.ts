/**
 * AI Usage Tracking - Daily/monthly limit management with tiers
 */

import { prisma } from '@/lib/db';

export interface UsageStatus {
    canUse: boolean;
    messagesUsedToday: number;
    messagesUsedThisMonth: number;
    dailyLimit: number;
    monthlyLimit: number;

    // Token stats
    tokensUsedToday: number;
    tokensUsedThisMonth: number;
    dailyTokenLimit: number;
    monthlyTokenLimit: number;

    tier: string;
    tierName: string;
    reason?: string;
}

/**
 * Get limits for a usage tier
 */
function getTierLimits(tier: string, globalSettings: any): {
    daily: number;
    monthly: number;
    name: string;
    dailyTokens: number;
    monthlyTokens: number;
} {
    if (!globalSettings) {
        return { daily: 0, monthly: 0, name: 'No Access', dailyTokens: 0, monthlyTokens: 0 };
    }

    switch (tier) {
        case 'tier1':
            return {
                daily: globalSettings.tier1DailyLimit ?? 10,
                monthly: globalSettings.tier1MonthlyLimit ?? 100,
                name: globalSettings.tier1Name ?? 'Basic',
                dailyTokens: globalSettings.tier1DailyTokenLimit ?? 50000,
                monthlyTokens: globalSettings.tier1MonthlyTokenLimit ?? 500000,
            };
        case 'tier2':
            return {
                daily: globalSettings.tier2DailyLimit ?? 25,
                monthly: globalSettings.tier2MonthlyLimit ?? 300,
                name: globalSettings.tier2Name ?? 'Standard',
                dailyTokens: globalSettings.tier2DailyTokenLimit ?? 100000,
                monthlyTokens: globalSettings.tier2MonthlyTokenLimit ?? 1000000,
            };
        case 'tier3':
            return {
                daily: globalSettings.tier3DailyLimit ?? 50,
                monthly: globalSettings.tier3MonthlyLimit ?? 500,
                name: globalSettings.tier3Name ?? 'Premium',
                dailyTokens: globalSettings.tier3DailyTokenLimit ?? 200000,
                monthlyTokens: globalSettings.tier3MonthlyTokenLimit ?? 2000000,
            };
        case 'none':
        default:
            return { daily: 0, monthly: 0, name: 'Bring Your Own Key', dailyTokens: 0, monthlyTokens: 0 };
    }
}

/**
 * Check if a user can use AI (within limits)
 */
export async function checkUsageLimit(userId: string): Promise<UsageStatus> {
    const [userSettings, globalSettings] = await Promise.all([
        prisma.userAiSettings.findUnique({ where: { userId } }),
        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
    ]);

    // If user has their own API key, no limits apply
    if (userSettings?.customApiKey) {
        return {
            canUse: true,
            messagesUsedToday: userSettings.messagesUsedToday,
            messagesUsedThisMonth: userSettings.messagesUsedThisMonth,
            dailyLimit: Infinity,
            monthlyLimit: Infinity,

            tokensUsedToday: (userSettings.inputTokensUsedToday || 0) + (userSettings.outputTokensUsedToday || 0),
            tokensUsedThisMonth: (userSettings.inputTokensUsedThisMonth || 0) + (userSettings.outputTokensUsedThisMonth || 0),
            dailyTokenLimit: Infinity,
            monthlyTokenLimit: Infinity,

            tier: 'byok',
            tierName: 'Your API Key',
        };
    }

    if (!userSettings) {
        return {
            canUse: false,
            messagesUsedToday: 0,
            messagesUsedThisMonth: 0,
            dailyLimit: 0,
            monthlyLimit: 0,
            tokensUsedToday: 0,
            tokensUsedThisMonth: 0,
            dailyTokenLimit: 0,
            monthlyTokenLimit: 0,
            tier: 'none',
            tierName: 'Not Configured',
            reason: 'AI not configured',
        };
    }

    // Get tier-based limits
    const usageTier = userSettings.usageTier || 'none';
    const tierLimits = getTierLimits(usageTier, globalSettings);

    // "none" tier means BYOK only - no access without own key
    if (usageTier === 'none') {
        return {
            canUse: false,
            messagesUsedToday: userSettings.messagesUsedToday,
            messagesUsedThisMonth: userSettings.messagesUsedThisMonth,
            dailyLimit: 0,
            monthlyLimit: 0,
            tokensUsedToday: 0,
            tokensUsedThisMonth: 0,
            dailyTokenLimit: 0,
            monthlyTokenLimit: 0,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: 'Add your own API key to use AI features',
        };
    }

    // Reset logic (same as before but consider tokens too if needed, though simpler to just read what's there)
    // We rely on the increment function to handle resets, but for reading, we might see old data if no activity happened.
    // Ideally we'd reset on read if stale, but for now we just read.
    // Actually, let's do a quick check to see if we should report 0 based on date.

    const now = new Date();
    const lastReset = new Date(userSettings.lastUsageReset);
    let messagesUsedToday = userSettings.messagesUsedToday;
    let messagesUsedThisMonth = userSettings.messagesUsedThisMonth;

    let inputTokensUsedToday = userSettings.inputTokensUsedToday || 0;
    let outputTokensUsedToday = userSettings.outputTokensUsedToday || 0;
    let inputTokensUsedThisMonth = userSettings.inputTokensUsedThisMonth || 0;
    let outputTokensUsedThisMonth = userSettings.outputTokensUsedThisMonth || 0;

    // Reset daily counter if it's a new day
    if (now.toDateString() !== lastReset.toDateString()) {
        messagesUsedToday = 0;
        inputTokensUsedToday = 0;
        outputTokensUsedToday = 0;
    }

    // Reset monthly counter if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        messagesUsedThisMonth = 0;
        inputTokensUsedThisMonth = 0;
        outputTokensUsedThisMonth = 0;
    }

    const tokensUsedToday = inputTokensUsedToday + outputTokensUsedToday;
    const tokensUsedThisMonth = inputTokensUsedThisMonth + outputTokensUsedThisMonth;

    const dailyLimit = tierLimits.daily;
    const monthlyLimit = tierLimits.monthly;
    const dailyTokenLimit = tierLimits.dailyTokens;
    const monthlyTokenLimit = tierLimits.monthlyTokens;

    // Check message limits
    if (messagesUsedToday >= dailyLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
            tokensUsedToday,
            tokensUsedThisMonth,
            dailyTokenLimit,
            monthlyTokenLimit,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: `Daily message limit reached (${dailyLimit}/day)`,
        };
    }

    if (messagesUsedThisMonth >= monthlyLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
            tokensUsedToday,
            tokensUsedThisMonth,
            dailyTokenLimit,
            monthlyTokenLimit,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: `Monthly message limit reached (${monthlyLimit}/month)`,
        };
    }

    // Check token limits
    if (tokensUsedToday >= dailyTokenLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
            tokensUsedToday,
            tokensUsedThisMonth,
            dailyTokenLimit,
            monthlyTokenLimit,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: `Daily token limit reached`,
        };
    }

    if (tokensUsedThisMonth >= monthlyTokenLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
            tokensUsedToday,
            tokensUsedThisMonth,
            dailyTokenLimit,
            monthlyTokenLimit,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: `Monthly token limit reached`,
        };
    }

    return {
        canUse: true,
        messagesUsedToday,
        messagesUsedThisMonth,
        dailyLimit,
        monthlyLimit,
        tokensUsedToday,
        tokensUsedThisMonth,
        dailyTokenLimit,
        monthlyTokenLimit,
        tier: usageTier,
        tierName: tierLimits.name,
    };
}

/**
 * Check if the active AI provider has sufficient quota
 */
export async function checkProviderLimit(providerId: string): Promise<{ canUse: boolean; reason?: string }> {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return { canUse: true };

    // Check if limit is set (and not 0)
    if (!provider.monthlyTokenLimit || provider.monthlyTokenLimit === BigInt(0)) {
        return { canUse: true };
    }

    const now = new Date();
    const lastReset = new Date(provider.lastUsageReset);
    let monthlyInput = provider.monthlyInputTokensUsed;
    let monthlyOutput = provider.monthlyOutputTokensUsed;

    // Simulate reset if new month (actual reset happens in incrementUsage)
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        monthlyInput = 0;
        monthlyOutput = 0;
    }

    const currentUsage = BigInt(monthlyInput + monthlyOutput);

    // monthlyTokenLimit is BigInt
    if (currentUsage >= provider.monthlyTokenLimit) {
        return { canUse: false, reason: 'Provider monthly token limit exceeded' };
    }

    return { canUse: true };
}

/**
 * Increment usage counters for a user
 * Called after each successful AI message
 */
export async function incrementUsage(
    userId: string,
    tokenStats?: { inputTokens: number; outputTokens: number },
    providerId?: string
): Promise<void> {
    const now = new Date();

    // Get current settings
    const settings = await prisma.userAiSettings.findUnique({
        where: { userId },
    });

    if (!settings) return;

    const lastReset = new Date(settings.lastUsageReset);
    let messagesUsedToday = settings.messagesUsedToday;
    let messagesUsedThisMonth = settings.messagesUsedThisMonth;

    let inputTokensUsedToday = settings.inputTokensUsedToday || 0;
    let outputTokensUsedToday = settings.outputTokensUsedToday || 0;
    let inputTokensUsedThisMonth = settings.inputTokensUsedThisMonth || 0;
    let outputTokensUsedThisMonth = settings.outputTokensUsedThisMonth || 0;

    // Reset if needed
    if (now.toDateString() !== lastReset.toDateString()) {
        messagesUsedToday = 0;
        inputTokensUsedToday = 0;
        outputTokensUsedToday = 0;
    }
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        messagesUsedThisMonth = 0;
        inputTokensUsedThisMonth = 0;
        outputTokensUsedThisMonth = 0;
    }

    // Increment
    const inputDelta = tokenStats?.inputTokens || 0;
    const outputDelta = tokenStats?.outputTokens || 0;

    await prisma.userAiSettings.update({
        where: { userId },
        data: {
            messagesUsedToday: messagesUsedToday + 1,
            messagesUsedThisMonth: messagesUsedThisMonth + 1,

            // @ts-ignore
            inputTokensUsedToday: inputTokensUsedToday + inputDelta,
            // @ts-ignore
            outputTokensUsedToday: outputTokensUsedToday + outputDelta,
            // @ts-ignore
            inputTokensUsedThisMonth: inputTokensUsedThisMonth + inputDelta,
            // @ts-ignore
            outputTokensUsedThisMonth: outputTokensUsedThisMonth + outputDelta,

            // @ts-ignore
            lastUsageReset: now,
        },
    });

    // 2. Update Provider Usage (if providerId is supplied)
    if (providerId) {
        const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
        if (provider) {
            // @ts-ignore
            const lastReset = new Date(provider.lastUsageReset);
            // @ts-ignore
            let monthlyInput = provider.monthlyInputTokensUsed;
            // @ts-ignore
            let monthlyOutput = provider.monthlyOutputTokensUsed;

            // Reset monthly if new month
            if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                monthlyInput = 0;
                monthlyOutput = 0;
            }

            await prisma.aiProvider.update({
                where: { id: providerId },
                data: {
                    // @ts-ignore
                    monthlyInputTokensUsed: monthlyInput + inputDelta,
                    // @ts-ignore
                    monthlyOutputTokensUsed: monthlyOutput + outputDelta,
                    lastUsageReset: now
                }
            });
        }
    }
}

/**
 * Get usage stats for display
 */
export async function getUsageStats(userId: string): Promise<UsageStatus> {
    return checkUsageLimit(userId);
}

/**
 * Reset all users' daily counters (for cron job)
 */
export async function resetDailyUsage(): Promise<number> {
    const result = await prisma.userAiSettings.updateMany({
        data: {
            messagesUsedToday: 0,
            inputTokensUsedToday: 0,
            outputTokensUsedToday: 0,
            lastUsageReset: new Date(),
        },
    });
    return result.count;
}

/**
 * Reset all users' monthly counters (for cron job)
 */
export async function resetMonthlyUsage(): Promise<number> {
    const result = await prisma.userAiSettings.updateMany({
        data: {
            messagesUsedThisMonth: 0,
            inputTokensUsedThisMonth: 0,
            outputTokensUsedThisMonth: 0,
            lastUsageReset: new Date(),
        },
    });
    return result.count;
}
