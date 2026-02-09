/**
 * AI Usage Tracking - Daily/monthly limit management
 */

import { prisma } from '@/lib/db';

export interface UsageStatus {
    canUse: boolean;
    messagesUsedToday: number;
    messagesUsedThisMonth: number;
    dailyLimit: number;
    monthlyLimit: number;
    reason?: string;
}

/**
 * Check if a user can use AI (within limits)
 */
export async function checkUsageLimit(userId: string): Promise<UsageStatus> {
    const [userSettings, globalSettings] = await Promise.all([
        prisma.userAiSettings.findUnique({ where: { userId } }),
        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
    ]);

    const dailyLimit = globalSettings?.dailyMessageLimit ?? 50;
    const monthlyLimit = globalSettings?.monthlyMessageLimit ?? 500;

    // If user has their own API key, no limits apply
    if (userSettings?.customApiKey) {
        return {
            canUse: true,
            messagesUsedToday: userSettings.messagesUsedToday,
            messagesUsedThisMonth: userSettings.messagesUsedThisMonth,
            dailyLimit: Infinity,
            monthlyLimit: Infinity,
        };
    }

    if (!userSettings) {
        return {
            canUse: false,
            messagesUsedToday: 0,
            messagesUsedThisMonth: 0,
            dailyLimit,
            monthlyLimit,
            reason: 'AI not configured',
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

    // Check limits
    if (messagesUsedToday >= dailyLimit) {
        return {
            canUse: false,
            messagesUsedToday,
            messagesUsedThisMonth,
            dailyLimit,
            monthlyLimit,
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
            reason: `Monthly limit reached (${monthlyLimit} messages/month)`,
        };
    }

    return {
        canUse: true,
        messagesUsedToday,
        messagesUsedThisMonth,
        dailyLimit,
        monthlyLimit,
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
