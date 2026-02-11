'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import {
    DndContext,
    useSensor,
    useSensors,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
} from '@dnd-kit/core';

import { MobileSwipeLayout } from '@/components/navigation';
import { DashboardView, PlanView, AnalyticsView } from '@/components/views';
import { SettingsModal, EditWorkoutModal } from '@/components';
import ProfileModal from '@/components/ProfileModal';
import ActivityDetailsModal from '@/components/ActivityDetailsModal';
import ShapeCalibrationModal from '@/components/ShapeCalibrationModal';
import AiChat from '@/components/AiChat';
import AiSettingsModal from '@/components/AiSettingsModal';
import type { TimeRange } from '@/components/CombinedAnalyticsChart';
import type { Workout, Goal, Activity } from '@/lib/types';
import { WorkoutWithLinkedActivity, PlanResponse } from '@/lib/types';
import {
    calculatePredictedTimes,
    calculateAllRacePredictions,
    calculateEffectiveVO2max,
} from '@/lib/metrics/runalyze';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';

export function MobileLayout() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();

    // Modals State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<(Workout | WorkoutWithLinkedActivity) | null>(null);
    const [initialComplete, setInitialComplete] = useState(false);
    const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

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
    const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery({
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
    const analyticsMetrics = useMemo(() => {
        const activities: Activity[] = activitiesData?.activities || [];
        const effectiveVO2max = statsData?.effectiveVO2max || 0;
        const activeGoalForCalibration = goalsData?.goals?.find((g: Goal) => g.isActive);
        const calibrationFactor = activeGoalForCalibration?.marathonShapeFactor || 1.0;
        const shapeFromServer = statsData?.marathonShape || { shape: 0, mileageScore: 0, longRunScore: 0, crossTrainingScore: 0, details: {} };

        const times = effectiveVO2max > 0
            ? calculatePredictedTimes(effectiveVO2max, shapeFromServer.shape, calibrationFactor)
            : { optimal: 0, predicted: 0 };

        const trainingPaces = effectiveVO2max > 0 ? calculateTrainingPaces(effectiveVO2max) : null;

        // Trend data from server
        const serverVo2Trend = historyData?.vo2Trend || [];
        const vo2TrendData = serverVo2Trend.map((point: any, index: number) => {
            const windowSize = 4;
            const windowValues: number[] = [];
            for (let i = index; i >= 0 && windowValues.length < windowSize; i--) {
                windowValues.push(serverVo2Trend[i].vo2);
            }
            const avg = windowValues.length > 0 ? windowValues.reduce((a, b) => a + b, 0) / windowValues.length : 0;
            return { date: point.week, vo2: point.vo2, vo2Rolling: Math.round(avg * 10) / 10 };
        });

        const shapeTrendData = (historyData?.shapeTrend || []).map((s: any) => ({ week: s.week, shape: s.shape }));
        const fitnessData = (historyData?.fitnessTrend || []).map((f: any) => ({ date: f.date, ctl: f.ctl, atl: f.atl, tsb: f.tsb }));

        // Combined data for charts (matching desktop implementation)
        const dailyVolumeMap = new Map<string, number>();
        const dailyTimeMap = new Map<string, number>();
        const dailyVO2Map = new Map<string, { values: number[]; vo2max?: number }>();
        const maxHR = userData?.user?.hrMax || userData?.hrMax || 190;
        const factor = statsData?.vdotCorrectionFactor || 1.0;
        const serverFitnessTrend = historyData?.fitnessTrend || [];

        activities.forEach(activity => {
            const dateKey = new Date(activity.startDate).toISOString().split('T')[0];

            // Always add to Training Time (minutes) - All Activity Types
            dailyTimeMap.set(dateKey, (dailyTimeMap.get(dateKey) || 0) + activity.movingTime / 60);

            // Run-specific metrics (Volume, VO2)
            if (activity.type === 'RUN') {
                dailyVolumeMap.set(dateKey, (dailyVolumeMap.get(dateKey) || 0) + activity.distance / 1000);

                // Calculate VO2max for this run if it has HR
                if (activity.hasHeartrate && activity.averageHr && activity.distance >= 3000) {
                    const { calculateEffectiveVO2max } = require('@/lib/metrics/runalyze');
                    const vo2 = calculateEffectiveVO2max(activity.distance, activity.movingTime, activity.averageHr, maxHR);
                    if (vo2 > 0) {
                        const existing = dailyVO2Map.get(dateKey) || { values: [] };
                        existing.values.push(vo2 * factor);
                        dailyVO2Map.set(dateKey, existing);
                    }
                }
            }
        });

        // Calculate average VO2max for each day
        dailyVO2Map.forEach((entry) => {
            if (entry.values.length > 0) {
                entry.vo2max = Math.round(entry.values.reduce((a, b) => a + b, 0) / entry.values.length * 10) / 10;
            }
        });

        // Helper to normalize dates
        const normalizeDate = (d: string) => {
            if (!d) return '';
            return d.length >= 10 ? d.substring(0, 10) : d;
        };

        // Build combined data array - INCLUDE server fitness dates (for rest days)
        const fitnessDateSet = new Set<string>(serverFitnessTrend.map((f: { date: string }) => normalizeDate(f.date)));
        const allDates = new Set<string>([
            ...Array.from(dailyVolumeMap.keys()),
            ...Array.from(dailyTimeMap.keys()),
            ...Array.from(fitnessDateSet)
        ]);
        const combinedDataRaw = Array.from(allDates).sort().map((date: string) => {
            const fitnessEntry = serverFitnessTrend.find((f: { date: string }) => normalizeDate(f.date) === date);
            return {
                date,
                volume: dailyVolumeMap.get(date) || 0,
                trainingTime: dailyTimeMap.get(date) || 0,
                vo2max: dailyVO2Map.get(date)?.vo2max,
                ctl: fitnessEntry?.ctl,
                atl: fitnessEntry?.atl,
                tsb: fitnessEntry?.tsb,
            };
        });

        // Calculate rolling averages for combined data
        const combinedData = combinedDataRaw.map((d, index) => {
            const windowSize = 7;
            let volSum = 0, timeSum = 0, vo2Sum = 0, vo2Count = 0;

            for (let i = index; i >= 0 && index - i < windowSize; i--) {
                volSum += combinedDataRaw[i].volume;
                timeSum += combinedDataRaw[i].trainingTime;
                if (combinedDataRaw[i].vo2max) {
                    vo2Sum += combinedDataRaw[i].vo2max!;
                    vo2Count++;
                }
            }

            return {
                ...d,
                vo2maxRolling: vo2Count > 0 ? Math.round(vo2Sum / vo2Count * 10) / 10 : undefined,
                volumeRolling: Math.round(volSum * 10) / 10,
                trainingTimeRolling: Math.round(timeSum)
            };
        });

        return {
            runalyzeMetrics: {
                effectiveVO2max,
                rawVO2max: statsData?.rawVO2max || 0,
                vdotCorrectionFactor: statsData?.vdotCorrectionFactor || 1.0,
                shape: shapeFromServer.shape,
                mileageScore: shapeFromServer.mileageScore,
                longRunScore: shapeFromServer.longRunScore,
                crossTrainingScore: shapeFromServer.crossTrainingScore || 0,
                details: shapeFromServer.details || {},
                optimalTime: times.optimal,
                predictedTime: times.predicted,
                calibrationFactor
            },
            vo2TrendData,
            shapeTrendData,
            fitnessData,
            combinedData,
            trainingPaces,
        };
    }, [activitiesData, goalsData, statsData, historyData]);

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
                    const { isSameDay } = require('date-fns');
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

    const handleActivityClick = useCallback((activity: any, e?: React.MouseEvent) => {
        e?.stopPropagation?.();
        setSelectedActivity(activity);
        setIsActivityModalOpen(true);
    }, []);

    // === AUTH GUARDS ===



    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    if (status === 'authenticated' && !isDashboardLoading && !activeGoal) {
        router.push('/onboarding');
        return null;
    }

    // === RENDER ===

    return (
        <>
            <MobileSwipeLayout showAiChat={showAiChat}>
                {/* Dashboard View */}
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

                {/* Plan View */}
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

                {/* Analytics View */}
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


                {/* Chat View */}
                {showAiChat && (
                    <div className="h-full flex flex-col bg-background">
                        <div className="p-4 border-b border-gray-800">
                            <h1 className="text-xl font-bold text-white">AI Coach</h1>
                        </div>
                        <AiChat onOpenSettings={() => setIsAiSettingsOpen(true)} />
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
                workout={editingWorkout as any}
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
