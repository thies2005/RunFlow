'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw, AlertCircle, BarChart3, Hand, Target } from 'lucide-react';
import { Session } from 'next-auth';
import { UseMutationResult } from '@tanstack/react-query';
import { RaceCountdown, ActivityList, Footer, UserMenu, UserAvatar } from '@/components';
import TrainingStatusCard from '@/components/dashboard/TrainingStatusCard';
import WorkoutScheduleCard from '@/components/dashboard/WorkoutScheduleCard';
import { UserMetricsProvider } from '@/components/providers/UserMetricsProvider';
import type { Workout, Goal, ActivityListItem } from '@/lib/types';

interface DashboardViewProps {
    session: Session | null;
    statsData: any;
    recentActivities: ActivityListItem[];
    activeGoal: Goal | undefined;
    weeklyWorkouts: Workout[];
    syncStatus: any;
    syncMutation: UseMutationResult<any, Error, void, unknown>;
    isLoading: boolean;
    error: Error | null;
    onOpenSettings: () => void;
    onOpenProfile: () => void;
    onEditWorkout: (_workout: Workout, _complete?: boolean) => void;
    onInvalidateQueries: () => void;
    showHeader?: boolean;
}

export function DashboardView({
    session,
    statsData,
    recentActivities,
    activeGoal,
    weeklyWorkouts,
    syncStatus,
    syncMutation,
    isLoading,
    error,
    onOpenSettings,
    onOpenProfile,
    onEditWorkout,
    onInvalidateQueries,
    showHeader = true,
}: DashboardViewProps) {
    const router = useRouter();
    const hasError = error || syncMutation.error;

    return (
        <div className="min-h-screen bg-background">
            <UserMetricsProvider stats={statsData}>
                {showHeader && (
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
                                    <div className="flex items-center gap-3">
                                        <UserMenu
                                            onOpenProfile={onOpenProfile}
                                            onOpenSettings={onOpenSettings}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {hasError && (
                    <div className="bg-red-500/10 border-b border-red-500/20 py-3 px-4">
                        <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">
                                {syncMutation.error?.message || error?.message || 'An error occurred'}
                            </span>
                            <button onClick={() => { onInvalidateQueries(); syncMutation.reset(); }} className="ml-auto text-sm underline hover:no-underline">
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <span className="hidden sm:inline">Welcome back, {session?.user?.name?.split(' ')[0] || 'Runner'}!</span>
                                <span className="sm:hidden">Welcome back!</span>
                                <Hand className="w-8 h-8 text-accent-orange" />
                            </h1>
                            <div className="sm:hidden">
                                <UserMenu
                                    onOpenProfile={onOpenProfile}
                                    onOpenSettings={onOpenSettings}
                                    trigger={
                                        <div className="rounded-full border border-glass-border">
                                            <UserAvatar
                                                image={session?.user?.image}
                                                name={session?.user?.name}
                                                className="w-10 h-10"
                                            />
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                        <p className="text-gray-400">
                            {syncStatus?.totalActivities ? `${syncStatus.totalActivities} activities synced` : 'Sync your Strava activities to get started'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                        <div className="lg:col-span-1">
                            <WorkoutScheduleCard
                                weeklyWorkouts={weeklyWorkouts}
                                today={new Date().toDateString()}
                                onEditWorkout={(w) => onEditWorkout(w, false)}
                                onCompleteWorkout={(w) => onEditWorkout(w, true)}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            {activeGoal ? (
                                <RaceCountdown
                                    goal={activeGoal}
                                    className="h-full"
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
                        <ActivityList
                            activities={recentActivities}
                            isLoading={isLoading}
                            userHrMax={statsData?.hrMax || 185}
                            vdotCorrectionFactor={statsData?.vdotCorrectionFactor || 1.0}
                        />
                    </div>
                </main>

                {showHeader && <Footer />}
            </UserMetricsProvider>
        </div>
    );
}

export default DashboardView;
