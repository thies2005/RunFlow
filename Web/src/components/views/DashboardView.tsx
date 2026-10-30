'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw, AlertCircle, BarChart3, Hand, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { UseMutationResult } from '@tanstack/react-query';
import { RaceCountdown, ActivityList, Footer, MinimalistPillsMenu, UserAvatar } from '@/components';
import * as TrainingStatusCardModule from '@/components/dashboard/TrainingStatusCard';
import TrainingStatusCard, { readDashboardLayoutMode, EVENT_DASHBOARD_LAYOUT_CHANGE, type DashboardStatusLayoutMode } from '@/components/dashboard/TrainingStatusCard';
import WorkoutScheduleCard from '@/components/dashboard/WorkoutScheduleCard';
import { UserMetricsProvider } from '@/components/providers/UserMetricsProvider';
import type { Workout, Goal, ActivityListItem, AnalyticsStats, SuggestedRaceActivity } from '@/lib/types';
import RaceResultModal from '@/components/RaceResultModal';

interface DashboardViewProps {
    session: Session | null;
    statsData: AnalyticsStats | null;
    recentActivities: ActivityListItem[];
    activeGoal: Goal | undefined;
    incompleteGoal?: Goal | null;
    weeklyWorkouts: Workout[];
    syncStatus: { totalActivities?: number; syncInProgress?: boolean } | null;
    syncMutation: UseMutationResult<any, Error, void, unknown>;
    isLoading: boolean;
    error: Error | null;
    onOpenSettings: () => void;
    onOpenProfile: () => void;
    onEditWorkout: (_workout: Workout, _complete?: boolean) => void;
    onInvalidateQueries: () => void;
    showHeader?: boolean;
}

function hydrateUiPreferencesFromServer(prefs: any) {
    if (typeof (TrainingStatusCardModule as any).hydrateUiPreferencesFromServer === 'function') {
        (TrainingStatusCardModule as any).hydrateUiPreferencesFromServer(prefs);
        return;
    }
    if (!prefs || typeof prefs !== 'object' || typeof window === 'undefined') return;
    try {
        if (prefs.countdownStyle) localStorage.setItem('runflow_countdown_style_v1', prefs.countdownStyle);
        if (prefs.effortCardMode) localStorage.setItem('runflow_effort_card_mode_v1', prefs.effortCardMode);
        if (prefs.calendarWeeksMode) localStorage.setItem('runflow_calendar_weeks_v1', prefs.calendarWeeksMode);
        if (prefs.workoutCardStyle) localStorage.setItem('runflow_workout_card_style_v1', prefs.workoutCardStyle);
        if (prefs.primaryLoadMetric) localStorage.setItem('runflow_load_metric_v1', prefs.primaryLoadMetric);
        window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
    } catch {}
}

export function DashboardView({
    session,
    statsData,
    recentActivities,
    activeGoal,
    incompleteGoal,
    weeklyWorkouts,
    syncStatus,
    syncMutation,
    isLoading,
    error,
    onOpenSettings: _onOpenSettings,
    onOpenProfile: _onOpenProfile,
    onEditWorkout,
    onInvalidateQueries,
    showHeader = true,
}: DashboardViewProps) {
    const router = useRouter();
    const hasError = error || syncMutation.error;
    const [raceResultModal, setRaceResultModal] = useState<{
        goal: Goal;
        suggestedActivity: SuggestedRaceActivity | null;
        mode: 'suggest' | 'review' | 'pick';
    } | null>(null);

    const planTileGoal: Goal | null = activeGoal || incompleteGoal || null;
    const [hideNoPlanReminder, setHideNoPlanReminder] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('runflow_hide_no_plan_prompt') === 'true';
    });
    const [dashboardLayoutMode, setDashboardLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');

    useEffect(() => {
        setDashboardLayoutMode(readDashboardLayoutMode());
        const syncNoPlanPref = () => {
            setHideNoPlanReminder(localStorage.getItem('runflow_hide_no_plan_prompt') === 'true');
            setDashboardLayoutMode(readDashboardLayoutMode());
        };
        window.addEventListener('runflow-plan-reminder-change', syncNoPlanPref);
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncNoPlanPref);
        window.addEventListener('storage', syncNoPlanPref);
        return () => {
            window.removeEventListener('runflow-plan-reminder-change', syncNoPlanPref);
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncNoPlanPref);
            window.removeEventListener('storage', syncNoPlanPref);
        };
    }, []);

    useEffect(() => {
        if (statsData && (statsData as any).uiPreferences) {
            hydrateUiPreferencesFromServer((statsData as any).uiPreferences);
        }
    }, [statsData]);

    return (
        <div className="min-h-screen bg-background">
            <UserMetricsProvider stats={statsData}>
                {showHeader && (
                    <header className="topbar sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src="/icons/app-icon-192.png"
                                        alt="RunFlow"
                                        width={40}
                                        height={40}
                                        className="rounded-md"
                                    />
                                    <span className="text-xl brand">Run<span>Flow</span></span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button onClick={() => router.push('/analytics')} className="topbar-btn flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5" />
                                        <span className="hidden sm:inline">Analytics</span>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <MinimalistPillsMenu />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {hasError && (
                    <div className="bg-accent-pink/10 border-b border-accent-pink/20 py-3 px-4">
                        <div className="max-w-7xl mx-auto flex items-center gap-2 text-accent-pink">
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
                                <MinimalistPillsMenu
                                    trigger={
                                        <div className="rounded-full border border-line">
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
                        <p className="text-foreground-muted">
                            {syncStatus?.totalActivities ? `${syncStatus.totalActivities} activities synced` : 'Sync your Strava activities to get started'}
                        </p>
                    </div>

                    {(() => {
                        const showWorkoutsCard = weeklyWorkouts.length > 0;
                        const showPlanCard = isLoading || Boolean(activeGoal) || Boolean(planTileGoal) || !hideNoPlanReminder;
                        const isDualBoxes = dashboardLayoutMode === 'DUAL_BOXES';
                        const visibleCount = (showWorkoutsCard ? 1 : 0) + (showPlanCard ? 1 : 0) + (isDualBoxes ? 2 : 1);
                        const gridColsClass =
                            visibleCount >= 4
                                ? 'md:grid-cols-2 xl:grid-cols-4'
                                : visibleCount === 3
                                ? 'md:grid-cols-2 lg:grid-cols-3'
                                : visibleCount === 2
                                ? 'md:grid-cols-2 lg:grid-cols-2'
                                : 'grid-cols-1';

                        return (
                            <div className={`grid grid-cols-1 ${gridColsClass} gap-6 items-stretch`}>
                                {showWorkoutsCard && (
                                    <div className="lg:col-span-1">
                                        <WorkoutScheduleCard
                                            weeklyWorkouts={weeklyWorkouts}
                                            today={new Date().toDateString()}
                                            onEditWorkout={(w) => onEditWorkout(w, false)}
                                            onCompleteWorkout={(w) => onEditWorkout(w, true)}
                                        />
                                    </div>
                                )}
                                {showPlanCard && (
                                    <div className="lg:col-span-1">
                                        {isLoading ? (
                                            <div className="h-full flex flex-col items-center justify-center glass-card p-8 min-h-[300px]">
                                                <div className="w-8 h-8 rounded-full border-4 border-accent-orange border-t-transparent animate-spin mb-4"></div>
                                                <p className="text-foreground-muted text-sm">Loading plan...</p>
                                            </div>
                                        ) : activeGoal ? (
                                            <RaceCountdown
                                                goal={activeGoal}
                                                weeklyWorkouts={weeklyWorkouts}
                                                statsData={statsData}
                                                className="h-full"
                                                onSelectRace={(goal, activity, mode) => {
                                                    setRaceResultModal({
                                                        goal,
                                                        suggestedActivity: activity,
                                                        mode,
                                                    });
                                                }}
                                            />
                                        ) : planTileGoal ? (
                                            <RaceCountdown
                                                goal={planTileGoal}
                                                weeklyWorkouts={weeklyWorkouts}
                                                statsData={statsData}
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
                                            <div className="h-full flex flex-col items-center justify-center glass-card p-8 text-center">
                                                <div className="w-16 h-16 rounded-full bg-accent-orange/10 flex items-center justify-center mb-4">
                                                    <Target className="w-8 h-8 text-accent-orange" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-foreground mb-2">No Active Training Plan</h3>
                                                <p className="text-foreground-muted mb-6 text-sm">
                                                    You don&apos;t have an active training plan yet. Create one when you&apos;re ready to start training!
                                                </p>
                                                <div className="flex flex-wrap items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => router.push('/onboarding?step=4')}
                                                        className="btn-primary py-2 px-6"
                                                    >
                                                        Create Training Plan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            localStorage.setItem('runflow_hide_no_plan_prompt', 'true');
                                                            setHideNoPlanReminder(true);
                                                            window.dispatchEvent(new Event('runflow-plan-reminder-change'));
                                                        }}
                                                        className="px-4 py-2 rounded-md text-xs font-medium border border-line text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                                                    >
                                                        Hide Reminder
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-foreground-muted mt-3">
                                                    You can always create or reopen a plan from your Profile menu → Training Plan.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={`${isDualBoxes ? 'md:col-span-2 lg:col-span-2' : 'lg:col-span-1'} h-full flex flex-col`}>
                                    <TrainingStatusCard />
                                </div>
                            </div>
                        );
                    })()}

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

            {raceResultModal && (
                <RaceResultModal
                    isOpen={!!raceResultModal}
                    onClose={() => setRaceResultModal(null)}
                    goal={raceResultModal.goal}
                    suggestedActivity={raceResultModal.suggestedActivity}
                    initialMode={raceResultModal.mode}
                />
            )}
        </div>
    );
}

export default DashboardView;
