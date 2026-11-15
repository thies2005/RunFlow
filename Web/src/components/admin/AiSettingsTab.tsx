import React, { useEffect, useState } from 'react';
import { Plus, Sliders, Eye, Trash2, Save, Loader2, Zap, AlertTriangle, CheckCircle, Activity, GitBranch } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';
import TierInputGroup from '@/components/admin/TierInputGroup';
import TierRoutingEditor from '@/components/admin/TierRoutingEditor';
import { Modal } from '@/components/ui/Modal';
import useConfirmAction from '@/hooks/useConfirmAction';
import { AdminAiProvider, AdminAiSettingsData, TierRoutingConfig } from '@/app/admin/types';

interface AiSettingsTabProps {
    settings?: AdminAiSettingsData;
    stats?: {
        totalUsers: number;
        enabledUsers: number;
        usersWithCustomKey: number;
    };
    onRefresh: () => void;
    processing: boolean;
    setProcessing: (_val: boolean) => void;
    setActionMessage: (_msg: { type: 'success' | 'error', text: string } | null) => void;
}

export default function AiSettingsTab({ settings, stats, onRefresh, processing, setProcessing, setActionMessage }: AiSettingsTabProps) {
    const { confirm, ConfirmDialog } = useConfirmAction();
    const [providers, setProviders] = useState<AdminAiProvider[]>([]);
    const [activeProviderId, setActiveProviderId] = useState<string | null>(settings?.activeProviderId || null);
    const [fallbackProviderId, setFallbackProviderId] = useState<string | null>(settings?.fallbackProviderId || null);
    const [routingConfig, setRoutingConfig] = useState<TierRoutingConfig | null>(settings?.routingConfig ?? null);
    const [showProviderForm, setShowProviderForm] = useState(false);
    const [editingProvider, setEditingProvider] = useState<AdminAiProvider | null>(null);

    // Global Settings Form Data (Tiers & System Prompt)
    const [formData, setFormData] = useState({
        tier1Name: settings?.tier1Name || 'Basic',
        tier1DailyLimit: settings?.tier1DailyLimit || 10,
        tier1MonthlyLimit: settings?.tier1MonthlyLimit || 100,
        tier1DailyTokenLimit: settings?.tier1DailyTokenLimit || 50000,
        tier1MonthlyTokenLimit: settings?.tier1MonthlyTokenLimit || 500000,

        tier2Name: settings?.tier2Name || 'Standard',
        tier2DailyLimit: settings?.tier2DailyLimit || 25,
        tier2MonthlyLimit: settings?.tier2MonthlyLimit || 300,
        tier2DailyTokenLimit: settings?.tier2DailyTokenLimit || 100000,
        tier2MonthlyTokenLimit: settings?.tier2MonthlyTokenLimit || 1000000,

        tier3Name: settings?.tier3Name || 'Premium',
        tier3DailyLimit: settings?.tier3DailyLimit || 50,
        tier3MonthlyLimit: settings?.tier3MonthlyLimit || 500,
        tier3DailyTokenLimit: settings?.tier3DailyTokenLimit || 200000,
        tier3MonthlyTokenLimit: settings?.tier3MonthlyTokenLimit || 2000000,

        tier1CalorieSnapLimit: settings?.tier1CalorieSnapLimit ?? 1,
        tier2CalorieSnapLimit: settings?.tier2CalorieSnapLimit ?? 3,
        tier3CalorieSnapLimit: settings?.tier3CalorieSnapLimit ?? 6,

        tier1MealSuggestLimit: settings?.tier1MealSuggestLimit ?? 3,
        tier2MealSuggestLimit: settings?.tier2MealSuggestLimit ?? 10,
        tier3MealSuggestLimit: settings?.tier3MealSuggestLimit ?? 25,

        tier1ActivityFeedbackLimit: settings?.tier1ActivityFeedbackLimit ?? 5,
        tier2ActivityFeedbackLimit: settings?.tier2ActivityFeedbackLimit ?? 15,
        tier3ActivityFeedbackLimit: settings?.tier3ActivityFeedbackLimit ?? 50,

        calorieSnapModel: settings?.calorieSnapModel || 'gemini-1.5-flash',
        mealSuggestModel: settings?.mealSuggestModel || 'gemini-1.5-flash',
        activityFeedbackModel: settings?.activityFeedbackModel || 'gemini-1.5-flash',

        systemPrompt: settings?.systemPrompt || '',

        planBuilderModel: settings?.planBuilderModel || 'gpt-4o',
        planMaxTokensPerAnalysis: settings?.planMaxTokensPerAnalysis || 8000,
    });

    useEffect(() => {
        fetchProviders();
    }, []);

    useEffect(() => {
        if (settings) {
            setActiveProviderId(settings.activeProviderId);
            setFallbackProviderId(settings.fallbackProviderId);
            setRoutingConfig(settings.routingConfig ?? null);
            setFormData(prev => ({
                ...prev,
                tier1Name: settings.tier1Name || prev.tier1Name,
                tier1DailyLimit: settings.tier1DailyLimit ?? prev.tier1DailyLimit,
                tier1MonthlyLimit: settings.tier1MonthlyLimit ?? prev.tier1MonthlyLimit,
                tier1DailyTokenLimit: settings.tier1DailyTokenLimit ?? prev.tier1DailyTokenLimit,
                tier1MonthlyTokenLimit: settings.tier1MonthlyTokenLimit ?? prev.tier1MonthlyTokenLimit,

                tier2Name: settings.tier2Name || prev.tier2Name,
                tier2DailyLimit: settings.tier2DailyLimit ?? prev.tier2DailyLimit,
                tier2MonthlyLimit: settings.tier2MonthlyLimit ?? prev.tier2MonthlyLimit,
                tier2DailyTokenLimit: settings.tier2DailyTokenLimit ?? prev.tier2DailyTokenLimit,
                tier2MonthlyTokenLimit: settings.tier2MonthlyTokenLimit ?? prev.tier2MonthlyTokenLimit,

                tier3Name: settings.tier3Name || prev.tier3Name,
                tier3DailyLimit: settings.tier3DailyLimit ?? prev.tier3DailyLimit,
                tier3MonthlyLimit: settings.tier3MonthlyLimit ?? prev.tier3MonthlyLimit,
                tier3DailyTokenLimit: settings.tier3DailyTokenLimit ?? prev.tier3DailyTokenLimit,
                tier3MonthlyTokenLimit: settings.tier3MonthlyTokenLimit ?? prev.tier3MonthlyTokenLimit,

                tier1CalorieSnapLimit: settings.tier1CalorieSnapLimit ?? prev.tier1CalorieSnapLimit,
                tier2CalorieSnapLimit: settings.tier2CalorieSnapLimit ?? prev.tier2CalorieSnapLimit,
                tier3CalorieSnapLimit: settings.tier3CalorieSnapLimit ?? prev.tier3CalorieSnapLimit,

                tier1MealSuggestLimit: settings.tier1MealSuggestLimit ?? prev.tier1MealSuggestLimit,
                tier2MealSuggestLimit: settings.tier2MealSuggestLimit ?? prev.tier2MealSuggestLimit,
                tier3MealSuggestLimit: settings.tier3MealSuggestLimit ?? prev.tier3MealSuggestLimit,

                tier1ActivityFeedbackLimit: settings.tier1ActivityFeedbackLimit ?? prev.tier1ActivityFeedbackLimit,
                tier2ActivityFeedbackLimit: settings.tier2ActivityFeedbackLimit ?? prev.tier2ActivityFeedbackLimit,
                tier3ActivityFeedbackLimit: settings.tier3ActivityFeedbackLimit ?? prev.tier3ActivityFeedbackLimit,

                calorieSnapModel: settings.calorieSnapModel || prev.calorieSnapModel,
                mealSuggestModel: settings.mealSuggestModel || prev.mealSuggestModel,
                activityFeedbackModel: settings.activityFeedbackModel || prev.activityFeedbackModel,

                systemPrompt: settings.systemPrompt || prev.systemPrompt,

                planBuilderModel: settings.planBuilderModel || prev.planBuilderModel,
                planMaxTokensPerAnalysis: settings.planMaxTokensPerAnalysis ?? prev.planMaxTokensPerAnalysis,
            }));
        }
    }, [settings]);

    const fetchProviders = async () => {
        try {
            const res = await fetch('/api/admin/providers');
            const data = await res.json();
            if (data.providers) setProviders(data.providers);
        } catch (error) {
            console.error('Failed to fetch providers', error);
        }
    };

    const hasUnsavedRoutingChanges =
        JSON.stringify(routingConfig ?? null) !== JSON.stringify(settings?.routingConfig ?? null);

    const handleProviderSlotChange = async (nextActiveId: string | null, nextFallbackId: string | null) => {
        const prevActive = activeProviderId;
        const prevFallback = fallbackProviderId;
        setActiveProviderId(nextActiveId);
        setFallbackProviderId(nextFallbackId);
        setProcessing(true);
        try {
            const res = await fetch('/api/admin/ai-settings', {
                method: 'PUT',
                headers: csrfHeaders(),
                body: JSON.stringify({
                    ...formData,
                    activeProviderId: nextActiveId,
                    fallbackProviderId: nextFallbackId,
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update provider routing');
            }
            setActionMessage({ type: 'success', text: 'Provider routing updated' });
            onRefresh();
        } catch (error: any) {
            setActiveProviderId(prevActive);
            setFallbackProviderId(prevFallback);
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveGlobal = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/admin/ai-settings', {
                method: 'PUT',
                headers: csrfHeaders(),
                body: JSON.stringify({
                    ...formData,
                    activeProviderId,
                    fallbackProviderId,
                    routingConfig,
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save settings');
            }
            setActionMessage({ type: 'success', text: 'Global settings saved' });
            onRefresh();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteProvider = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Provider',
            message: 'Are you sure you want to delete this AI provider?',
            confirmText: 'Delete',
            isDestructive: true
        });
        if (!isConfirmed) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/providers?id=${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
            if (!res.ok) throw new Error('Failed to delete');
            fetchProviders();
            if (activeProviderId === id) setActiveProviderId(null);
            if (fallbackProviderId === id) setFallbackProviderId(null);
            onRefresh();
            setActionMessage({ type: 'success', text: 'Provider deleted' });
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background-secondary p-4 rounded-md border border-line">
                    <p className="text-foreground-muted text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-background-secondary p-4 rounded-md border border-line">
                    <p className="text-foreground-muted text-sm font-medium">AI Enabled</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{stats?.enabledUsers || 0}</p>
                </div>
                <div className="bg-background-secondary p-4 rounded-md border border-line">
                    <p className="text-foreground-muted text-sm font-medium">Custom API Keys</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{stats?.usersWithCustomKey || 0}</p>
                </div>
            </div>

            {/* Providers Section */}
            <div className="bg-background-secondary p-6 rounded-md border border-line space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-foreground-muted" aria-hidden="true" />
                        AI Providers
                    </h3>
                    <button
                        onClick={() => { setEditingProvider(null); setShowProviderForm(true); }}
                        className="px-3 py-1.5 bg-accent-orange/10 text-accent-orange rounded-md hover:bg-accent-orange/20 text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Provider
                    </button>
                </div>

                {providers.length === 0 ? (
                    <div className="text-center py-8 bg-background-secondary rounded-md border border-dashed border-line-strong">
                        <p className="text-foreground-muted">No providers configured.</p>
                        <button onClick={() => setShowProviderForm(true)} className="text-accent-blue hover:underline mt-2 text-sm">Add one now</button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {providers.map(provider => (
                            <div key={provider.id} className={`p-4 rounded-md border flex items-center justify-between ${activeProviderId === provider.id ? 'border-accent-orange bg-accent-orange/10' : fallbackProviderId === provider.id ? 'border-workout-tempo bg-workout-tempo/10' : 'border-line bg-background-secondary'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${activeProviderId === provider.id ? 'bg-accent-orange' : fallbackProviderId === provider.id ? 'bg-workout-tempo' : 'bg-line-strong'}`} />
                                    <div>
                                        <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <span>{provider.name} {activeProviderId === provider.id && '(Active)'} {fallbackProviderId === provider.id && '(Fallback)'}</span>
                                            {!provider.isActive && (
                                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/30">
                                                    Inactive
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-foreground-muted flex flex-wrap gap-2">
                                            <span className="bg-background-tertiary px-1.5 rounded-sm font-mono">{provider.slug}</span>
                                            <span className="bg-background-tertiary px-1.5 rounded-sm">{provider.type}</span>
                                            <span>{provider.models.join(', ')}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeProviderId !== provider.id && (
                                        <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => handleProviderSlotChange(provider.id, fallbackProviderId === provider.id ? null : fallbackProviderId)}
                                            className="px-3 py-1 text-xs font-medium text-accent-orange hover:bg-accent-orange/10 rounded border border-accent-orange/30 disabled:opacity-50"
                                        >
                                            Set Active
                                        </button>
                                    )}
                                    {fallbackProviderId !== provider.id && activeProviderId !== provider.id && (
                                        <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => handleProviderSlotChange(activeProviderId, provider.id)}
                                            className="px-3 py-1 text-xs font-medium text-workout-tempo hover:bg-workout-tempo/10 rounded border border-workout-tempo/30 disabled:opacity-50"
                                        >
                                            Set Fallback
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        aria-label={`Edit provider ${provider.name}`}
                                        onClick={() => { setEditingProvider(provider); setShowProviderForm(true); }}
                                        className="p-2 text-foreground-muted hover:text-foreground-secondary rounded"
                                    >
                                        <Eye className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Delete provider ${provider.name}`}
                                        onClick={() => handleDeleteProvider(provider.id)}
                                        className="p-2 text-foreground-muted hover:text-negative rounded"
                                    >
                                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tier & Function Routing Section */}
            <div className="bg-background-secondary p-6 rounded-md border border-line space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <GitBranch className="w-5 h-5 text-accent-orange" aria-hidden="true" />
                            Tier &amp; Function Routing
                        </h3>
                        <p className="text-xs text-foreground-muted mt-1">
                            Assign specific primary models and ordered fallback chains per user tier and AI function. Same-provider downgrades and cross-provider failovers are supported.
                        </p>
                    </div>
                    {hasUnsavedRoutingChanges && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded bg-accent-orange/15 text-accent-orange border border-accent-orange/30 self-start sm:self-center shrink-0">
                            Unsaved routing changes
                        </span>
                    )}
                </div>

                <TierRoutingEditor
                    value={routingConfig}
                    onChange={setRoutingConfig}
                    providers={providers}
                    tierNames={{
                        tier1: formData.tier1Name,
                        tier2: formData.tier2Name,
                        tier3: formData.tier3Name,
                    }}
                    legacyDefaults={{
                        activeProviderId,
                        fallbackProviderId,
                        defaultModel: settings?.defaultModel ?? undefined,
                        calorieSnapModel: formData.calorieSnapModel,
                        mealSuggestModel: formData.mealSuggestModel,
                        activityFeedbackModel: formData.activityFeedbackModel,
                        planBuilderModel: formData.planBuilderModel,
                    }}
                    disabled={processing}
                />
            </div>

            {/* Global Limits & Prompt */}
            <div className="bg-background-secondary p-6 rounded-md border border-line space-y-4">
                <h3 className="font-semibold text-foreground">Usage Limits & Persona</h3>

                {/* Usage Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TierInputGroup tier={1} formData={formData} setFormData={setFormData} />
                    <TierInputGroup tier={2} formData={formData} setFormData={setFormData} />
                    <TierInputGroup tier={3} formData={formData} setFormData={setFormData} />
                </div>

                <div className="pt-4 border-t border-line">
                    <label htmlFor="ai-calorie-snap-model" className="block text-sm font-medium text-foreground-secondary mb-1">CalorieSnap (AI Food Scanner) Model ID</label>
                    <input
                        id="ai-calorie-snap-model"
                        type="text"
                        value={formData.calorieSnapModel}
                        onChange={(e) => setFormData({ ...formData, calorieSnapModel: e.target.value })}
                        className="w-full px-3 py-2 bg-background-secondary text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                        placeholder="e.g. gemini-1.5-flash"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                        Must be a valid vision model from Google (e.g., `gemini-1.5-flash` or `gemini-1.5-pro`).
                    </p>
                </div>

                <div className="pt-4 border-t border-line">
                    <label htmlFor="ai-meal-suggest-model" className="block text-sm font-medium text-foreground-secondary mb-1">Meal Suggestions Model ID</label>
                    <input
                        id="ai-meal-suggest-model"
                        type="text"
                        value={formData.mealSuggestModel}
                        onChange={(e) => setFormData({ ...formData, mealSuggestModel: e.target.value })}
                        className="w-full px-3 py-2 bg-background-secondary text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                        placeholder="e.g. gemini-1.5-flash"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                        Used for the &quot;What should I eat?&quot; meal suggestions feature. Any non-vision model works here.
                    </p>
                </div>

                <div className="pt-4 border-t border-line">
                    <label htmlFor="ai-activity-feedback-model" className="block text-sm font-medium text-foreground-secondary mb-1">Activity Feedback Model ID</label>
                    <input
                        id="ai-activity-feedback-model"
                        type="text"
                        value={formData.activityFeedbackModel}
                        onChange={(e) => setFormData({ ...formData, activityFeedbackModel: e.target.value })}
                        className="w-full px-3 py-2 bg-background-secondary text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                        placeholder="e.g. gemini-1.5-flash"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                        Used for post-activity AI coaching feedback and weekly nutrition insights. Any non-vision model works here.
                    </p>
                </div>

                <div className="pt-4 border-t border-line">
                    <label htmlFor="ai-system-prompt" className="block text-sm font-medium text-foreground-secondary mb-1">System Prompt</label>
                    <textarea
                        id="ai-system-prompt"
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                        className="w-full px-3 py-2 bg-background-secondary text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange h-32"
                    />
                </div>
            </div>

            {/* Plan Builder AI Settings */}
            <div className="bg-background-secondary p-6 rounded border border-line space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-accent-orange" aria-hidden="true" />
                    Plan Builder AI
                </h3>
                <p className="text-xs text-foreground-muted">
                    Configure the AI model used for plan analysis, suggestions, and guided mode features. It will use the globally active AI provider.
                </p>

                <div>
                    <label htmlFor="ai-plan-builder-model" className="block text-sm font-medium text-foreground-secondary mb-1">Plan Builder Model</label>
                    <input
                        id="ai-plan-builder-model"
                        type="text"
                        value={formData.planBuilderModel}
                        onChange={(e) => setFormData({ ...formData, planBuilderModel: e.target.value })}
                        className="w-full px-3 py-2 bg-background-secondary text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                        placeholder="e.g. gpt-4o"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                        Model ID used for plan analysis and suggestions. Should support large context windows.
                    </p>
                </div>

                <div>
                    <label htmlFor="ai-plan-max-tokens" className="block text-sm font-medium text-foreground-secondary mb-1">Max Tokens Per Analysis</label>
                    <input
                        id="ai-plan-max-tokens"
                        type="number"
                        value={formData.planMaxTokensPerAnalysis}
                        onChange={(e) => setFormData({ ...formData, planMaxTokensPerAnalysis: parseInt(e.target.value, 10) || 8000 })}
                        className="w-full px-3 py-2 bg-background-secondary text-foreground border border-line rounded font-mono tabular-nums focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                        min={1000}
                        max={16000}
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                        Maximum output tokens per AI analysis request (default: 8000). Higher values give more detailed analysis.
                    </p>
                </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-0 z-10 bg-background border-t border-line py-3 px-4 flex items-center justify-between gap-4">
                <div className="text-xs text-foreground-muted">
                    {hasUnsavedRoutingChanges && (
                        <span className="text-accent-orange font-medium">
                            Tier routing changes pending save
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleSaveGlobal}
                    disabled={processing}
                    className="px-6 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white rounded font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" aria-hidden="true" />
                    {processing ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            {/* Provider Modal/Form Overlay */}
            <Modal
                isOpen={showProviderForm}
                onClose={() => setShowProviderForm(false)}
                title={editingProvider ? 'Edit Provider' : 'Add New Provider'}
                maxWidth="lg"
            >
                <ProviderForm
                    initialData={editingProvider}
                    onClose={() => setShowProviderForm(false)}
                    onSuccess={() => { setShowProviderForm(false); fetchProviders(); }}
                />
            </Modal>
            <ConfirmDialog />
        </div>
    );
}

const ProviderForm = ({ initialData, onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        type: initialData?.type || 'openai',
        baseUrl: initialData?.baseUrl || '',
        apiKey: '',
        models: initialData?.models?.join(',') || '',
        monthlyTokenLimit: initialData?.monthlyTokenLimit || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [testing, setTesting] = useState(false);

    // Auto-fill defaults based on type
    useEffect(() => {
        if (!initialData && formData.type) {
            if (formData.type === 'openai') {
                setFormData(prev => ({ ...prev, baseUrl: 'https://api.openai.com/v1', models: 'gpt-4o,gpt-4o-mini' }));
            } else if (formData.type === 'nvidia') {
                setFormData(prev => ({ ...prev, baseUrl: 'https://integrate.api.nvidia.com/v1', models: 'moonshotai/kimi-k2.5,meta/llama-3.1-405b-instruct' }));
            } else if (formData.type === 'zhipu') {
                setFormData(prev => ({ ...prev, baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: 'glm-4-plus,glm-4-air,glm-4-0520' }));
            } else if (formData.type === 'anthropic') {
                setFormData(prev => ({ ...prev, baseUrl: 'https://api.anthropic.com', models: 'claude-3-opus-20240229,claude-3-sonnet-20240229' }));
            } else if (formData.type === 'google') {
                setFormData(prev => ({ ...prev, baseUrl: 'https://generativelanguage.googleapis.com', models: 'gemini-1.5-pro,gemini-1.5-flash' }));
            }
        }
    }, [formData.type, initialData]);

    const handleSave = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...formData,
                models: formData.models.split(',').map((s: string) => s.trim()).filter(Boolean),
                id: initialData?.id,
            };

            // Generate slug if empty
            if (!payload.slug) {
                payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            }

            const method = initialData ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/providers', {
                method,
                headers: csrfHeaders(),
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const modelsList = formData.models.split(',').map((s: string) => s.trim()).filter(Boolean);
            const res = await fetch('/api/ai/test-key', {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({
                    provider: formData.type,
                    providerId: initialData?.id,
                    apiKey: formData.apiKey || null,
                    baseUrl: formData.baseUrl,
                    model: modelsList[0] || 'gpt-4o-mini',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({ success: true, message: `Connected to ${data.model || 'API'}` });
            } else {
                setTestResult({ success: false, message: data.error || 'Connection failed' });
            }
        } catch {
            setTestResult({ success: false, message: 'Network error' });
        } finally {
            setTesting(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="provider-name" className="block text-sm font-medium text-foreground-secondary mb-1">Name</label>
                    <input
                        id="provider-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-background text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange placeholder-foreground-muted"
                        placeholder="e.g. OpenAI"
                    />
                </div>
                <div>
                    <label htmlFor="provider-slug" className="block text-sm font-medium text-foreground-secondary mb-1">Slug</label>
                    <input
                        id="provider-slug"
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-background text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange placeholder-foreground-muted font-mono text-sm"
                        placeholder="openai"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="provider-type" className="block text-sm font-medium text-foreground-secondary mb-1">Type</label>
                    <select
                        id="provider-type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 bg-background text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                    >
                        <option value="openai">OpenAI Compatible</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google Gemini</option>
                        <option value="nvidia">NVIDIA NIM</option>
                        <option value="zhipu">Zhipu AI</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="provider-token-limit" className="block text-sm font-medium text-foreground-secondary mb-1">Monthly Token Limit</label>
                    <input
                        id="provider-token-limit"
                        type="number"
                        value={formData.monthlyTokenLimit}
                        onChange={(e) => setFormData({ ...formData, monthlyTokenLimit: e.target.value })}
                        placeholder="Optional (e.g. 1000000)"
                        className="w-full px-3 py-2 bg-background text-foreground border border-line rounded font-mono tabular-nums focus:ring-2 focus:ring-accent-orange focus:border-accent-orange placeholder-foreground-muted"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="provider-base-url" className="block text-sm font-medium text-foreground-secondary mb-1">Base URL</label>
                <input
                    id="provider-base-url"
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-background text-foreground border border-line rounded font-mono text-sm focus:ring-2 focus:ring-accent-orange focus:border-accent-orange placeholder-foreground-muted"
                />
            </div>

            <div>
                <label htmlFor="provider-api-key" className="block text-sm font-medium text-foreground-secondary mb-1">
                    API Key(s) {initialData && '(Leave blank to keep current)'}
                </label>
                <p className="text-xs text-foreground-muted mb-2">
                    Enter multiple keys separated by commas or newlines for automatic fallback on rate limits (429).
                </p>
                <div className="flex gap-2 items-start">
                    <textarea
                        id="provider-api-key"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        className="flex-1 px-3 py-2 bg-background text-foreground border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange placeholder-foreground-muted min-h-[80px] font-mono text-sm leading-relaxed"
                        placeholder="sk-key1,&#10;sk-key2..."
                    />
                    <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing || (!formData.apiKey && !initialData)}
                        className="px-3 py-2 bg-background-tertiary border border-line text-foreground-secondary rounded hover:bg-surface-hover text-sm font-medium flex items-center gap-1 mt-1 shrink-0 disabled:opacity-50"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Zap className="w-4 h-4" aria-hidden="true" />}
                        Test
                    </button>
                </div>
                {testResult && (
                    <p role="status" className={`text-xs mt-2 ${testResult.success ? 'text-positive' : 'text-negative'}`}>
                        {testResult.success ? <CheckCircle className="w-3 h-3 inline mr-1" aria-hidden="true" /> : <AlertTriangle className="w-3 h-3 inline mr-1" aria-hidden="true" />}
                        {testResult.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="provider-models" className="block text-sm font-medium text-foreground-secondary mb-1">Models (comma separated)</label>
                <input
                    id="provider-models"
                    type="text"
                    value={formData.models}
                    onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                    className="w-full px-3 py-2 bg-background text-foreground border border-line rounded font-mono text-sm focus:ring-2 focus:ring-accent-orange focus:border-accent-orange placeholder-foreground-muted"
                    placeholder="gpt-4, gpt-4o-mini"
                />
            </div>

            {error && <p role="alert" className="text-negative text-sm">{error}</p>}

            <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-line text-foreground-secondary hover:bg-background-tertiary rounded font-medium text-sm transition"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white rounded font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {initialData ? 'Update Provider' : 'Add Provider'}
                </button>
            </div>
        </div>
    );
};
