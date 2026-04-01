'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import {
    useSensor,
    useSensors,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
} from '@dnd-kit/core';

import { X } from 'lucide-react';

import { MobileSwipeLayout } from '@/components/navigation';
import ChatSidebar from '@/components/ChatSidebar';
import { DashboardView, PlanView, AnalyticsView } from '@/components/views';
import { SettingsModal, EditWorkoutModal } from '@/components';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import ProfileModal from '@/components/ProfileModal';
import ActivityDetailsModal from '@/components/ActivityDetailsModal';
import ShapeCalibrationModal from '@/components/ShapeCalibrationModal';
import AiSettingsModal from '@/components/AiSettingsModal';
import HealthView from '@/components/views/HealthView';
import type { TimeRange } from '@/components/CombinedAnalyticsChart';
import type { Workout, Goal, ActivityListItem } from '@/lib/types';
import { WorkoutWithLinkedActivity, PlanResponse } from '@/lib/types';
import { Capacitor } from '@capacitor/core';
import { syncLocalNotifications } from '@/lib/mobile/notifications';

const AiChat = dynamic(() => import('@/components/AiChat'), { ssr: false });

export function MobileLayout() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId') || undefined;
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
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
    const [aiChatResetKey, setAiChatResetKey] = useState(0);

    // Plan State
    const [showUnlinked, setShowUnlinked] = useState(true);

    // Analytics State
    const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
    const [zonesTimeRange, setZonesTimeRange] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');

    // DnD Sensors for Plan
    // DnD Sensors for Plan
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
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
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        enabled: status === 'authenticated',
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
        enabled: status === 'authenticated',
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
        enabled: status === 'authenticated',
    });

    // Analytics Stats Query
    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: status === 'authenticated',
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

    // Determine if AI chat should be shown
    const showAiChat = aiSettingsData?.settings?.adminAllowed;

    // Determine if Health should be shown
    const showHealth = userData?.healthTrackingEnabled === true;

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
        enabled: status === 'authenticated',
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
    const weeklyWorkouts: Workout[] = activeGoal?.workouts || [];
    const syncStatus = dashboardData?.syncStatus;

    // Analytics calculated data
    const analyticsMetrics = useAnalyticsMetrics(
        activitiesData,
        goalsData,
        statsData,
        historyData,
        userData
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



    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    if (status === 'authenticated' && !isDashboardLoading && !activeGoal) {
        const dismissed = typeof window !== 'undefined' && localStorage.getItem('runflow_onboarding_dismissed') === 'true';
        if (!dismissed) {
            router.push('/onboarding');
            return null;
        }
    }

    // === RENDER ===

    return (
        <>
            <MobileSwipeLayout showAiChat={showAiChat} showHealth={showHealth} onChatTabClick={() => setAiChatResetKey(prev => prev + 1)}>
                {/* Dashboard View - always index 0 */}
                <DashboardView
                    session={session}
                    statsData={dashboardStats}
                    recentActivities={recentActivities}
                    activeGoal={activeGoal}
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

                {/* Plan View - always index 1 */}
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

                {/* Analytics View - always index 2 */}
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

                {/* Health View — index 3, ONLY rendered when health is enabled so tabs align */}
                {showHealth && (
                    <HealthView
                        showHeader={false}
                    />
                )}

                {/* Chat View — always LAST; index depends on whether Health tab is present */}
                {showAiChat && (
                    <div className="h-full flex flex-col min-h-0 bg-background relative">
                        <AiChat
                            key={aiChatResetKey}
                            sessionId={sessionId}
                            onOpenSettings={() => setIsAiSettingsOpen(true)}
                            isPromptLibraryOpen={isPromptLibraryOpen}
                            onClosePromptLibrary={() => setIsPromptLibraryOpen(false)}
                            onOpenPromptLibrary={() => setIsPromptLibraryOpen(true)}
                            onOpenHistory={() => setIsMobileSidebarOpen(true)}
                            onNewChat={() => {
                                // Close sidebar if open from New Chat click inside it
                                setIsMobileSidebarOpen(false);
                                // Increment key to force AiChat to unmount and remount (resetting history & sessionId)
                                setAiChatResetKey(prev => prev + 1);
                                // Ensure we navigate without existing sessionId
                                router.push('/chat');
                            }}
                        />

                        {/* Mobile Sidebar Overlay */}
                        {isMobileSidebarOpen && (
                            <div className="fixed inset-0 z-[60] flex">
                                {/* Backdrop */}
                                <div
                                    className="absolute inset-0 bg-black/[var(--modal-backdrop-opacity)] backdrop-blur-xs"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                />
                                {/* Sidebar */}
                                <div className="relative w-[80%] max-w-sm h-full bg-[#1c1c1e] shadow-xl animate-in slide-in-from-left duration-200">
                                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                                        <span className="font-semibold text-white">Chat History</span>
                                        <button
                                            onClick={() => setIsMobileSidebarOpen(false)}
                                            className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="h-[calc(100%-60px)]">
                                        <ChatSidebar
                                            sessionId={sessionId}
                                            className="border-none w-full"
                                            onCloseMobile={() => setIsMobileSidebarOpen(false)}
                                            onNewChat={() => {
                                                setIsMobileSidebarOpen(false);
                                                // Increment key to force AiChat to remount with fresh state
                                                setAiChatResetKey(prev => prev + 1);
                                                // Navigate to base chat path to clear session
                                                router.push('/chat');
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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

            <AiSettingsModal
                isOpen={isAiSettingsOpen}
                onClose={() => setIsAiSettingsOpen(false)}
            />
        </>
    );
}

export default MobileLayout;
