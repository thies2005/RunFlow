'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Users, Activity, LogIn, Database, RefreshCw, Trash2, Download, AlertTriangle, CheckCircle, Upload, Plus, Mail, Bot, Eye, Save, Loader2, Zap, BarChart3, ClipboardList } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';

import AnalyticsTab from '@/components/admin/AnalyticsTab';
import AiSettingsTab from '@/components/admin/AiSettingsTab';
import UsersTab from '@/components/admin/UsersTab';
import BackupsTab from '@/components/admin/BackupsTab';
import AuditLogsTab from '@/components/admin/AuditLogsTab';


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
    const activeTab = tabParam === 'backups' ? 'backups' : tabParam === 'ai' ? 'ai' : tabParam === 'analytics' ? 'analytics' : tabParam === 'audit' ? 'audit' : 'users';

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
                    <button
                        onClick={() => router.push('/admin?tab=audit')}
                        className={`px-6 py-4 text-sm font-medium transition ${activeTab === 'audit' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <ClipboardList className="w-4 h-4 inline mr-1" />
                        Audit Trail
                    </button>
                </div>

                <div className="p-6">
                    {/* Users Tab */}
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

                    {/* Backups Tab */}
                    {activeTab === 'backups' && (
                        <BackupsTab
                            backups={backups}
                            processing={processing}
                            setProcessing={setProcessing}
                            setActionMessage={setActionMessage}
                            fetchAllData={fetchAllData}
                        />
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

                    {/* Audit Logs Tab */}
                    {activeTab === 'audit' && (
                        <AuditLogsTab />
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

