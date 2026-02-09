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
    tier: string;
    tierName: string;
    reason?: string;
}

/**
 * Get limits for a usage tier
 */
function getTierLimits(tier: string, globalSettings: any): { daily: number; monthly: number; name: string } {
    if (!globalSettings) {
        return { daily: 0, monthly: 0, name: 'No Access' };
    }

    switch (tier) {
        case 'tier1':
            return {
                daily: globalSettings.tier1DailyLimit ?? 10,
                monthly: globalSettings.tier1MonthlyLimit ?? 100,
                name: globalSettings.tier1Name ?? 'Basic'
            };
        case 'tier2':
            return {
                daily: globalSettings.tier2DailyLimit ?? 25,
                monthly: globalSettings.tier2MonthlyLimit ?? 300,
                name: globalSettings.tier2Name ?? 'Standard'
            };
        case 'tier3':
            return {
                daily: globalSettings.tier3DailyLimit ?? 50,
                monthly: globalSettings.tier3MonthlyLimit ?? 500,
                name: globalSettings.tier3Name ?? 'Premium'
            };
        case 'none':
        default:
            return { daily: 0, monthly: 0, name: 'Bring Your Own Key' };
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
            tier: usageTier,
            tierName: tierLimits.name,
            reason: 'Add your own API key to use AI features',
        };
    }

    // Reset counters if needed
    const now = new Date();
    const lastReset = new Date(userSettings.lastUsageReset);
    let messagesUsedToday = userSettings.messagesUsedToday;
    let messagesUsedThisMonth = userSettings.messagesUsedThisMonth;

    // Reset daily counter if it's a new day
    if (now.toDateString() !== lastReset.toDateString()) {
        messagesUsedToday = 0;
    }

    // Reset monthly counter if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        messagesUsedThisMonth = 0;
    }

    const dailyLimit = tierLimits.daily;
    const monthlyLimit = tierLimits.monthly;

    // Check limits
    if (messagesUsedToday >= dailyLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: `Daily limit reached (${dailyLimit} messages/day)`,
        };
    }

    if (messagesUsedThisMonth >= monthlyLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
            tier: usageTier,
            tierName: tierLimits.name,
            reason: `Monthly limit reached (${monthlyLimit} messages/month)`,
        };
    }

    return {
        canUse: true,
        messagesUsedToday,
        messagesUsedThisMonth,
        dailyLimit,
        monthlyLimit,
        tier: usageTier,
        tierName: tierLimits.name,
    };
}

/**
 * Increment usage counters for a user
 * Called after each successful AI message
 */
export async function incrementUsage(userId: string): Promise<void> {
    const now = new Date();

    // Get current settings
    const settings = await prisma.userAiSettings.findUnique({
        where: { userId },
    });

    if (!settings) return;

    const lastReset = new Date(settings.lastUsageReset);
    let messagesUsedToday = settings.messagesUsedToday;
    let messagesUsedThisMonth = settings.messagesUsedThisMonth;

    // Reset if needed
    if (now.toDateString() !== lastReset.toDateString()) {
        messagesUsedToday = 0;
    }
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        messagesUsedThisMonth = 0;
    }

    // Increment
    await prisma.userAiSettings.update({
        where: { userId },
        data: {
            messagesUsedToday: messagesUsedToday + 1,
            messagesUsedThisMonth: messagesUsedThisMonth + 1,
            lastUsageReset: now,
        },
    });
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
            lastUsageReset: new Date(),
        },
    });
    return result.count;
}
