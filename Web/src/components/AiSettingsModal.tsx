'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Save,
    AlertCircle,
    Bot,
    Key,
    Eye,
    EyeOff,
    Check,
    Loader2,
    Info,
    Zap,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface AiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AiSettings {
    adminAllowed: boolean;
    aiEnabled: boolean;
    hasCustomApiKey: boolean;
    customBaseUrl: string | null;
    customModel: string | null;
    feedbackMode: string;
    accessFitnessMetrics: boolean;
    accessActivityHistory: boolean;
    accessHeartRateData: boolean;
    accessGoals: boolean;
    accessTrainingPlan: boolean;
    accessPerformance: boolean;
    accessBiometrics: boolean;
    accessAllActivities: boolean;
    accessActivityLogs: boolean;
    accessNutritionLogs: boolean;
    customPromptAddition: string | null;
}

interface UsageInfo {
    messagesUsedToday: number;
    messagesUsedThisMonth: number;
    dailyLimit: number;
    monthlyLimit: number;
    canUse: boolean;
}

const DATA_ACCESS_OPTIONS = [
    {
        key: 'accessFitnessMetrics',
        label: 'Fitness Metrics',
        description: 'CTL, ATL, TSB (training load & form)',
    },
    {
        key: 'accessActivityHistory',
        label: 'Recent Activity',
        description: 'Your recent runs, distances, and times (Last 20)',
    },
    {
        key: 'accessHeartRateData',
        label: 'Heart Rate Data',
        description: 'HR zones, average & max HR',
    },
    {
        key: 'accessGoals',
        label: 'Goals & Races',
        description: 'Your race goals and targets',
    },
    {
        key: 'accessTrainingPlan',
        label: 'Training Plan',
        description: 'Scheduled workouts and progress',
    },
    {
        key: 'accessPerformance',
        label: 'Performance',
        description: 'VDOT and race predictions',
    },
    {
        key: 'accessBiometrics',
        label: 'Biometrics',
        description: 'Weight, height, age',
    },
    {
        key: 'accessAllActivities',
        label: 'All Activity History (Lazy Load)',
        description: 'Allow AI to search older activities when needed',
    },
    {
        key: 'accessActivityLogs',
        label: 'Activity Logs (Read Only)',
        description: 'Allows AI to see recent runs and workouts for proactive suggestions',
    },
    {
        key: 'accessNutritionLogs',
        label: 'Nutrition Logs (Read & Write)',
        description: 'Allows AI to see macros and log meals via Calorie Snap',
    },
];

const FEEDBACK_MODES = [
    { value: 'off', label: 'Off', description: 'No automatic feedback' },
    { value: 'on_demand', label: 'On Demand', description: 'Generate when you request it' },
    { value: 'auto', label: 'Automatic', description: 'Generate after each sync' },
    { value: 'both', label: 'Both', description: 'Auto-generate + on-demand refresh' },
];

export default function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
    const queryClient = useQueryClient();

    // Form state
    const [customBaseUrl, setCustomBaseUrl] = useState('');
    const [customApiKey, setCustomApiKey] = useState('');
    const [customModel, setCustomModel] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [feedbackMode, setFeedbackMode] = useState('on_demand');
    const [dataAccess, setDataAccess] = useState<Record<string, boolean>>({});
    const [customPrompt, setCustomPrompt] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // API key testing state
    const [testingKey, setTestingKey] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Fetch current settings
    const { data, isLoading } = useQuery({
        queryKey: ['ai-settings'],
        queryFn: async () => {
            const res = await fetch('/api/ai/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json() as Promise<{
                settings: AiSettings;
                usage: UsageInfo;
                limits: { dailyLimit: number; monthlyLimit: number };
            }>;
        },
        enabled: isOpen,
    });

    // Initialize form when data loads
    useEffect(() => {
        if (data?.settings) {
            const s = data.settings;
            setAiEnabled(s.aiEnabled);
            setCustomBaseUrl(s.customBaseUrl || '');
            setCustomModel(s.customModel || '');
            setFeedbackMode(s.feedbackMode);
            setCustomPrompt(s.customPromptAddition || '');
            setDataAccess({
                accessFitnessMetrics: s.accessFitnessMetrics,
                accessActivityHistory: s.accessActivityHistory,
                accessHeartRateData: s.accessHeartRateData,
                accessGoals: s.accessGoals,
                accessTrainingPlan: s.accessTrainingPlan,
                accessPerformance: s.accessPerformance,
                accessBiometrics: s.accessBiometrics,
                accessAllActivities: s.accessAllActivities,
                accessActivityLogs: s.accessActivityLogs,
                accessNutritionLogs: s.accessNutritionLogs,
            });
            // Don't populate API key for security
            setCustomApiKey('');
        }
    }, [data]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const res = await fetch('/api/ai/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save settings');
            }
            return res.json();
        },
        onSuccess: () => {
            setSuccess('Settings saved!');
            setError('');
            queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (err: Error) => {
            setError(err.message);
            setSuccess('');
        },
    });

    const handleSave = () => {
        const updates: Record<string, unknown> = {
            aiEnabled,
            feedbackMode,
            customPromptAddition: customPrompt || null,
            ...dataAccess,
        };

        // Only send API key if user entered a new one
        if (customApiKey) {
            updates.customApiKey = customApiKey;
            updates.customBaseUrl = customBaseUrl || 'https://api.openai.com/v1';
            updates.customModel = customModel || 'gpt-4o-mini';
        } else if (data?.settings && customBaseUrl !== data?.settings?.customBaseUrl) {
            updates.customBaseUrl = customBaseUrl || null;
        }
        if (data?.settings && customModel !== data?.settings?.customModel) {
            updates.customModel = customModel || null;
        }

        saveMutation.mutate(updates);
    };

    const handleRemoveApiKey = () => {
        saveMutation.mutate({
            customApiKey: null,
            customBaseUrl: null,
            customModel: null,
        });
    };

    const toggleAllAccess = (enabled: boolean) => {
        const newAccess: Record<string, boolean> = {};
        DATA_ACCESS_OPTIONS.forEach((opt) => {
            newAccess[opt.key] = enabled;
        });
        setDataAccess(newAccess);
    };

    const handleTestApiKey = async () => {
        if (!customApiKey) {
            setTestResult({ success: false, message: 'Please enter an API key to test' });
            return;
        }

        setTestingKey(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/ai/test-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: customApiKey,
                    baseUrl: customBaseUrl || 'https://api.openai.com/v1',
                    model: customModel || 'gpt-4o-mini',
                }),
            });

            const data = await res.json();

            if (data.success) {
                setTestResult({ success: true, message: `✓ API key works! Model: ${data.model}` });
            } else {
                setTestResult({ success: false, message: data.error || 'API key test failed' });
            }
        } catch {
            setTestResult({ success: false, message: 'Connection error - check your base URL' });
        } finally {
            setTestingKey(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="AI Features"
            icon={<Bot className="w-6 h-6 text-accent-purple" />}
            maxWidth="lg"
        >
            <div className="flex flex-col max-h-[75vh]">
                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Master Toggle */}
                            <div className={`p-4 rounded-xl border-2 transition-all ${data?.settings?.adminAllowed
                                ? aiEnabled
                                    ? 'bg-accent-purple/10 border-accent-purple/50'
                                    : 'bg-background-tertiary/50 border-foreground/20'
                                : 'bg-red-500/5 border-red-500/20 grayscale'
                                }`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${!data?.settings?.adminAllowed ? 'text-foreground-muted' : 'text-foreground'}`}>
                                            Enable AI Features
                                        </h3>
                                        <p className="text-xs text-foreground-muted mt-1">
                                            {data?.settings?.adminAllowed
                                                ? 'Toggle all AI coaching and activity analysis features'
                                                : 'AI access has not been granted by an administrator.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setAiEnabled(!aiEnabled)}
                                        disabled={!data?.settings?.adminAllowed}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${aiEnabled ? 'bg-accent-purple' : 'bg-foreground/15'
                                            } ${!data?.settings?.adminAllowed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <span
                                            className={`${aiEnabled ? 'translate-x-6' : 'translate-x-1'
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                </div>

                                {!data?.settings?.adminAllowed && (
                                    <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-400 bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        <span>Your administrator needs to enable AI access for your account before you can opt-in.</span>
                                    </div>
                                )}
                            </div>

                            <div className={`space-y-6 transition-all ${!aiEnabled || !data?.settings?.adminAllowed ? 'opacity-50 pointer-events-none' : ''}`}>

                                {/* Usage Stats (if enabled and not using own key) */}
                                {data?.settings?.aiEnabled && !data?.settings?.hasCustomApiKey && data?.usage && (
                                    <div className="bg-background-tertiary/50 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-foreground-muted mb-2">Usage</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-foreground-muted">Today</p>
                                                <p className="text-foreground">
                                                    {data?.usage.messagesUsedToday} / {data?.usage.dailyLimit}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-foreground-muted">This Month</p>
                                                <p className="text-foreground">
                                                    {data?.usage.messagesUsedThisMonth} / {data?.usage.monthlyLimit}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* API Key Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-foreground-muted flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Your API Key (Optional)
                                    </h3>
                                    <p className="text-xs text-foreground-muted">
                                        Add your own OpenAI-compatible API key for unlimited usage
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex gap-2 mb-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomBaseUrl('https://api.openai.com/v1');
                                                    setCustomModel('gpt-4o-mini');
                                                }}
                                                className="text-[10px] px-2 py-0.5 bg-background-tertiary hover:bg-foreground/15 text-foreground-muted rounded border border-foreground/20 transition"
                                            >
                                                OpenAI Preset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomBaseUrl('https://integrate.api.nvidia.com/v1');
                                                    setCustomModel('moonshotai/kimi-k2.5');
                                                }}
                                                className="text-[10px] px-2 py-0.5 bg-background-tertiary hover:bg-foreground/15 text-foreground-muted rounded border border-foreground/20 transition"
                                            >
                                                NVIDIA (Kimi) Preset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomBaseUrl('https://open.bigmodel.cn/api/paas/v4');
                                                    setCustomModel('glm-4-plus');
                                                }}
                                                className="text-[10px] px-2 py-0.5 bg-background-tertiary hover:bg-foreground/15 text-foreground-muted rounded border border-foreground/20 transition"
                                            >
                                                Zhipu AI (GLM) Preset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomBaseUrl('https://openrouter.ai/api/v1');
                                                    setCustomModel('deepseek/deepseek-r1:free');
                                                }}
                                                className="text-[10px] px-2 py-0.5 bg-background-tertiary hover:bg-foreground/15 text-foreground-muted rounded border border-foreground/20 transition"
                                            >
                                                OpenRouter Preset
                                            </button>
                                        </div>

                                        <Input
                                            id="customBaseUrl"
                                            type="text"
                                            placeholder="Base URL (default: https://api.openai.com/v1)"
                                            value={customBaseUrl}
                                            onChange={(e) => setCustomBaseUrl(e.target.value)}
                                            className="!bg-background-tertiary border-foreground/20"
                                        />

                                        <div className="relative">
                                            <label htmlFor="customApiKey" className="sr-only">API Key</label>
                                            <input
                                                id="customApiKey"
                                                type={showApiKey ? 'text' : 'password'}
                                                placeholder={data?.settings?.hasCustomApiKey ? '••••••••••••••••' : 'API Key'}
                                                value={customApiKey}
                                                onChange={(e) => setCustomApiKey(e.target.value)}
                                                className="w-full bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 pr-10 text-foreground text-sm focus:border-accent-purple focus:outline-hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-muted"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <Input
                                            id="customModel"
                                            type="text"
                                            placeholder="Model (default: gpt-4o-mini)"
                                            value={customModel}
                                            onChange={(e) => setCustomModel(e.target.value)}
                                            className="!bg-background-tertiary border-foreground/20"
                                        />

                                        {/* Test API Key Button */}
                                        <button
                                            onClick={handleTestApiKey}
                                            disabled={testingKey || !customApiKey}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-purple hover:bg-purple-700 disabled:bg-foreground/15 disabled:text-foreground-muted text-white rounded-lg text-sm font-medium transition"
                                        >
                                            {testingKey ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Testing...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4" />
                                                    Test API Key
                                                </>
                                            )}
                                        </button>

                                        {/* Test Result Feedback */}
                                        {testResult && (
                                            <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${testResult.success
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                }`}>
                                                {testResult.success ? (
                                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 flex-shrink-0" />
                                                )}
                                                <span>{testResult.message}</span>
                                            </div>
                                        )}
                                    </div>

                                    {data?.settings?.hasCustomApiKey && (
                                        <button
                                            onClick={handleRemoveApiKey}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Remove my API key
                                        </button>
                                    )}
                                </div>

                                {/* Data Access Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-foreground-muted">Data Access</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleAllAccess(true)}
                                                className="text-xs text-accent-purple hover:text-accent-purple"
                                            >
                                                Enable All
                                            </button>
                                            <span className="text-foreground-secondary">|</span>
                                            <button
                                                onClick={() => toggleAllAccess(false)}
                                                className="text-xs text-foreground-muted hover:text-foreground-muted"
                                            >
                                                Disable All
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground-muted">
                                        Choose what data the AI coach can access
                                    </p>

                                    <div className="space-y-2">
                                        {DATA_ACCESS_OPTIONS.map((option) => (
                                            <label
                                                key={option.key}
                                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-background-tertiary/50 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={dataAccess[option.key] || false}
                                                    onChange={(e) =>
                                                        setDataAccess((prev) => ({
                                                            ...prev,
                                                            [option.key]: e.target.checked,
                                                        }))
                                                    }
                                                    className="mt-1 w-4 h-4 rounded border-foreground/25 bg-background-tertiary text-accent-purple focus:ring-accent-purple focus:ring-offset-gray-900"
                                                />
                                                <div>
                                                    <p className="text-sm text-foreground">{option.label}</p>
                                                    <p className="text-xs text-foreground-muted">{option.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Feedback Mode Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-foreground-muted">Activity Feedback</h3>
                                    <p className="text-xs text-foreground-muted">
                                        When should AI analyze your activities?
                                    </p>

                                    <div className="grid grid-cols-2 gap-2">
                                        {FEEDBACK_MODES.map((mode) => (
                                            <button
                                                key={mode.value}
                                                onClick={() => setFeedbackMode(mode.value)}
                                                className={`p-3 rounded-lg border text-left transition-colors ${feedbackMode === mode.value
                                                    ? 'border-accent-purple bg-accent-purple/10'
                                                    : 'border-foreground/20 hover:border-foreground/25'
                                                    }`}
                                            >
                                                <p className={`text-sm font-medium ${feedbackMode === mode.value ? 'text-accent-purple' : 'text-foreground'
                                                    }`}>
                                                    {mode.label}
                                                </p>
                                                <p className="text-xs text-foreground-muted">{mode.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Prompt Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-foreground-muted flex items-center gap-2">
                                        Custom Instructions
                                        <Info className="w-4 h-4 text-foreground-muted" />
                                    </h3>
                                    <p className="text-xs text-foreground-muted">
                                        Add context about your training (e.g., injuries, preferences)
                                    </p>
                                    <Textarea
                                        id="customPrompt"
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="I'm recovering from a knee injury and should avoid high-intensity work..."
                                        rows={3}
                                        className="!bg-background-tertiary border-foreground/20"
                                    />
                                </div>

                                {/* Error/Success Messages */}
                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">
                                        <Check className="w-4 h-4" />
                                        {success}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-4 mt-6 border-t border-glass-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-foreground-muted hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="px-4 py-2 bg-accent-purple hover:bg-accent-purple text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Settings
                    </button>
                </div>
            </div>
        </Modal>
    );
}
