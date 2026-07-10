'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import {
    useSensor,
    useSensors,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
} from '@dnd-kit/core';

import { MobileSwipeLayout } from '@/components/navigation';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import type { TimeRange } from '@/components/CombinedAnalyticsChart';
import type { Workout, Goal, ActivityListItem } from '@/lib/types';
import { WorkoutWithLinkedActivity, PlanResponse } from '@/lib/types';
import { Capacitor } from '@capacitor/core';
import { syncLocalNotifications } from '@/lib/mobile/notifications';

const DashboardView = dynamic(() => import('@/components/views/DashboardView'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-background" />,
});
const PlanView = dynamic(() => import('@/components/views/PlanView'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-background" />,
});
const AnalyticsView = dynamic(() => import('@/components/views/AnalyticsView'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-background" />,
});
const CalendarView = dynamic(() => import('@/components/views/CalendarView').then(m => ({ default: m.CalendarView })), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-background" />,
});
const SettingsModal = dynamic(() => import('@/components/SettingsModal'), { ssr: false, loading: () => null });
const EditWorkoutModal = dynamic(() => import('@/components/EditWorkoutModal'), { ssr: false, loading: () => null });
const ProfileModal = dynamic(() => import('@/components/ProfileModal'), { ssr: false, loading: () => null });
const ActivityDetailsModal = dynamic(() => import('@/components/ActivityDetailsModal'), { ssr: false, loading: () => null });
const ShapeCalibrationModal = dynamic(() => import('@/components/ShapeCalibrationModal'), { ssr: false, loading: () => null });

export function MobileLayout() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Modals State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<(Workout | WorkoutWithLinkedActivity) | null>(null);
    const [initialComplete, setInitialComplete] = useState(false);
    const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
    // M-06 fix: Use proper ActivityListItem type (matches ActivityDetailsModal props)
    const [selectedActivity, setSelectedActivity] = useState<ActivityListItem | null>(null);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [activePath, setActivePath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/'));

    // Plan State
    const [showUnlinked, setShowUnlinked] = useState(true);

    // Analytics State
    const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
    const [zonesTimeRange, setZonesTimeRange] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');

    const isPlanPath = activePath === '/plan';
    const isAnalyticsPath = activePath === '/analytics';
    const isCalendarPath = activePath === '/calendar';

    // DnD Sensors for Plan
    // DnD Sensors for Plan
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
        useSensor(KeyboardSensor),
    );

    // === QUERIES ===

    // Dashboard Query
    const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
        queryKey: ['dashboard-data'],
        queryFn: async () => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const res = await fetch(`/api/dashboard?date=${todayStr}`);
            if (!res.ok) throw new Error('Failed to load dashboard');
            return res.json();
        },
        enabled: status === 'authenticated',
        refetchInterval: (query) => query.state.data?.syncStatus?.syncInProgress ? 2000 : false,
    });

    // Plan Query
    const { data: planData, isLoading: isPlanLoading, refetch: refetchPlan } = useQuery<PlanResponse>({
        queryKey: ['plan', showUnlinked],
        queryFn: async () => {
            const url = showUnlinked ? '/api/plan?includeUnlinked=true' : '/api/plan';
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        enabled: status === 'authenticated' && (isPlanPath || !!editingWorkout || !!createDate),
        placeholderData: keepPreviousData
    });

    // Activities Query
    const { data: activitiesData } = useQuery({
        queryKey: ['all-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=500');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated' && (isAnalyticsPath || isCalibrationOpen),
    });

    // User Settings Query
    const { data: userData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch user settings');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Goals Query
    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: status === 'authenticated' && isAnalyticsPath,
    });

    // Analytics Stats Query
    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: status === 'authenticated' && isAnalyticsPath,
    });

    // Determine if Health should be shown
    const showHealth = userData?.healthTrackingEnabled === true;
    void showHealth; // Health tab temporarily hidden from nav; retained for re-enable

    // Analytics History Query
    const { data: historyData } = useQuery({
        queryKey: ['analytics-history', timeRange],
        queryFn: async () => {
            const rangeMap: Record<string, string> = {
                'ALL': 'ALL',
                '1Y': '1_YEAR',
                '6M': '6_MONTHS',
                '3M': '12_WEEKS',
                '1M': '4_WEEKS'
            };
            const res = await fetch(`/api/analytics/history?range=${rangeMap[timeRange] || '1_YEAR'}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: status === 'authenticated' && isAnalyticsPath,
    });

    // Background Sync for Native Mobile Notifications
    // Whenever the mobile layout mounts and auth is ready, fetch reminder settings to ensure alarms are in sync
    useEffect(() => {
        if (Capacitor.isNativePlatform() && status === 'authenticated') {
            const syncMobileNotifications = async () => {
                try {
                    const response = await fetch('/api/reminders/settings');
                    if (response.ok) {
                        const settings = await response.json();
                        await syncLocalNotifications(settings);
                    }
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        console.error('Failed to sync mobile notifications:', err.message);
                    } else {
                        console.error('Failed to sync mobile notifications:', err);
                    }
                }
            };
            syncMobileNotifications();

            // We could optionally listen for Capacitor 'appStateChange' here
            // to re-sync every time the app comes to foreground.
        }
    }, [status]);

    // === MUTATIONS ===

    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to start sync');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-data'] }),
    });

    const reorderMutation = useMutation({
        mutationFn: async ({ workoutId, newDate }: { workoutId: string; newDate: string }) => {
            const res = await fetch('/api/workouts/reorder', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workoutId, newDate }),
            });
            if (!res.ok) throw new Error('Failed to reorder');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
    });

    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/recalculate-vdot', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to recalculate');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-activities'] }),
    });

    // === DERIVED DATA ===

    const dashboardStats = dashboardData?.stats;
    const recentActivities = dashboardData?.recentActivities?.activities || [];
    const goalsList = dashboardData?.goals?.goals || [];
    const activeGoal: Goal | undefined = goalsList.find((g: Goal) => g.isActive);
    const incompleteGoal: Goal | null = dashboardData?.incompleteGoal || null;
    const weeklyWorkouts: Workout[] = activeGoal?.workouts || [];
    const syncStatus = dashboardData?.syncStatus;

    // Analytics calculated data
    const analyticsMetrics = useAnalyticsMetrics(
        isAnalyticsPath ? activitiesData : undefined,
        isAnalyticsPath ? goalsData : undefined,
        isAnalyticsPath ? statsData : undefined,
        isAnalyticsPath ? historyData : undefined,
        isAnalyticsPath ? userData : undefined
    );

    // === HANDLERS ===

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active) {
            const workoutId = active.id as string;
            const overId = over.id as string;
            if (overId.startsWith('day-')) {
                const newDate = overId.replace('day-', '');
                const currentWorkout = planData?.goal?.workouts?.find((w: WorkoutWithLinkedActivity) => w.id === workoutId);
                if (currentWorkout) {
                    if (!isSameDay(new Date(currentWorkout.scheduledDate), new Date(newDate))) {
                        reorderMutation.mutate({ workoutId, newDate });
                    }
                }
            }
        }
    }, [planData, reorderMutation]);

    const handleEditWorkout = useCallback((workout: Workout | WorkoutWithLinkedActivity, complete: boolean = false) => {
        setEditingWorkout(workout);
        setCreateDate(undefined);
        setInitialComplete(complete);
    }, []);

    const handleCreateWorkout = useCallback((date: Date) => {
        setEditingWorkout(null);
        setCreateDate(date);
    }, []);

    const handleActivityClick = useCallback((activity: ActivityListItem, e?: React.MouseEvent) => {
        e?.stopPropagation?.();
        // M-06 fix: UnlinkedActivity is a subset of ActivityListItem, safe to cast for modal display
        setSelectedActivity(activity as unknown as ActivityListItem);
        setIsActivityModalOpen(true);
    }, []);

    // === AUTH GUARDS ===
    // Redirects must run in an effect — calling router.push() during render
    // triggers a "Cannot update a component while rendering a different
    // component" error (Router state update inside MobileLayout render).
    const shouldRedirectToLogin = status === 'unauthenticated';
    const shouldRedirectToOnboarding =
        status === 'authenticated' && !isDashboardLoading && !activeGoal && !incompleteGoal &&
        (typeof window === 'undefined' || localStorage.getItem('runflow_onboarding_dismissed') !== 'true');

    useEffect(() => {
        if (shouldRedirectToLogin) {
            router.push('/login');
        } else if (shouldRedirectToOnboarding) {
            router.push('/onboarding');
        }
    }, [router, shouldRedirectToLogin, shouldRedirectToOnboarding]);

    if (shouldRedirectToLogin || shouldRedirectToOnboarding) {
        return null;
    }

    // === RENDER ===

    return (
        <Suspense fallback={<div className="fixed inset-0 bg-background" />}>
            <MobileSwipeLayout
                onPathChange={setActivePath}
            >
                {/* Dashboard View - always index 0 */}
                {activePath === '/' ? (
                    <DashboardView
                        session={session}
                        statsData={dashboardStats}
                        recentActivities={recentActivities}
                        activeGoal={activeGoal}
                        incompleteGoal={incompleteGoal}
                        weeklyWorkouts={weeklyWorkouts}
                        syncStatus={syncStatus}
                        syncMutation={syncMutation}
                        isLoading={isDashboardLoading}
                        error={dashboardError}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onOpenProfile={() => setIsProfileOpen(true)}
                        onEditWorkout={handleEditWorkout}
                        onInvalidateQueries={() => queryClient.invalidateQueries()}
                        showHeader={false}
                    />
                ) : <div className="h-full w-full" />}

                {/* Plan View - always index 1 */}
                {isPlanPath ? (
                    <PlanView
                        data={planData}
                        isLoading={isPlanLoading}
                        showUnlinked={showUnlinked}
                        setShowUnlinked={setShowUnlinked}
                        sensors={sensors}
                        handleDragEnd={handleDragEnd}
                        handleEdit={(w) => handleEditWorkout(w, false)}
                        handleComplete={(w, e) => { e.stopPropagation(); handleEditWorkout(w, true); }}
                        handleCreate={handleCreateWorkout}
                        handleActivityClick={handleActivityClick}
                        showHeader={false}
                    />
                ) : <div className="h-full w-full" />}

                {/* Analytics View - always index 2 */}
                {isAnalyticsPath ? (
                    <AnalyticsView
                        runalyzeMetrics={analyticsMetrics.runalyzeMetrics}
                        vo2TrendData={analyticsMetrics.vo2TrendData}
                        shapeTrendData={analyticsMetrics.shapeTrendData}
                        fitnessData={analyticsMetrics.fitnessData}
                        combinedData={analyticsMetrics.combinedData}
                        trainingPaces={analyticsMetrics.trainingPaces}
                        userData={userData}
                        activitiesData={activitiesData}
                        timeRange={timeRange}
                        zonesTimeRange={zonesTimeRange}
                        setTimeRange={setTimeRange}
                        setZonesTimeRange={setZonesTimeRange}
                        onRecalculate={() => recalculateMutation.mutate()}
                        isRecalculating={recalculateMutation.isPending}
                        onOpenCalibration={() => setIsCalibrationOpen(true)}
                        showHeader={false}
                    />
                ) : <div className="h-full w-full" />}

                {/* Calendar View - always index 3 */}
                {isCalendarPath ? (
                    <CalendarView showHeader={false} />
                ) : <div className="h-full w-full" />}
            </MobileSwipeLayout>

            {/* Modals */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <EditWorkoutModal
                key={editingWorkout?.id ?? 'new'}
                isOpen={!!editingWorkout || !!createDate}
                onClose={() => { setEditingWorkout(null); setCreateDate(undefined); refetchPlan(); }}
                // M-06 fix: WorkoutWithLinkedActivity extends Workout, safe cast
                workout={editingWorkout as Workout | null}
                defaultDate={createDate}
                goalId={activeGoal?.id || planData?.goal?.id}
                initialComplete={initialComplete}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />

            <ActivityDetailsModal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                activity={selectedActivity}
            />

            <ShapeCalibrationModal
                isOpen={isCalibrationOpen}
                onClose={() => setIsCalibrationOpen(false)}
                currentFactor={analyticsMetrics.runalyzeMetrics.calibrationFactor}
                effectiveVO2max={analyticsMetrics.runalyzeMetrics.effectiveVO2max}
                rawVO2max={analyticsMetrics.runalyzeMetrics.rawVO2max}
                vdotCorrectionFactor={analyticsMetrics.runalyzeMetrics.vdotCorrectionFactor}
                shapePercent={analyticsMetrics.runalyzeMetrics.shape}
                activities={activitiesData?.activities || []}
            />
        </Suspense>
    );
}

export default MobileLayout;
