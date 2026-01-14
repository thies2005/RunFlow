'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Activity, LogIn, Database, RefreshCw, Trash2, Download, AlertTriangle, CheckCircle, Upload } from 'lucide-react';

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
    const [loading, setLoading] = useState(true);

    // Tab state controlled by URL
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam === 'backups' ? 'backups' : 'users';

    const [processing, setProcessing] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch data
    const fetchAllData = React.useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, usersRes, backupsRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/users?limit=20'),
                fetch('/api/admin/backups'),
            ]);

            if (statsRes.status === 401 || usersRes.status === 401) {
                router.push('/admin/login');
                return;
            }

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            const backupsData = await backupsRes.json();

            setStats(statsData);
            setUsers(usersData.users || []);
            setBackups(backupsData.backups || []);

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

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action CANNOT be undone.')) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete user');

            setActionMessage({ type: 'success', text: 'User deleted successfully' });
            fetchAllData(); // Refresh list
        } catch (error) {
            setActionMessage({ type: 'error', text: 'Failed to delete user' });
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
                headers: { 'Content-Type': 'application/json' },
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
                </div>

                <div className="p-6">
                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">User</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">Joined</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">Last Sync</th>
                                            <th className="pb-3 font-semibold text-gray-600 text-sm">Activities</th>
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
                                                <td className="py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        disabled={processing}
                                                        className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-lg"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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
                                        <Download className="w-4 h-4 mr-2" />
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

