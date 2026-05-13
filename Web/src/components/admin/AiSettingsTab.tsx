import React, { useEffect, useState } from 'react';
import { Plus, Bot, Eye, Trash2, Save, Loader2, Zap, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';
import TierInputGroup from '@/components/admin/TierInputGroup';
import useConfirmAction from '@/hooks/useConfirmAction';
import { AdminAiSettingsData } from '@/app/admin/types';

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
    const [providers, setProviders] = useState<any[]>([]);
    const [activeProviderId, setActiveProviderId] = useState<string | null>(settings?.activeProviderId || null);
    const [fallbackProviderId, setFallbackProviderId] = useState<string | null>(settings?.fallbackProviderId || null);
    const [showProviderForm, setShowProviderForm] = useState(false);
    const [editingProvider, setEditingProvider] = useState<any | null>(null);

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

        tier1MealSuggestLimit: settings?.tier1MealSuggestLimit ?? 1,
        tier2MealSuggestLimit: settings?.tier2MealSuggestLimit ?? 3,
        tier3MealSuggestLimit: settings?.tier3MealSuggestLimit ?? 6,

        tier1ActivityFeedbackLimit: settings?.tier1ActivityFeedbackLimit ?? 1,
        tier2ActivityFeedbackLimit: settings?.tier2ActivityFeedbackLimit ?? 3,
        tier3ActivityFeedbackLimit: settings?.tier3ActivityFeedbackLimit ?? 6,

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

    const handleSaveGlobal = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/admin/ai-settings', {
                method: 'PUT',
                headers: csrfHeaders(),
                body: JSON.stringify({
                    ...formData,
                    activeProviderId,
                    fallbackProviderId
                }),
            });
            if (!res.ok) throw new Error('Failed to save settings');
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
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <p className="text-purple-600 text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-purple-800">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-green-600 text-sm font-medium">AI Enabled</p>
                    <p className="text-2xl font-bold text-green-800">{stats?.enabledUsers || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-blue-600 text-sm font-medium">Custom API Keys</p>
                    <p className="text-2xl font-bold text-blue-800">{stats?.usersWithCustomKey || 0}</p>
                </div>
            </div>

            {/* Providers Section */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-purple-600" />
                        AI Providers
                    </h3>
                    <button
                        onClick={() => { setEditingProvider(null); setShowProviderForm(true); }}
                        className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-sm font-medium flex items-center gap-1 transition"
                    >
                        <Plus className="w-4 h-4" /> Add Provider
                    </button>
                </div>

                {providers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">No providers configured.</p>
                        <button onClick={() => setShowProviderForm(true)} className="text-purple-600 hover:underline mt-2 text-sm">Add one now</button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {providers.map(provider => (
                            <div key={provider.id} className={`p-4 rounded-lg border flex items-center justify-between ${activeProviderId === provider.id ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : fallbackProviderId === provider.id ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${activeProviderId === provider.id ? 'bg-purple-600' : fallbackProviderId === provider.id ? 'bg-amber-500' : 'bg-gray-300'}`} />
                                    <div>
                                        <h4 className="font-medium text-gray-900">{provider.name} {activeProviderId === provider.id && '(Active)'} {fallbackProviderId === provider.id && '(Fallback)'}</h4>
                                        <p className="text-xs text-gray-500 flex gap-2">
                                            <span className="uppercase bg-gray-100 px-1.5 rounded">{provider.type}</span>
                                            <span>{provider.models.join(', ')}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeProviderId !== provider.id && (
                                        <button
                                            onClick={() => setActiveProviderId(provider.id)}
                                            className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded border border-purple-200"
                                        >
                                            Set Active
                                        </button>
                                    )}
                                    {fallbackProviderId !== provider.id && activeProviderId !== provider.id && (
                                        <button
                                            onClick={() => setFallbackProviderId(provider.id)}
                                            className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded border border-amber-200"
                                        >
                                            Set Fallback
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setEditingProvider(provider); setShowProviderForm(true); }}
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProvider(provider.id)}
                                        className="p-2 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Global Limits & Prompt */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4">
                <h3 className="font-semibold text-gray-800">Usage Limits & Persona</h3>

                {/* Usage Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TierInputGroup tier={1} formData={formData} setFormData={setFormData} />
                    <TierInputGroup tier={2} formData={formData} setFormData={setFormData} />
                    <TierInputGroup tier={3} formData={formData} setFormData={setFormData} />
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">CalorieSnap (AI Food Scanner) Model ID</label>
                    <input
                        type="text"
                        value={formData.calorieSnapModel}
                        onChange={(e) => setFormData({ ...formData, calorieSnapModel: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="e.g. gemini-1.5-flash"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Must be a valid vision model from Google (e.g., `gemini-1.5-flash` or `gemini-1.5-pro`).
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meal Suggestions Model ID</label>
                    <input
                        type="text"
                        value={formData.mealSuggestModel}
                        onChange={(e) => setFormData({ ...formData, mealSuggestModel: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="e.g. gemini-1.5-flash"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Used for the &quot;What should I eat?&quot; meal suggestions feature. Any non-vision model works here.
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activity Feedback Model ID</label>
                    <input
                        type="text"
                        value={formData.activityFeedbackModel}
                        onChange={(e) => setFormData({ ...formData, activityFeedbackModel: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="e.g. gemini-1.5-flash"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Used for post-activity AI coaching feedback and weekly nutrition insights. Any non-vision model works here.
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                    <textarea
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-32"
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSaveGlobal}
                        disabled={processing}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {processing ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </div>

            {/* Plan Builder AI Settings */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Plan Builder AI
                </h3>
                <p className="text-xs text-gray-500">
                    Configure the AI model used for plan analysis, suggestions, and guided mode features. It will use the globally active AI provider.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Builder Model</label>
                    <input
                        type="text"
                        value={formData.planBuilderModel}
                        onChange={(e) => setFormData({ ...formData, planBuilderModel: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. gpt-4o"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Model ID used for plan analysis and suggestions. Should support large context windows.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens Per Analysis</label>
                    <input
                        type="number"
                        value={formData.planMaxTokensPerAnalysis}
                        onChange={(e) => setFormData({ ...formData, planMaxTokensPerAnalysis: parseInt(e.target.value, 10) || 8000 })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        min={1000}
                        max={16000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Maximum output tokens per AI analysis request (default: 8000). Higher values give more detailed analysis.
                    </p>
                </div>
            </div>

            {/* Provider Modal/Form Overlay */}
            {showProviderForm && (
                <div className="fixed inset-0 bg-black/[var(--modal-backdrop-opacity)] flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">{editingProvider ? 'Edit Provider' : 'Add New Provider'}</h3>
                        <ProviderForm
                            initialData={editingProvider}
                            onClose={() => setShowProviderForm(false)}
                            onSuccess={() => { setShowProviderForm(false); fetchProviders(); }}
                        />
                    </div>
                </div>
            )}
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: formData.type,
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        placeholder="e.g. OpenAI"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        placeholder="openai"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="openai">OpenAI Compatible</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google Gemini</option>
                        <option value="nvidia">NVIDIA NIM</option>
                        <option value="zhipu">Zhipu AI</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Token Limit</label>
                    <input
                        type="number"
                        value={formData.monthlyTokenLimit}
                        onChange={(e) => setFormData({ ...formData, monthlyTokenLimit: e.target.value })}
                        placeholder="Optional (e.g. 1000000)"
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key(s) {initialData && '(Leave blank to keep current)'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                    Enter multiple keys separated by commas or newlines for automatic fallback on rate limits (429).
                </p>
                <div className="flex gap-2 items-start">
                    <textarea
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 min-h-[80px] font-mono text-sm leading-relaxed"
                        placeholder="sk-key1,&#10;sk-key2..."
                    />
                    <button
                        onClick={handleTest}
                        disabled={testing || (!formData.apiKey && !initialData)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-1 mt-1 shrink-0"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Test
                    </button>
                </div>
                {testResult && (
                    <p className={`text-xs mt-2 ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
                        {testResult.success ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {testResult.message}
                    </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Models (comma separated)</label>
                <input
                    type="text"
                    value={formData.models}
                    onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                    placeholder="gpt-4, gpt-4o-mini"
                />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initialData ? 'Update Provider' : 'Add Provider'}
                </button>
            </div>
        </div>
    );
};
