'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, LogOut, AlertCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { TodayWorkout, RaceCountdown, ActivityList, AnalyticsDashboard, SettingsModal, PoweredByStravaLogo } from '@/components';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // 1. Fetch Stats (Server-calculated)
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // 2. Fetch Recent Activities (Limit 10)
    const { data: activitiesData, isLoading: activitiesLoading, error: activitiesError } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: async () => {
            // Only fetch runs, limited to 10
            const res = await fetch('/api/activities?limit=10&type=RUN');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch activities');
            }
            return res.json();
        },
        enabled: status === 'authenticated',
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
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['sync-status'] });
        },
    });

    const completeWorkoutMutation = useMutation({
        mutationFn: async (workoutId: string) => {
            const res = await fetch(`/api/workouts/${workoutId}/complete`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to complete workout');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
    });

    // Data extraction
    const recentActivities = activitiesData?.activities || [];
    const activeGoal = goalsData?.goals?.find((g: any) => g.isActive);
    const todayWorkout = activeGoal?.workouts?.[0] || null;

    // Stats from Server
    const currentWeekMileage = statsData?.currentWeekMileage || 0;
    const effectiveVO2max = statsData?.effectiveVO2max || 0;
    const marathonShape = statsData?.marathonShape || { shape: 0, longRunScore: 0, weeklyMileageScore: 0 };
    const currentVdot = statsData?.currentVdot || activeGoal?.currentVdot || null;

    // Loading State
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    // Auth Redirects
    if (status === 'unauthenticated') {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return null;
    }

    // Onboarding Redirect
    if (status === 'authenticated' && syncStatus && syncStatus.totalActivities === 0 && !syncStatus.syncInProgress && !activitiesLoading) {
        if (typeof window !== 'undefined') router.push('/onboarding');
        return null;
    }

    const hasError = activitiesError || goalsError || syncError || syncMutation.error;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-white/10 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
                                <span className="text-xl">🏃</span>
                            </div>
                            <span className="text-xl font-bold text-white">RunFlow</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => syncMutation.mutate()}
                                disabled={syncStatus?.syncInProgress || syncMutation.isPending}
                                className="btn-secondary flex items-center gap-2 py-2 px-4 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncStatus?.syncInProgress || syncMutation.isPending ? 'animate-spin' : ''}`} />
                                {syncMutation.isPending ? 'Starting...' : syncStatus?.syncInProgress ? 'Syncing...' : 'Sync'}
                            </button>
                            <button onClick={() => router.push('/analytics')} className="btn-secondary flex items-center gap-2 py-2 px-4">
                                📊 Analytics
                            </button>
                            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <Settings className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                {session?.user?.image && (
                                    <img src={session.user.image} alt={session.user.name || 'User'} className="w-8 h-8 rounded-full" />
                                )}
                                <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {hasError && (
                <div className="bg-red-500/10 border-b border-red-500/20 py-3 px-4">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">
                            {syncMutation.error?.message || activitiesError?.message || goalsError?.message || syncError?.message || 'An error occurred'}
                        </span>
                        <button onClick={() => { queryClient.invalidateQueries(); syncMutation.reset(); }} className="ml-auto text-sm underline hover:no-underline">
                            Retry
                        </button>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'Runner'}! 👋
                    </h1>
                    <p className="text-gray-400">
                        {syncStatus?.totalActivities ? `${syncStatus.totalActivities} activities synced` : 'Sync your Strava activities to get started'}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <TodayWorkout
                            workout={todayWorkout}
                            onComplete={(id) => completeWorkoutMutation.mutate(id)}
                            isLoading={completeWorkoutMutation.isPending}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <RaceCountdown goal={activeGoal} weeklyMileage={currentWeekMileage} />
                    </div>
                    <div className="lg:col-span-1 flex flex-col justify-center">
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-gray-300 mb-4">Training Status</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="text-center">
                                    <p className="text-4xl font-bold text-white mb-1">
                                        {currentVdot ? currentVdot.toFixed(1) : '-'}
                                    </p>
                                    <p className="text-sm text-gray-400">Current VDOT</p>
                                    {!currentVdot && (
                                        <button onClick={() => router.push('/onboarding?step=3')} className="text-xs text-accent-orange mt-2 hover:underline">
                                            Set Race Goal to Estimate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Performance Analytics</h2>
                    {/* AnalyticsDashboard now fetches its own data, we just pass VDOT context */}
                    <AnalyticsDashboard currentVdot={currentVdot} />
                </div>

                {/* NOTE: FitnessChart moved inside AnalyticsDashboard or kept separately? 
                    The design in page.tsx had a separate FitnessChart. 
                    However, AnalyticsDashboard ALSO has a fitness chart now (Fitness Tracking).
                    The old FitnessChart.tsx component is likely redundant or duplicative if AnalyticsDashboard covers it.
                    For cleanup, I'll remove the redundant "Fitness Chart" section here since AnalyticsDashboard includes "Fitness Tracking".
                    The user requested "Refactor AnalyticsDashboard to consume these new APIs", which implies consolidation.
                */}

                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Recent Activities</h2>
                        <button onClick={() => router.push('/activities')} className="btn-secondary py-2 px-4">
                            View All
                        </button>
                    </div>
                    <ActivityList activities={recentActivities} isLoading={activitiesLoading} />
                </div>
            </main>

            <footer className="border-t border-white/10 mt-12 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
                    <PoweredByStravaLogo className="h-4" />
                    <p className="text-gray-500 text-xs">RunFlow • Built with ❤️ for runners</p>
                </div>
            </footer>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                effectiveVO2max={effectiveVO2max}
                shapePercent={marathonShape.shape}
            />
        </div>
    );
}
