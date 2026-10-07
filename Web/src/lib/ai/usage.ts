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
 * Result of an atomic usage reservation (see reserveUsageSlot).
 */
export interface UsageReservation {
    allowed: boolean;
    /**
     * True when a tier quota unit was actually claimed with a conditional
     * updateMany. Only then does the caller owe a releaseUsageReservation()
     * refund when the request fails before delivering a response.
     */
    claimed: boolean;
    reason?: string;
}

/**
 * Atomically reserve one chat message against the user's tier quotas BEFORE
 * any provider work (context building, intent classification, streaming).
 *
 * Quota-overshoot fix: the chat routes used to gate admission on a read-only
 * checkUsageLimit() and only increment the counters after the provider stream
 * completed. Concurrent in-flight requests were therefore all admitted against
 * the same stale counter snapshot and pushed messages/tokens past the daily
 * and monthly caps by up to one in-flight burst. This reservation is a single
 * conditional UPDATE whose WHERE clause is the quota gate, so of N concurrent
 * requests at most the remaining headroom can be admitted; incrementUsage()
 * afterwards settles the token deltas.
 */
export async function reserveUsageSlot(userId: string): Promise<UsageReservation> {
    const [userSettings, globalSettings] = await Promise.all([
        prisma.userAiSettings.findUnique({ where: { userId } }),
        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
    ]);

    if (!userSettings) {
        return { allowed: false, claimed: false, reason: 'AI not configured' };
    }

    // Users with their own API key are not billed against platform tiers.
    if (userSettings.customApiKey) {
        return { allowed: true, claimed: false };
    }

    const tier = userSettings.usageTier || 'none';
    if (tier === 'none') {
        return { allowed: false, claimed: false, reason: 'Add your own API key to use AI features' };
    }

    const limits = getTierLimits(tier, globalSettings);

    // Lazy day/month rollover so stale counters from a previous period cannot
    // block (or admit) today's traffic. Expressed in WHERE clauses;
    // lastUsageReset is not written here so the rollover stays idempotent —
    // the claim below stamps it.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

    await prisma.userAiSettings.updateMany({
        where: { userId, lastUsageReset: { lt: startOfToday } },
        data: {
            messagesUsedToday: 0,
            inputTokensUsedToday: 0,
            outputTokensUsedToday: 0,
        },
    });
    await prisma.userAiSettings.updateMany({
        where: { userId, lastUsageReset: { lt: startOfMonth } },
        data: {
            messagesUsedThisMonth: 0,
            inputTokensUsedThisMonth: 0,
            outputTokensUsedThisMonth: 0,
        },
    });

    // Atomic conditional increment: the UPDATE only matches while EVERY
    // counter is still below its cap, so concurrent in-flight requests can no
    // longer all pass on the same stale snapshot.
    const result = await prisma.userAiSettings.updateMany({
        where: {
            userId,
            messagesUsedToday: { lt: limits.daily },
            messagesUsedThisMonth: { lt: limits.monthly },
            inputTokensUsedToday: { lt: limits.dailyTokens },
            outputTokensUsedToday: { lt: limits.dailyTokens },
            inputTokensUsedThisMonth: { lt: limits.monthlyTokens },
            outputTokensUsedThisMonth: { lt: limits.monthlyTokens },
        },
        data: {
            messagesUsedToday: { increment: 1 },
            messagesUsedThisMonth: { increment: 1 },
            lastUsageReset: new Date(),
        },
    });

    if (result.count === 0) {
        return { allowed: false, claimed: false, reason: 'Daily or monthly AI message/token limit reached' };
    }
    return { allowed: true, claimed: true };
}

/**
 * Best-effort release of a message slot claimed by reserveUsageSlot() when the
 * request failed before delivering a response. Guarded decrements keep the
 * counters non-negative even if a rollover already reset them.
 */
export async function releaseUsageReservation(userId: string): Promise<void> {
    await prisma.userAiSettings.updateMany({
        where: {
            userId,
            messagesUsedToday: { gt: 0 },
            messagesUsedThisMonth: { gt: 0 },
        },
        data: {
            messagesUsedToday: { decrement: 1 },
            messagesUsedThisMonth: { decrement: 1 },
        },
    });
}

/**
 * Options for incrementUsage.
 */
export interface IncrementUsageOptions {
    /**
     * Set when a chat route already counted this message atomically via
     * reserveUsageSlot() before the provider call. Settling then records only
     * the token deltas so the message counters advance exactly once per chat.
     */
    messagesAlreadyCounted?: boolean;
}

/**
 * Increment usage counters for a user
 * Called after each successful AI message
 *
 * D-H2 / AI-H3: Uses Prisma's atomic `increment` operator so concurrent requests
 * cannot lose updates. The daily/monthly reset is applied by writing the delta
 * directly (set) instead of incrementing when a reset is due. The reset *decision*
 * is still based on a read, so two concurrent requests that both observe a day
 * change will both set the counter to its delta — that over-counts by at most the
 * number of concurrent requests in the reset instant, which is far better than the
 * previous unbounded lost-update (quota bypass). The common increment path is
 * fully atomic.
 *
 * Chat routes that reserved a slot via reserveUsageSlot() pass
 * `{ messagesAlreadyCounted: true }` so the message counters (already advanced
 * by the reservation) are left untouched and only the token deltas settle here.
 */
export async function incrementUsage(
    userId: string,
    tokenStats?: { inputTokens: number; outputTokens: number },
    providerId?: string,
    options?: IncrementUsageOptions
): Promise<void> {
    const now = new Date();
    const inputDelta = tokenStats?.inputTokens || 0;
    const outputDelta = tokenStats?.outputTokens || 0;
    const messagesAlreadyCounted = options?.messagesAlreadyCounted === true;

    // Fetch settings to decide whether a reset is due (read is fine for the *decision*;
    // the write below is atomic so concurrent increments don't lose updates).
    const settings = await prisma.userAiSettings.findUnique({
        where: { userId },
    });

    if (!settings) return;

    const lastReset = new Date(settings.lastUsageReset);
    const dayChanged = now.toDateString() !== lastReset.toDateString();
    const monthChanged = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    // Single atomic update. If a reset is due, set counters to their delta (not increment);
    // otherwise increment. This is still technically racy on the *reset decision* (two requests
    // could both see dayChanged=true and both set messagesUsedToday=1), but that only over-counts
    // by the number of concurrent requests in the reset instant — far better than the current
    // unbounded lost-update. The increment path (the common case) is fully atomic.
    // `undefined` fields are skipped by Prisma: when the caller already counted the
    // message via reserveUsageSlot(), the message counters are not written again.
    const dayFields = {
        messagesUsedToday: messagesAlreadyCounted ? undefined : (dayChanged ? 1 : { increment: 1 }),
        inputTokensUsedToday: dayChanged ? inputDelta : { increment: inputDelta },
        outputTokensUsedToday: dayChanged ? outputDelta : { increment: outputDelta },
    };

    const monthFields = {
        messagesUsedThisMonth: messagesAlreadyCounted ? undefined : (monthChanged ? 1 : { increment: 1 }),
        inputTokensUsedThisMonth: monthChanged ? inputDelta : { increment: inputDelta },
        outputTokensUsedThisMonth: monthChanged ? outputDelta : { increment: outputDelta },
    };

    await prisma.userAiSettings.update({
        where: { userId },
        data: { ...dayFields, ...monthFields, lastUsageReset: now },
    });

    // 2. Update Provider Usage (if providerId is supplied) — same atomic pattern
    if (providerId) {
        const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
        if (provider) {
            const pLastReset = new Date(provider.lastUsageReset);
            const pMonthChanged = now.getMonth() !== pLastReset.getMonth() || now.getFullYear() !== pLastReset.getFullYear();

            const providerFields = pMonthChanged
                ? { monthlyInputTokensUsed: inputDelta, monthlyOutputTokensUsed: outputDelta }
                : { monthlyInputTokensUsed: { increment: inputDelta }, monthlyOutputTokensUsed: { increment: outputDelta } };

            await prisma.aiProvider.update({
                where: { id: providerId },
                data: { ...providerFields, lastUsageReset: now },
            });

            // 3. Log Daily Token Usage for Analytics
            const today = new Date();
            today.setHours(0, 0, 0, 0); // UTC Midnight ideally, but server time is fine for now

            await prisma.aiDailyTokenUsage.upsert({
                where: {
                    date_providerId: {
                        date: today,
                        providerId: providerId
                    }
                },
                update: {
                    inputTokens: { increment: inputDelta },
                    outputTokens: { increment: outputDelta }
                },
                create: {
                    date: today,
                    providerId: providerId,
                    inputTokens: inputDelta,
                    outputTokens: outputDelta
                }
            });

            // 4. Create Granular Usage History Record
            await prisma.aiUsageHistory.create({
                data: {
                    userId: userId,
                    providerId: providerId,
                    inputTokens: inputDelta,
                    outputTokens: outputDelta,
                    timestamp: now
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
