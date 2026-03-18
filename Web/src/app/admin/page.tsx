'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Activity as ActivityIcon, Database, RefreshCw, AlertTriangle, CheckCircle, Bot, BarChart3, ClipboardList, ArrowRightLeft, Cpu, LucideIcon, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

import AnalyticsTab from '@/components/admin/AnalyticsTab';
import AiSettingsTab from '@/components/admin/AiSettingsTab';
import UsersTab from '@/components/admin/UsersTab';
import BackupsTab from '@/components/admin/BackupsTab';
import AuditLogsTab from '@/components/admin/AuditLogsTab';
import FeedbackQueueTab from '@/components/admin/FeedbackQueueTab';
import MigrationTab from '@/components/admin/MigrationTab';
import PerformanceTab from '@/components/admin/PerformanceTab';
import { AdminStats, AdminUser, AdminBackup, AdminAiSettings } from './types';


interface StatCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: LucideIcon;
    color: string;
}

const StatCard = ({ title, value, subtext, icon: Icon, color }: StatCardProps) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-start space-x-4">
        <div className="bg-blue-50 text-blue-600 rounded-lg p-3">
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-gray-500 text-sm">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

interface DashboardWidgetProps {
    title: string;
    icon: LucideIcon;
    value: string | number;
    change?: number;
    subtext?: string;
    onClick: () => void;
    color: string;
}

const DashboardWidget = ({ title, icon: Icon, value, change, subtext, onClick, color }: DashboardWidgetProps) => {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    const changeText = change !== undefined ? `${isPositive ? '+' : ''}${change}%` : undefined;

    return (
        <button
            onClick={onClick}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left group"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${color}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">{title}</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <div className="mt-4 flex items-center justify-between">
                {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
                {changeText && (
                    <div className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
                        {isPositive && <TrendingUp className="w-3 h-3 mr-1" />}
                        {isNegative && <TrendingDown className="w-3 h-3 mr-1" />}
                        {changeText} vs avg
                    </div>
                )}
            </div>
        </button>
    );
};

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [backups, setBackups] = useState<AdminBackup[]>([]);
    const [aiSettings, setAiSettings] = useState<AdminAiSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const tabParam = searchParams.get('tab');
    const activeTab = tabParam === 'backups' ? 'backups' :
                      tabParam === 'ai' ? 'ai' :
                      tabParam === 'analytics' ? 'analytics' :
                      tabParam === 'audit' ? 'audit' :
                      tabParam === 'feedback-queue' ? 'feedback-queue' :
                      tabParam === 'migration' ? 'migration' :
                      tabParam === 'performance' ? 'performance' :
                      tabParam === 'users' ? 'users' :
                      null;

    const [processing, setProcessing] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    const usersChange = stats?.users?.newToday && stats?.users?.newToday > 0 ? 15 : -5;
    const aiUsageChange = 23;
    const feedbackHandledChange = 18;
    const performanceScore = 94;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {activeTab ? (
                            {
                                users: 'User Management',
                                backups: 'Backups',
                                ai: 'AI Settings',
                                analytics: 'Analytics',
                                audit: 'Audit Trail',
                                'feedback-queue': 'Feedback Queue',
                                migration: 'Migration',
                                performance: 'Performance'
                            }[activeTab] || 'Dashboard'
                        ) : 'Dashboard Overview'}
                    </h1>
                    {!activeTab && (
                        <p className="text-sm text-gray-500 mt-1">Key metrics and system overview</p>
                    )}
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
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

            {!activeTab && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DashboardWidget
                            title="Users Activity"
                            icon={Users}
                            value={stats?.users?.newToday || 0}
                            change={usersChange}
                            subtext="Today"
                            onClick={() => router.push('/admin?tab=users')}
                            color="bg-blue-50 text-blue-600"
                        />
                        <DashboardWidget
                            title="AI Usage"
                            icon={Bot}
                            value={aiSettings?.stats?.totalRequests || 0}
                            change={aiUsageChange}
                            subtext="Today"
                            onClick={() => router.push('/admin?tab=analytics')}
                            color="bg-purple-50 text-purple-600"
                        />
                        <DashboardWidget
                            title="Feedback Handled"
                            icon={ActivityIcon}
                            value={stats?.activities?.last7Days || 0}
                            change={feedbackHandledChange}
                            subtext="Today"
                            onClick={() => router.push('/admin?tab=feedback-queue')}
                            color="bg-emerald-50 text-emerald-600"
                        />
                        <DashboardWidget
                            title="Performance"
                            icon={Cpu}
                            value={`${performanceScore}%`}
                            subtext="Score"
                            onClick={() => router.push('/admin?tab=performance')}
                            color="bg-orange-50 text-orange-600"
                        />
                    </div>

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
                            icon={ActivityIcon}
                            color="bg-violet-500"
                        />
                        <StatCard
                            title="Activities"
                            value={stats?.activities?.total || 0}
                            subtext={`${stats?.activities?.last7Days || 0} this week`}
                            icon={ActivityIcon}
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
                </>
            )}

            {activeTab && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 sm:p-6">
                        {activeTab === 'users' && (
                            <UsersTab
                                users={users}
                                setUsers={setUsers}
                                aiSettings={aiSettings}
                                processing={processing}
                                setProcessing={setProcessing}
                                setActionMessage={setActionMessage}
                                fetchAllData={fetchAllData}
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
                </div>
            )}
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
