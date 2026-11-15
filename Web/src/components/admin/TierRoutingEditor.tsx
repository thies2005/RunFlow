'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    GitBranch,
    Layers,
    Plus,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import type {
    AdminAiProvider,
    AiFunction,
    AiTier,
    FunctionRouteConfig,
    ModelTarget,
    TierRouteConfig,
    TierRoutingConfig,
} from '@/app/admin/types';

interface TierMeta {
    id: AiTier;
    label: string;
    defaultName: string;
}

const TIERS: TierMeta[] = [
    { id: 'tier1', label: 'Tier 1', defaultName: 'Basic' },
    { id: 'tier2', label: 'Tier 2', defaultName: 'Standard' },
    { id: 'tier3', label: 'Tier 3', defaultName: 'Premium' },
];

interface FunctionMeta {
    id: AiFunction;
    label: string;
    description: string;
}

const FUNCTIONS: FunctionMeta[] = [
    {
        id: 'chat',
        label: 'AI Chat',
        description: 'Interactive coaching chat and intent detection.',
    },
    {
        id: 'activityFeedback',
        label: 'Activity Feedback',
        description: 'Post-workout AI coaching analysis and feedback.',
    },
    {
        id: 'calorieSnap',
        label: 'CalorieSnap Vision',
        description: 'Food photo and meal description nutrition scanning.',
    },
    {
        id: 'mealSuggest',
        label: 'Meal Suggestions',
        description: 'Personalized AI meal recommendations.',
    },
    {
        id: 'planBuilder',
        label: 'Plan Builder',
        description: 'Training plan analysis, suggestions, and guided plan chat.',
    },
    {
        id: 'healthInsights',
        label: 'Health Insights',
        description: 'Weekly health, recovery, and nutrition insights.',
    },
];

export interface LegacyRoutingDefaults {
    activeProviderId: string | null;
    fallbackProviderId: string | null;
    defaultModel?: string;
    calorieSnapModel?: string;
    mealSuggestModel?: string;
    activityFeedbackModel?: string;
    planBuilderModel?: string;
}

interface TierRoutingEditorProps {
    value: TierRoutingConfig | null | undefined;
    onChange: (_next: TierRoutingConfig | null) => void;
    providers: AdminAiProvider[];
    tierNames?: Partial<Record<AiTier, string>>;
    legacyDefaults?: LegacyRoutingDefaults;
    disabled?: boolean;
}

type DraftTarget = {
    providerId: string;
    model: string;
};

type DraftFunctionRoute = {
    primary?: DraftTarget;
    fallbacks?: DraftTarget[];
};

type DraftTierRoute = {
    defaultPrimary?: DraftTarget;
    defaultFallbacks?: DraftTarget[];
    functions?: Partial<Record<AiFunction, DraftFunctionRoute>>;
};

type DraftRoutingConfig = {
    tiers: Partial<Record<AiTier, DraftTierRoute>>;
};

function cloneRoutingConfig(config: TierRoutingConfig | null | undefined): DraftRoutingConfig {
    if (!config || !config.tiers) {
        return { tiers: {} };
    }
    const tiers: Partial<Record<AiTier, DraftTierRoute>> = {};
    for (const tierMeta of TIERS) {
        const src = config.tiers[tierMeta.id];
        if (!src) continue;
        const nextTier: DraftTierRoute = {};
        if (src.defaultPrimary) {
            nextTier.defaultPrimary = { ...src.defaultPrimary };
        }
        if (src.defaultFallbacks && src.defaultFallbacks.length > 0) {
            nextTier.defaultFallbacks = src.defaultFallbacks.map((t) => ({ ...t }));
        }
        if (src.functions) {
            const nextFns: Partial<Record<AiFunction, DraftFunctionRoute>> = {};
            for (const fnMeta of FUNCTIONS) {
                const fnSrc = src.functions[fnMeta.id];
                if (!fnSrc) continue;
                const nextFn: DraftFunctionRoute = {};
                if (fnSrc.primary) {
                    nextFn.primary = { ...fnSrc.primary };
                }
                if (fnSrc.fallbacks && fnSrc.fallbacks.length > 0) {
                    nextFn.fallbacks = fnSrc.fallbacks.map((t) => ({ ...t }));
                }
                nextFns[fnMeta.id] = nextFn;
            }
            if (Object.keys(nextFns).length > 0) {
                nextTier.functions = nextFns;
            }
        }
        tiers[tierMeta.id] = nextTier;
    }
    return { tiers };
}

function sanitizeTarget(target: DraftTarget | undefined): ModelTarget | undefined {
    if (!target) return undefined;
    const providerId = target.providerId.trim();
    const model = target.model.trim();
    if (!providerId || !model) return undefined;
    return { providerId, model };
}

function sanitizeTargets(targets: DraftTarget[] | undefined): ModelTarget[] | undefined {
    if (!targets || targets.length === 0) return undefined;
    const cleaned = targets
        .map(sanitizeTarget)
        .filter((t): t is ModelTarget => t !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Strip incomplete targets, empty arrays, and empty tier/function records
 * so emitted config always satisfies TierRoutingConfigSchema (with no null subfields).
 */
export function sanitizeRoutingConfig(draft: DraftRoutingConfig): TierRoutingConfig | null {
    const nextTiers: TierRoutingConfig['tiers'] = {};

    for (const tierMeta of TIERS) {
        const tierDraft = draft.tiers[tierMeta.id];
        if (!tierDraft) continue;

        const defaultPrimary = sanitizeTarget(tierDraft.defaultPrimary);
        const defaultFallbacks = sanitizeTargets(tierDraft.defaultFallbacks);

        let functions: Partial<Record<AiFunction, FunctionRouteConfig>> | undefined;
        if (tierDraft.functions) {
            const nextFns: Partial<Record<AiFunction, FunctionRouteConfig>> = {};
            for (const fnMeta of FUNCTIONS) {
                const fnDraft = tierDraft.functions[fnMeta.id];
                if (!fnDraft) continue;
                const primary = sanitizeTarget(fnDraft.primary);
                const fallbacks = sanitizeTargets(fnDraft.fallbacks);
                if (!primary && !fallbacks) continue;
                const cleanedFn: FunctionRouteConfig = {};
                if (primary) cleanedFn.primary = primary;
                if (fallbacks) cleanedFn.fallbacks = fallbacks;
                nextFns[fnMeta.id] = cleanedFn;
            }
            if (Object.keys(nextFns).length > 0) {
                functions = nextFns;
            }
        }

        if (!defaultPrimary && !defaultFallbacks && !functions) continue;

        const cleanedTier: TierRouteConfig = {};
        if (defaultPrimary) cleanedTier.defaultPrimary = defaultPrimary;
        if (defaultFallbacks) cleanedTier.defaultFallbacks = defaultFallbacks;
        if (functions) cleanedTier.functions = functions;
        nextTiers[tierMeta.id] = cleanedTier;
    }

    return Object.keys(nextTiers).length > 0 ? { tiers: nextTiers } : null;
}

function getDefaultTargetFromProviders(providers: AdminAiProvider[]): DraftTarget {
    const preferred = providers.find((p) => p.isActive) || providers[0];
    if (!preferred) {
        return { providerId: '', model: '' };
    }
    return {
        providerId: preferred.id,
        model: preferred.models[0] || '',
    };
}

function formatProviderOptionLabel(provider: AdminAiProvider): string {
    const statusSuffix = provider.isActive ? '' : ' [Inactive]';
    return `${provider.name} (${provider.slug} · ${provider.type})${statusSuffix}`;
}

function getLegacyModelSummary(fn: AiFunction, defaults?: LegacyRoutingDefaults): string {
    switch (fn) {
        case 'calorieSnap':
            return defaults?.calorieSnapModel || defaults?.defaultModel || 'gemini-1.5-flash';
        case 'mealSuggest':
            return defaults?.mealSuggestModel || defaults?.defaultModel || 'gemini-1.5-flash';
        case 'activityFeedback':
            return defaults?.activityFeedbackModel || defaults?.defaultModel || 'gemini-1.5-flash';
        case 'planBuilder':
            return defaults?.planBuilderModel || defaults?.defaultModel || 'gpt-4o';
        case 'chat':
        case 'healthInsights':
        default:
            return defaults?.defaultModel || 'gpt-4o-mini';
    }
}

interface TargetRowEditorProps {
    idPrefix: string;
    target: DraftTarget;
    providers: AdminAiProvider[];
    providerMap: Map<string, AdminAiProvider>;
    onChange: (_next: DraftTarget) => void;
    allowEmptyProvider?: boolean;
    emptyProviderLabel?: string;
    disabled?: boolean;
}

function TargetRowEditor({
    idPrefix,
    target,
    providers,
    providerMap,
    onChange,
    allowEmptyProvider = false,
    emptyProviderLabel = '— Select provider —',
    disabled = false,
}: TargetRowEditorProps) {
    const selectedProvider = target.providerId ? providerMap.get(target.providerId) : undefined;
    const isMissingProvider = Boolean(target.providerId && !selectedProvider);
    const availableModels = selectedProvider?.models ?? [];
    const modelInPresetList = availableModels.includes(target.model);

    const handleProviderChange = (nextProviderId: string) => {
        if (!nextProviderId) {
            onChange({ providerId: '', model: '' });
            return;
        }
        const nextProvider = providerMap.get(nextProviderId);
        const nextModels = nextProvider?.models ?? [];
        const keepCurrentModel = target.model.trim() !== '' && nextModels.includes(target.model);
        const nextModel = keepCurrentModel ? target.model : nextModels[0] || target.model || '';
        onChange({
            providerId: nextProviderId,
            model: nextModel,
        });
    };

    const handlePresetSelect = (presetModel: string) => {
        if (presetModel === '__custom__') return;
        onChange({
            providerId: target.providerId,
            model: presetModel,
        });
    };

    const incompleteWarning =
        target.providerId && !target.model.trim()
            ? 'Enter or select a model ID for this target to take effect.'
            : !target.providerId && target.model.trim()
              ? 'Select a provider for this target.'
              : null;

    return (
        <div className="space-y-1.5 flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                {/* Provider selector */}
                <div className="md:col-span-5 min-w-0">
                    <label htmlFor={`${idPrefix}-provider`} className="sr-only">
                        Provider
                    </label>
                    <select
                        id={`${idPrefix}-provider`}
                        value={target.providerId}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        disabled={disabled}
                        className="w-full px-2.5 py-1.5 bg-background-secondary text-foreground border border-line rounded text-xs focus:outline-hidden focus:border-accent-orange disabled:opacity-50"
                    >
                        <option value="">{allowEmptyProvider ? emptyProviderLabel : '— Select provider —'}</option>
                        {providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                                {formatProviderOptionLabel(provider)}
                            </option>
                        ))}
                        {isMissingProvider && (
                            <option value={target.providerId}>
                                Missing Provider ({target.providerId})
                            </option>
                        )}
                    </select>
                </div>

                {/* Preset model quick selector (when provider has models[]) */}
                {availableModels.length > 0 && (
                    <div className="md:col-span-3 min-w-0">
                        <label htmlFor={`${idPrefix}-model-preset`} className="sr-only">
                            Preset Model
                        </label>
                        <select
                            id={`${idPrefix}-model-preset`}
                            value={modelInPresetList ? target.model : '__custom__'}
                            onChange={(e) => handlePresetSelect(e.target.value)}
                            disabled={disabled || !target.providerId}
                            className="w-full px-2.5 py-1.5 bg-background-secondary text-foreground border border-line rounded text-xs font-mono focus:outline-hidden focus:border-accent-orange disabled:opacity-50"
                        >
                            {!modelInPresetList && (
                                <option value="__custom__">Custom model...</option>
                            )}
                            {availableModels.map((modelName) => (
                                <option key={modelName} value={modelName}>
                                    {modelName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Free-text custom model input */}
                <div className={availableModels.length > 0 ? 'md:col-span-4 min-w-0' : 'md:col-span-7 min-w-0'}>
                    <label htmlFor={`${idPrefix}-model-input`} className="sr-only">
                        Model ID
                    </label>
                    <input
                        id={`${idPrefix}-model-input`}
                        type="text"
                        value={target.model}
                        onChange={(e) =>
                            onChange({
                                providerId: target.providerId,
                                model: e.target.value,
                            })
                        }
                        disabled={disabled}
                        placeholder="e.g. gemini-2.5-flash"
                        className="w-full px-2.5 py-1.5 bg-background-secondary text-foreground border border-line rounded text-xs font-mono placeholder-foreground-muted focus:outline-hidden focus:border-accent-orange disabled:opacity-50"
                    />
                </div>
            </div>

            {/* Provider status / validation badges */}
            {(isMissingProvider || (selectedProvider && !selectedProvider.isActive) || incompleteWarning) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {selectedProvider && !selectedProvider.isActive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/30">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            Inactive provider ({selectedProvider.slug}) — skipped at runtime until activated
                        </span>
                    )}
                    {isMissingProvider && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-negative/10 text-negative border border-negative/30">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            Provider ID not found
                        </span>
                    )}
                    {incompleteWarning && (
                        <span className="text-warning">{incompleteWarning}</span>
                    )}
                </div>
            )}
        </div>
    );
}

interface FallbackChainEditorProps {
    idPrefix: string;
    fallbacks: DraftTarget[];
    providers: AdminAiProvider[];
    providerMap: Map<string, AdminAiProvider>;
    onChange: (_next: DraftTarget[]) => void;
    disabled?: boolean;
}

function FallbackChainEditor({
    idPrefix,
    fallbacks,
    providers,
    providerMap,
    onChange,
    disabled = false,
}: FallbackChainEditorProps) {
    const handleAddFallback = () => {
        onChange([...fallbacks, getDefaultTargetFromProviders(providers)]);
    };

    const handleUpdateAt = (index: number, nextTarget: DraftTarget) => {
        const next = fallbacks.map((item, idx) => (idx === index ? nextTarget : item));
        onChange(next);
    };

    const handleMove = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= fallbacks.length) return;
        const next = [...fallbacks];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        onChange(next);
    };

    const handleRemove = (index: number) => {
        onChange(fallbacks.filter((_, idx) => idx !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-secondary">
                    Fallback Chain ({fallbacks.length})
                </span>
                <button
                    type="button"
                    onClick={handleAddFallback}
                    disabled={disabled || providers.length === 0}
                    className="px-2.5 py-1 text-xs font-medium text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20 rounded border border-accent-orange/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Add Fallback
                </button>
            </div>

            {fallbacks.length === 0 ? (
                <p className="text-xs text-foreground-muted italic">
                    No fallbacks configured for this route.
                </p>
            ) : (
                <div className="space-y-2">
                    {fallbacks.map((fb, idx) => (
                        <div
                            key={`${idPrefix}-fb-${idx}`}
                            className="flex items-start gap-2 p-2.5 rounded bg-background border border-line"
                        >
                            <span className="text-[11px] font-mono text-foreground-muted pt-1.5 shrink-0 w-6">
                                #{idx + 1}
                            </span>
                            <TargetRowEditor
                                idPrefix={`${idPrefix}-fb-${idx}`}
                                target={fb}
                                providers={providers}
                                providerMap={providerMap}
                                onChange={(next) => handleUpdateAt(idx, next)}
                                disabled={disabled}
                            />
                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                <button
                                    type="button"
                                    aria-label={`Move fallback ${idx + 1} up`}
                                    onClick={() => handleMove(idx, -1)}
                                    disabled={disabled || idx === 0}
                                    className="p-1.5 text-foreground-muted hover:text-foreground rounded border border-transparent hover:border-line disabled:opacity-30"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Move fallback ${idx + 1} down`}
                                    onClick={() => handleMove(idx, 1)}
                                    disabled={disabled || idx === fallbacks.length - 1}
                                    className="p-1.5 text-foreground-muted hover:text-foreground rounded border border-transparent hover:border-line disabled:opacity-30"
                                >
                                    <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Remove fallback ${idx + 1}`}
                                    onClick={() => handleRemove(idx)}
                                    disabled={disabled}
                                    className="p-1.5 text-foreground-muted hover:text-negative rounded border border-transparent hover:border-negative/30 disabled:opacity-30"
                                >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TierRoutingEditor({
    value,
    onChange,
    providers,
    tierNames,
    legacyDefaults,
    disabled = false,
}: TierRoutingEditorProps) {
    const [activeTier, setActiveTier] = useState<AiTier>('tier1');
    const [draft, setDraft] = useState<DraftRoutingConfig>(() => cloneRoutingConfig(value));
    const lastEmittedRef = useRef<string>(JSON.stringify(value ?? null));

    useEffect(() => {
        const serializedProp = JSON.stringify(value ?? null);
        if (serializedProp !== lastEmittedRef.current) {
            lastEmittedRef.current = serializedProp;
            setDraft(cloneRoutingConfig(value));
        }
    }, [value]);

    const providerMap = useMemo(
        () => new Map(providers.map((provider) => [provider.id, provider])),
        [providers]
    );

    const commitDraft = (nextDraft: DraftRoutingConfig) => {
        setDraft(nextDraft);
        const sanitized = sanitizeRoutingConfig(nextDraft);
        lastEmittedRef.current = JSON.stringify(sanitized ?? null);
        onChange(sanitized);
    };

    const currentTierDraft: DraftTierRoute = draft.tiers[activeTier] ?? {};

    const updateCurrentTier = (updater: (_prev: DraftTierRoute) => DraftTierRoute) => {
        const nextTier = updater(draft.tiers[activeTier] ?? {});
        commitDraft({
            tiers: {
                ...draft.tiers,
                [activeTier]: nextTier,
            },
        });
    };

    const clearCurrentTierDefaultPrimary = () => {
        updateCurrentTier((prev) => ({
            ...prev,
            defaultPrimary: undefined,
        }));
    };

    const toggleFunctionMode = (fn: AiFunction, useCustom: boolean) => {
        updateCurrentTier((prev) => {
            const nextFunctions = { ...(prev.functions ?? {}) };
            if (!useCustom) {
                delete nextFunctions[fn];
            } else if (!nextFunctions[fn]) {
                const seedPrimary =
                    prev.defaultPrimary && prev.defaultPrimary.providerId
                        ? { ...prev.defaultPrimary }
                        : getDefaultTargetFromProviders(providers);
                nextFunctions[fn] = {
                    primary: seedPrimary,
                    fallbacks: [],
                };
            }
            return {
                ...prev,
                functions: Object.keys(nextFunctions).length > 0 ? nextFunctions : undefined,
            };
        });
    };

    const updateFunctionRoute = (
        fn: AiFunction,
        updater: (_prev: DraftFunctionRoute) => DraftFunctionRoute
    ) => {
        updateCurrentTier((prev) => {
            const existing = prev.functions?.[fn] ?? {};
            return {
                ...prev,
                functions: {
                    ...(prev.functions ?? {}),
                    [fn]: updater(existing),
                },
            };
        });
    };

    const describeTarget = (target: DraftTarget | undefined): string | null => {
        if (!target || !target.providerId || !target.model.trim()) return null;
        const p = providerMap.get(target.providerId);
        const providerLabel = p ? `${p.name} (${p.slug})` : target.providerId;
        return `${providerLabel} / ${target.model}`;
    };

    const legacyActiveProvider = legacyDefaults?.activeProviderId
        ? providerMap.get(legacyDefaults.activeProviderId)
        : providers.find((p) => p.isActive) || providers[0];

    const getInheritedSummary = (fn: AiFunction): string => {
        const tierPrimarySummary = describeTarget(currentTierDraft.defaultPrimary);
        if (tierPrimarySummary) {
            const fbCount = currentTierDraft.defaultFallbacks?.filter((t) => t.providerId && t.model.trim()).length || 0;
            return `Tier default: ${tierPrimarySummary}${fbCount > 0 ? ` (+${fbCount} fallback${fbCount === 1 ? '' : 's'})` : ''}`;
        }
        const legacyProviderLabel = legacyActiveProvider
            ? `${legacyActiveProvider.name} (${legacyActiveProvider.slug})`
            : 'Active provider';
        return `Global legacy: ${legacyProviderLabel} / ${getLegacyModelSummary(fn, legacyDefaults)}`;
    };

    const getTierSummaryBadge = (tierId: AiTier): string => {
        const t = draft.tiers[tierId];
        if (!t) return 'Legacy';
        const hasDefault = Boolean(sanitizeTarget(t.defaultPrimary) || sanitizeTargets(t.defaultFallbacks));
        const fnCount = t.functions
            ? FUNCTIONS.filter((f) => {
                  const fnCfg = t.functions?.[f.id];
                  return Boolean(fnCfg && (sanitizeTarget(fnCfg.primary) || sanitizeTargets(fnCfg.fallbacks)));
              }).length
            : 0;
        if (hasDefault && fnCount > 0) return `Default + ${fnCount}`;
        if (hasDefault) return 'Default';
        if (fnCount > 0) return `${fnCount} custom`;
        return 'Legacy';
    };

    return (
        <div className="space-y-5">
            {providers.length === 0 && (
                <div className="p-3 rounded bg-warning/10 border border-warning/30 text-warning text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Add at least one AI provider above before configuring tier routing targets.</span>
                </div>
            )}

            {/* Tier Selector Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-line pb-3" role="tablist" aria-label="AI Tiers">
                {TIERS.map((tierMeta) => {
                    const isSelected = activeTier === tierMeta.id;
                    const displayName = tierNames?.[tierMeta.id]?.trim() || tierMeta.defaultName;
                    const badge = getTierSummaryBadge(tierMeta.id);

                    return (
                        <button
                            key={tierMeta.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setActiveTier(tierMeta.id)}
                            className={`px-3.5 py-2 rounded-md border text-xs font-medium transition-colors flex items-center gap-2 ${
                                isSelected
                                    ? 'bg-accent-orange/15 border-accent-orange text-accent-orange'
                                    : 'bg-background border-line text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                            }`}
                        >
                            <span>
                                {tierMeta.label} · {displayName}
                            </span>
                            <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                    isSelected
                                        ? 'bg-accent-orange/20 text-accent-orange'
                                        : 'bg-background-tertiary text-foreground-muted'
                                }`}
                            >
                                {badge}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Tier Default Route */}
            <div className="p-4 rounded-md bg-background border border-line space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Layers className="w-4 h-4 text-accent-orange" aria-hidden="true" />
                            Tier Default Route
                        </h4>
                        <p className="text-xs text-foreground-muted mt-0.5">
                            Used by all AI functions in this tier unless overridden below. Leave unset to fall back to the legacy global active/fallback providers.
                        </p>
                    </div>
                    {currentTierDraft.defaultPrimary && (
                        <button
                            type="button"
                            onClick={clearCurrentTierDefaultPrimary}
                            disabled={disabled}
                            className="px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground border border-line rounded flex items-center gap-1 self-start sm:self-auto disabled:opacity-50"
                        >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                            Clear Primary
                        </button>
                    )}
                </div>

                <div className="space-y-1.5">
                    <span className="text-xs font-medium text-foreground-secondary block">
                        Primary Target (Provider &amp; Model)
                    </span>
                    <TargetRowEditor
                        idPrefix={`${activeTier}-default-primary`}
                        target={currentTierDraft.defaultPrimary ?? { providerId: '', model: '' }}
                        providers={providers}
                        providerMap={providerMap}
                        allowEmptyProvider
                        emptyProviderLabel="— Inherit legacy global active provider —"
                        onChange={(nextTarget) => {
                            if (!nextTarget.providerId && !nextTarget.model.trim()) {
                                clearCurrentTierDefaultPrimary();
                            } else {
                                updateCurrentTier((prev) => ({
                                    ...prev,
                                    defaultPrimary: nextTarget,
                                }));
                            }
                        }}
                        disabled={disabled}
                    />
                </div>

                <div className="pt-3 border-t border-line">
                    <FallbackChainEditor
                        idPrefix={`${activeTier}-default`}
                        fallbacks={currentTierDraft.defaultFallbacks ?? []}
                        providers={providers}
                        providerMap={providerMap}
                        onChange={(nextFallbacks) =>
                            updateCurrentTier((prev) => ({
                                ...prev,
                                defaultFallbacks: nextFallbacks.length > 0 ? nextFallbacks : undefined,
                            }))
                        }
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Per-Function Overrides */}
            <div className="space-y-3">
                <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-accent-blue" aria-hidden="true" />
                        Per-Function Overrides
                    </h4>
                    <p className="text-xs text-foreground-muted mt-0.5">
                        Override the tier default for specific AI features (e.g., use a vision-capable model for CalorieSnap or a cheaper model for Activity Feedback).
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {FUNCTIONS.map((fnMeta) => {
                        const fnDraft = currentTierDraft.functions?.[fnMeta.id];
                        const isCustom = Boolean(fnDraft);

                        return (
                            <div
                                key={`${activeTier}-${fnMeta.id}`}
                                className={`p-4 rounded-md border transition-colors space-y-3 ${
                                    isCustom
                                        ? 'bg-background border-accent-orange/40'
                                        : 'bg-background/60 border-line'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">
                                                {fnMeta.label}
                                            </span>
                                            <span className="text-[11px] font-mono text-foreground-muted bg-background-tertiary px-1.5 py-0.5 rounded">
                                                {fnMeta.id}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground-muted mt-0.5">
                                            {fnMeta.description}
                                        </p>
                                        {activeTier === 'tier1' && fnMeta.id === 'planBuilder' && (
                                            <p className="text-[11px] text-accent-blue mt-1">
                                                Setting a custom primary route here grants Plan Builder access to Tier 1 users.
                                            </p>
                                        )}
                                    </div>

                                    <div className="inline-flex rounded-md border border-line bg-background-secondary p-0.5 shrink-0 self-start sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleFunctionMode(fnMeta.id, false)}
                                            disabled={disabled}
                                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                                !isCustom
                                                    ? 'bg-background-tertiary text-foreground'
                                                    : 'text-foreground-muted hover:text-foreground'
                                            }`}
                                        >
                                            Inherit tier default
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleFunctionMode(fnMeta.id, true)}
                                            disabled={disabled}
                                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                                isCustom
                                                    ? 'bg-accent-orange/15 text-accent-orange'
                                                    : 'text-foreground-muted hover:text-foreground'
                                            }`}
                                        >
                                            Custom route
                                        </button>
                                    </div>
                                </div>

                                {!isCustom ? (
                                    <p className="text-xs text-foreground-muted font-mono bg-background-secondary/60 px-2.5 py-1.5 rounded border border-line/60">
                                        {getInheritedSummary(fnMeta.id)}
                                    </p>
                                ) : (
                                    <div className="pt-3 border-t border-line space-y-3">
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-medium text-foreground-secondary block">
                                                Primary Target (Provider &amp; Model)
                                            </span>
                                            <TargetRowEditor
                                                idPrefix={`${activeTier}-${fnMeta.id}-primary`}
                                                target={fnDraft?.primary ?? { providerId: '', model: '' }}
                                                providers={providers}
                                                providerMap={providerMap}
                                                onChange={(nextTarget) =>
                                                    updateFunctionRoute(fnMeta.id, (prev) => ({
                                                        ...prev,
                                                        primary: nextTarget,
                                                    }))
                                                }
                                                disabled={disabled}
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-line/70">
                                            <FallbackChainEditor
                                                idPrefix={`${activeTier}-${fnMeta.id}`}
                                                fallbacks={fnDraft?.fallbacks ?? []}
                                                providers={providers}
                                                providerMap={providerMap}
                                                onChange={(nextFallbacks) =>
                                                    updateFunctionRoute(fnMeta.id, (prev) => ({
                                                        ...prev,
                                                        fallbacks:
                                                            nextFallbacks.length > 0 ? nextFallbacks : undefined,
                                                    }))
                                                }
                                                disabled={disabled}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
