import React from 'react';
import Image from 'next/image';
import { Activity, Mail, Trash2 } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';
import useConfirmAction from '@/hooks/useConfirmAction';
import { AdminUser, AdminAiSettings } from '@/app/admin/types';

interface UsersTabProps {
    users: AdminUser[];
    setUsers: (_users: AdminUser[]) => void;
    aiSettings: AdminAiSettings | null;
    processing: boolean;
    setProcessing: (_val: boolean) => void;
    setActionMessage: (_msg: { type: 'success' | 'error', text: string } | null) => void;
    fetchAllData: () => void;
}

export default function UsersTab({
    users,
    setUsers,
    aiSettings,
    processing,
    setProcessing,
    setActionMessage,
    fetchAllData
}: UsersTabProps) {
    const { confirm, ConfirmDialog } = useConfirmAction();

    const handleResetPassword = async (userId: string, userEmail: string | null) => {
        const isConfirmed = await confirm({
            title: 'Reset Password',
            message: `Are you sure you want to send a password reset email to ${userEmail}?`,
            confirmText: 'Send Email'
        });
        if (!isConfirmed) return;

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

    const handleRecalculateFitness = async (userId?: string, userEmail?: string | null) => {
        const confirmMsg = userId
            ? `Recalculate fitness history for ${userEmail}? This may take a few seconds.`
            : 'Recalculate fitness history for ALL users? This checks all activities and rebuilds cache. It may take a while.';

        const isConfirmed = await confirm({
            title: 'Recalculate Fitness',
            message: confirmMsg,
            confirmText: 'Recalculate'
        });
        if (!isConfirmed) return;

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

            fetchAllData();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const isConfirmed = await confirm({
            title: 'Delete User',
            message: 'Are you sure you want to delete this user? This action CANNOT be undone.',
            confirmText: 'Delete',
            isDestructive: true
        });
        if (!isConfirmed) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() } });
            if (!res.ok) throw new Error('Failed to delete user');

            setActionMessage({ type: 'success', text: 'User deleted successfully' });
            fetchAllData();
        } catch {
            setActionMessage({ type: 'error', text: 'Failed to delete user' });
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleAi = async (userId: string, tier: string) => {
        setProcessing(true);
        setUsers(users.map((u: AdminUser) =>
            u.id === userId
                ? { ...u, aiSettings: u.aiSettings ? { ...u.aiSettings, usageTier: tier } : { usageTier: tier, adminAllowed: false, aiEnabled: false } }
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
            fetchAllData();
        } finally {
            setProcessing(false);
        }
    };

    return (
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
                        {users.map((user: AdminUser) => (
                            <tr key={user.id} className="group hover:bg-gray-50 transition">
                                <td className="py-4">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                            {user.image ? (
                                                <Image src={user.image} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
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
                                <td colSpan={7} className="py-8 text-center text-gray-500">
                                    No users found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ConfirmDialog />
        </div>
    );
}
