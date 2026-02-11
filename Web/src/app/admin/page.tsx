'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Activity, LogIn, Database, RefreshCw, Trash2, Download, AlertTriangle, CheckCircle, Upload, Plus, Mail, Bot, Eye, EyeOff, Save, Loader2, Zap, XCircle, BarChart3 } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Analytics Tab Component
const AnalyticsTab = ({ }: any) => {
    const [data, setData] = useState<{ dailyUsage: any[], topUsers: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/admin/analytics');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    if (!data) return <div className="p-8 text-center text-gray-500">Failed to load data</div>;

    return (
        <div className="space-y-6">
            {/* Daily Token Usage Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Token Usage (Last 30 Days)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.dailyUsage}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f9fafb' }}
                            />
                            <Legend />
                            <Bar dataKey="input" name="Input Tokens" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="output" name="Output Tokens" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Top Users (This Month)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Tier</th>
                                <th className="px-6 py-3">Messages</th>
                                <th className="px-6 py-3">Input / Output Tokens</th>
                                <th className="px-6 py-3">Total Tokens</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.topUsers.map((user: any) => (
                                <tr key={user.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <div>{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.tier === 'tier3' ? 'bg-purple-100 text-purple-700' :
                                            user.tier === 'tier2' ? 'bg-blue-100 text-blue-700' :
                                                user.tier === 'tier1' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>
                                            {user.tier === 'tier3' ? 'Premium' : user.tier === 'tier2' ? 'Standard' : user.tier === 'tier1' ? 'Basic' : user.tier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{user.messages.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {user.inputTokens.toLocaleString()} <span className="text-gray-400">/</span> {user.outputTokens.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.totalTokens.toLocaleString()}</td>
                                </tr>
                            ))}
                            {data.topUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No active users this month</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// AI Settings Tab Component
const AiSettingsTab = ({ settings, stats, onRefresh, processing, setProcessing, setActionMessage }: any) => {
    const [providers, setProviders] = useState<any[]>([]);
    const [activeProviderId, setActiveProviderId] = useState<string | null>(settings?.activeProviderId || null);
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

        systemPrompt: settings?.systemPrompt || '',
    });

    useEffect(() => {
        fetchProviders();
    }, []);

    useEffect(() => {
        if (settings) {
            setActiveProviderId(settings.activeProviderId);
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

                systemPrompt: settings.systemPrompt || prev.systemPrompt,
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
                    activeProviderId
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
        if (!confirm('Delete this provider?')) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/providers?id=${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
            if (!res.ok) throw new Error('Failed to delete');
            fetchProviders();
            if (activeProviderId === id) setActiveProviderId(null);
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
                            <div key={provider.id} className={`p-4 rounded-lg border flex items-center justify-between ${activeProviderId === provider.id ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${activeProviderId === provider.id ? 'bg-purple-600' : 'bg-gray-300'}`} />
                                    <div>
                                        <h4 className="font-medium text-gray-900">{provider.name}</h4>
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
                    {/* Tier 1 */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <input
                            type="text"
                            value={formData.tier1Name}
                            onChange={(e) => setFormData({ ...formData, tier1Name: e.target.value })}
                            className="w-full px-2 py-1 bg-white text-gray-900 border-b border-gray-200 font-medium mb-3 focus:outline-none focus:border-purple-500"
                            placeholder="Tier 1 Name"
                        />
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily Msgs</label>
                                    <input
                                        type="number"
                                        value={formData.tier1DailyLimit}
                                        onChange={(e) => setFormData({ ...formData, tier1DailyLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Monthly Msgs</label>
                                    <input
                                        type="number"
                                        value={formData.tier1MonthlyLimit}
                                        onChange={(e) => setFormData({ ...formData, tier1MonthlyLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily Tokens</label>
                                    <input
                                        type="number"
                                        value={formData.tier1DailyTokenLimit}
                                        onChange={(e) => setFormData({ ...formData, tier1DailyTokenLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Monthly Tokens</label>
                                    <input
                                        type="number"
                                        value={formData.tier1MonthlyTokenLimit}
                                        onChange={(e) => setFormData({ ...formData, tier1MonthlyTokenLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Tier 2 */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <input
                            type="text"
                            value={formData.tier2Name}
                            onChange={(e) => setFormData({ ...formData, tier2Name: e.target.value })}
                            className="w-full px-2 py-1 bg-white text-gray-900 border-b border-gray-200 font-medium mb-3 focus:outline-none focus:border-purple-500"
                        />
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily Msgs</label>
                                    <input type="number" value={formData.tier2DailyLimit} onChange={e => setFormData({ ...formData, tier2DailyLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Monthly Msgs</label>
                                    <input type="number" value={formData.tier2MonthlyLimit} onChange={e => setFormData({ ...formData, tier2MonthlyLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily Tokens</label>
                                    <input type="number" value={formData.tier2DailyTokenLimit} onChange={e => setFormData({ ...formData, tier2DailyTokenLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Monthly Tokens</label>
                                    <input type="number" value={formData.tier2MonthlyTokenLimit} onChange={e => setFormData({ ...formData, tier2MonthlyTokenLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Tier 3 */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <input
                            type="text"
                            value={formData.tier3Name}
                            onChange={(e) => setFormData({ ...formData, tier3Name: e.target.value })}
                            className="w-full px-2 py-1 bg-white text-gray-900 border-b border-gray-200 font-medium mb-3 focus:outline-none focus:border-purple-500"
                        />
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily Msgs</label>
                                    <input type="number" value={formData.tier3DailyLimit} onChange={e => setFormData({ ...formData, tier3DailyLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Monthly Msgs</label>
                                    <input type="number" value={formData.tier3MonthlyLimit} onChange={e => setFormData({ ...formData, tier3MonthlyLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily Tokens</label>
                                    <input type="number" value={formData.tier3DailyTokenLimit} onChange={e => setFormData({ ...formData, tier3DailyTokenLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Monthly Tokens</label>
                                    <input type="number" value={formData.tier3MonthlyTokenLimit} onChange={e => setFormData({ ...formData, tier3MonthlyTokenLimit: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
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

            {/* Provider Modal/Form Overlay */}
            {showProviderForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
        </div>
    );
};

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
        // ... same logic ...
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
        } catch (error) {
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
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key {initialData && '(Leave blank to keep current)'}</label>
                <div className="flex gap-2">
                    <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                        placeholder="sk-..."
                    />
                    <button
                        onClick={handleTest}
                        disabled={testing || (!formData.apiKey && !initialData)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-1"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Test
                    </button>
                </div>
                {testResult && (
                    <p className={`text-xs mt-1 ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
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




// Components
const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (

    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-gray-500 text-sm">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [backups, setBackups] = useState<any[]>([]);
    const [aiSettings, setAiSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Tab state controlled by URL
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam === 'backups' ? 'backups' : tabParam === 'ai' ? 'ai' : tabParam === 'analytics' ? 'analytics' : 'users';

    const [processing, setProcessing] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch data
    const fetchAllData = React.useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, usersRes, backupsRes, aiRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/users?limit=20'),
                fetch('/api/admin/backups'),
                fetch('/api/admin/ai-settings'),
            ]);

            if (statsRes.status === 401 || usersRes.status === 401) {
                router.push('/admin/login');
                return;
            }

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            const backupsData = await backupsRes.json();
            const aiData = aiRes.ok ? await aiRes.json() : null;

            setStats(statsData);
            setUsers(usersData.users || []);
            setBackups(backupsData.backups || []);
            setAiSettings(aiData);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setActionMessage({ type: 'error', text: 'Failed to load dashboard data' });
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleResetPassword = async (userId: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to send a password reset email to ${userEmail}?`)) return;

        setProcessing(true);
        setActionMessage(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST', headers: { 'X-CSRF-Token': getCsrfToken() } });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to send reset email');

            setActionMessage({ type: 'success', text: `Reset email sent to ${userEmail}` });
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleRecalculateFitness = async (userId?: string, userEmail?: string) => {
        const confirmMsg = userId
            ? `Recalculate fitness history for ${userEmail}? This may take a few seconds.`
            : 'Recalculate fitness history for ALL users? This checks all activities and rebuilds cache. It may take a while.';

        if (!confirm(confirmMsg)) return;

        setProcessing(true);
        setActionMessage(null);
        try {
            const res = await fetch('/api/admin/recalculate-fitness', {
                method: 'POST',
                headers: csrfHeaders(),
                body: userId ? JSON.stringify({ userId }) : undefined
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Recalculation failed');

            setActionMessage({
                type: 'success',
                text: userId
                    ? `Fitness recalculated for ${userEmail}`
                    : `Recalculation complete. Processed ${data.totalUsers} users.`
            });

            // Refresh list to update any status indicators if we add them later
            fetchAllData();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action CANNOT be undone.')) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
            if (!res.ok) throw new Error('Failed to delete user');

            setActionMessage({ type: 'success', text: 'User deleted successfully' });
            fetchAllData(); // Refresh list
        } catch (error) {
            setActionMessage({ type: 'error', text: 'Failed to delete user' });
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleAi = async (userId: string, tier: string) => {
        setProcessing(true);
        // Optimistic update
        setUsers(users.map((u: any) =>
            u.id === userId
                ? { ...u, aiSettings: { ...u.aiSettings, usageTier: tier } }
                : u
        ));

        try {
            const res = await fetch(`/api/admin/users/${userId}/toggle-ai`, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ tier }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update AI settings');
            }

            setActionMessage({ type: 'success', text: 'User AI tier updated' });
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
            fetchAllData(); // Revert on error
        } finally {
            setProcessing(false);
        }
    };

    const handleUploadBackup = async (file: File) => {
        setProcessing(true);
        setActionMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/backups/upload', {
                method: 'POST',
                headers: { 'X-CSRF-Token': getCsrfToken() },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setActionMessage({ type: 'success', text: `Uploaded: ${data.filename}` });
            fetchAllData();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleBackupAction = async (action: 'create' | 'restore', backupName?: string) => {
        if (action === 'restore' && !confirm(`⚠️ WARNING: This will overwrite the current database with ${backupName}. This action is destructive. Are you sure?`)) return;

        setProcessing(true);
        setActionMessage(null);

        try {
            const res = await fetch('/api/admin/backups', {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ action, backupName }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Backup action failed');

            setActionMessage({
                type: 'success',
                text: action === 'create'
                    ? `Backup created: ${data.backup.name}`
                    : 'Database restored successfully'
            });

            fetchAllData(); // Refresh list
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={fetchAllData}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        System Healthy
                    </div>
                </div>
            </div>

            {actionMessage && (
                <div className={`p-4 rounded-lg flex items-center ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {actionMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 mr-2" />
                    )}
                    {actionMessage.text}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.users?.total || 0}
                    subtext={`${stats?.users?.newToday || 0} new today`}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Active Sessions"
                    value={stats?.sessions?.active || 0}
                    subtext={`${stats?.sessions?.total || 0} total sessions`}
                    icon={LogIn}
                    color="bg-violet-500"
                />
                <StatCard
                    title="Activities"
                    value={stats?.activities?.total || 0}
                    subtext={`${stats?.activities?.last7Days || 0} this week`}
                    icon={Activity}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Backups"
                    value={stats?.backups?.count || 0}
                    subtext={`Last: ${stats?.backups?.lastBackupAt ? new Date(stats.backups.lastBackupAt).toLocaleDateString() : 'Never'}`}
                    icon={Database}
                    color="bg-emerald-500"
                />
            </div>

            {/* Main Content Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 flex">
                    <button
                        onClick={() => router.push('/admin')}
                        className={`px-6 py-4 text-sm font-medium transition ${activeTab === 'users' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => router.push('/admin?tab=backups')}
                        className={`px-6 py-4 text-sm font-medium transition ${activeTab === 'backups' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Backup & Restore
                    </button>
                    <button
                        onClick={() => router.push('/admin?tab=ai')}
                        className={`px-6 py-4 text-sm font-medium transition ${activeTab === 'ai' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <Bot className="w-4 h-4 inline mr-1" />
                        AI Settings
                    </button>
                    <button
                        onClick={() => router.push('/admin?tab=analytics')}
                        className={`px-6 py-4 text-sm font-medium transition ${activeTab === 'analytics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-1" />
                        Analytics
                    </button>
                </div>

                <div className="p-6">
                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => handleRecalculateFitness()}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                                >
                                    <Activity className="w-4 h-4" />
                                    Recalculate All Fitness
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">User</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">Joined</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">Last Sync</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">Activities</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm text-center">AI Access</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">AI Tier</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.map((user: any) => (
                                            <tr key={user.id} className="group hover:bg-gray-50 transition">
                                                <td className="py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                                            {user.image ? (
                                                                <img src={user.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                                    {user.name?.[0] || '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</p>
                                                            <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm text-gray-500">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 text-sm text-gray-500">
                                                    {user.lastSyncAt ? new Date(user.lastSyncAt).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="py-4 text-sm text-gray-500">
                                                    {user.activityCount}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex gap-2">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.aiSettings?.adminAllowed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                                                                title={user.aiSettings?.adminAllowed ? 'Admin has allowed access' : 'Admin has not allowed access'}
                                                            >
                                                                {user.aiSettings?.adminAllowed ? 'Allowed' : 'Locked'}
                                                            </span>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.aiSettings?.aiEnabled ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}
                                                                title={user.aiSettings?.aiEnabled ? 'User has opted-in' : 'User has not opted-in'}
                                                            >
                                                                {user.aiSettings?.aiEnabled ? 'Opt-in' : 'Off'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-sm text-gray-500">
                                                    <select
                                                        value={user.aiSettings?.usageTier || 'none'}
                                                        onChange={(e) => handleToggleAi(user.id, e.target.value)}
                                                        disabled={processing}
                                                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2"
                                                    >
                                                        <option value="none">No Access</option>
                                                        <option value="tier1">{aiSettings?.settings?.tier1Name || 'Tier 1'}</option>
                                                        <option value="tier2">{aiSettings?.settings?.tier2Name || 'Tier 2'}</option>
                                                        <option value="tier3">{aiSettings?.settings?.tier3Name || 'Tier 3'}</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleRecalculateFitness(user.id, user.name || user.email)}
                                                            disabled={processing}
                                                            className="text-gray-400 hover:text-blue-500 transition p-2 hover:bg-blue-50 rounded-lg"
                                                            title="Recalculate Fitness"
                                                        >
                                                            <Activity className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetPassword(user.id, user.email)}
                                                            disabled={processing}
                                                            className="text-gray-400 hover:text-emerald-500 transition p-2 hover:bg-emerald-50 rounded-lg"
                                                            title="Send Reset Password Email"
                                                        >
                                                            <Mail className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            disabled={processing}
                                                            className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-lg"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">
                                                    No users found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Backups Tab */}
                    {activeTab === 'backups' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div>
                                    <h3 className="font-semibold text-gray-800">Manage Backups</h3>
                                    <p className="text-sm text-gray-500">Create new snapshots or upload existing backup files.</p>
                                </div>
                                <div className="flex space-x-2">
                                    {/* Hidden file input */}
                                    <input
                                        type="file"
                                        id="backup-upload"
                                        className="hidden"
                                        accept=".sql,.sql.gz"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadBackup(file);
                                            // Reset input
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        onClick={() => document.getElementById('backup-upload')?.click()}
                                        disabled={processing}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center disabled:opacity-50"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload
                                    </button>
                                    <button
                                        onClick={() => handleBackupAction('create')}
                                        disabled={processing}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center disabled:opacity-50"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-800">Available Backups</h3>
                                <div className="space-y-2">
                                    {backups.map((backup: any) => (
                                        <div key={backup.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{backup.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(backup.createdAt).toLocaleString()} • {backup.sizeFormatted}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <a
                                                    href={`/api/admin/backups/${backup.name}`}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition flex items-center"
                                                    title="Download Backup"
                                                >
                                                    <Download className="w-3 h-3 mr-1" />
                                                    Download
                                                </a>
                                                <button
                                                    onClick={() => handleBackupAction('restore', backup.name)}
                                                    disabled={processing}
                                                    className="px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 border border-orange-200 rounded-lg transition disabled:opacity-50"
                                                >
                                                    Restore
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {backups.length === 0 && (
                                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                            No backups available. Create one to get started.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Settings Tab */}
                    {activeTab === 'ai' && (
                        <AiSettingsTab
                            settings={aiSettings?.settings}
                            stats={aiSettings?.stats}
                            onRefresh={fetchAllData}
                            processing={processing}
                            setProcessing={setProcessing}
                            setActionMessage={setActionMessage}
                        />
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <AnalyticsTab />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

