'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, FileText, Target, Server, UserSquare2, Bot, PlayCircle, Settings } from 'lucide-react';

interface AuditLog {
    id: string;
    adminUser: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

export default function AuditLogsTab() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    const fetchLogs = async (pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/audit-logs?page=${pageNum}&limit=50`);
            const data = await res.json();

            if (res.ok) {
                setLogs(data.logs || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalLogs(data.pagination?.total || 0);
            } else {
                setError(data.error || 'Failed to fetch audit logs');
            }
        } catch (err) {
            console.error('Fetch logs error:', err);
            setError('Network error loading audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const getActionIcon = (action: string) => {
        if (action.includes('USER')) return <UserSquare2 className="w-4 h-4" />;
        if (action.includes('BACKUP')) return <Server className="w-4 h-4" />;
        if (action.includes('SETTINGS') || action.includes('AI')) return <Settings className="w-4 h-4" />;
        if (action.includes('PROVIDER')) return <Bot className="w-4 h-4" />;
        if (action.includes('RECALCULATE')) return <PlayCircle className="w-4 h-4" />;
        return <FileText className="w-4 h-4" />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'bg-red-50 text-red-600 border-red-200';
        if (action.includes('UPLOAD') || action.includes('RESTORE')) return 'bg-orange-50 text-orange-600 border-orange-200';
        if (action.includes('MODIFY') || action.includes('TOGGLE') || action.includes('RESET')) return 'bg-amber-50 text-amber-600 border-amber-200';
        return 'bg-blue-50 text-blue-600 border-blue-200';
    };

    const formatDetails = (details: string | null) => {
        if (!details) return '-';
        try {
            const parsed = JSON.parse(details);
            return (
                <pre className="text-xs bg-gray-50 text-gray-700 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono mt-2 border border-gray-100">
                    {JSON.stringify(parsed, null, 2)}
                </pre>
            );
        } catch {
            return details;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">System Audit Trail</h2>
                    <p className="text-gray-500 text-sm mt-1">Immutable log of administrative actions (GDPR Art. 5)</p>
                </div>
                <button
                    onClick={() => fetchLogs(page)}
                    className="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-lg">Recent Actions</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Showing page {page} of {totalPages} ({totalLogs} total logs)
                    </p>
                </div>
                <div className="p-5">
                    {loading && logs.length === 0 ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse flex space-x-4 p-4 border border-gray-100 rounded-xl">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                    <div className="flex-1 space-y-3 py-1">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No audit logs found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-gray-50/50">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-600 shadow-sm">
                                                {getActionIcon(log.action)}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-800">{log.adminUser}</span>
                                                    <span className="text-gray-500 text-sm">performed</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </div>

                                                <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                                    {log.targetType && log.targetId && (
                                                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200">
                                                            <Target className="w-3 h-3" />
                                                            <span>{log.targetType}: {log.targetId}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-gray-400">
                                                        <Server className="w-3 h-3" />
                                                        <span>IP: {log.ipAddress}</span>
                                                    </div>
                                                </div>

                                                {(log.details && log.details !== '{}') && (
                                                    <div className="mt-4">
                                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Context & Data</span>
                                                        {formatDetails(log.details)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 sm:text-right shrink-0 bg-white px-3 py-2 rounded-lg border border-gray-100 flex flex-row sm:flex-col gap-2 sm:gap-0 items-center sm:items-end">
                                            <div className="font-medium text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</div>
                                            <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                            <div className="text-sm text-gray-500">
                                Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, totalLogs)} of {totalLogs} entries
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                >
                                    Previous
                                </button>
                                <button
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
