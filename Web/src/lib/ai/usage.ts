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
 * Unified default chat/token limits per tier (matches prisma/schema.prisma GlobalAiSettings defaults)
 */
export const DEFAULT_TIER_CHAT_LIMITS = {
    tier1: { name: 'Basic', daily: 10, monthly: 100, dailyTokens: 50000, monthlyTokens: 500000 },
    tier2: { name: 'Standard', daily: 25, monthly: 300, dailyTokens: 100000, monthlyTokens: 1000000 },
    tier3: { name: 'Premium', daily: 50, monthly: 500, dailyTokens: 200000, monthlyTokens: 2000000 },
} as const;

/**
 * Unified default per-day feature quotas per tier (matches prisma/schema.prisma GlobalAiSettings defaults)
 */
export const DEFAULT_FEATURE_DAILY_LIMITS = {
    calorieSnap: { tier1: 1, tier2: 3, tier3: 6 },
    mealSuggest: { tier1: 3, tier2: 10, tier3: 25 },
    activityFeedback: { tier1: 5, tier2: 15, tier3: 50 },
} as const;

export type LimitedAiFeature = keyof typeof DEFAULT_FEATURE_DAILY_LIMITS;

export interface FeatureLimitSettings {
    tier1CalorieSnapLimit?: number | null;
    tier2CalorieSnapLimit?: number | null;
    tier3CalorieSnapLimit?: number | null;
    tier1MealSuggestLimit?: number | null;
    tier2MealSuggestLimit?: number | null;
    tier3MealSuggestLimit?: number | null;
    tier1ActivityFeedbackLimit?: number | null;
    tier2ActivityFeedbackLimit?: number | null;
    tier3ActivityFeedbackLimit?: number | null;
}

export function getFeatureDailyLimit(
    feature: LimitedAiFeature,
    tier: string,
    globalSettings?: FeatureLimitSettings | null
): number {
    const defaults = DEFAULT_FEATURE_DAILY_LIMITS[feature];
    const resolvedTier = tier === 'tier1' || tier === 'tier2' || tier === 'tier3' ? tier : 'tier1';

    if (feature === 'calorieSnap') {
        const limits = {
            tier1: globalSettings?.tier1CalorieSnapLimit ?? defaults.tier1,
            tier2: globalSettings?.tier2CalorieSnapLimit ?? defaults.tier2,
            tier3: globalSettings?.tier3CalorieSnapLimit ?? defaults.tier3,
        };
        return limits[resolvedTier];
    }

    if (feature === 'mealSuggest') {
        const limits = {
            tier1: globalSettings?.tier1MealSuggestLimit ?? defaults.tier1,
            tier2: globalSettings?.tier2MealSuggestLimit ?? defaults.tier2,
            tier3: globalSettings?.tier3MealSuggestLimit ?? defaults.tier3,
        };
        return limits[resolvedTier];
    }

    const limits = {
        tier1: globalSettings?.tier1ActivityFeedbackLimit ?? defaults.tier1,
        tier2: globalSettings?.tier2ActivityFeedbackLimit ?? defaults.tier2,
        tier3: globalSettings?.tier3ActivityFeedbackLimit ?? defaults.tier3,
    };
    return limits[resolvedTier];
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
                daily: globalSettings.tier1DailyLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier1.daily,
                monthly: globalSettings.tier1MonthlyLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier1.monthly,
                name: globalSettings.tier1Name ?? DEFAULT_TIER_CHAT_LIMITS.tier1.name,
                dailyTokens: globalSettings.tier1DailyTokenLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier1.dailyTokens,
                monthlyTokens: globalSettings.tier1MonthlyTokenLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier1.monthlyTokens,
            };
        case 'tier2':
            return {
                daily: globalSettings.tier2DailyLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier2.daily,
                monthly: globalSettings.tier2MonthlyLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier2.monthly,
                name: globalSettings.tier2Name ?? DEFAULT_TIER_CHAT_LIMITS.tier2.name,
                dailyTokens: globalSettings.tier2DailyTokenLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier2.dailyTokens,
                monthlyTokens: globalSettings.tier2MonthlyTokenLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier2.monthlyTokens,
            };
        case 'tier3':
            return {
                daily: globalSettings.tier3DailyLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier3.daily,
                monthly: globalSettings.tier3MonthlyLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier3.monthly,
                name: globalSettings.tier3Name ?? DEFAULT_TIER_CHAT_LIMITS.tier3.name,
                dailyTokens: globalSettings.tier3DailyTokenLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier3.dailyTokens,
                monthlyTokens: globalSettings.tier3MonthlyTokenLimit ?? DEFAULT_TIER_CHAT_LIMITS.tier3.monthlyTokens,
            };
        case 'none':
        default:
            return { daily: 0, monthly: 0, name: 'Bring Your Own Key', dailyTokens: 0, monthlyTokens: 0 };
    }
}

export function isByokActive(
    userSettings?: { customApiKey?: string | null; usageTier?: string | null } | null
): boolean {
    return Boolean(userSettings?.customApiKey && (userSettings.usageTier || 'none') === 'none');
}

export async function ensurePeriodUsageReset(userId: string): Promise<void> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. If lastUsageReset is from a previous month, reset BOTH monthly and daily counters atomically
    await prisma.userAiSettings.updateMany({
        where: { userId, lastUsageReset: { lt: startOfMonth } },
        data: {
            messagesUsedToday: 0,
            messagesUsedThisMonth: 0,
            inputTokensUsedToday: 0,
            outputTokensUsedToday: 0,
            inputTokensUsedThisMonth: 0,
            outputTokensUsedThisMonth: 0,
            calorieSnapsUsedToday: 0,
            mealSuggestsUsedToday: 0,
            activityFeedbackUsedToday: 0,
            lastUsageReset: now,
        },
    });

    // 2. If lastUsageReset is from earlier this month (before startOfToday), reset ALL daily counters atomically
    await prisma.userAiSettings.updateMany({
        where: { userId, lastUsageReset: { gte: startOfMonth, lt: startOfToday } },
        data: {
            messagesUsedToday: 0,
            inputTokensUsedToday: 0,
            outputTokensUsedToday: 0,
            calorieSnapsUsedToday: 0,
            mealSuggestsUsedToday: 0,
            activityFeedbackUsedToday: 0,
            lastUsageReset: now,
        },
    });
}

/**
 * Check if a user can use AI (within limits)
 */
export async function checkUsageLimit(userId: string): Promise<UsageStatus> {
    await ensurePeriodUsageReset(userId);

    const [userSettings, globalSettings] = await Promise.all([
        prisma.userAiSettings.findUnique({ where: { userId } }),
        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
    ]);

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

    // Enforce adminAllowed === true uniformly for BOTH managed and BYOK users
    if (!userSettings.adminAllowed) {
        const isByok = isByokActive(userSettings);
        const usageTier = isByok ? 'byok' : (userSettings.usageTier || 'none');
        const tierLimits = getTierLimits(isByok ? 'none' : usageTier, globalSettings);
        return {
            canUse: false,
            messagesUsedToday: userSettings.messagesUsedToday ?? 0,
            messagesUsedThisMonth: userSettings.messagesUsedThisMonth ?? 0,
            dailyLimit: 0,
            monthlyLimit: 0,
            tokensUsedToday: (userSettings.inputTokensUsedToday || 0) + (userSettings.outputTokensUsedToday || 0),
            tokensUsedThisMonth: (userSettings.inputTokensUsedThisMonth || 0) + (userSettings.outputTokensUsedThisMonth || 0),
            dailyTokenLimit: 0,
            monthlyTokenLimit: 0,
            tier: usageTier,
            tierName: isByok ? 'Your API Key' : tierLimits.name,
            reason: 'AI features are not enabled for your account',
        };
    }

    // If user has their own API key and usageTier is none (active BYOK), no limits apply
    if (isByokActive(userSettings)) {
        return {
            canUse: true,
            messagesUsedToday: userSettings.messagesUsedToday ?? 0,
            messagesUsedThisMonth: userSettings.messagesUsedThisMonth ?? 0,
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
 * Auto-reset a provider's monthly usage counters when crossing a month boundary.
 */
async function ensureProviderMonthReset(
    provider: { id: string; lastUsageReset: Date; monthlyInputTokensUsed: number; monthlyOutputTokensUsed: number },
    now: Date = new Date()
): Promise<boolean> {
    const lastReset = new Date(provider.lastUsageReset);
    const monthChanged = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
    if (!monthChanged) return false;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (typeof prisma.aiProvider.updateMany === 'function') {
        await prisma.aiProvider.updateMany({
            where: { id: provider.id, lastUsageReset: { lt: startOfMonth } },
            data: {
                monthlyInputTokensUsed: 0,
                monthlyOutputTokensUsed: 0,
                lastUsageReset: now,
            },
        });
    } else if (typeof prisma.aiProvider.update === 'function') {
        await prisma.aiProvider.update({
            where: { id: provider.id },
            data: {
                monthlyInputTokensUsed: 0,
                monthlyOutputTokensUsed: 0,
                lastUsageReset: now,
            },
        });
    }
    return true;
}

/**
 * Check if the active AI provider has sufficient quota
 */
export async function checkProviderLimit(providerId: string): Promise<{ canUse: boolean; reason?: string }> {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return { canUse: true };

    const now = new Date();
    const resetOccurred = await ensureProviderMonthReset(provider, now);

    // Check if limit is set (and not 0)
    if (!provider.monthlyTokenLimit || BigInt(provider.monthlyTokenLimit) <= BigInt(0)) {
        return { canUse: true };
    }

    const monthlyInput = resetOccurred ? 0 : (provider.monthlyInputTokensUsed || 0);
    const monthlyOutput = resetOccurred ? 0 : (provider.monthlyOutputTokensUsed || 0);
    const currentUsage = BigInt(monthlyInput + monthlyOutput);

    if (currentUsage >= BigInt(provider.monthlyTokenLimit)) {
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

    if (
        !userSettings.adminAllowed ||
        (userSettings.aiEnabled !== undefined && !userSettings.aiEnabled)
    ) {
        return { allowed: false, claimed: false, reason: 'AI features are not enabled for your account' };
    }

    // Users with active BYOK (customApiKey and usageTier === 'none') are not billed against platform tiers.
    if (isByokActive(userSettings)) {
        return { allowed: true, claimed: false };
    }

    const tier = userSettings.usageTier || 'none';
    if (tier === 'none') {
        return { allowed: false, claimed: false, reason: 'Add your own API key to use AI features' };
    }

    await ensurePeriodUsageReset(userId);

    const limits = getTierLimits(tier, globalSettings);
    const now = new Date();
    let claimedCount = 0;

    if (typeof (prisma as { $executeRaw?: unknown }).$executeRaw === 'function') {
        // Atomic conditional UPDATE enforcing combined (input + output) daily & monthly token caps.
        claimedCount = await prisma.$executeRaw`
            UPDATE "UserAiSettings"
            SET
                "messagesUsedToday" = "messagesUsedToday" + 1,
                "messagesUsedThisMonth" = "messagesUsedThisMonth" + 1,
                "lastUsageReset" = ${now}
            WHERE "userId" = ${userId}
              AND "messagesUsedToday" < ${limits.daily}
              AND "messagesUsedThisMonth" < ${limits.monthly}
              AND ("inputTokensUsedToday" + "outputTokensUsedToday") < ${limits.dailyTokens}
              AND ("inputTokensUsedThisMonth" + "outputTokensUsedThisMonth") < ${limits.monthlyTokens}
        `;
    } else {
        // Fallback for minimal unit-test mocks that do not implement $executeRaw:
        // enforce combined token cap via findUnique pre-check + atomic updateMany.
        const freshSettings = await prisma.userAiSettings.findUnique({ where: { userId } });
        if (!freshSettings) {
            return { allowed: false, claimed: false, reason: 'AI not configured' };
        }
        const combinedDailyTokens =
            (freshSettings.inputTokensUsedToday || 0) + (freshSettings.outputTokensUsedToday || 0);
        const combinedMonthlyTokens =
            (freshSettings.inputTokensUsedThisMonth || 0) + (freshSettings.outputTokensUsedThisMonth || 0);
        if (combinedDailyTokens >= limits.dailyTokens || combinedMonthlyTokens >= limits.monthlyTokens) {
            return { allowed: false, claimed: false, reason: 'Daily or monthly AI message/token limit reached' };
        }

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
                lastUsageReset: now,
            },
        });
        claimedCount = result.count;
    }

    if (claimedCount === 0) {
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
    skipMessageIncrement?: boolean;
    /**
     * Optional model identifier persisted into AiUsageHistory.model for per-model analytics.
     */
    model?: string;
}

/**
 * Increment monthly provider token counters (auto-resetting across month boundaries),
 * daily analytics rollup, and optional granular usage history.
 */
export async function incrementProviderUsage(
    providerId: string,
    tokenStats: { inputTokens: number; outputTokens: number },
    options?: { userId?: string; model?: string; now?: Date }
): Promise<void> {
    const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return;

    const now = options?.now ?? new Date();
    const inputDelta = tokenStats.inputTokens || 0;
    const outputDelta = tokenStats.outputTokens || 0;

    if (typeof prisma.aiProvider.updateMany === 'function') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        await prisma.aiProvider.updateMany({
            where: { id: providerId, lastUsageReset: { lt: startOfMonth } },
            data: {
                monthlyInputTokensUsed: 0,
                monthlyOutputTokensUsed: 0,
                lastUsageReset: now,
            },
        });
        await prisma.aiProvider.update({
            where: { id: providerId },
            data: {
                monthlyInputTokensUsed: { increment: inputDelta },
                monthlyOutputTokensUsed: { increment: outputDelta },
                lastUsageReset: now,
            },
        });
    } else {
        const pLastReset = new Date(provider.lastUsageReset);
        const pMonthChanged = now.getMonth() !== pLastReset.getMonth() || now.getFullYear() !== pLastReset.getFullYear();

        const providerFields = pMonthChanged
            ? { monthlyInputTokensUsed: inputDelta, monthlyOutputTokensUsed: outputDelta }
            : { monthlyInputTokensUsed: { increment: inputDelta }, monthlyOutputTokensUsed: { increment: outputDelta } };

        await prisma.aiProvider.update({
            where: { id: providerId },
            data: { ...providerFields, lastUsageReset: now },
        });
    }

    // Log Daily Token Usage for Analytics
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    await prisma.aiDailyTokenUsage.upsert({
        where: {
            date_providerId: {
                date: today,
                providerId,
            },
        },
        update: {
            inputTokens: { increment: inputDelta },
            outputTokens: { increment: outputDelta },
        },
        create: {
            date: today,
            providerId,
            inputTokens: inputDelta,
            outputTokens: outputDelta,
        },
    });

    // Create Granular Usage History Record
    if (options?.userId) {
        await prisma.aiUsageHistory.create({
            data: {
                userId: options.userId,
                providerId,
                model: options.model ?? undefined,
                inputTokens: inputDelta,
                outputTokens: outputDelta,
                timestamp: now,
            },
        });
    }
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
 * `{ messagesAlreadyCounted: true }` or `{ skipMessageIncrement: true }` so the
 * message counters (already advanced by the reservation) are left untouched and
 * only the token deltas settle here.
 */
export async function incrementUsage(
    userId: string,
    tokenStatsOrInput?: { inputTokens: number; outputTokens: number } | number,
    providerIdOrOutput?: string | number,
    optionsOrProviderId?: IncrementUsageOptions | string,
    maybeOptions?: IncrementUsageOptions
): Promise<void> {
    await ensurePeriodUsageReset(userId);

    let tokenStats: { inputTokens: number; outputTokens: number } | undefined;
    let providerId: string | undefined;
    let options: IncrementUsageOptions | undefined;

    if (typeof tokenStatsOrInput === 'number') {
        tokenStats = {
            inputTokens: tokenStatsOrInput,
            outputTokens: typeof providerIdOrOutput === 'number' ? providerIdOrOutput : 0,
        };
        providerId = typeof optionsOrProviderId === 'string' ? optionsOrProviderId : undefined;
        options = maybeOptions || (typeof optionsOrProviderId === 'object' ? optionsOrProviderId : undefined);
    } else {
        tokenStats = tokenStatsOrInput;
        providerId = typeof providerIdOrOutput === 'string' ? providerIdOrOutput : undefined;
        options = typeof optionsOrProviderId === 'object' ? optionsOrProviderId : undefined;
    }

    const now = new Date();
    const inputDelta = tokenStats?.inputTokens || 0;
    const outputDelta = tokenStats?.outputTokens || 0;
    const messagesAlreadyCounted = options?.messagesAlreadyCounted === true || options?.skipMessageIncrement === true;

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

    // 2. Update Provider Usage (if providerId is supplied) — only if not active BYOK
    if (providerId && !isByokActive(settings)) {
        await incrementProviderUsage(
            providerId,
            { inputTokens: inputDelta, outputTokens: outputDelta },
            { userId, model: options?.model, now }
        );
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
