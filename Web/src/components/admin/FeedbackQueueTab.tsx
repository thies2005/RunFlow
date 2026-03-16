'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Clock, CheckCircle, AlertCircle, Loader2, User, Activity as ActivityIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { csrfHeaders } from '@/lib/admin/csrfHelper';

interface Job {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
    priority: number;
    retryCount: number;
    error?: string;
    updatedAt: string;
    user: { name: string | null; email: string | null };
    activity: { name: string; startDate: string };
}

interface Stats {
    status: string;
    _count: { _all: number };
}

export default function FeedbackQueueTab() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [stats, setStats] = useState<Stats[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/ai/feedback-queue');
            if (res.ok) {
                const data = await res.json();
                setJobs(data.recentJobs || []);
                setStats(data.stats || []);
            }
        } catch (error) {
            console.error('Failed to fetch queue data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (action: 'retry-failed' | 'clear-done' | 'process-now') => {
        try {
            setActionLoading(action);
            const res = await fetch('/api/ai/feedback-queue', {
                method: 'POST',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                await fetchData();
            }
        } catch (error) {
            console.error(`Action ${action} failed:`, error);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'PROCESSING': return 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse';
            case 'DONE': return 'bg-green-100 text-green-600 border-green-200';
            case 'FAILED': return 'bg-red-100 text-red-600 border-red-200';
            default: return 'bg-gray-50 text-gray-400';
        }
    };

    const statMap = stats.reduce((acc, curr) => {
        acc[curr.status] = curr._count._all;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                        <span className="text-sm text-gray-500 mr-2">Pending:</span>
                        <span className="font-bold text-gray-800">{statMap['PENDING'] || 0}</span>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                        <span className="text-sm text-blue-500 mr-2">Processing:</span>
                        <span className="font-bold text-blue-800">{statMap['PROCESSING'] || 0}</span>
                    </div>
                    <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                        <span className="text-sm text-red-500 mr-2">Failed:</span>
                        <span className="font-bold text-red-800">{statMap['FAILED'] || 0}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('process-now')}
                        disabled={actionLoading === 'process-now'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
                    >
                        {actionLoading === 'process-now' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Process Now
                    </button>
                    <button
                        onClick={() => handleAction('retry-failed')}
                        disabled={actionLoading === 'retry-failed'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-60"
                    >
                        {actionLoading === 'retry-failed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Retry All Failed
                    </button>
                    <button
                        onClick={() => handleAction('clear-done')}
                        disabled={actionLoading === 'clear-done'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-60"
                    >
                        {actionLoading === 'clear-done' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Clear Completed
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition"
                    >
                        {loading && !actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Activity</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Updated</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        No recent queue activity.
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyles(job.status)}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-800">{job.user.name || 'Anonymous'}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter">{job.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <ActivityIcon className="w-4 h-4 text-emerald-500" />
                                                <div>
                                                    <div className="text-sm text-gray-600 font-medium truncate max-w-[200px]">{job.activity.name}</div>
                                                    <div className="text-[10px] text-gray-400">{new Date(job.activity.startDate).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {job.status === 'FAILED' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium group cursor-help" title={job.error}>
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Fail (Try {job.retryCount})
                                                </div>
                                            ) : job.status === 'DONE' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Success
                                                </div>
                                            ) : job.status === 'PROCESSING' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium italic">
                                                    Working...
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-400 italic">
                                                    In Queue (Pri: {job.priority})
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
