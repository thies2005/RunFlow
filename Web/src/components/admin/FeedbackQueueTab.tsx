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
            const res = await fetch('/api/ai/feedback-queue', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
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
                cache: 'no-store',
                headers: {
                    ...csrfHeaders(),
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
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
            case 'PENDING': return 'bg-background-tertiary text-foreground-secondary border-line';
            case 'PROCESSING': return 'bg-accent-blue/10 text-accent-blue border-accent-blue/30';
            case 'DONE': return 'bg-positive/10 text-positive border-positive/30';
            case 'FAILED': return 'bg-negative/10 text-negative border-negative/30';
            default: return 'bg-background-secondary text-foreground-muted';
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
                    <div className="bg-background-secondary px-4 py-2 rounded-md border border-line">
                        <span className="text-sm text-foreground-muted mr-2">Pending:</span>
                        <span className="font-bold text-foreground">{statMap['PENDING'] || 0}</span>
                    </div>
                    <div className="bg-background-secondary px-4 py-2 rounded-md border border-line">
                        <span className="text-sm text-foreground-muted mr-2">Processing:</span>
                        <span className="font-bold font-mono tabular-nums text-accent-blue">{statMap['PROCESSING'] || 0}</span>
                    </div>
                    <div className="bg-background-secondary px-4 py-2 rounded-md border border-line">
                        <span className="text-sm text-foreground-muted mr-2">Failed:</span>
                        <span className="font-bold font-mono tabular-nums text-negative">{statMap['FAILED'] || 0}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('process-now')}
                        disabled={actionLoading === 'process-now'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-accent-blue/90 rounded-md transition disabled:opacity-60"
                    >
                        {actionLoading === 'process-now' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Process Now
                    </button>
                    <button
                        onClick={() => handleAction('retry-failed')}
                        disabled={actionLoading === 'retry-failed'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-orange hover:bg-accent-orange/90 rounded-md transition disabled:opacity-60"
                    >
                        {actionLoading === 'retry-failed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Retry All Failed
                    </button>
                    <button
                        onClick={() => handleAction('clear-done')}
                        disabled={actionLoading === 'clear-done'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-negative bg-negative/10 hover:bg-negative/20 border border-negative/30 rounded-md transition disabled:opacity-60"
                    >
                        {actionLoading === 'clear-done' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Clear Completed
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-background-tertiary hover:bg-surface-hover text-foreground-secondary rounded-md transition"
                    >
                        {loading && !actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-background-secondary rounded-md border border-line overflow-hidden ">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-background-secondary border-b border-line">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-foreground-muted">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-foreground-muted">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-foreground-muted">Activity</th>
                                <th className="px-6 py-4 text-xs font-bold text-foreground-muted">Updated</th>
                                <th className="px-6 py-4 text-xs font-bold text-foreground-muted">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-foreground-muted">
                                        No recent queue activity.
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-background-secondary transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyles(job.status)}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-background-tertiary border border-line flex items-center justify-center">
                                                    <User className="w-4 h-4 text-foreground-muted" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-foreground">{job.user.name || 'Anonymous'}</div>
                                                    <div className="text-[10px] text-foreground-muted font-mono">{job.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <ActivityIcon className="w-4 h-4 text-positive" />
                                                <div>
                                                    <div className="text-sm text-foreground-secondary font-medium truncate max-w-[200px]">{job.activity.name}</div>
                                                    <div className="text-[10px] text-foreground-muted">{new Date(job.activity.startDate).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-foreground-muted">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {job.status === 'FAILED' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-negative font-medium group cursor-help" title={job.error}>
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Fail (Try {job.retryCount})
                                                </div>
                                            ) : job.status === 'DONE' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-positive font-medium">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Success
                                                </div>
                                            ) : job.status === 'PROCESSING' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-accent-blue font-medium italic">
                                                    Working...
                                                </div>
                                            ) : (
                                                <div className="text-xs text-foreground-muted italic">
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
