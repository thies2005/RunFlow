import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Activity, Mail, Trash2, Search } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';
import useConfirmAction from '@/hooks/useConfirmAction';
import SignupAccessControl from '@/components/admin/SignupAccessControl';
import { AdminUser, AdminAiSettings } from '@/app/admin/types';

interface UsersTabProps {
    users: AdminUser[];
    setUsers: (_users: AdminUser[]) => void;
    aiSettings: AdminAiSettings | null;
    processing: boolean;
    setProcessing: (_val: boolean) => void;
    setActionMessage: (_msg: { type: 'success' | 'error', text: string } | null) => void;
    fetchAllData: () => void;
    userPage: number;
    usersTotal: number;
    usersTotalPages: number;
    userSearch: string;
    usersLoading?: boolean;
    onPageChange: (_page: number) => void;
    onSearchSubmit: (_search: string) => void;
}

export default function UsersTab({
    users,
    setUsers,
    aiSettings,
    processing,
    setProcessing,
    setActionMessage,
    fetchAllData,
    userPage,
    usersTotal,
    usersTotalPages,
    userSearch,
    usersLoading = false,
    onPageChange,
    onSearchSubmit,
}: UsersTabProps) {
    const { confirm, ConfirmDialog } = useConfirmAction();
    const [searchDraft, setSearchDraft] = useState(userSearch);

    useEffect(() => {
        setSearchDraft(userSearch);
    }, [userSearch]);

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
        const allowAccess = tier !== 'none';
        setUsers(users.map((u: AdminUser) =>
            u.id === userId
                ? {
                    ...u,
                    aiSettings: u.aiSettings
                        ? { ...u.aiSettings, usageTier: tier, adminAllowed: allowAccess }
                        : { usageTier: tier, adminAllowed: allowAccess, aiEnabled: false }
                }
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
        <div className="space-y-6">
            <SignupAccessControl
                allowSignups={aiSettings?.settings?.allowSignups}
                envAllowSignups={aiSettings?.settings?.envAllowSignups}
                processing={processing}
                setProcessing={setProcessing}
                setActionMessage={setActionMessage}
                onUpdated={() => fetchAllData()}
            />

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div role="search" aria-label="Search users" className="flex-1 max-w-md">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            onSearchSubmit(searchDraft);
                        }}
                        className="flex items-center gap-2"
                    >
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                            <input
                                id="admin-user-search"
                                type="search"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                                placeholder="Search by name or email..."
                                aria-label="Search users by name or email"
                                className="w-full pl-9 pr-3 py-2 bg-background border border-line rounded-md text-sm text-foreground placeholder-foreground-muted focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={usersLoading}
                            className="px-3 py-2 bg-background-tertiary border border-line text-foreground text-sm font-medium rounded-md hover:bg-surface-hover transition disabled:opacity-50"
                        >
                            Search
                        </button>
                        {userSearch && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchDraft('');
                                    onSearchSubmit('');
                                }}
                                disabled={usersLoading}
                                className="px-3 py-2 border border-line text-foreground-muted hover:text-foreground text-sm rounded-md transition disabled:opacity-50"
                            >
                                Clear
                            </button>
                        )}
                    </form>
                </div>

                <button
                    type="button"
                    onClick={() => handleRecalculateFitness()}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-background-tertiary border border-line rounded-md text-accent-blue hover:bg-surface-hover transition text-sm font-medium disabled:opacity-50"
                >
                    <Activity className="w-4 h-4" aria-hidden="true" />
                    Recalculate All Fitness
                </button>
            </div>
            <div className="overflow-x-auto border border-line rounded bg-background-secondary" role="region" tabIndex={0} aria-label="Users table">
                <table className="w-full text-left">
                    <caption className="sr-only">Registered users and AI access settings</caption>
                    <thead className="border-b border-line bg-background">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">User</th>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Joined</th>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Last Sync</th>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted text-right">Activities</th>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted text-center">AI Access</th>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">AI Tier</th>
                            <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {users.map((user: AdminUser) => (
                            <tr key={user.id} className="group hover:bg-background transition">
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-foreground/15 flex-shrink-0 overflow-hidden">
                                            {user.image ? (
                                                <Image src={user.image} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-foreground-muted text-xs">
                                                    {user.name?.[0] || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-foreground">{user.name || 'Unknown'}</p>
                                            <p className="text-xs text-foreground-muted">{user.email || 'No email'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-foreground-muted">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-foreground-muted">
                                    {user.lastSyncAt ? new Date(user.lastSyncAt).toLocaleString() : 'Never'}
                                </td>
                                <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-foreground-muted text-right">
                                    {user.activityCount}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex gap-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.aiSettings?.adminAllowed ? 'bg-accent-blue/10 text-accent-blue' : 'bg-background-tertiary text-foreground-muted'}`}
                                                title={user.aiSettings?.adminAllowed ? 'Admin has allowed access' : 'Admin has not allowed access'}
                                            >
                                                {user.aiSettings?.adminAllowed ? 'Allowed' : 'Locked'}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.aiSettings?.aiEnabled ? 'bg-positive/10 text-positive' : 'bg-background-tertiary text-foreground-muted'}`}
                                                title={user.aiSettings?.aiEnabled ? 'User has opted-in' : 'User has not opted-in'}
                                            >
                                                {user.aiSettings?.aiEnabled ? 'Opt-in' : 'Off'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-foreground-muted">
                                    <select
                                        aria-label={`AI tier for ${user.name || user.email || user.id}`}
                                        value={user.aiSettings?.usageTier || 'none'}
                                        onChange={(e) => handleToggleAi(user.id, e.target.value)}
                                        disabled={processing}
                                        className="bg-background border border-line text-foreground-secondary text-sm rounded focus:ring-accent-orange focus:border-accent-orange block w-full p-2"
                                    >
                                        <option value="none">No Access</option>
                                        <option value="tier1">{aiSettings?.settings?.tier1Name || 'Tier 1'}</option>
                                        <option value="tier2">{aiSettings?.settings?.tier2Name || 'Tier 2'}</option>
                                        <option value="tier3">{aiSettings?.settings?.tier3Name || 'Tier 3'}</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                    <div className="flex justify-end space-x-1">
                                        <button
                                            type="button"
                                            onClick={() => handleRecalculateFitness(user.id, user.name || user.email)}
                                            disabled={processing}
                                            className="text-foreground-muted hover:text-accent-blue transition p-2 hover:bg-accent-blue/10 rounded"
                                            aria-label={`Recalculate fitness for ${user.name || user.email || user.id}`}
                                            title="Recalculate Fitness"
                                        >
                                            <Activity className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleResetPassword(user.id, user.email)}
                                            disabled={processing}
                                            className="text-foreground-muted hover:text-positive transition p-2 hover:bg-positive/10 rounded"
                                            aria-label={`Send password reset email to ${user.email || user.name || user.id}`}
                                            title="Send Reset Password Email"
                                        >
                                            <Mail className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteUser(user.id)}
                                            disabled={processing}
                                            className="text-foreground-muted hover:text-negative transition p-2 hover:bg-negative/10 rounded"
                                            aria-label={`Delete user ${user.name || user.email || user.id}`}
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-foreground-muted">
                                    No users found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {usersTotal > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line">
                    <div className="text-xs font-mono tabular-nums text-foreground-muted">
                        Showing page {userPage} of {usersTotalPages} ({usersTotal} total users)
                    </div>
                    {usersTotalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onPageChange(Math.max(1, userPage - 1))}
                                disabled={userPage <= 1 || usersLoading}
                                className="px-3 py-1.5 border border-line rounded-md text-xs font-medium text-foreground-secondary hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => onPageChange(Math.min(usersTotalPages, userPage + 1))}
                                disabled={userPage >= usersTotalPages || usersLoading}
                                className="px-3 py-1.5 border border-line rounded-md text-xs font-medium text-foreground-secondary hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
            <ConfirmDialog />
        </div>
    );
}
