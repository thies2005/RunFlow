'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Activity as ActivityIcon, Database, RefreshCw, AlertTriangle, CheckCircle, Bot, Cpu, LucideIcon, ArrowRight } from 'lucide-react';

import AnalyticsTab from '@/components/admin/AnalyticsTab';
import AiSettingsTab from '@/components/admin/AiSettingsTab';
import UsersTab from '@/components/admin/UsersTab';
import BackupsTab from '@/components/admin/BackupsTab';
import AuditLogsTab from '@/components/admin/AuditLogsTab';
import FeedbackQueueTab from '@/components/admin/FeedbackQueueTab';
import MigrationTab from '@/components/admin/MigrationTab';
import PerformanceTab from '@/components/admin/PerformanceTab';
import WorkoutTemplatesTab from '@/components/admin/WorkoutTemplatesTab';
import { AdminStats, AdminUser, AdminBackup, AdminAiSettings } from './types';


interface TelemetryMetricProps {
    label: string;
    value: string | number;
    subtext?: string;
    icon: LucideIcon;
}

const TelemetryMetric = ({ label, value, subtext, icon: Icon }: TelemetryMetricProps) => (
    <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted">{label}</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">{value}</p>
            {subtext && <p className="text-xs text-foreground-muted mt-1">{subtext}</p>}
        </div>
        <Icon className="w-4 h-4 text-foreground-muted shrink-0 mt-0.5" aria-hidden="true" />
    </div>
);

interface DashboardWidgetProps {
    title: string;
    icon: LucideIcon;
    value: string | number;
    subtext?: string;
    onClick: () => void;
    alert?: boolean;
}

const DashboardWidget = ({ title, icon: Icon, value, subtext, onClick, alert = false }: DashboardWidgetProps) => (
    <button
        type="button"
        onClick={onClick}
        className="bg-background-secondary p-4 rounded border border-line hover:border-accent-orange/60 transition-colors text-left group flex flex-col justify-between"
    >
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${alert ? 'text-warning' : 'text-foreground-muted group-hover:text-accent-orange transition-colors'}`} aria-hidden="true" />
                    <span className="font-mono text-[11px] uppercase tracking-wider">{title}</span>
                </div>
                <p className={`text-2xl font-bold font-mono tabular-nums mt-2 ${alert ? 'text-warning' : 'text-foreground'}`}>{value}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-accent-orange group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" aria-hidden="true" />
        </div>
        {subtext && (
            <p className="text-xs text-foreground-muted mt-3 pt-2.5 border-t border-line w-full font-mono tabular-nums">
                {subtext}
            </p>
        )}
    </button>
);

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userSearch, setUserSearch] = useState('');
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersTotalPages, setUsersTotalPages] = useState(1);
    const [usersLoading, setUsersLoading] = useState(false);
    const [backups, setBackups] = useState<AdminBackup[]>([]);
    const [aiSettings, setAiSettings] = useState<AdminAiSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const tabParam = searchParams.get('tab');

    const activeTab = tabParam === 'backups' ? 'backups' :
                      tabParam === 'ai' ? 'ai' :
                      tabParam === 'analytics' ? 'analytics' :
                      tabParam === 'templates' ? 'templates' :
                      tabParam === 'audit' ? 'audit' :
                      tabParam === 'feedback-queue' ? 'feedback-queue' :
                      tabParam === 'migration' ? 'migration' :
                      tabParam === 'performance' ? 'performance' :
                      tabParam === 'users' ? 'users' :
                      null;

    const [processing, setProcessing] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchUsersPage = React.useCallback(async (page: number, search: string) => {
        try {
            setUsersLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: '25',
            });
            if (search.trim()) {
                params.set('search', search.trim());
            }
            const res = await fetch(`/api/admin/users?${params.toString()}`);
            if (res.status === 401) {
                router.push('/admin/login');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setUsersTotal(data.total ?? (data.users?.length || 0));
                setUsersTotalPages(data.totalPages || 1);
            } else {
                const errBody = await res.json().catch(() => ({}));
                setActionMessage({ type: 'error', text: `Users: ${errBody.error || res.statusText}` });
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setActionMessage({ type: 'error', text: 'Failed to load users' });
        } finally {
            setUsersLoading(false);
        }
    }, [router]);

    const fetchAllData = React.useCallback(async () => {
        try {
            setLoading(true);
            const userParams = new URLSearchParams({
                page: String(userPage),
                limit: '25',
            });
            if (userSearch.trim()) {
                userParams.set('search', userSearch.trim());
            }

            const [statsRes, usersRes, backupsRes, aiRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch(`/api/admin/users?${userParams.toString()}`),
                fetch('/api/admin/backups'),
                fetch('/api/admin/ai-settings'),
            ]);

            if (statsRes.status === 401 || usersRes.status === 401) {
                router.push('/admin/login');
                return;
            }

            let statsData: AdminStats | null = null;
            let usersData: AdminUser[] = [];
            let usersTotalCount = 0;
            let usersPagesCount = 1;
            let backupsData: AdminBackup[] = [];
            let aiData: AdminAiSettings | null = null;
            const errors: string[] = [];

            if (statsRes.ok) {
                statsData = await statsRes.json();
            } else {
                const errBody = await statsRes.json().catch(() => ({}));
                errors.push(`Stats: ${errBody.error || statsRes.statusText}`);
            }

            if (usersRes.ok) {
                const usersJson = await usersRes.json();
                usersData = usersJson.users || [];
                usersTotalCount = usersJson.total ?? usersData.length;
                usersPagesCount = usersJson.totalPages || 1;
            } else {
                const errBody = await usersRes.json().catch(() => ({}));
                errors.push(`Users: ${errBody.error || usersRes.statusText}`);
            }

            if (backupsRes.ok) {
                const backupsJson = await backupsRes.json();
                backupsData = backupsJson.backups || [];
            } else {
                const errBody = await backupsRes.json().catch(() => ({}));
                errors.push(`Backups: ${errBody.error || backupsRes.statusText}`);
            }

            if (aiRes.ok) {
                aiData = await aiRes.json();
            }

            setStats(statsData);
            setUsers(usersData);
            setUsersTotal(usersTotalCount);
            setUsersTotalPages(usersPagesCount);
            setBackups(backupsData);
            setAiSettings(aiData);

            if (errors.length > 0) {
                setActionMessage({ type: 'error', text: `API errors: ${errors.join('; ')}` });
                setTimeout(() => setActionMessage(null), 15000);
            }

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setActionMessage({ type: 'error', text: 'Failed to load dashboard data' });
        } finally {
            setLoading(false);
        }
    }, [router, userPage, userSearch]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-orange"></div>
            </div>
        );
    }

    const handleUserPageChange = (nextPage: number) => {
        setUserPage(nextPage);
        fetchUsersPage(nextPage, userSearch);
    };

    const handleUserSearch = (nextSearch: string) => {
        setUserSearch(nextSearch);
        setUserPage(1);
        fetchUsersPage(1, nextSearch);
    };

    const unresolvedErrors = stats?.monitoring?.unresolvedErrors ?? 0;
    const failedQueueJobs = stats?.feedbackQueue?.failed ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-line">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {activeTab ? (
                            {
                                users: 'User Management',
                                backups: 'Backups',
                                ai: 'AI Settings',
                                analytics: 'Analytics',
                                templates: 'Workout Templates',
                                audit: 'Audit Trail',
                                'feedback-queue': 'Feedback Queue',
                                migration: 'Migration',
                                performance: 'Performance'
                            }[activeTab] || 'Dashboard'
                        ) : 'Dashboard Overview'}
                    </h1>
                    {!activeTab && (
                        <p className="text-sm text-foreground-muted mt-1">Key metrics and system overview</p>
                    )}
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={fetchAllData}
                        className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-secondary border border-line rounded transition"
                        aria-label="Refresh dashboard data"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <div
                        role="status"
                        className={`px-3 py-1 rounded text-xs font-medium font-mono flex items-center border ${
                            unresolvedErrors > 0 || failedQueueJobs > 0
                                ? 'bg-warning/10 text-warning border-warning/30'
                                : 'bg-positive/10 text-positive border-positive/30'
                        }`}
                    >
                        {unresolvedErrors > 0 || failedQueueJobs > 0 ? (
                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                        ) : (
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                        )}
                        {unresolvedErrors > 0
                            ? `${unresolvedErrors} unresolved error${unresolvedErrors === 1 ? '' : 's'}`
                            : failedQueueJobs > 0
                                ? `${failedQueueJobs} failed job${failedQueueJobs === 1 ? '' : 's'}`
                                : 'Operational'}
                    </div>
                </div>
            </div>

            {actionMessage && (
                <div
                    role={actionMessage.type === 'error' ? 'alert' : 'status'}
                    className={`p-3.5 rounded border text-sm flex items-center ${actionMessage.type === 'success' ? 'bg-positive/10 border-positive/30 text-positive' : 'bg-negative/10 border-negative/30 text-negative'}`}
                >
                    {actionMessage.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                    ) : (
                        <AlertTriangle className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                    )}
                    <span>{actionMessage.text}</span>
                </div>
            )}

            {!activeTab && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DashboardWidget
                            title="New Users (24h)"
                            icon={Users}
                            value={stats?.users?.newToday || 0}
                            subtext={`${stats?.users?.newLast7Days ?? 0} in last 7 days`}
                            onClick={() => router.push('/admin?tab=users')}
                        />
                        <DashboardWidget
                            title="AI Enabled Users"
                            icon={Bot}
                            value={aiSettings?.stats?.enabledUsers || 0}
                            subtext={`${(stats?.aiUsage?.todayTokens || 0).toLocaleString()} tokens today`}
                            onClick={() => router.push('/admin?tab=analytics')}
                        />
                        <DashboardWidget
                            title="Feedback Queue"
                            icon={ActivityIcon}
                            value={stats?.feedbackQueue?.doneToday || 0}
                            subtext={`${stats?.feedbackQueue?.pending || 0} pending • ${failedQueueJobs} failed`}
                            onClick={() => router.push('/admin?tab=feedback-queue')}
                            alert={failedQueueJobs > 0}
                        />
                        <DashboardWidget
                            title="Unresolved Errors"
                            icon={Cpu}
                            value={unresolvedErrors}
                            subtext={`${stats?.monitoring?.errorsLast24h || 0} logged in last 24h`}
                            onClick={() => router.push('/admin?tab=performance')}
                            alert={unresolvedErrors > 0}
                        />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 border border-line bg-background-secondary divide-y lg:divide-y-0 lg:divide-x divide-line rounded">
                        <TelemetryMetric
                            label="Total Users"
                            value={stats?.users?.total || 0}
                            subtext={`${stats?.users?.newToday || 0} new today`}
                            icon={Users}
                        />
                        <TelemetryMetric
                            label="Active Sessions"
                            value={stats?.sessions?.active || 0}
                            subtext={`${stats?.sessions?.total || 0} total sessions`}
                            icon={ActivityIcon}
                        />
                        <TelemetryMetric
                            label="Activities"
                            value={stats?.activities?.total || 0}
                            subtext={`${stats?.activities?.last7Days || 0} this week`}
                            icon={ActivityIcon}
                        />
                        <TelemetryMetric
                            label="Backups"
                            value={stats?.backups?.count || 0}
                            subtext={`Last: ${stats?.backups?.lastBackupAt ? new Date(stats.backups.lastBackupAt).toLocaleDateString() : 'Never'}`}
                            icon={Database}
                        />
                    </div>
                </div>
            )}

            {activeTab && (
                <div>
                    {activeTab === 'users' && (
                        <UsersTab
                            users={users}
                            setUsers={setUsers}
                            aiSettings={aiSettings}
                            processing={processing}
                            setProcessing={setProcessing}
                            setActionMessage={setActionMessage}
                            fetchAllData={fetchAllData}
                            userPage={userPage}
                            usersTotal={usersTotal}
                            usersTotalPages={usersTotalPages}
                            userSearch={userSearch}
                            usersLoading={usersLoading}
                            onPageChange={handleUserPageChange}
                            onSearchSubmit={handleUserSearch}
                        />
                    )}

                    {activeTab === 'backups' && (
                        <BackupsTab
                            backups={backups}
                            processing={processing}
                            setProcessing={setProcessing}
                            setActionMessage={setActionMessage}
                            fetchAllData={fetchAllData}
                        />
                    )}

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

                    {activeTab === 'analytics' && (
                        <AnalyticsTab />
                    )}

                    {activeTab === 'templates' && (
                        <WorkoutTemplatesTab />
                    )}

                    {activeTab === 'audit' && (
                        <AuditLogsTab />
                    )}

                    {activeTab === 'feedback-queue' && (
                        <FeedbackQueueTab />
                    )}

                    {activeTab === 'migration' && (
                        <MigrationTab />
                    )}

                    {activeTab === 'performance' && (
                        <PerformanceTab />
                    )}
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-orange"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
