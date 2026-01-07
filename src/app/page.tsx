'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, LogOut, AlertCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { RaceCountdown, ActivityList, SettingsModal, PoweredByStravaLogo } from '@/components';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import ProfileModal from '@/components/ProfileModal';
import TrainingStatusCard from '@/components/dashboard/TrainingStatusCard';
import WorkoutScheduleCard from '@/components/dashboard/WorkoutScheduleCard';
import { UserMetricsProvider } from '@/components/providers/UserMetricsProvider';
import type { Workout, Goal } from '@/lib/types';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

    // 1. Unified Dashboard Query
    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['dashboard-data'],
        queryFn: async () => {
            const res = await fetch('/api/dashboard');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load dashboard');
            }
            return res.json();
        },
        enabled: status === 'authenticated',
        refetchInterval: (query) => query.state.data?.syncStatus?.syncInProgress ? 2000 : false,
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', { method: 'POST' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (errorData.details) {
                    throw new Error(`${errorData.error}: ${errorData.details}`);
                }
                throw new Error(errorData.error || 'Failed to start sync');
            }
            return res.json();
        },
        onSuccess: () => {
            // Invalidate the unified query
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        },
    });

    // Data extraction with safe defaults
    const statsData = dashboardData?.stats;
    const recentActivities = dashboardData?.recentActivities?.activities || [];
    const goalsList = dashboardData?.goals?.goals || [];
    const syncStatus = dashboardData?.syncStatus;

    // Find active goal
    const activeGoal: Goal | undefined = goalsList.find((g: Goal) => g.isActive);
    const weeklyWorkouts: Workout[] = activeGoal?.workouts || [];

    const today = new Date().toDateString();

    // Stats from Server
    const currentWeekMileage = statsData?.currentWeekMileage || 0;
    const effectiveVO2max = statsData?.effectiveVO2max || 0;
    const correctionFactor = statsData?.vdotCorrectionFactor || 1.0;
    const marathonShape = statsData?.marathonShape || { shape: 0, longRunScore: 0, weeklyMileageScore: 0 };
    const ctl = statsData?.ctl || 0;
    const atl = statsData?.atl || 0;
    const tsb = statsData?.tsb || 0;
    const workloadRatio = statsData?.workloadRatio || 0;
    const easyTrimp = statsData?.easyTrimp || 0;
    const userHrMax = statsData?.hrMax || 185;


    // Loading State
    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    // Auth Redirects
    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    // Onboarding Redirect (Check sync status from unified response)
    if (status === 'authenticated' && syncStatus && syncStatus.totalActivities === 0 && !syncStatus.syncInProgress) {
        router.push('/onboarding');
        return null;
    }

    const hasError = error || syncMutation.error;

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
                                    <button onClick={() => setIsProfileOpen(true)} className="relative group">
                                        <img
                                            src={session.user.image}
                                            alt={session.user.name || 'User'}
                                            className="w-8 h-8 rounded-full border border-transparent group-hover:border-white transition-all cursor-pointer"
                                        />
                                        <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
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
                            {syncMutation.error?.message || error?.message || 'An error occurred'}
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <UserMetricsProvider stats={statsData}>
                        <div className="lg:col-span-1">
                            <WorkoutScheduleCard
                                weeklyWorkouts={weeklyWorkouts}
                                today={today}
                                onEditWorkout={setEditingWorkout}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <RaceCountdown
                                goal={activeGoal ?? null}
                                className="h-full"
                            />
                        </div>
                        <div className="lg:col-span-1 h-full flex flex-col">
                            <TrainingStatusCard />
                        </div>
                    </UserMetricsProvider>
                </div>

                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Recent Activities</h2>
                        <button onClick={() => router.push('/activities')} className="btn-secondary py-2 px-4">
                            View All
                        </button>
                    </div>
                    <ActivityList activities={recentActivities} isLoading={isLoading} userHrMax={userHrMax} />
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
            />

            <EditWorkoutModal
                isOpen={!!editingWorkout}
                onClose={() => setEditingWorkout(null)}
                workout={editingWorkout}
                goalId={activeGoal?.id}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
}
