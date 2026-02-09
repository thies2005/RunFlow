'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    X,
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
        label: 'Activity History',
        description: 'Your runs, distances, and times',
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
    const { data, isLoading, refetch } = useQuery({
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
        } catch (error) {
            setTestResult({ success: false, message: 'Connection error - check your base URL' });
        } finally {
            setTestingKey(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <Bot className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">AI Features</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Master Toggle */}
                            <div className={`p-4 rounded-xl border-2 transition-all ${data?.settings?.adminAllowed
                                ? aiEnabled
                                    ? 'bg-purple-500/10 border-purple-500/50'
                                    : 'bg-gray-800/50 border-gray-700'
                                : 'bg-red-500/5 border-red-500/20 grayscale'
                                }`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${!data?.settings?.adminAllowed ? 'text-gray-500' : 'text-white'}`}>
                                            Enable AI Features
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {data?.settings?.adminAllowed
                                                ? 'Toggle all AI coaching and activity analysis features'
                                                : 'AI access has not been granted by an administrator.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setAiEnabled(!aiEnabled)}
                                        disabled={!data?.settings?.adminAllowed}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${aiEnabled ? 'bg-purple-600' : 'bg-gray-700'
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

                            {/* Status Banner - Deprecated in favor of the master toggle above, but kept for legacy message check if needed */}
                            {/* {data?.settings?.aiEnabled && ... } */}

                            <div className={`space-y-6 transition-all ${!aiEnabled || !data?.settings?.adminAllowed ? 'opacity-50 pointer-events-none' : ''}`}>

                                {/* Usage Stats (if enabled and not using own key) */}
                                {data?.settings?.aiEnabled && !data?.settings?.hasCustomApiKey && data?.usage && (
                                    <div className="bg-gray-800/50 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-300 mb-2">Usage</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Today</p>
                                                <p className="text-white">
                                                    {data?.usage.messagesUsedToday} / {data?.usage.dailyLimit}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">This Month</p>
                                                <p className="text-white">
                                                    {data?.usage.messagesUsedThisMonth} / {data?.usage.monthlyLimit}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* API Key Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Your API Key (Optional)
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Add your own OpenAI-compatible API key for unlimited usage
                                    </p>

                                    <div className="space-y-2">
                                        <label htmlFor="customBaseUrl" className="sr-only">Base URL</label>
                                        <input
                                            id="customBaseUrl"
                                            type="text"
                                            placeholder="Base URL (default: https://api.openai.com/v1)"
                                            value={customBaseUrl}
                                            onChange={(e) => setCustomBaseUrl(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />

                                        <div className="relative">
                                            <label htmlFor="customApiKey" className="sr-only">API Key</label>
                                            <input
                                                id="customApiKey"
                                                type={showApiKey ? 'text' : 'password'}
                                                placeholder={data?.settings?.hasCustomApiKey ? '••••••••••••••••' : 'API Key'}
                                                value={customApiKey}
                                                onChange={(e) => setCustomApiKey(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:border-purple-500 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <label htmlFor="customModel" className="sr-only">Model</label>
                                        <input
                                            id="customModel"
                                            type="text"
                                            placeholder="Model (default: gpt-4o-mini)"
                                            value={customModel}
                                            onChange={(e) => setCustomModel(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                                        />

                                        {/* Test API Key Button */}
                                        <button
                                            onClick={handleTestApiKey}
                                            disabled={testingKey || !customApiKey}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition"
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
                                        <h3 className="text-sm font-medium text-gray-300">Data Access</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleAllAccess(true)}
                                                className="text-xs text-purple-400 hover:text-purple-300"
                                            >
                                                Enable All
                                            </button>
                                            <span className="text-gray-600">|</span>
                                            <button
                                                onClick={() => toggleAllAccess(false)}
                                                className="text-xs text-gray-400 hover:text-gray-300"
                                            >
                                                Disable All
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Choose what data the AI coach can access
                                    </p>

                                    <div className="space-y-2">
                                        {DATA_ACCESS_OPTIONS.map((option) => (
                                            <label
                                                key={option.key}
                                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer"
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
                                                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                                                />
                                                <div>
                                                    <p className="text-sm text-white">{option.label}</p>
                                                    <p className="text-xs text-gray-500">{option.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Feedback Mode Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-300">Activity Feedback</h3>
                                    <p className="text-xs text-gray-500">
                                        When should AI analyze your activities?
                                    </p>

                                    <div className="grid grid-cols-2 gap-2">
                                        {FEEDBACK_MODES.map((mode) => (
                                            <button
                                                key={mode.value}
                                                onClick={() => setFeedbackMode(mode.value)}
                                                className={`p-3 rounded-lg border text-left transition-colors ${feedbackMode === mode.value
                                                    ? 'border-purple-500 bg-purple-500/10'
                                                    : 'border-gray-700 hover:border-gray-600'
                                                    }`}
                                            >
                                                <p className={`text-sm font-medium ${feedbackMode === mode.value ? 'text-purple-300' : 'text-white'
                                                    }`}>
                                                    {mode.label}
                                                </p>
                                                <p className="text-xs text-gray-500">{mode.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Prompt Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                        Custom Instructions
                                        <Info className="w-4 h-4 text-gray-500" />
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Add context about your training (e.g., injuries, preferences)
                                    </p>
                                    <label htmlFor="customPrompt" className="sr-only">Custom Instructions</label>
                                    <textarea
                                        id="customPrompt"
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="I'm recovering from a knee injury and should avoid high-intensity work..."
                                        rows={3}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none resize-none"
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
                <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
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
        </div>
    );
}
