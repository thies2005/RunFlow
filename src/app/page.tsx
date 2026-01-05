'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { TodayWorkout, RaceCountdown, ActivityList, FitnessChart } from '@/components';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();

    // Fetch activities
    const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
        queryKey: ['activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=10');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch goals
    const { data: goalsData, isLoading: goalsLoading } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch sync status
    const { data: syncStatus, isLoading: syncLoading } = useQuery({
        queryKey: ['sync-status'],
        queryFn: async () => {
            const res = await fetch('/api/sync');
            if (!res.ok) throw new Error('Failed to fetch sync status');
            return res.json() as Promise<{ syncInProgress: boolean; lastSyncAt: string | null; totalActivities: number }>;
        },
        enabled: status === 'authenticated',
        refetchInterval: (query) => query.state.data?.syncInProgress ? 2000 : false,
    });

    // Sync mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to start sync');
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
            <div className="min-h-screen flex items-center justify-center">
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

    const activeGoal = goalsData?.goals?.find((g: any) => g.isActive);
    const todayWorkout = activeGoal?.workouts?.[0] || null;

    // Mock fitness data (would come from API in production)
    const fitnessData = activitiesData?.activities?.length > 0
        ? Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
            ctl: 40 + Math.random() * 20,
            atl: 30 + Math.random() * 30,
            tsb: -10 + Math.random() * 25,
        }))
        : [];

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
                                onClick={() => syncMutation.mutate()}
                                disabled={syncStatus?.syncInProgress || syncMutation.isPending}
                                className="btn-secondary flex items-center gap-2 py-2 px-4"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncStatus?.syncInProgress || syncMutation.isPending
                                    ? 'animate-spin'
                                    : ''
                                    }`} />
                                {syncStatus?.syncInProgress ? 'Syncing...' : 'Sync'}
                            </button>

                            {/* Settings */}
                            <button className="p-2 text-gray-400 hover:text-white transition-colors">
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
                                    onClick={() => signOut()}
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
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
                            <h2 className="text-lg font-semibold text-gray-300 mb-4">
                                This Week
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-4 text-center">
                                    <p className="stat-value-accent text-3xl font-bold">
                                        {activitiesData?.activities?.slice(0, 7)
                                            .reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / 1000 || 0
                                        }
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">km</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <p className="stat-value text-3xl font-bold">
                                        {activitiesData?.activities?.slice(0, 7).length || 0}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">activities</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fitness chart */}
                <div className="mt-6">
                    <FitnessChart data={fitnessData} isLoading={activitiesLoading} />
                </div>

                {/* Activity history */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Recent Activities</h2>
                        <button className="btn-secondary py-2 px-4">View All</button>
                    </div>
                    <ActivityList
                        activities={activitiesData?.activities || []}
                        isLoading={activitiesLoading}
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-12 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-gray-500 text-sm">
                        RunFlow • Powered by Strava • Built with ❤️ for runners
                    </p>
                </div>
            </footer>
        </div>
    );
}
