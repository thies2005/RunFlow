/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
    prisma: {
        userAiSettings: {
            findUnique: jest.fn(),
        },
        globalAiSettings: {
            findUnique: jest.fn(),
        },
        aiProvider: {
            findMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('@/lib/crypto', () => ({
    decryptToken: jest.fn((val: string) => val),
    encryptToken: jest.fn((val: string) => val),
}));

import { prisma } from '@/lib/db';
import { AiProviderError } from '../errors';
import {
    AI_FUNCTIONS,
    checkPlanBuilderEligibility,
    detectByokProviderType,
    parseApiKeys,
    parseRoutingConfig,
    resolveCandidateTargets,
    scrubProviderFromRoutingConfig,
    slugifyRoutingConfig,
    unslugifyRoutingConfig,
} from '../routing';

const mockPrisma = prisma as unknown as {
    userAiSettings: { findUnique: jest.Mock };
    globalAiSettings: { findUnique: jest.Mock };
    aiProvider: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
};

function makeProvider(overrides: Record<string, unknown> = {}) {
    return {
        id: 'prov-1',
        name: 'Provider 1',
        slug: 'provider-1',
        type: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key-12345678',
        models: ['gpt-4o-mini', 'gpt-4o'],
        isActive: true,
        monthlyTokenLimit: null,
        monthlyInputTokensUsed: 0,
        monthlyOutputTokensUsed: 0,
        lastUsageReset: new Date(),
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    };
}

function makeUserSettings(overrides: Record<string, unknown> = {}) {
    return {
        id: 'uas-1',
        userId: 'user-1',
        adminAllowed: true,
        aiEnabled: true,
        usageTier: 'tier1',
        customApiKey: null,
        customBaseUrl: null,
        customModel: null,
        ...overrides,
    };
}

function makeGlobalSettings(overrides: Record<string, unknown> = {}) {
    return {
        id: 'singleton',
        activeProviderId: null,
        fallbackProviderId: null,
        activeProvider: null,
        fallbackProvider: null,
        defaultApiKey: null,
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        activityFeedbackModel: null,
        calorieSnapModel: null,
        mealSuggestModel: null,
        planBuilderModel: null,
        routingConfig: null,
        ...overrides,
    };
}

describe('AI Routing (routing.ts)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('detectByokProviderType', () => {
        it('detects OpenAI-compatible Gemini endpoint as openai', () => {
            expect(detectByokProviderType('https://generativelanguage.googleapis.com/v1beta/openai')).toBe('openai');
            expect(detectByokProviderType('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe('openai');
        });

        it('detects native Google Gemini endpoint as google', () => {
            expect(detectByokProviderType('https://generativelanguage.googleapis.com/v1beta')).toBe('google');
            expect(detectByokProviderType('https://generativelanguage.googleapis.com')).toBe('google');
        });

        it('detects Anthropic endpoint as anthropic', () => {
            expect(detectByokProviderType('https://api.anthropic.com')).toBe('anthropic');
            expect(detectByokProviderType('https://api.anthropic.com/v1')).toBe('anthropic');
        });

        it('detects NVIDIA, Zhipu, OpenRouter, and empty/default URLs as openai', () => {
            expect(detectByokProviderType('https://integrate.api.nvidia.com/v1')).toBe('openai');
            expect(detectByokProviderType('https://open.bigmodel.cn/api/paas/v4')).toBe('openai');
            expect(detectByokProviderType('https://openrouter.ai/api/v1')).toBe('openai');
            expect(detectByokProviderType(null)).toBe('openai');
            expect(detectByokProviderType(undefined)).toBe('openai');
        });
    });

    describe('parseApiKeys', () => {
        it('parses single, comma/semicolon/newline delimited, and JSON array keys', () => {
            expect(parseApiKeys('sk-one')).toEqual(['sk-one']);
            expect(parseApiKeys('sk-one, sk-two; sk-three\nsk-four')).toEqual([
                'sk-one',
                'sk-two',
                'sk-three',
                'sk-four',
            ]);
            expect(parseApiKeys('["sk-a", " sk-b ", ""]')).toEqual(['sk-a', 'sk-b']);
            expect(parseApiKeys('')).toEqual([]);
            expect(parseApiKeys(null)).toEqual([]);
        });
    });

    describe('resolveCandidateTargets - access & BYOK enforcement', () => {
        it('blocks managed user when adminAllowed is false', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ adminAllowed: false, usageTier: 'tier2' })
            );
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(makeGlobalSettings());

            await expect(resolveCandidateTargets('user-1', 'chat')).rejects.toMatchObject({
                name: 'AiProviderError',
                code: 'AI_DISABLED',
                httpStatus: 403,
            });
        });

        it('blocks BYOK user when adminAllowed is false', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({
                    adminAllowed: false,
                    usageTier: 'none',
                    customApiKey: 'sk-byok-12345678',
                    customBaseUrl: 'https://api.openai.com/v1',
                })
            );
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(makeGlobalSettings());

            await expect(resolveCandidateTargets('user-1', 'chat')).rejects.toMatchObject({
                name: 'AiProviderError',
                code: 'AI_DISABLED',
                httpStatus: 403,
            });
        });

        it('blocks user when aiEnabled is false', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ adminAllowed: true, aiEnabled: false })
            );
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(makeGlobalSettings());

            await expect(resolveCandidateTargets('user-1', 'chat')).rejects.toMatchObject({
                code: 'AI_DISABLED',
                httpStatus: 403,
            });
        });

        it('throws 403 NOT_CONFIGURED when usageTier is none and customApiKey is absent', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ adminAllowed: true, aiEnabled: true, usageTier: 'none', customApiKey: null })
            );
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(makeGlobalSettings());

            await expect(resolveCandidateTargets('user-1', 'chat')).rejects.toMatchObject({
                code: 'NOT_CONFIGURED',
                httpStatus: 403,
            });
        });

        it('resolves BYOK candidate with detected protocol and multi-keys', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({
                    usageTier: 'none',
                    customApiKey: 'AIzaTestKeyOne12345, AIzaTestKeyTwo12345',
                    customBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                    customModel: 'gemini-2.5-pro',
                })
            );
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(makeGlobalSettings());

            const res = await resolveCandidateTargets('user-1', 'chat');
            expect(res.candidates).toHaveLength(1);
            expect(res.candidates[0]).toMatchObject({
                provider: 'google',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                apiKey: 'AIzaTestKeyOne12345',
                apiKeys: ['AIzaTestKeyOne12345', 'AIzaTestKeyTwo12345'],
                model: 'gemini-2.5-pro',
                isByok: true,
                keyOverride: true,
                providerSlug: 'byok',
            });
        });

        it('rejects BYOK user with invalid/disallowed customBaseUrl', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({
                    usageTier: 'none',
                    customApiKey: 'sk-byok-12345678',
                    customBaseUrl: 'http://127.0.0.1:8080/v1',
                })
            );
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(makeGlobalSettings());

            await expect(resolveCandidateTargets('user-1', 'chat')).rejects.toMatchObject({
                code: 'NOT_CONFIGURED',
                httpStatus: 400,
            });
        });
    });

    describe('resolveCandidateTargets - deterministic providerId & tier/function routing', () => {
        const googleFree = makeProvider({
            id: 'prov-google-free',
            name: 'Google Free',
            slug: 'google-free',
            type: 'google',
            baseUrl: 'https://generativelanguage.googleapis.com',
            apiKey: 'AIzaFreeKey12345678',
            models: ['gemini-2.5-flash'],
            createdAt: new Date('2026-01-01T00:00:00Z'),
        });
        const googlePaid = makeProvider({
            id: 'prov-google-paid',
            name: 'Google Paid',
            slug: 'google-paid',
            type: 'google',
            baseUrl: 'https://generativelanguage.googleapis.com',
            apiKey: 'AIzaPaidKey12345678',
            models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
            createdAt: new Date('2026-01-02T00:00:00Z'),
        });
        const openrouter = makeProvider({
            id: 'prov-openrouter',
            name: 'OpenRouter',
            slug: 'openrouter',
            type: 'openai',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKey: 'sk-or-v1-test12345678',
            models: ['openai/gpt-4o-mini'],
            createdAt: new Date('2026-01-03T00:00:00Z'),
        });

        const routingConfig = {
            tiers: {
                tier1: {
                    defaultPrimary: { providerId: 'prov-google-free', model: 'gemini-2.5-flash' },
                    defaultFallbacks: [{ providerId: 'prov-openrouter', model: 'openai/gpt-4o-mini' }],
                    functions: {
                        calorieSnap: {
                            primary: { providerId: 'prov-google-paid', model: 'gemini-2.5-flash' },
                        },
                    },
                },
                tier2: {
                    defaultPrimary: { providerId: 'prov-google-paid', model: 'gemini-2.5-flash' },
                    defaultFallbacks: [
                        { providerId: 'prov-google-free', model: 'gemini-2.5-flash' },
                        { providerId: 'prov-openrouter', model: 'openai/gpt-4o-mini' },
                    ],
                    functions: {
                        planBuilder: {
                            primary: { providerId: 'prov-google-paid', model: 'gemini-2.5-pro' },
                            fallbacks: [
                                { providerId: 'prov-google-paid', model: 'gemini-2.5-flash' },
                                { providerId: 'prov-google-free', model: 'gemini-2.5-flash' },
                            ],
                        },
                    },
                },
                tier3: {
                    defaultPrimary: { providerId: 'prov-google-paid', model: 'gemini-2.5-pro' },
                    defaultFallbacks: [{ providerId: 'prov-openrouter', model: 'openai/gpt-4o-mini' }],
                },
            },
        };

        beforeEach(() => {
            mockPrisma.aiProvider.findMany.mockResolvedValue([googleFree, googlePaid, openrouter]);
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(
                makeGlobalSettings({ routingConfig })
            );
        });

        it('distinguishes google-free vs google-paid deterministically by providerId', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ usageTier: 'tier1' })
            );

            const chatRes = await resolveCandidateTargets('user-1', 'chat');
            expect(chatRes.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                'google-free:gemini-2.5-flash',
                'openrouter:openai/gpt-4o-mini',
            ]);
            expect(chatRes.candidates[0].apiKey).toBe('AIzaFreeKey12345678');

            const snapRes = await resolveCandidateTargets('user-1', 'calorieSnap');
            expect(snapRes.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                'google-paid:gemini-2.5-flash',
                'openrouter:openai/gpt-4o-mini',
            ]);
            expect(snapRes.candidates[0].apiKey).toBe('AIzaPaidKey12345678');
        });

        it('inherits defaultPrimary and defaultFallbacks when function override is absent, and overrides both when specified', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ usageTier: 'tier2' })
            );

            for (const inheritedFn of ['chat', 'activityFeedback', 'mealSuggest', 'healthInsights'] as const) {
                const res = await resolveCandidateTargets('user-1', inheritedFn);
                expect(res.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                    'google-paid:gemini-2.5-flash',
                    'google-free:gemini-2.5-flash',
                    'openrouter:openai/gpt-4o-mini',
                ]);
            }

            const planRes = await resolveCandidateTargets('user-1', 'planBuilder');
            expect(planRes.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                'google-paid:gemini-2.5-pro',
                'google-paid:gemini-2.5-flash',
                'google-free:gemini-2.5-flash',
            ]);
        });

        it('resolves tier3 defaults across all functions', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ usageTier: 'tier3' })
            );

            for (const fn of AI_FUNCTIONS) {
                const res = await resolveCandidateTargets('user-1', fn);
                expect(res.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                    'google-paid:gemini-2.5-pro',
                    'openrouter:openai/gpt-4o-mini',
                ]);
            }
        });

        it('places modelOverride first and deduplicates repeated targets', async () => {
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(
                makeUserSettings({ usageTier: 'tier2' })
            );

            const res = await resolveCandidateTargets('user-1', 'chat', {
                modelOverride: 'gemini-2.5-pro',
            });
            expect(res.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                'google-paid:gemini-2.5-pro',
                'google-paid:gemini-2.5-flash',
                'google-free:gemini-2.5-flash',
                'openrouter:openai/gpt-4o-mini',
            ]);

            const dedupedRes = await resolveCandidateTargets('user-1', 'chat', {
                modelOverride: 'gemini-2.5-flash',
            });
            expect(dedupedRes.candidates.map((c) => `${c.providerSlug}:${c.model}`)).toEqual([
                'google-paid:gemini-2.5-flash',
                'google-free:gemini-2.5-flash',
                'openrouter:openai/gpt-4o-mini',
            ]);
        });
    });

    describe('resolveCandidateTargets - legacy fallback & provider skipping', () => {
        it('falls back to legacy activeProviderId, fallbackProviderId, and function models when routingConfig is absent', async () => {
            const p1 = makeProvider({
                id: 'prov-primary',
                slug: 'primary',
                type: 'openai',
                baseUrl: 'https://api.openai.com/v1',
                models: ['gpt-4o', 'gpt-4o-mini'],
            });
            const p2 = makeProvider({
                id: 'prov-fb',
                slug: 'fallback',
                type: 'openrouter',
                baseUrl: 'https://openrouter.ai/api/v1',
                models: ['anthropic/claude-3.5-sonnet'],
            });

            mockPrisma.userAiSettings.findUnique.mockResolvedValue(makeUserSettings({ usageTier: 'tier1' }));
            mockPrisma.aiProvider.findMany.mockResolvedValue([p1, p2]);
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(
                makeGlobalSettings({
                    activeProviderId: 'prov-primary',
                    fallbackProviderId: 'prov-fb',
                    defaultModel: 'gpt-4o-mini',
                    planBuilderModel: 'gpt-4o',
                    calorieSnapModel: 'gpt-4o',
                    routingConfig: null,
                })
            );

            const chatRes = await resolveCandidateTargets('user-1', 'chat');
            expect(chatRes.candidates.map((c) => `${c.providerId}:${c.model}`)).toEqual([
                'prov-primary:gpt-4o-mini',
                'prov-fb:anthropic/claude-3.5-sonnet',
            ]);

            const planRes = await resolveCandidateTargets('user-1', 'planBuilder');
            expect(planRes.candidates.map((c) => `${c.providerId}:${c.model}`)).toEqual([
                'prov-primary:gpt-4o',
                'prov-fb:anthropic/claude-3.5-sonnet',
            ]);
        });

        it('skips inactive providers, invalid URLs, and providers over monthlyTokenLimit', async () => {
            const inactive = makeProvider({ id: 'p-inactive', isActive: false });
            const badUrl = makeProvider({ id: 'p-badurl', baseUrl: 'http://10.0.0.1/v1' });
            const overQuota = makeProvider({
                id: 'p-quota',
                monthlyTokenLimit: BigInt(1000),
                monthlyInputTokensUsed: 600,
                monthlyOutputTokensUsed: 400,
                lastUsageReset: new Date(),
            });
            const healthy = makeProvider({
                id: 'p-healthy',
                slug: 'healthy',
                baseUrl: 'https://api.openai.com/v1',
            });

            mockPrisma.userAiSettings.findUnique.mockResolvedValue(makeUserSettings({ usageTier: 'tier1' }));
            mockPrisma.aiProvider.findMany.mockResolvedValue([inactive, badUrl, overQuota, healthy]);
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(
                makeGlobalSettings({
                    routingConfig: {
                        tiers: {
                            tier1: {
                                defaultPrimary: { providerId: 'p-inactive', model: 'gpt-4o-mini' },
                                defaultFallbacks: [
                                    { providerId: 'p-badurl', model: 'gpt-4o-mini' },
                                    { providerId: 'p-quota', model: 'gpt-4o-mini' },
                                    { providerId: 'p-healthy', model: 'gpt-4o-mini' },
                                ],
                            },
                        },
                    },
                })
            );

            const res = await resolveCandidateTargets('user-1', 'chat');
            expect(res.candidates).toHaveLength(1);
            expect(res.candidates[0].providerId).toBe('p-healthy');
        });

        it('treats provider monthly usage as 0 when lastUsageReset is in a previous month', async () => {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const rolledOver = makeProvider({
                id: 'p-rolled',
                slug: 'rolled',
                monthlyTokenLimit: BigInt(1000),
                monthlyInputTokensUsed: 900,
                monthlyOutputTokensUsed: 500,
                lastUsageReset: lastMonth,
            });

            mockPrisma.userAiSettings.findUnique.mockResolvedValue(makeUserSettings({ usageTier: 'tier1' }));
            mockPrisma.aiProvider.findMany.mockResolvedValue([rolledOver]);
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(
                makeGlobalSettings({
                    routingConfig: {
                        tiers: {
                            tier1: {
                                defaultPrimary: { providerId: 'p-rolled', model: 'gpt-4o-mini' },
                            },
                        },
                    },
                })
            );

            const res = await resolveCandidateTargets('user-1', 'chat');
            expect(res.candidates).toHaveLength(1);
            expect(res.candidates[0].monthlyTokensUsed).toBe(0);
        });

        it('throws PROVIDER_QUOTA_EXCEEDED when all configured providers are over monthlyTokenLimit', async () => {
            const overQuota = makeProvider({
                id: 'p-quota',
                monthlyTokenLimit: BigInt(1000),
                monthlyInputTokensUsed: 1000,
                monthlyOutputTokensUsed: 0,
                lastUsageReset: new Date(),
            });

            mockPrisma.userAiSettings.findUnique.mockResolvedValue(makeUserSettings({ usageTier: 'tier1' }));
            mockPrisma.aiProvider.findMany.mockResolvedValue([overQuota]);
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(
                makeGlobalSettings({
                    routingConfig: {
                        tiers: {
                            tier1: {
                                defaultPrimary: { providerId: 'p-quota', model: 'gpt-4o-mini' },
                            },
                        },
                    },
                })
            );

            await expect(resolveCandidateTargets('user-1', 'chat')).rejects.toMatchObject({
                code: 'PROVIDER_QUOTA_EXCEEDED',
                httpStatus: 503,
            });
        });

        it('throws NOT_CONFIGURED when only inactive or invalid-URL providers exist', async () => {
            const inactive = makeProvider({ id: 'p-inactive', isActive: false });
            mockPrisma.userAiSettings.findUnique.mockResolvedValue(makeUserSettings({ usageTier: 'tier1' }));
            mockPrisma.aiProvider.findMany.mockResolvedValue([inactive]);
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue(
                makeGlobalSettings({
                    routingConfig: {
                        tiers: {
                            tier1: {
                                defaultPrimary: { providerId: 'p-inactive', model: 'gpt-4o-mini' },
                            },
                        },
                    },
                })
            );

            try {
                await resolveCandidateTargets('user-1', 'chat');
                fail('Expected AiProviderError');
            } catch (err) {
                expect(err).toBeInstanceOf(AiProviderError);
                expect((err as AiProviderError).code).toBe('NOT_CONFIGURED');
                expect((err as AiProviderError).httpStatus).toBe(503);
            }
        });
    });

    describe('routingConfig portability helpers', () => {
        const sampleConfig = {
            tiers: {
                tier1: {
                    defaultPrimary: { providerId: 'id-1', model: 'gemini-2.5-flash' },
                    defaultFallbacks: [
                        { providerId: 'id-2', model: 'gpt-4o-mini' },
                        { providerId: 'id-3', model: 'claude-3-5-sonnet-latest' },
                    ],
                    functions: {
                        planBuilder: {
                            primary: { providerId: 'id-2', model: 'gpt-4o' },
                            fallbacks: [{ providerId: 'id-1', model: 'gemini-2.5-flash' }],
                        },
                    },
                },
            },
        };

        const providers = [
            { id: 'id-1', slug: 'google-free' },
            { id: 'id-2', slug: 'openai-main' },
            { id: 'id-3', slug: 'anthropic-main' },
        ];

        it('parseRoutingConfig returns null on invalid schema and parses valid config', () => {
            expect(parseRoutingConfig(null)).toBeNull();
            expect(parseRoutingConfig({ tiers: { unknownTier: {} } })).toBeNull();
            expect(parseRoutingConfig(sampleConfig)).toEqual(sampleConfig);
        });

        it('scrubProviderFromRoutingConfig removes all references to deletedProviderId', () => {
            const scrubbed = scrubProviderFromRoutingConfig(sampleConfig, 'id-2');
            expect(scrubbed).toEqual({
                tiers: {
                    tier1: {
                        defaultPrimary: { providerId: 'id-1', model: 'gemini-2.5-flash' },
                        defaultFallbacks: [{ providerId: 'id-3', model: 'claude-3-5-sonnet-latest' }],
                        functions: {
                            planBuilder: {
                                fallbacks: [{ providerId: 'id-1', model: 'gemini-2.5-flash' }],
                            },
                        },
                    },
                },
            });
        });

        it('slugifyRoutingConfig and unslugifyRoutingConfig round-trip and drop unknown slugs', () => {
            const slugified = slugifyRoutingConfig(sampleConfig, providers);
            expect(slugified).toEqual({
                tiers: {
                    tier1: {
                        defaultPrimary: { providerId: 'google-free', model: 'gemini-2.5-flash' },
                        defaultFallbacks: [
                            { providerId: 'openai-main', model: 'gpt-4o-mini' },
                            { providerId: 'anthropic-main', model: 'claude-3-5-sonnet-latest' },
                        ],
                        functions: {
                            planBuilder: {
                                primary: { providerId: 'openai-main', model: 'gpt-4o' },
                                fallbacks: [{ providerId: 'google-free', model: 'gemini-2.5-flash' }],
                            },
                        },
                    },
                },
            });

            const importedProviders = [
                { id: 'new-id-1', slug: 'google-free' },
                { id: 'new-id-2', slug: 'openai-main' },
                // anthropic-main intentionally omitted -> unknown slug
            ];
            const unslugified = unslugifyRoutingConfig(slugified, importedProviders);
            expect(unslugified).toEqual({
                tiers: {
                    tier1: {
                        defaultPrimary: { providerId: 'new-id-1', model: 'gemini-2.5-flash' },
                        defaultFallbacks: [{ providerId: 'new-id-2', model: 'gpt-4o-mini' }],
                        functions: {
                            planBuilder: {
                                primary: { providerId: 'new-id-2', model: 'gpt-4o' },
                                fallbacks: [{ providerId: 'new-id-1', model: 'gemini-2.5-flash' }],
                            },
                        },
                    },
                },
            });
        });
    });

    describe('checkPlanBuilderEligibility', () => {
        it('grants access to admins regardless of aiSettings', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'admin-1',
                isAdmin: true,
                aiSettings: { adminAllowed: false, usageTier: 'none', customApiKey: null },
            });
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue({ routingConfig: null });

            await expect(checkPlanBuilderEligibility('admin-1')).resolves.toEqual({
                isPremium: true,
                canUsePlanBuilder: true,
            });
        });

        it('blocks non-admin when adminAllowed is false even for tier2/tier3/BYOK', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u-2',
                isAdmin: false,
                aiSettings: { adminAllowed: false, usageTier: 'tier3', customApiKey: null },
            });
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue({ routingConfig: null });

            await expect(checkPlanBuilderEligibility('u-2')).resolves.toEqual({
                isPremium: true,
                canUsePlanBuilder: false,
            });
        });

        it('grants access to tier2, tier3, and active BYOK users when adminAllowed is true', async () => {
            mockPrisma.globalAiSettings.findUnique.mockResolvedValue({ routingConfig: null });

            for (const tier of ['tier2', 'tier3']) {
                mockPrisma.user.findUnique.mockResolvedValue({
                    id: 'u-tier',
                    isAdmin: false,
                    aiSettings: { adminAllowed: true, usageTier: tier, customApiKey: null },
                });
                await expect(checkPlanBuilderEligibility('u-tier')).resolves.toEqual({
                    isPremium: true,
                    canUsePlanBuilder: true,
                });
            }

            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u-byok',
                isAdmin: false,
                aiSettings: { adminAllowed: true, usageTier: 'none', customApiKey: 'sk-byok-key' },
            });
            await expect(checkPlanBuilderEligibility('u-byok')).resolves.toEqual({
                isPremium: false,
                canUsePlanBuilder: true,
            });
        });

        it('grants tier1 access ONLY when routingConfig has explicit tier1.functions.planBuilder.primary', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u-t1',
                isAdmin: false,
                aiSettings: { adminAllowed: true, usageTier: 'tier1', customApiKey: null },
            });

            mockPrisma.globalAiSettings.findUnique.mockResolvedValue({ routingConfig: null });
            await expect(checkPlanBuilderEligibility('u-t1')).resolves.toEqual({
                isPremium: false,
                canUsePlanBuilder: false,
            });

            mockPrisma.globalAiSettings.findUnique.mockResolvedValue({
                routingConfig: {
                    tiers: {
                        tier1: {
                            functions: {
                                planBuilder: {
                                    primary: { providerId: 'prov-1', model: 'gemini-2.5-flash' },
                                },
                            },
                        },
                    },
                },
            });
            await expect(checkPlanBuilderEligibility('u-t1')).resolves.toEqual({
                isPremium: false,
                canUsePlanBuilder: true,
            });
        });
    });
});
