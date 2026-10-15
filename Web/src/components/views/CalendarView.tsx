'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { addMonths, endOfWeek, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { PencilRuler } from 'lucide-react';
import { toast } from 'sonner';
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    DragEndEvent,
} from '@dnd-kit/core';
import { CalendarToolbar, type CalendarViewMode } from '@/app/calendar-preview/components/CalendarToolbar';
import { MonthlyView } from '@/app/calendar-preview/components/MonthlyView';
import { WeeklyView } from '@/app/calendar-preview/components/WeeklyView';
import { SummaryStats } from '@/app/calendar-preview/components/SummaryStats';
import { buildDays, buildWeeks, buildMonth, fillFitness } from '@/app/calendar-preview/components/metrics';
import type { MockActivity, MockWorkout, WorkoutType } from '@/app/calendar-preview/components/mockData';
import type { ActivityListItem } from '@/lib/types';
import dynamic from 'next/dynamic';
import { CalendarWorkoutDetailDrawer } from '@/components/Calendar/CalendarWorkoutDetailDrawer';

const ActivityDetailsModal = dynamic(() => import('@/components/ActivityDetailsModal'), {
    ssr: false,
    loading: () => null,
});

/**
 * Live training calendar view.
 *
 * Fetches real activities (/api/activities) and the active training plan's
 * workouts (/api/plan-advanced/[goalId]) and renders the Runalyze/TrainingPeaks-
 * style weekly + monthly calendar with planned-vs-actual, TRIMP load shading,
 * and CTL/ATL/TSB fitness metrics.
 */

interface PlanWorkout {
    id: string;
    scheduledDate: string | Date;
    workoutType: string;
    sport?: string | null;
    phase: string;
    targetDistance: number | null;
    targetDuration: number | null;
    plannedTss: number | null;
    targetPaceMinSecondsPerKm?: number | null;
    targetPaceMaxSecondsPerKm?: number | null;
    targetPowerWatts?: number | null;
    targetPowerMinWatts?: number | null;
    targetPowerMaxWatts?: number | null;
    targetFtpPercent?: number | null;
    targetHrZone?: number | null;
    targetHrMinBpm?: number | null;
    targetHrMaxBpm?: number | null;
    structuredSteps?: unknown;
    isCompleted: boolean;
    linkedActivityId: string | null;
    customName: string | null;
    displayDesc: string | null;
}

interface PlanResponse {
    plan: {
        id: string;
        workouts: PlanWorkout[];
    };
}

interface GoalsResponse {
    goals: Array<{
        id: string;
        isActive: boolean;
        raceDate: string | Date | null;
        raceType: string | null;
        parentGoalId: string | null;
        deletedAt: string | Date | null;
    }>;
}

interface CalendarViewProps {
    /** Reserved for parity with other views (DashboardView, etc.). The calendar
     *  always renders its own toolbar; the shell-provided header is separate. */
    showHeader?: boolean;
}

export function CalendarView({ showHeader: _showHeader = true }: CalendarViewProps) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<CalendarViewMode>('week');
    const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

    // Modals / Detail Drawer state
    const [selectedWorkout, setSelectedWorkout] = useState<MockWorkout | null>(null);
    const [isWorkoutDrawerOpen, setIsWorkoutDrawerOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivityListItem | null>(null);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor),
    );

    // 1. Active goal (to know which plan's workouts to fetch)
    const { data: goalsData } = useQuery<GoalsResponse>({
        queryKey: ['plans', 'parentOnly'],
        queryFn: async () => {
            const res = await fetch('/api/plans?parentOnly=true');
            if (!res.ok) throw new Error('Failed to load plans');
            return res.json();
        },
    });

    const activeGoal = useMemo(() => {
        const goals = goalsData?.goals ?? [];
        return goals.find((g) => g.isActive && !g.deletedAt) ?? null;
    }, [goalsData]);

    // 2. Plan workouts (planned training) — only if there's an active goal
    const { data: planData } = useQuery<PlanResponse>({
        queryKey: ['plan-advanced', activeGoal?.id],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${activeGoal!.id}`);
            if (!res.ok) throw new Error('Failed to load plan');
            return res.json();
        },
        enabled: !!activeGoal?.id,
    });

    // 3. Activities (completed training) — fetch a wide window for context
    const from = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6); // 6 months back
        return startOfWeek(d, { weekStartsOn: 1 });
    }, []);
    const to = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3); // 3 months ahead (planned)
        return endOfWeek(d, { weekStartsOn: 1 });
    }, []);

    const { data: activitiesData, isLoading: activitiesLoading } = useQuery<{ activities: ActivityListItem[] }>({
        queryKey: ['activities', 'calendar', from.toISOString(), to.toISOString()],
        queryFn: async () => {
            // Fetch up to 100 most recent; the API caps at 100 per request.
            const res = await fetch('/api/activities?limit=100');
            if (!res.ok) throw new Error('Failed to load activities');
            return res.json();
        },
    });

    // Map live API shapes onto the calendar's internal types.
    const activities = useMemo<MockActivity[]>(() => {
        const raw = activitiesData?.activities ?? [];
        return raw.map((a) => ({
            id: a.id,
            name: a.name ?? 'Activity',
            type: normalizeType(a.trainingType ?? a.type),
            sport: (a as unknown as { sport?: string }).sport ?? (a.type?.toUpperCase().includes('RIDE') ? 'BIKE' : a.type?.toUpperCase().includes('SWIM') ? 'SWIM' : 'RUN'),
            startDate: a.startDate as string,
            distance: a.distance ?? 0,
            duration: a.movingTime ?? 0,
            averageHr: a.averageHr ?? null,
            trimp: a.trimp ?? null,
            tss: a.runningTss ?? null,
            vdot: a.estimatedVdot ?? null,
            totalElevation: a.totalElevation ?? null,
            averageWatts: (a as unknown as { averageWatts?: number }).averageWatts ?? null,
            npWatts: (a as unknown as { npWatts?: number }).npWatts ?? null,
            bikeTss: (a as unknown as { bikeTss?: number }).bikeTss ?? null,
        }));
    }, [activitiesData]);

    const workouts = useMemo<MockWorkout[]>(() => {
        const raw = planData?.plan?.workouts ?? [];
        return raw.map((w) => ({
            id: w.id,
            name: w.displayDesc ?? w.customName ?? w.workoutType.replace(/_/g, ' '),
            type: normalizeType(w.workoutType),
            sport: w.sport ?? null,
            phase: (w.phase as MockWorkout['phase']) ?? 'BASE',
            scheduledDate: typeof w.scheduledDate === 'string' ? w.scheduledDate : new Date(w.scheduledDate).toISOString(),
            targetDistance: w.targetDistance ?? null,
            targetDuration: w.targetDuration ?? null,
            plannedTss: w.plannedTss ?? null,
            targetPaceMinSecondsPerKm: w.targetPaceMinSecondsPerKm ?? null,
            targetPaceMaxSecondsPerKm: w.targetPaceMaxSecondsPerKm ?? null,
            targetPowerWatts: w.targetPowerWatts ?? null,
            targetPowerMinWatts: w.targetPowerMinWatts ?? null,
            targetPowerMaxWatts: w.targetPowerMaxWatts ?? null,
            targetFtpPercent: w.targetFtpPercent ?? null,
            targetHrZone: w.targetHrZone ?? null,
            targetHrMinBpm: w.targetHrMinBpm ?? null,
            targetHrMaxBpm: w.targetHrMaxBpm ?? null,
            structuredSteps: w.structuredSteps,
            linkedActivityId: w.linkedActivityId ?? null,
            completed: w.isCompleted ?? false,
        }));
    }, [planData]);

    // Drag-and-drop reschedule
    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || !active || !activeGoal?.id) return;
            const overId = over.id.toString();
            if (!overId.startsWith('day-')) return;

            const targetDateStr = overId.replace('day-', '');
            const targetDateIso = new Date(`${targetDateStr}T12:00:00.000Z`).toISOString();
            const workoutId = active.id.toString();

            const currentWorkout = workouts.find((w) => w.id === workoutId);
            if (currentWorkout && currentWorkout.scheduledDate.startsWith(targetDateStr)) {
                return;
            }

            try {
                const res = await fetch(`/api/plan-advanced/${activeGoal.id}/workouts/${workoutId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scheduledDate: targetDateIso }),
                });
                if (!res.ok) throw new Error('Failed to reschedule workout');
                toast.success('Workout rescheduled');
                queryClient.invalidateQueries({ queryKey: ['plan-advanced', activeGoal.id] });
                queryClient.invalidateQueries({ queryKey: ['plan'] });
                queryClient.invalidateQueries({ queryKey: ['goals'] });
            } catch {
                toast.error('Failed to reschedule workout');
            }
        },
        [activeGoal, workouts, queryClient],
    );

    // Toggle workout completion status from drawer
    const handleToggleComplete = useCallback(
        async (workoutId: string, currentCompleted: boolean) => {
            if (!activeGoal?.id) return;
            try {
                const res = await fetch(`/api/plan-advanced/${activeGoal.id}/workouts/${workoutId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        isCompleted: !currentCompleted,
                        completedAt: !currentCompleted ? new Date().toISOString() : null,
                    }),
                });
                if (!res.ok) throw new Error('Failed to update status');
                toast.success(!currentCompleted ? 'Workout marked complete' : 'Workout marked incomplete');
                queryClient.invalidateQueries({ queryKey: ['plan-advanced', activeGoal.id] });
                queryClient.invalidateQueries({ queryKey: ['plan'] });
                queryClient.invalidateQueries({ queryKey: ['goals'] });
                if (selectedWorkout && selectedWorkout.id === workoutId) {
                    setSelectedWorkout((prev) => (prev ? { ...prev, completed: !currentCompleted } : null));
                }
            } catch {
                toast.error('Failed to update workout status');
            }
        },
        [activeGoal, queryClient, selectedWorkout],
    );

    const handleWorkoutClick = useCallback((w: MockWorkout) => {
        setSelectedWorkout(w);
        setIsWorkoutDrawerOpen(true);
    }, []);

    const handleActivityClick = useCallback(
        (a: MockActivity) => {
            const rawAct = activitiesData?.activities?.find((act) => act.id === a.id);
            if (rawAct) {
                setSelectedActivity(rawAct);
                setIsActivityModalOpen(true);
            }
        },
        [activitiesData],
    );

    // Build the day/week/month aggregations + fitness curve.
    const days = useMemo(() => buildDays(activities, workouts, from, to), [activities, workouts, from, to]);
    const allWeeks = useMemo(
        () => fillFitness(buildWeeks(days, from, to), { initialCtl: 50, initialAtl: 55 }),
        [days, from, to],
    );

    const visibleWeeks = useMemo(() => {
        const monthStart = startOfMonth(cursor);
        const leadWeeks = startOfWeek(monthStart, { weekStartsOn: 1 });
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return allWeeks.filter((w) => w.weekStart >= leadWeeks && w.weekStart <= end);
    }, [cursor, allWeeks]);

    const monthEntry = useMemo(
        () => buildMonth(days, cursor.getFullYear(), cursor.getMonth()),
        [days, cursor],
    );

    const label = useMemo(() => {
        if (mode === 'month') return monthEntry.label;
        if (visibleWeeks.length === 0) return '';
        const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return `${fmt(visibleWeeks[0].weekStart)} – ${fmt(visibleWeeks[visibleWeeks.length - 1].weekEnd)}`;
    }, [mode, monthEntry, visibleWeeks]);

    const period = mode === 'month'
        ? monthEntry
        : {
            trimp: visibleWeeks.reduce((s, w) => s + w.trimp, 0),
            tss: visibleWeeks.reduce((s, w) => s + w.tss, 0),
            plannedTss: visibleWeeks.reduce((s, w) => s + w.plannedTss, 0),
            distance: visibleWeeks.reduce((s, w) => s + w.distance, 0),
            avgVdot: avgOrNull(visibleWeeks.map((w) => w.avgVdot)),
        };
    const fitness = visibleWeeks.length > 0 ? visibleWeeks[visibleWeeks.length - 1] : undefined;

    const hasAnyData = activities.length > 0 || workouts.length > 0;

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="h-full flex flex-col bg-background text-foreground">
                <CalendarToolbar
                    mode={mode}
                    onModeChange={setMode}
                    label={label}
                    onPrev={() => setCursor((c) => subMonths(c, 1))}
                    onNext={() => setCursor((c) => addMonths(c, 1))}
                    onToday={() => setCursor(startOfMonth(new Date()))}
                    actions={activeGoal ? (
                        <Link
                            href={`/plan-advanced/${activeGoal.id}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 rounded-md text-xs font-medium text-accent-orange hover:text-accent-pink hover:bg-accent-orange/10 border border-accent-orange/30 transition-colors"
                            title="Open this plan in the advanced editor"
                        >
                            <PencilRuler className="w-3.5 h-3.5" />
                            Advanced Editor
                        </Link>
                    ) : undefined}
                />
                <SummaryStats period={period} fitness={fitness} />

                <div className="flex-1 overflow-auto">
                    {activitiesLoading && !hasAnyData ? (
                        <div className="flex items-center justify-center h-full text-foreground-muted text-sm">
                            <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mr-2" />
                            Loading your training history…
                        </div>
                    ) : !hasAnyData ? (
                        <div className="flex flex-col items-center justify-center h-full text-foreground-muted text-sm gap-2 px-6 text-center">
                            <p>No activities or planned workouts found for this period.</p>
                            <p className="text-xs text-foreground-muted">
                                Sync your Strava activities or create a training plan to populate the calendar.
                            </p>
                        </div>
                    ) : mode === 'month' ? (
                        <MonthlyView
                            month={cursor}
                            days={days}
                            onWorkoutClick={handleWorkoutClick}
                            onActivityClick={handleActivityClick}
                        />
                    ) : (
                        <WeeklyView
                            weeks={visibleWeeks}
                            onWorkoutClick={handleWorkoutClick}
                            onActivityClick={handleActivityClick}
                        />
                    )}
                </div>

                {/* Workout Detail Slide-over Drawer */}
                <CalendarWorkoutDetailDrawer
                    workout={selectedWorkout}
                    goalId={activeGoal?.id}
                    isOpen={isWorkoutDrawerOpen}
                    onClose={() => {
                        setIsWorkoutDrawerOpen(false);
                        setSelectedWorkout(null);
                    }}
                    onToggleComplete={handleToggleComplete}
                />

                {/* Activity Details Modal */}
                <ActivityDetailsModal
                    isOpen={isActivityModalOpen}
                    onClose={() => {
                        setIsActivityModalOpen(false);
                        setSelectedActivity(null);
                    }}
                    activity={selectedActivity}
                />
            </div>
        </DndContext>
    );
}

/** Map an activity training type / plan workout type onto the calendar's union. */
function normalizeType(t: string): WorkoutType {
    const u = (t || '').toUpperCase();
    const known = new Set([
        'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS',
        'RECOVERY', 'RACE', 'REST', 'RIDE', 'SWIM', 'STRENGTH', 'CROSS_TRAIN',
        'OTHER', 'BRICK', 'OPEN_WATER_SWIM', 'LONG_RIDE', 'RIDE_INTERVALS',
        'SWIM_DRILL', 'TRANSITION_PRACTICE', 'DOUBLE_DAY',
    ]);
    if (known.has(u as WorkoutType)) return u as WorkoutType;
    if (u === 'RUN' || u === 'VIRTUALRUN') return 'EASY';
    if (u === 'RIDE' || u === 'VIRTUAL_RIDE' || u === 'CYCLING') return 'RIDE';
    if (u === 'SWIM') return 'SWIM';
    if (u === 'WALK' || u === 'HIKE') return 'EASY';
    if (u === 'WORKOUT') return 'STRENGTH';
    return 'OTHER';
}

function avgOrNull(values: (number | null)[]): number | null {
    const valid = values.filter((v): v is number => v != null);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}
