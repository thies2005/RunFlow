import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsTab() {
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

    if (loading) return <div className="p-8 text-center text-foreground-muted">Loading analytics...</div>;
    if (!data) return <div className="p-8 text-center text-foreground-muted">Failed to load data</div>;

    return (
        <div className="space-y-6">
            {/* Daily Token Usage Chart */}
            <div className="bg-background-secondary p-6 rounded-xl shadow-xs border border-glass-border">
                <h3 className="text-lg font-bold text-foreground mb-4">Daily Token Usage (Last 30 Days)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.dailyUsage}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', color: '#1f2937', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#1f2937' }}
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
            <div className="bg-background-secondary rounded-xl shadow-xs border border-glass-border overflow-hidden">
                <div className="p-6 border-b border-glass-border">
                    <h3 className="text-lg font-bold text-foreground">Top Users (This Month)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-foreground-muted uppercase bg-background-secondary border-b border-glass-border">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Tier</th>
                                <th className="px-6 py-3">Messages</th>
                                <th className="px-6 py-3">Input / Output Tokens</th>
                                <th className="px-6 py-3">Total Tokens</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-glass-border">
                            {data.topUsers.map((user: any) => (
                                <tr key={user.id} className="hover:bg-background-secondary/50">
                                    <td className="px-6 py-4 font-medium text-foreground">
                                        <div>{user.name}</div>
                                        <div className="text-xs text-foreground-muted">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.tier === 'tier3' ? 'bg-purple-100 text-purple-700' :
                                            user.tier === 'tier2' ? 'bg-blue-100 text-blue-700' :
                                                user.tier === 'tier1' ? 'bg-green-100 text-green-700' :
                                                    'bg-background-tertiary text-foreground-secondary'
                                            }`}>
                                            {user.tier === 'tier3' ? 'Premium' : user.tier === 'tier2' ? 'Standard' : user.tier === 'tier1' ? 'Basic' : user.tier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-foreground-secondary">{user.messages.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-foreground-secondary">
                                        {user.inputTokens.toLocaleString()} <span className="text-foreground-muted">/</span> {user.outputTokens.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-foreground">{user.totalTokens.toLocaleString()}</td>
                                </tr>
                            ))}
                            {data.topUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-foreground-muted">No active users this month</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
