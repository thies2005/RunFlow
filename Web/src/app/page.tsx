'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, BarChart3, MessageSquare, Hand, Heart, Target } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { RaceCountdown, ActivityList, SettingsModal, Footer, MinimalistPillsMenu, PullToRefresh } from '@/components';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import ProfileModal from '@/components/ProfileModal';
import RaceResultModal from '@/components/RaceResultModal';
import TrainingStatusCard from '@/components/dashboard/TrainingStatusCard';
import WorkoutScheduleCard from '@/components/dashboard/WorkoutScheduleCard';
import { UserMetricsProvider } from '@/components/providers/UserMetricsProvider';
import type { Workout, Goal } from '@/lib/types';
import type { SuggestedRaceActivity } from '@/lib/types';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
    const [initialComplete, setInitialComplete] = useState(false);
    const [sessionTimedOut, setSessionTimedOut] = useState(false);
    const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [raceResultModal, setRaceResultModal] = useState<{
        goal: Goal;
        suggestedActivity: SuggestedRaceActivity | null;
        mode: 'suggest' | 'review' | 'pick';
    } | null>(null);

    // 1. Unified Dashboard Query
    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['dashboard-data'],
        queryFn: async () => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const res = await fetch(`/api/dashboard?date=${todayStr}`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load dashboard');
            }
            return res.json();
        },
        enabled: status === 'authenticated',
        refetchInterval: (query) => query.state.data?.syncStatus?.syncInProgress ? 2000 : false,
    });

    // AI Settings Query
    const { data: aiSettingsData } = useQuery({
        queryKey: ['ai-settings'],
        queryFn: async () => {
            const res = await fetch('/api/ai/settings');
            if (!res.ok) throw new Error('Failed to fetch AI settings');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const showAiCoach = aiSettingsData?.settings?.adminAllowed;

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
    const incompleteGoal: Goal | null = dashboardData?.incompleteGoal || null;
    const planTileGoal: Goal | null = activeGoal || incompleteGoal;
    const weeklyWorkouts: Workout[] = activeGoal?.workouts || [];

    const today = new Date().toDateString();

    // Stats from Server
    const correctionFactor = statsData?.vdotCorrectionFactor || 1.0;
    const userHrMax = statsData?.hrMax || 185;


    // Loading State
    useEffect(() => {
        if (status === 'loading') {
            sessionTimerRef.current = setTimeout(() => {
                setSessionTimedOut(true);
            }, 10000);
        }
        return () => {
            if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
        };
    }, [status]);

    if (status === 'loading' && !sessionTimedOut) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    if (status === 'loading' && sessionTimedOut) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center max-w-md px-4">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load session</h2>
                    <p className="text-gray-400 mb-4">The session check is taking too long. This may be a network or database issue.</p>
                    <button onClick={() => { setSessionTimedOut(false); }} className="btn-primary py-2 px-6">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'authenticated' && isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading dashboard...</div>
            </div>
        );
    }

    // Auth Redirects
    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    const hasError = error || syncMutation.error;

    return (
        <div className="min-h-screen bg-background">
            <UserMetricsProvider stats={statsData}>
                <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(); }}>
                    <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src="/icons/app-icon-192.png"
                                        alt="RunFlow"
                                        width={40}
                                        height={40}
                                        className="rounded-xl"
                                    />
                                    <span className="text-xl font-bold text-foreground">RunFlow</span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button onClick={() => router.push('/analytics')} className="btn-secondary text-foreground flex items-center gap-2 py-2 px-3 sm:px-4">
                                        <BarChart3 className="w-5 h-5" />
                                        <span className="hidden sm:inline">Analytics</span>
                                    </button>
                                    {statsData?.healthTrackingEnabled && (
                                        <button onClick={() => router.push('/health')} className="btn-secondary text-foreground flex items-center gap-2 py-2 px-3 sm:px-4">
                                            <Heart className="w-5 h-5" />
                                            <span className="hidden sm:inline">Health</span>
                                        </button>
                                    )}
                                    {showAiCoach && (
                                        <button onClick={() => router.push('/chat')} className="btn-secondary text-foreground flex items-center gap-2 py-2 px-3 sm:px-4">
                                            <MessageSquare className="w-5 h-5" />
                                            <span className="hidden sm:inline">AI Coach</span>
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <MinimalistPillsMenu />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {hasError && (() => {
                        const errMsg = syncMutation.error?.message || error?.message || '';
                        const isAuthError = errMsg.toLowerCase().includes('authenticate') ||
                            errMsg.toLowerCase().includes('token') ||
                            errMsg.includes('400') || errMsg.includes('401');
                        return (
                            <div className="bg-red-500/10 border-b border-red-500/20 py-3 px-4">
                                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 text-red-400">
                                    <div className="flex items-center gap-2 flex-1">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">
                                            {isAuthError ? 'Strava connection lost. Please reconnect to resume syncing.' : (errMsg || 'An error occurred')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isAuthError && (
                                            <button
                                                onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                                                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors font-medium"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                Reconnect Strava
                                            </button>
                                        )}
                                        <button onClick={() => { queryClient.invalidateQueries(); syncMutation.reset(); }} className="text-sm underline hover:no-underline">
                                            {isAuthError ? 'Dismiss' : 'Retry'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                                Welcome back, {session?.user?.name?.split(' ')[0] || 'Runner'}!
                                <Hand className="w-8 h-8 text-accent-orange" />
                            </h1>
                            <p className="text-gray-400">
                                {syncStatus?.totalActivities ? `${syncStatus.totalActivities} activities synced` : 'Sync your Strava activities to get started'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            <div className="lg:col-span-1">
                                <WorkoutScheduleCard
                                    weeklyWorkouts={weeklyWorkouts}
                                    today={today}
                                    onEditWorkout={(w) => {
                                        setEditingWorkout(w);
                                        setInitialComplete(false);
                                    }}
                                    onCompleteWorkout={(w) => {
                                        setEditingWorkout(w);
                                        setInitialComplete(true);
                                    }}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                {planTileGoal ? (
                                    <RaceCountdown
                                        goal={planTileGoal}
                                        className="h-full"
                                        isIncompleteArchived={!activeGoal && !!incompleteGoal}
                                        onSelectRace={(goal, activity, mode) => {
                                            setRaceResultModal({
                                                goal,
                                                suggestedActivity: activity,
                                                mode,
                                            });
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center bg-surface/50 border border-glass-border rounded-xl p-8 text-center">
                                        <div className="w-16 h-16 rounded-full bg-accent-orange/10 flex items-center justify-center mb-4">
                                            <Target className="w-8 h-8 text-accent-orange" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground mb-2">No Active Training Plan</h3>
                                        <p className="text-gray-400 mb-6 text-sm">
                                            You don&apos;t have an active training plan yet. Create one when you&apos;re ready to start training!
                                        </p>
                                        <button
                                            onClick={() => router.push('/onboarding')}
                                            className="btn-primary py-2 px-6"
                                        >
                                            Create Training Plan
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-1 h-full flex flex-col">
                                <TrainingStatusCard />
                            </div>
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-foreground">Recent Activities</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => syncMutation.mutate()}
                                        disabled={syncStatus?.syncInProgress || syncMutation.isPending}
                                        className="btn-secondary flex items-center gap-2 py-2 px-4 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${syncStatus?.syncInProgress || syncMutation.isPending ? 'animate-spin' : ''}`} />
                                        {syncMutation.isPending ? 'Starting...' : syncStatus?.syncInProgress ? 'Syncing...' : 'Sync'}
                                    </button>
                                    <button onClick={() => router.push('/activities')} className="btn-secondary py-2 px-4">
                                        View All
                                    </button>
                                </div>
                            </div>
                            <ActivityList activities={recentActivities} isLoading={isLoading} userHrMax={userHrMax} vdotCorrectionFactor={correctionFactor} />
                        </div>
                    </main>

                    <Footer />
                </PullToRefresh>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                />

                <EditWorkoutModal
                    key={editingWorkout?.id ?? 'new'}
                    isOpen={!!editingWorkout}
                    onClose={() => setEditingWorkout(null)}
                    workout={editingWorkout}
                    goalId={activeGoal?.id}
                    initialComplete={initialComplete}
                />

                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                />

                {raceResultModal && (
                    <RaceResultModal
                        isOpen={!!raceResultModal}
                        onClose={() => setRaceResultModal(null)}
                        goal={raceResultModal.goal}
                        suggestedActivity={raceResultModal.suggestedActivity}
                        initialMode={raceResultModal.mode}
                    />
                )}
            </UserMetricsProvider>
        </div >
    );
}
