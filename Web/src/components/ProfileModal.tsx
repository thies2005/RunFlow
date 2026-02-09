'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Save, AlertCircle, User, Trash2, RefreshCw, Key, Copy, Check, ExternalLink, Bot } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { requestHealthPermissions, syncHealthData, isMobile } from '@/lib/mobile/healthConnect';
import AiSettingsModal from '@/components/AiSettingsModal';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const queryClient = useQueryClient();
    const [weight, setWeight] = useState(70);
    const [height, setHeight] = useState(175);
    const [thresholdHr, setThresholdHr] = useState<number | undefined>(undefined);

    // Zones
    const [hrZone1Max, setHrZone1Max] = useState(130);
    const [hrZone2Max, setHrZone2Max] = useState(148);
    const [hrZone3Max, setHrZone3Max] = useState(160);
    const [hrZone4Max, setHrZone4Max] = useState(170);
    const [hrZone5Max, setHrZone5Max] = useState(178);
    const [hrZone6Max, setHrZone6Max] = useState(187);

    // Marathon Shape settings
    const [includeCrossTraining, setIncludeCrossTraining] = useState(true);

    // Display preferences
    const [useImperial, setUseImperial] = useState(false);

    const [message, setMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // API Key state
    const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

    // Fetch existing settings
    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot'); // Re-using existing endpoint or creating new GET? 
            // Note: The previous code was using update-vdot to GET? That seems odd. 
            // Let's assume there is a GET endpoint or we might need to check how to get the profile.
            // Wait, the original code used `/api/settings/update-vdot` to FETCH settings? 
            // Let's check that file if possible or just assume it returns the user object.
            // Ideally we should use a proper GET endpoint. 
            // Previous code: const res = await fetch('/api/settings/update-vdot');
            // Check if /api/settings/profile supports GET? 
            // Assuming we stick to the pattern or I should check the implementation of that endpoint.
            // For now, let's keep it but ideally we should have a GET /api/user/profile.
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    // Populate form with existing data
    useEffect(() => {
        if (settingsData) {
            setWeight(settingsData.weight || 70);
            setHeight(settingsData.height || 175);
            if (settingsData.thresholdHeartRate) setThresholdHr(settingsData.thresholdHeartRate);
            if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
            if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
            if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
            if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
            if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
            if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
            if (typeof settingsData.includeCrossTraining === 'boolean') {
                setIncludeCrossTraining(settingsData.includeCrossTraining);
            }
            if (typeof settingsData.useImperial === 'boolean') {
                setUseImperial(settingsData.useImperial);
            }
        }
    }, [settingsData]);

    // Auto-calculate zones when Threshold HR changes
    const handleThresholdChange = (val: number) => {
        setThresholdHr(val);
        if (val > 0) {
            setHrZone1Max(Math.round(val * 0.75));
            setHrZone2Max(Math.round(val * 0.87));
            setHrZone3Max(Math.round(val * 0.94));
            setHrZone4Max(Math.round(val * 1.00));
            setHrZone5Max(Math.round(val * 1.05));
            setHrZone6Max(Math.round(val * 1.10));
        }
    };

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                body: JSON.stringify({
                    weight,
                    height,
                    thresholdHeartRate: thresholdHr,
                    hrZone1Max,
                    hrZone2Max,
                    hrZone3Max,
                    hrZone4Max,
                    hrZone5Max,
                    hrZone6Max,
                    includeCrossTraining,
                    useImperial
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to update profile');
            return res.json();
        },
        onSuccess: () => {
            setMessage('Profile updated!');
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => {
                setMessage('');
                onClose();
            }, 1500);
        },
        onError: () => {
            setMessage('Error updating profile. Please try again.');
        }
    });

    const resyncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', {
                method: 'POST',
                body: JSON.stringify({ range: 'ALL' }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to resync activities');
            }
            return res.json();
        },
        onSuccess: () => {
            setMessage('Full resync started! This may take a few minutes.');
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        },
        onError: (err) => {
            setMessage(`Resync failed: ${err.message}`);
        }
    });

    const healthConnectSyncMutation = useMutation({
        mutationFn: async () => {
            // Request permissions (opens Health Connect settings)
            const permitted = await requestHealthPermissions();
            if (!permitted) {
                throw new Error('Health Connect permissions not granted');
            }
            // Sync activities
            const result = await syncHealthData(90, {
                z1: hrZone1Max,
                z2: hrZone2Max,
                z3: hrZone3Max,
                z4: hrZone4Max,
                z5: hrZone5Max,
                z6: hrZone6Max,
            }); // Last 90 days
            return result;
        },
        onSuccess: (result) => {
            if (result.synced > 0) {
                setMessage(`Synced ${result.synced} activities from Health Connect!`);
            } else {
                setMessage('No new activities found in Health Connect.');
            }
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
        onError: (err) => {
            setMessage(`Health Connect sync failed: ${err.message}`);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/user/delete', {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete account');
            return res.json();
        },
        onSuccess: async () => {
            // Force refresh to handle redirect
            await signOut({ callbackUrl: '/' });
        },
        onError: () => {
            setMessage('Error deleting account. Please try again.');
            setIsDeleting(false);
        }
    });

    const handleDelete = () => {
        setIsDeleting(true);
        deleteMutation.mutate();
    };

    // API Key Query
    const { data: apiKeyData, refetch: refetchApiKey } = useQuery({
        queryKey: ['api-key'],
        queryFn: async () => {
            const res = await fetch('/api/settings/api-key');
            if (!res.ok) throw new Error('Failed to fetch API key info');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    // Generate API Key Mutation
    const generateApiKeyMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My API Key' }),
            });
            if (!res.ok) throw new Error('Failed to generate API key');
            return res.json();
        },
        onSuccess: (data) => {
            setGeneratedApiKey(data.apiKey);
            refetchApiKey();
        },
        onError: () => {
            setMessage('Failed to generate API key.');
        }
    });

    // Revoke API Key Mutation
    const revokeApiKeyMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/api-key', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to revoke API key');
            return res.json();
        },
        onSuccess: () => {
            setGeneratedApiKey(null);
            setShowRevokeConfirm(false);
            refetchApiKey();
            setMessage('API key revoked.');
        },
        onError: () => {
            setMessage('Failed to revoke API key.');
        }
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    const inputClass = "bg-white/5 border border-white/10 rounded-lg p-3 text-white w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto pt-10 pb-10">
            <div className="glass-card w-full max-w-sm p-6 relative animate-slide-in my-auto !bg-[#12121a]/95 border-white/10">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-accent-orange/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-accent-orange" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Profile</h2>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Weight (kg)</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={e => setWeight(parseInt(e.target.value) || 70)}
                                className={inputClass}
                                min="30"
                                max="200"
                                placeholder="70"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Height (cm)</label>
                            <input
                                type="number"
                                value={height}
                                onChange={e => setHeight(parseInt(e.target.value) || 175)}
                                className={inputClass}
                                min="100"
                                max="250"
                                placeholder="175"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                        <label className="block text-xs text-accent-orange mb-2 uppercase font-semibold">Heart Rate Zones</label>
                        <div className="mb-4">
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Threshold Heart Rate (bpm)</label>
                            <input
                                type="number"
                                value={thresholdHr || ''}
                                onChange={e => handleThresholdChange(parseInt(e.target.value) || 0)}
                                className={inputClass}
                                placeholder="e.g. 170"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Enter LTHR to auto-calculate zones</p>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 uppercase">Zone 1 Max (&lt;75%)</label>
                                    <input type="number" value={hrZone1Max} onChange={e => setHrZone1Max(parseInt(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 uppercase">Zone 2 Max (76-87%)</label>
                                    <input type="number" value={hrZone2Max} onChange={e => setHrZone2Max(parseInt(e.target.value))} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 uppercase">Zone 3 Max (88-94%)</label>
                                    <input type="number" value={hrZone3Max} onChange={e => setHrZone3Max(parseInt(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 uppercase">Zone 4 Max (95-100%)</label>
                                    <input type="number" value={hrZone4Max} onChange={e => setHrZone4Max(parseInt(e.target.value))} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 uppercase">Zone 5 Max (101-105%)</label>
                                    <input type="number" value={hrZone5Max} onChange={e => setHrZone5Max(parseInt(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1 uppercase">Zone 6 Max (106-110%)</label>
                                    <input type="number" value={hrZone6Max} onChange={e => setHrZone6Max(parseInt(e.target.value))} className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Marathon Shape Settings */}
                    <div className="pt-2 border-t border-white/10">
                        <label className="block text-xs text-accent-orange mb-3 uppercase font-semibold">Marathon Shape</label>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div>
                                <p className="text-sm text-white">Include Cross-Training</p>
                                <p className="text-[10px] text-gray-500">Count cycling, swimming, etc. towards marathon shape</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIncludeCrossTraining(!includeCrossTraining)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeCrossTraining ? 'bg-accent-orange' : 'bg-white/20'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeCrossTraining ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Display Preferences */}
                    <div className="pt-2 border-t border-white/10">
                        <label className="block text-xs text-accent-orange mb-3 uppercase font-semibold">Display Preferences</label>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div>
                                <p className="text-sm text-white">Use Miles</p>
                                <p className="text-[10px] text-gray-500">Show distance and pace in miles instead of kilometers</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setUseImperial(!useImperial)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useImperial ? 'bg-accent-orange' : 'bg-white/20'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useImperial ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* AI Features Section */}
                    <div className="pt-2 border-t border-white/10">
                        <label className="block text-xs text-purple-400 mb-3 uppercase font-semibold">AI Features</label>
                        <button
                            onClick={() => setIsAiSettingsOpen(true)}
                            className="w-full py-3 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <Bot className="w-4 h-4" />
                            Configure AI Coach
                        </button>
                        <p className="text-[10px] text-gray-500 mt-2">Get personalized training advice, activity feedback, and more</p>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            <AlertCircle className="w-4 h-4" />
                            {message}
                        </div>
                    )}

                    <button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                        {updateMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </button>

                    <div className="border-t border-white/10 my-4"></div>

                    <div className="mb-4">
                        <h3 className="text-gray-400 font-medium mb-3 text-xs uppercase tracking-wider">Data Management</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => resyncMutation.mutate()}
                                disabled={resyncMutation.isPending}
                                className="w-full py-2.5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
                                {resyncMutation.isPending ? 'Syncing...' : 'Sync from Strava'}
                            </button>
                            <button
                                onClick={() => healthConnectSyncMutation.mutate()}
                                disabled={healthConnectSyncMutation.isPending}
                                className="w-full py-2.5 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${healthConnectSyncMutation.isPending ? 'animate-spin' : ''}`} />
                                {healthConnectSyncMutation.isPending ? 'Syncing...' : 'Sync from Health Connect'}
                            </button>
                        </div>
                    </div>

                    {/* API Access Section */}
                    <div className="mb-4">
                        <h3 className="text-blue-400 font-medium mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            API Access
                        </h3>
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-[10px] text-gray-500">
                                Enable read-only API access for external AI assistants
                            </p>
                            <Link href="/api-docs" target="_blank" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                API Docs <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        {generatedApiKey ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-3 animate-fade-in">
                                <p className="text-green-300 text-xs mb-2 font-medium">🔑 Your API Key (copy now, it will not be shown again):</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-black/30 px-3 py-2 rounded text-xs text-green-400 font-mono break-all">
                                        {generatedApiKey}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(generatedApiKey)}
                                        className="p-2 bg-green-500/20 rounded hover:bg-green-500/30 transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
                                    </button>
                                </div>
                            </div>
                        ) : apiKeyData?.hasKey ? (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-300 text-sm">Active API Key</p>
                                        <code className="text-xs text-gray-500 font-mono">{apiKeyData.keyPrefix}</code>
                                    </div>
                                    {apiKeyData.lastUsedAt && (
                                        <p className="text-[10px] text-gray-500">
                                            Last used: {new Date(apiKeyData.lastUsedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            {!apiKeyData?.hasKey ? (
                                <button
                                    onClick={() => generateApiKeyMutation.mutate()}
                                    disabled={generateApiKeyMutation.isPending}
                                    className="w-full py-2.5 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    <Key className={`w-4 h-4 ${generateApiKeyMutation.isPending ? 'animate-pulse' : ''}`} />
                                    {generateApiKeyMutation.isPending ? 'Generating...' : 'Generate API Key'}
                                </button>
                            ) : !showRevokeConfirm ? (
                                <button
                                    onClick={() => setShowRevokeConfirm(true)}
                                    className="w-full py-2.5 border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Revoke API Key
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRevokeConfirm(false)}
                                        className="flex-1 py-2 bg-white/5 text-white text-xs rounded-md hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => revokeApiKeyMutation.mutate()}
                                        disabled={revokeApiKeyMutation.isPending}
                                        className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-md flex items-center justify-center gap-1"
                                    >
                                        {revokeApiKeyMutation.isPending ? 'Revoking...' : 'Confirm Revoke'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-red-400 font-medium mb-3 text-xs uppercase tracking-wider">Danger Zone</h3>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-2.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Account
                            </button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 animate-fade-in">
                                <p className="text-red-200 text-xs mb-4 leading-relaxed">
                                    Are you sure? This will details permanently delete your account, activities, and goals. This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-2 bg-white/5 text-white text-xs rounded-md hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md flex items-center justify-center gap-2 transition-colors font-medium shadow-lg shadow-red-500/20"
                                    >
                                        {isDeleting ? <AlertCircle className="animate-spin w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <AiSettingsModal
                isOpen={isAiSettingsOpen}
                onClose={() => setIsAiSettingsOpen(false)}
            />
        </div>
    );
}
