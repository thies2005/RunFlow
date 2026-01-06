'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, LogOut, AlertCircle, Edit2, Check } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { TodayWorkout, RaceCountdown, ActivityList, SettingsModal, PoweredByStravaLogo } from '@/components';
import EditWorkoutModal from '@/components/EditWorkoutModal';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);

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
    const weeklyWorkouts = activeGoal?.workouts || [];

    // Stats from Server
    const currentWeekMileage = statsData?.currentWeekMileage || 0;
    const effectiveVO2max = statsData?.effectiveVO2max || 0;
    const marathonShape = statsData?.marathonShape || { shape: 0, longRunScore: 0, weeklyMileageScore: 0 };
    const currentVdot = statsData?.currentVdot || activeGoal?.currentVdot || null;
    const marathonShapePercent = marathonShape?.shape || 0;
    const ctl = statsData?.ctl || 0;
    const atl = statsData?.atl || 0;
    const tsb = statsData?.tsb || 0;
    const workloadRatio = statsData?.workloadRatio || 0;
    const easyTrimp = statsData?.easyTrimp || 0;

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
        router.push('/login');
        return null;
    }

    // Onboarding Redirect
    if (status === 'authenticated' && syncStatus && syncStatus.totalActivities === 0 && !syncStatus.syncInProgress && !activitiesLoading) {
        router.push('/onboarding');
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 h-full flex flex-col">
                            <h2 className="text-lg font-semibold text-gray-300 mb-4">This Week's Workouts</h2>
                            {weeklyWorkouts.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {weeklyWorkouts.map((workout: any, index: number) => (
                                        <div key={workout.id || index} className={`p-3 rounded-lg border transition-all ${workout.isCompleted ? 'bg-green-500/5 border-green-500/20' : index === 0 ? 'bg-accent-orange/10 border-accent-orange/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workout.isCompleted ? 'bg-green-500/20' : index === 0 ? 'bg-accent-orange/20' : 'bg-white/10'}`}>
                                                        <span className="text-sm">{workout.workoutType === 'EASY' ? '🏃' : workout.workoutType === 'LONG_RUN' ? '🚀' : workout.workoutType === 'TEMPO' ? '⚡' : workout.workoutType === 'INTERVALS' ? '🔥' : workout.workoutType === 'STRENGTH' ? '💪' : workout.workoutType === 'REST' ? '😴' : workout.workoutType === 'RIDE' ? '🚴' : workout.workoutType === 'SWIM' ? '🏊' : '🎯'}</span>
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium ${workout.isCompleted ? 'text-green-400' : index === 0 ? 'text-accent-orange' : 'text-white'}`}>
                                                            {workout.description || workout.workoutType?.replace('_', ' ')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {workout.targetDistance ? `${(workout.targetDistance / 1000).toFixed(1)} km` : workout.targetDuration ? `${Math.round(workout.targetDuration / 60)} min` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!workout.isCompleted && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingWorkout(workout)}
                                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                                title="Edit workout"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => completeWorkoutMutation.mutate(workout.id)}
                                                                disabled={completeWorkoutMutation.isPending}
                                                                className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                {completeWorkoutMutation.isPending ? '...' : 'Done'}
                                                            </button>
                                                        </>
                                                    )}
                                                    {workout.isCompleted && (
                                                        <span className="text-green-400 text-xs flex items-center gap-1">
                                                            <Check className="w-3 h-3" /> Done
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-gray-500 text-sm">No workouts scheduled</p>
                                    <button onClick={() => router.push('/onboarding?step=3')} className="text-xs text-accent-orange mt-2 hover:underline">
                                        Set up a training plan
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <RaceCountdown goal={activeGoal} weeklyMileage={currentWeekMileage} className="h-full" />
                    </div>
                    <div className="lg:col-span-1 h-full flex flex-col">
                        <div className="glass-card p-6 h-full flex flex-col justify-center">
                            <h2 className="text-lg font-semibold text-gray-300 mb-4">Training Status</h2>

                            {/* Metrics List (Runalyze Style) */}
                            <div className="space-y-3">
                                {/* Effective VO2max */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Effective VO2max</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, ((effectiveVO2max - 30) / 40) * 100))}%` }} />
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-teal-400">
                                        {effectiveVO2max > 0 ? effectiveVO2max.toFixed(1) : '-'}
                                    </div>
                                </div>

                                {/* Marathon Shape */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Marathon Shape</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, marathonShapePercent)}%` }} />
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-green-400">
                                        {marathonShapePercent > 0 ? `${marathonShapePercent}%` : '-'}
                                    </div>
                                </div>

                                {/* Fatigue (ATL) */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Fatigue (ATL)</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, atl)}%` }} />
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-red-400">
                                        {atl > 0 ? `${atl}%` : '-'}
                                    </div>
                                </div>

                                {/* Fitness (CTL) */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Fitness (CTL)</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, ctl)}%` }} />
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-blue-400">
                                        {ctl > 0 ? `${ctl}%` : '-'}
                                    </div>
                                </div>

                                {/* Stress Balance (TSB) */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Stress Balance</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden relative">
                                        <div className="absolute left-1/2 w-0.5 h-full bg-gray-600" />
                                        <div
                                            className={`h-full ${tsb >= 0 ? 'bg-green-500' : 'bg-orange-500'} rounded-full absolute`}
                                            style={{
                                                width: `${Math.min(50, Math.abs(tsb))}%`,
                                                left: tsb >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(tsb))}%`
                                            }}
                                        />
                                    </div>
                                    <div className={`w-12 text-right text-sm font-bold ${tsb >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                                        {tsb >= 0 ? `+${tsb}` : tsb}
                                    </div>
                                </div>

                                {/* Workload Ratio */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Workload Ratio</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${workloadRatio >= 0.8 && workloadRatio <= 1.3 ? 'bg-green-500' : workloadRatio > 1.5 ? 'bg-red-500' : 'bg-yellow-500'}`}
                                            style={{ width: `${Math.min(100, workloadRatio * 50)}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-yellow-400">
                                        {workloadRatio > 0 ? workloadRatio.toFixed(2) : '-'}
                                    </div>
                                </div>

                                {/* Easy TRIMP */}
                                <div className="flex items-center gap-3">
                                    <div className="w-28 text-xs text-gray-400 truncate">Weekly TRIMP</div>
                                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, easyTrimp / 5)}%` }} />
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-purple-400">
                                        {easyTrimp > 0 ? easyTrimp : '-'}
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                </div>



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

            <EditWorkoutModal
                isOpen={!!editingWorkout}
                onClose={() => setEditingWorkout(null)}
                workout={editingWorkout}
                goalId={activeGoal?.id}
            />
        </div>
    );
}
