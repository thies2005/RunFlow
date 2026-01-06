'use client';

import { useState } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, LogOut, AlertCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { TodayWorkout, RaceCountdown, ActivityList, FitnessChart, AnalyticsDashboard, SettingsModal, PoweredByStravaLogo } from '@/components';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Fetch activities (Fetch more for analytics)
    const { data: activitiesData, isLoading: activitiesLoading, error: activitiesError } = useQuery({
        queryKey: ['activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=300&type=RUN');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch activities');
            }
            return res.json();
        },
        enabled: status === 'authenticated',
        retry: 1,
    });

    // Fetch goals
    const { data: goalsData, isLoading: goalsLoading, error: goalsError } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch goals');
            }
            return res.json();
        },
        enabled: status === 'authenticated',
        retry: 1,
    });

    // Fetch sync status
    const { data: syncStatus, isLoading: syncLoading, error: syncError } = useQuery({
        queryKey: ['sync-status'],
        queryFn: async () => {
            const res = await fetch('/api/sync');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch sync status');
            }
            return res.json() as Promise<{ syncInProgress: boolean; lastSyncAt: string | null; totalActivities: number }>;
        },
        enabled: status === 'authenticated',
        refetchInterval: (query) => query.state.data?.syncInProgress ? 2000 : false,
        retry: 1,
    });

    // Sync mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', { method: 'POST' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to start sync');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            queryClient.invalidateQueries({ queryKey: ['sync-status'] });
        },
    });

    // Show loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        return null;
    }

    // Redirect to onboarding if authenticated but no activities (and not currently syncing)
    if (status === 'authenticated'
        && syncStatus
        && syncStatus.totalActivities === 0
        && !syncStatus.syncInProgress
        && !activitiesLoading) {
        if (typeof window !== 'undefined') {
            router.push('/onboarding');
        }
        return null;
    }

    const activeGoal = goalsData?.goals?.find((g: any) => g.isActive);
    const todayWorkout = activeGoal?.workouts?.[0] || null;

    // Derived Activity Lists
    // We fetch 300 for analytics, but only show 10 in the list
    const allActivities = activitiesData?.activities || [];
    const recentActivities = allActivities.slice(0, 10);

    // Mock fitness data (would come from API in production)
    const fitnessData = allActivities.length > 0
        ? Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
            ctl: 40 + Math.random() * 20,
            atl: 30 + Math.random() * 30,
            tsb: -10 + Math.random() * 25,
        }))
        : [];

    // Check for any errors
    const hasError = activitiesError || goalsError || syncError || syncMutation.error;
    const currentVdot = activeGoal?.currentVdot || allActivities[0]?.estimatedVdot || null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
                                <span className="text-xl">🏃</span>
                            </div>
                            <span className="text-xl font-bold text-white">RunFlow</span>
                        </div>

                        {/* User menu */}
                        <div className="flex items-center gap-4">
                            {/* Sync button */}
                            <button
                                type="button"
                                onClick={() => {
                                    console.log('Sync button clicked');
                                    syncMutation.mutate();
                                }}
                                disabled={syncStatus?.syncInProgress || syncMutation.isPending}
                                className="btn-secondary flex items-center gap-2 py-2 px-4 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncStatus?.syncInProgress || syncMutation.isPending
                                    ? 'animate-spin'
                                    : ''
                                    }`} />
                                {syncMutation.isPending ? 'Starting...' : syncStatus?.syncInProgress ? 'Syncing...' : 'Sync'}
                            </button>

                            {/* Settings */}
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <Settings className="w-5 h-5" />
                            </button>

                            {/* User avatar */}
                            <div className="flex items-center gap-3">
                                {session?.user?.image && (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || 'User'}
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('Sign out clicked');
                                        signOut({ callbackUrl: '/login' });
                                    }}
                                    className="p-2 text-gray-400 hover:text-white transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Error banner */}
            {hasError && (
                <div className="bg-red-500/10 border-b border-red-500/20 py-3 px-4">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">
                            {syncMutation.error?.message || activitiesError?.message || goalsError?.message || syncError?.message || 'An error occurred'}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                queryClient.invalidateQueries();
                                syncMutation.reset();
                            }}
                            className="ml-auto text-sm underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome message */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'Runner'}! 👋
                    </h1>
                    <p className="text-gray-400">
                        {syncStatus?.totalActivities
                            ? `${syncStatus.totalActivities} activities synced`
                            : 'Sync your Strava activities to get started'
                        }
                    </p>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column - Today's workout */}
                    <div className="lg:col-span-1">
                        <TodayWorkout
                            workout={todayWorkout}
                            onStart={() => console.log('Starting workout')}
                        />
                    </div>

                    {/* Middle column - Race countdown */}
                    <div className="lg:col-span-1">
                        <RaceCountdown
                            goal={activeGoal}
                            weeklyMileage={25.5} // Would be calculated from activities
                        />
                    </div>

                    {/* Right column - Quick stats */}
                    <div className="lg:col-span-1 flex flex-col justify-center">
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-gray-300 mb-4">Training Status</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="text-center">
                                    <p className="text-4xl font-bold text-white mb-1">
                                        {currentVdot?.toFixed(1) || '-'}
                                    </p>
                                    <p className="text-sm text-gray-400">Current VDOT</p>
                                    {/* Feature: Estimate VDOT if missing */}
                                    {!currentVdot && (
                                        <button
                                            onClick={() => router.push('/onboarding?step=3')}
                                            className="text-xs text-accent-orange mt-2 hover:underline"
                                        >
                                            Set Race Goal to Estimate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {allActivities.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Performance Analytics</h2>
                        <AnalyticsDashboard
                            activities={allActivities}
                            currentVdot={currentVdot}
                        />
                    </div>
                )}

                {/* Fitness chart */}
                <div className="mt-8">
                    <FitnessChart data={fitnessData} isLoading={activitiesLoading} />
                </div>

                {/* Activity history */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Recent Activities</h2>
                        <button
                            type="button"
                            onClick={() => router.push('/activities')}
                            className="btn-secondary py-2 px-4"
                        >
                            View All
                        </button>
                    </div>
                    <ActivityList
                        activities={recentActivities}
                        isLoading={activitiesLoading}
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-12 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
                    <PoweredByStravaLogo className="h-4" />
                    <p className="text-gray-500 text-xs">
                        RunFlow • Built with ❤️ for runners
                    </p>
                </div>
            </footer>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
