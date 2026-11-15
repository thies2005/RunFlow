/**
 * Tier-by-Function AI Routing & Candidate Target Resolution
 *
 * Resolves ordered primary + fallback (provider, model) candidate targets for
 * every AI function and tier, handles BYOK protocol detection and SSRF checks,
 * and provides routing config portability helpers (scrubbing, slug translation).
 */

import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { AiProvider, GlobalAiSettings, UserAiSettings } from '@/generated/prisma/client';
import { logger } from '@/lib/logging/logger';
import { AiConfig, tryDecryptAiKey, validateBaseUrl } from './providers';
import { isByokActive } from './usage';
import { AiProviderError, AiProviderType } from './errors';

export const AI_FUNCTIONS = [
    'chat',
    'activityFeedback',
    'calorieSnap',
    'mealSuggest',
    'planBuilder',
    'healthInsights',
] as const;

export type AiFunction = (typeof AI_FUNCTIONS)[number];

export const AI_TIERS = ['tier1', 'tier2', 'tier3'] as const;

export type AiTier = (typeof AI_TIERS)[number];

export const ModelTargetSchema = z.object({
    providerId: z.string().trim().min(1),
    model: z.string().trim().min(1),
});

export const FunctionRouteConfigSchema = z.object({
    primary: ModelTargetSchema.optional(),
    fallbacks: z.array(ModelTargetSchema).optional(),
});

export const TierRouteConfigSchema = z.object({
    defaultPrimary: ModelTargetSchema.optional(),
    defaultFallbacks: z.array(ModelTargetSchema).optional(),
    functions: z.partialRecord(z.enum(AI_FUNCTIONS), FunctionRouteConfigSchema.optional()).optional(),
});

export const TierRoutingConfigSchema = z.object({
    tiers: z.partialRecord(z.enum(AI_TIERS), TierRouteConfigSchema.optional()),
});

export type ModelTarget = z.infer<typeof ModelTargetSchema>;
export type FunctionRouteConfig = z.infer<typeof FunctionRouteConfigSchema>;
export type TierRouteConfig = z.infer<typeof TierRouteConfigSchema>;
export type TierRoutingConfig = z.infer<typeof TierRoutingConfigSchema>;

export interface CandidateTarget extends AiConfig {
    provider: AiProviderType;
    baseUrl: string;
    apiKey: string;
    apiKeys: string[];
    model: string;
    providerId?: string;
    providerSlug?: string;
    providerName?: string;
    keyOverride?: boolean;
    allowedUrls?: string[];
    monthlyTokenLimit?: bigint | null;
    monthlyTokensUsed?: number;
    isByok?: boolean;
}

export type GlobalAiSettingsWithProviders = GlobalAiSettings & {
    activeProvider?: AiProvider | null;
    fallbackProvider?: AiProvider | null;
};

export interface ResolveCandidateTargetsResult {
    candidates: CandidateTarget[];
    userSettings: UserAiSettings;
    globalSettings: GlobalAiSettingsWithProviders | null;
}

/**
 * Safely parse and validate stored routingConfig JSON.
 * Returns null if raw is null/undefined or fails schema validation.
 */
export function parseRoutingConfig(raw: unknown): TierRoutingConfig | null {
    if (raw == null) return null;
    const parsed = TierRoutingConfigSchema.safeParse(raw);
    if (!parsed.success) {
        logger.warn('[AI Routing] Invalid routingConfig ignored', {
            issues: parsed.error.issues.slice(0, 5),
        });
        return null;
    }
    return parsed.data;
}

/**
 * Detect upstream API protocol from a BYOK base URL.
 * Returns 'google' ONLY when pointing at native Google Gemini endpoints
 * (not OpenAI-compatible Gemini endpoints containing '/openai').
 */
export function detectByokProviderType(baseUrl?: string | null): AiProviderType {
    if (!baseUrl) return 'openai';
    const lower = baseUrl.toLowerCase();
    if (lower.includes('generativelanguage.googleapis.com') && !lower.includes('/openai')) {
        return 'google';
    }
    if (lower.includes('api.anthropic.com')) {
        return 'anthropic';
    }
    return 'openai';
}

/**
 * Parse single or multi-key strings (comma, semicolon, newline, or JSON string array).
 */
export function parseApiKeys(rawKey: string | null | undefined): string[] {
    if (!rawKey) return [];
    const trimmed = rawKey.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter((entry): entry is string => typeof entry === 'string')
                    .map((entry) => entry.trim())
                    .filter(Boolean);
            }
        } catch {
            // Fall back to delimiter splitting if not valid JSON
        }
    }

    return trimmed
        .split(/[,;\n]+/)
        .map((key) => key.trim())
        .filter(Boolean);
}

function defaultModelForProtocol(protocol: AiProviderType): string {
    switch (protocol) {
        case 'google':
            return 'gemini-2.5-flash';
        case 'anthropic':
            return 'claude-3-5-sonnet-latest';
        case 'openai':
        default:
            return 'gpt-4o-mini';
    }
}

function getLegacyModelForFunction(
    globalSettings: GlobalAiSettings | null | undefined,
    fn: AiFunction
): string {
    switch (fn) {
        case 'activityFeedback':
            return globalSettings?.activityFeedbackModel || globalSettings?.defaultModel || 'gemini-1.5-flash';
        case 'calorieSnap':
            return globalSettings?.calorieSnapModel || globalSettings?.defaultModel || 'gemini-1.5-flash';
        case 'mealSuggest':
            return globalSettings?.mealSuggestModel || globalSettings?.defaultModel || 'gemini-1.5-flash';
        case 'planBuilder':
            return globalSettings?.planBuilderModel || globalSettings?.defaultModel || 'gpt-4o';
        case 'healthInsights':
        case 'chat':
        default:
            return globalSettings?.defaultModel || 'gpt-4o-mini';
    }
}

function isAiTier(value: string | null | undefined): value is AiTier {
    return value === 'tier1' || value === 'tier2' || value === 'tier3';
}

function normalizeProviderType(rawType: string): AiProviderType {
    if (rawType === 'anthropic' || rawType === 'google' || rawType === 'openai') {
        return rawType;
    }
    return 'openai';
}

function getEffectiveProviderMonthlyUsage(provider: AiProvider, now: Date): number {
    const lastReset = new Date(provider.lastUsageReset);
    if (
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()
    ) {
        return 0;
    }
    return (provider.monthlyInputTokensUsed || 0) + (provider.monthlyOutputTokensUsed || 0);
}

type SkipReason = 'missing_provider' | 'inactive' | 'monthly_limit_exceeded' | 'missing_key' | 'invalid_url';

/**
 * Resolve ordered candidate targets for a user and AI function.
 * Throws typed AiProviderError when disabled, unconfigured, or all providers exhausted.
 */
export async function resolveCandidateTargets(
    userId: string,
    fn: AiFunction,
    opts?: { modelOverride?: string }
): Promise<ResolveCandidateTargetsResult> {
    const [userSettings, globalSettings] = await Promise.all([
        prisma.userAiSettings.findUnique({ where: { userId } }),
        prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
            include: {
                activeProvider: true,
                fallbackProvider: true,
            },
        }),
    ]);

    // 1. Admin permission check applies uniformly to BOTH managed and BYOK users
    if (!userSettings || !userSettings.adminAllowed) {
        throw new AiProviderError({
            code: 'AI_DISABLED',
            httpStatus: 403,
            userMessage: 'AI access is not enabled for your account. Contact an administrator.',
        });
    }

    // 2. User opt-in toggle
    if (!userSettings.aiEnabled) {
        throw new AiProviderError({
            code: 'AI_DISABLED',
            httpStatus: 403,
            userMessage: 'AI features are currently disabled. Enable them in your AI settings.',
        });
    }

    // 3. BYOK mode (usageTier === 'none' + customApiKey)
    const usageTier = userSettings.usageTier || 'none';
    if (isByokActive(userSettings)) {
        const decryptedKey = tryDecryptAiKey(userSettings.customApiKey!, 'customApiKey', userId);
        const apiKeys = parseApiKeys(decryptedKey);
        if (!decryptedKey || apiKeys.length === 0) {
            throw new AiProviderError({
                code: 'NOT_CONFIGURED',
                httpStatus: 403,
                userMessage: 'No AI access tier assigned and no personal API key configured. Add your API key in AI Settings.',
            });
        }

        const baseUrl = userSettings.customBaseUrl?.trim() || 'https://api.openai.com/v1';
        if (!validateBaseUrl(baseUrl)) {
            throw new AiProviderError({
                code: 'NOT_CONFIGURED',
                httpStatus: 400,
                userMessage: 'Your custom AI Base URL is invalid or not allowed. Please check your AI settings.',
            });
        }

        const provider = detectByokProviderType(baseUrl);
        const model =
            opts?.modelOverride?.trim() ||
            userSettings.customModel?.trim() ||
            defaultModelForProtocol(provider);

        return {
            candidates: [
                {
                    provider,
                    baseUrl,
                    apiKey: apiKeys[0],
                    apiKeys,
                    model,
                    keyOverride: true,
                    isByok: true,
                    providerSlug: 'byok',
                    providerName: 'Personal API Key',
                },
            ],
            userSettings,
            globalSettings,
        };
    }

    if (!isAiTier(usageTier)) {
        throw new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 403,
            userMessage: 'No AI access tier assigned and no personal API key configured. Add your API key in AI Settings.',
        });
    }

    // 4. Managed tier resolution
    const allProviders = await prisma.aiProvider.findMany({
        orderBy: { createdAt: 'asc' },
    });
    const providerMap = new Map<string, AiProvider>();
    for (const p of allProviders) {
        providerMap.set(p.id, p);
    }

    const routingConfig = parseRoutingConfig(globalSettings?.routingConfig);
    const tierRoute = routingConfig?.tiers?.[usageTier];
    const fnRoute = tierRoute?.functions?.[fn];

    let primaryTarget: ModelTarget | undefined;
    if (fnRoute?.primary) {
        primaryTarget = fnRoute.primary;
    } else if (tierRoute?.defaultPrimary) {
        primaryTarget = tierRoute.defaultPrimary;
    } else {
        const legacyPrimaryProvider =
            (globalSettings?.activeProviderId
                ? providerMap.get(globalSettings.activeProviderId) ?? globalSettings.activeProvider
                : null) ||
            allProviders.find((p) => p.isActive) ||
            allProviders[0];

        if (legacyPrimaryProvider) {
            primaryTarget = {
                providerId: legacyPrimaryProvider.id,
                model: getLegacyModelForFunction(globalSettings, fn),
            };
        }
    }

    let fallbackTargets: ModelTarget[] = [];
    if (fnRoute?.fallbacks && fnRoute.fallbacks.length > 0) {
        fallbackTargets = fnRoute.fallbacks;
    } else if (tierRoute?.defaultFallbacks && tierRoute.defaultFallbacks.length > 0) {
        fallbackTargets = tierRoute.defaultFallbacks;
    } else if (globalSettings?.fallbackProviderId) {
        const fbProvider =
            providerMap.get(globalSettings.fallbackProviderId) ?? globalSettings.fallbackProvider;
        if (fbProvider) {
            const legacyFnModel = getLegacyModelForFunction(globalSettings, fn);
            const matchedModel = fbProvider.models.find(
                (m) => m.toLowerCase().trim() === legacyFnModel.toLowerCase().trim()
            );
            fallbackTargets = [
                {
                    providerId: fbProvider.id,
                    model: matchedModel || fbProvider.models[0] || legacyFnModel,
                },
            ];
        }
    }

    const rawTargets: ModelTarget[] = [];
    const overrideModel = opts?.modelOverride?.trim();
    if (overrideModel) {
        const lowerOverride = overrideModel.toLowerCase();
        const primaryProvider = primaryTarget ? providerMap.get(primaryTarget.providerId) : undefined;
        if (
            primaryProvider?.isActive &&
            primaryProvider.models.some((m) => m.toLowerCase().trim() === lowerOverride)
        ) {
            rawTargets.push({ providerId: primaryProvider.id, model: overrideModel });
        } else {
            const matchingProvider = allProviders.find(
                (p) => p.isActive && p.models.some((m) => m.toLowerCase().trim() === lowerOverride)
            );
            if (matchingProvider) {
                rawTargets.push({ providerId: matchingProvider.id, model: overrideModel });
            } else if (primaryTarget) {
                rawTargets.push({ providerId: primaryTarget.providerId, model: overrideModel });
            }
        }
    }

    if (primaryTarget) {
        rawTargets.push(primaryTarget);
    }
    rawTargets.push(...fallbackTargets);

    const seen = new Set<string>();
    const candidates: CandidateTarget[] = [];
    const skipReasons: SkipReason[] = [];
    const now = new Date();

    for (const target of rawTargets) {
        const dedupKey = `${target.providerId}::${target.model.toLowerCase().trim()}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const provider = providerMap.get(target.providerId);
        if (!provider) {
            skipReasons.push('missing_provider');
            continue;
        }
        if (!provider.isActive) {
            skipReasons.push('inactive');
            continue;
        }

        const effectiveMonthlyUsage = getEffectiveProviderMonthlyUsage(provider, now);
        if (
            provider.monthlyTokenLimit !== null &&
            provider.monthlyTokenLimit !== undefined &&
            provider.monthlyTokenLimit > BigInt(0) &&
            BigInt(effectiveMonthlyUsage) >= provider.monthlyTokenLimit
        ) {
            skipReasons.push('monthly_limit_exceeded');
            continue;
        }

        const decryptedKey = tryDecryptAiKey(provider.apiKey, 'aiProvider', provider.id);
        const apiKeys = parseApiKeys(decryptedKey);
        if (!decryptedKey || apiKeys.length === 0) {
            skipReasons.push('missing_key');
            continue;
        }

        if (!validateBaseUrl(provider.baseUrl, [provider.baseUrl])) {
            logger.warn('[AI Routing] Invalid provider baseUrl skipped', {
                providerId: provider.id,
                providerSlug: provider.slug,
            });
            skipReasons.push('invalid_url');
            continue;
        }

        candidates.push({
            provider: normalizeProviderType(provider.type),
            baseUrl: provider.baseUrl,
            apiKey: apiKeys[0],
            apiKeys,
            model: target.model,
            providerId: provider.id,
            providerSlug: provider.slug,
            providerName: provider.name,
            allowedUrls: [provider.baseUrl],
            monthlyTokenLimit: provider.monthlyTokenLimit,
            monthlyTokensUsed: effectiveMonthlyUsage,
        });
    }

    // Legacy GlobalAiSettings.defaultApiKey fallback when no AiProvider rows exist
    if (candidates.length === 0 && allProviders.length === 0 && globalSettings?.defaultApiKey) {
        const decryptedKey = tryDecryptAiKey(globalSettings.defaultApiKey, 'defaultApiKey');
        const apiKeys = parseApiKeys(decryptedKey);
        const baseUrl = globalSettings.defaultBaseUrl;
        if (decryptedKey && apiKeys.length > 0 && validateBaseUrl(baseUrl, [baseUrl])) {
            candidates.push({
                provider: 'openai',
                baseUrl,
                apiKey: apiKeys[0],
                apiKeys,
                model: overrideModel || getLegacyModelForFunction(globalSettings, fn),
                allowedUrls: [baseUrl],
            });
        }
    }

    if (candidates.length === 0) {
        if (skipReasons.includes('monthly_limit_exceeded')) {
            throw new AiProviderError({
                code: 'PROVIDER_QUOTA_EXCEEDED',
                httpStatus: 503,
                userMessage: 'All configured AI providers have reached their monthly token limit. Please try again next month or contact support.',
            });
        }

        throw new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 503,
            userMessage: 'AI service is not configured. Please contact an administrator or configure your own API key in AI Settings.',
        });
    }

    return {
        candidates,
        userSettings,
        globalSettings,
    };
}

function dedupeTargets(targets: ModelTarget[] | undefined): ModelTarget[] | undefined {
    if (!targets || targets.length === 0) return targets;
    const seen = new Set<string>();
    const deduped: ModelTarget[] = [];
    for (const target of targets) {
        const key = `${target.providerId}::${target.model.toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(target);
    }
    return deduped;
}

function transformRoutingTargets(
    rawConfig: unknown,
    mapTarget: (_target: ModelTarget) => ModelTarget | null
): TierRoutingConfig | null {
    const parsed = parseRoutingConfig(rawConfig);
    if (!parsed) return null;

    const nextTiers: TierRoutingConfig['tiers'] = {};

    for (const tier of AI_TIERS) {
        const tierConfig = parsed.tiers[tier];
        if (!tierConfig) continue;

        const nextPrimary = tierConfig.defaultPrimary
            ? mapTarget(tierConfig.defaultPrimary) ?? undefined
            : undefined;
        const nextFallbacks = dedupeTargets(
            tierConfig.defaultFallbacks
                ?.map(mapTarget)
                .filter((t): t is ModelTarget => t !== null)
        );

        let nextFunctions: TierRouteConfig['functions'];
        if (tierConfig.functions) {
            const fnEntries: Partial<Record<AiFunction, FunctionRouteConfig>> = {};
            for (const fn of AI_FUNCTIONS) {
                const fnConfig = tierConfig.functions[fn];
                if (!fnConfig) continue;

                const fnPrimary = fnConfig.primary ? mapTarget(fnConfig.primary) ?? undefined : undefined;
                const fnFallbacks = dedupeTargets(
                    fnConfig.fallbacks
                        ?.map(mapTarget)
                        .filter((t): t is ModelTarget => t !== null)
                );

                const cleanedFn: FunctionRouteConfig = {};
                if (fnPrimary) cleanedFn.primary = fnPrimary;
                if (fnFallbacks && fnFallbacks.length > 0) cleanedFn.fallbacks = fnFallbacks;

                if (cleanedFn.primary || cleanedFn.fallbacks) {
                    fnEntries[fn] = cleanedFn;
                }
            }
            if (Object.keys(fnEntries).length > 0) {
                nextFunctions = fnEntries;
            }
        }

        const cleanedTier: TierRouteConfig = {};
        if (nextPrimary) cleanedTier.defaultPrimary = nextPrimary;
        if (nextFallbacks && nextFallbacks.length > 0) cleanedTier.defaultFallbacks = nextFallbacks;
        if (nextFunctions) cleanedTier.functions = nextFunctions;

        if (cleanedTier.defaultPrimary || cleanedTier.defaultFallbacks || cleanedTier.functions) {
            nextTiers[tier] = cleanedTier;
        }
    }

    return { tiers: nextTiers };
}

/**
 * Remove all references to a deleted providerId from routingConfig.
 */
export function scrubProviderFromRoutingConfig(
    rawConfig: unknown,
    deletedProviderId: string
): TierRoutingConfig | null {
    return transformRoutingTargets(rawConfig, (target) =>
        target.providerId === deletedProviderId ? null : target
    );
}

/**
 * Translate internal provider IDs to portable provider slugs for migration export.
 */
export function slugifyRoutingConfig(
    rawConfig: unknown,
    providers: Array<{ id: string; slug: string }>
): TierRoutingConfig | null {
    const idToSlug = new Map(providers.map((p) => [p.id, p.slug]));
    return transformRoutingTargets(rawConfig, (target) => {
        const slug = idToSlug.get(target.providerId);
        return slug ? { providerId: slug, model: target.model } : null;
    });
}

/**
 * Translate portable provider slugs back to local database provider IDs on migration import.
 */
export function unslugifyRoutingConfig(
    rawConfig: unknown,
    providers: Array<{ id: string; slug: string }>
): TierRoutingConfig | null {
    const slugToId = new Map(providers.map((p) => [p.slug, p.id]));
    return transformRoutingTargets(rawConfig, (target) => {
        const id = slugToId.get(target.providerId);
        return id ? { providerId: id, model: target.model } : null;
    });
}

/**
 * Determine Plan Builder eligibility consistently across backend and UI:
 * - isPremium remains true for tier2, tier3, and admins (backward compatible).
 * - canUsePlanBuilder is granted to:
 *   admins, or (adminAllowed === true AND (tier2 | tier3 | active BYOK | tier1 with explicit planBuilder route)).
 */
export async function checkPlanBuilderEligibility(
    userId: string
): Promise<{ isPremium: boolean; canUsePlanBuilder: boolean }> {
    const [user, globalSettings] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                isAdmin: true,
                aiSettings: {
                    select: {
                        adminAllowed: true,
                        usageTier: true,
                        customApiKey: true,
                    },
                },
            },
        }),
        prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
            select: { routingConfig: true },
        }),
    ]);

    const tier = user?.aiSettings?.usageTier || 'none';
    const isAdmin = Boolean(user?.isAdmin);
    const isPremium = isAdmin || tier === 'tier2' || tier === 'tier3';

    if (isAdmin) {
        return { isPremium: true, canUsePlanBuilder: true };
    }

    if (!user?.aiSettings?.adminAllowed) {
        return { isPremium, canUsePlanBuilder: false };
    }

    if (tier === 'tier2' || tier === 'tier3') {
        return { isPremium, canUsePlanBuilder: true };
    }

    if (isByokActive(user.aiSettings)) {
        const decryptedKey = tryDecryptAiKey(user.aiSettings.customApiKey!, 'customApiKey', userId);
        if (parseApiKeys(decryptedKey).length > 0) {
            return { isPremium, canUsePlanBuilder: true };
        }
    }

    if (tier === 'tier1') {
        const routingConfig = parseRoutingConfig(globalSettings?.routingConfig);
        const tier1PlanPrimary = routingConfig?.tiers?.tier1?.functions?.planBuilder?.primary;
        if (tier1PlanPrimary?.providerId && tier1PlanPrimary?.model) {
            return { isPremium, canUsePlanBuilder: true };
        }
    }

    return { isPremium, canUsePlanBuilder: false };
}
