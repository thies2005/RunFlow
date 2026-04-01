'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, EyeOff, Download } from 'lucide-react';
import { format, startOfWeek, addDays, isToday, isSameDay, differenceInWeeks, isBefore } from 'date-fns';
import { useSession } from 'next-auth/react';
import { EditWorkoutModal, ErrorBoundary, Footer } from '@/components';
import ActivityDetailsModal from '@/components/ActivityDetailsModal';
import { isRunningActivity, isCrossTrainingActivity, type WorkoutWithLinkedActivity, type PlanResponse } from '@/lib/types';
import {
    DndContext,
    useSensor,
    useSensors,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
} from '@dnd-kit/core';

import { DraggableWorkout } from './components/DraggableWorkout';
import { DroppableDay } from './components/DroppableDay';
import { getPhase, formatDuration, RUN_TYPES } from '@/lib/plan/utils';

export default function PlanPage() {
    const router = useRouter();
    const { status } = useSession();
    const queryClient = useQueryClient();

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<WorkoutWithLinkedActivity | null>(null);
    const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
    const [initialComplete, setInitialComplete] = useState(false);

    // Activity Details State
    const [selectedActivity, setSelectedActivity] = useState<NonNullable<WorkoutWithLinkedActivity['linkedActivity']> | null>(null);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

    // Show Unlinked Activities Toggle
    const [showUnlinked, setShowUnlinked] = useState(true);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    // Reorder mutation
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
            // Optimistic update handled by invalidation for now
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
    });

    const { data, isLoading, refetch } = useQuery<PlanResponse>({
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active) {
            const workoutId = active.id as string;
            const overId = over.id as string;

            if (overId.startsWith('day-')) {
                const newDate = overId.replace('day-', '');

                // Find the workout by ID from the query data
                const currentWorkout = data?.goal?.workouts?.find((w: WorkoutWithLinkedActivity) => w.id === workoutId);

                // Only mutate if date actually changed
                if (currentWorkout && !isSameDay(new Date(currentWorkout.scheduledDate), new Date(newDate))) {
                    reorderMutation.mutate({ workoutId, newDate });
                }
            }
        }
    };

    // All useCallback hooks must be called before any early returns (React hooks rules)
    const handleEdit = useCallback((workout: WorkoutWithLinkedActivity) => {
        setEditingWorkout(workout);
        setCreateDate(undefined);
        setInitialComplete(false);
        setIsEditModalOpen(true);
    }, []);

    const handleComplete = useCallback((workout: WorkoutWithLinkedActivity, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingWorkout(workout);
        setCreateDate(undefined);
        setInitialComplete(true);
        setIsEditModalOpen(true);
    }, []);

    const handleCreate = useCallback((date: Date) => {
        setEditingWorkout(null);
        setCreateDate(date);
        setIsEditModalOpen(true);
    }, []);

    const handleActivityClick = useCallback((activity: NonNullable<WorkoutWithLinkedActivity['linkedActivity']>, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedActivity(activity);
        setIsActivityModalOpen(true);
    }, []);

    // Scroll to today on load
    useEffect(() => {
        if (!isLoading && data) {
            const todayElement = document.getElementById('plan-today-anchor');
            if (todayElement) {
                setTimeout(() => {
                    todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [isLoading, data]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading plan...</div>;

    if (!data?.goal) {
        return (
            <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl text-foreground font-bold mb-4">No Active Plan</h1>
                <p className="text-foreground-muted mb-6">You don&apos;t have an active training goal.</p>
                <button onClick={() => router.push('/onboarding?step=3')} className="btn-primary">Create Goal</button>
            </div>
        );
    }

    const goal = data.goal;
    const raceDateObj = new Date(goal.raceDate);
    // Fallback if raceDate is invalid (though it shouldn't be)
    const raceDate = !isNaN(raceDateObj.getTime()) ? raceDateObj : new Date();

    const workouts = goal.workouts || [];

    // Group by Week
    const weeks: Record<string, WorkoutWithLinkedActivity[]> = {};

    workouts.forEach((w) => {
        const d = new Date(w.scheduledDate);
        if (isNaN(d.getTime())) return; // Skip invalid dates

        try {
            const monday = startOfWeek(d, { weekStartsOn: 1 }).toISOString();
            if (!weeks[monday]) weeks[monday] = [];
            weeks[monday].push(w);
        } catch {
            console.warn('Invalid workout date:', w);
        }
    });

    const sortedWeeks = Object.keys(weeks).sort().filter(weekStartIso => {
        const weekStart = new Date(weekStartIso);
        if (isNaN(weekStart.getTime())) return false;

        // 1. Filter out weeks before plan start date (if set)
        if (goal.planStartDate) {
            const planStartObj = new Date(goal.planStartDate);
            if (!isNaN(planStartObj.getTime())) {
                const planStart = startOfWeek(planStartObj, { weekStartsOn: 1 });
                // Allow if weekStart is >= planStart's week start
                if (weekStart < planStart) return false;
            }
        }

        // 2. Filter out weeks strictly after the race week
        if (!isNaN(raceDate.getTime())) {
            const raceWeekStart = startOfWeek(raceDate, { weekStartsOn: 1 });
            if (weekStart > raceWeekStart) return false;
        }

        // 3. Keep weeks even if they only have "Rest" days
        return true;
    });

    return (
        <ErrorBoundary componentName="Training Plan" showRetry>
            <div className="min-h-screen bg-background p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="text-foreground-muted hover:text-foreground transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{goal.name} Plan</h1>
                                <p className="text-foreground-muted text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Race: {format(raceDate, 'MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const printStyles = document.createElement('style');
                                    printStyles.id = 'runflow-print-styles';
                                    printStyles.textContent = `
                                        @media print {
                                            body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                            header, footer, .no-print { display: none !important; }
                                            .glass-card { background: white !important; border: 1px solid #e5e7eb !important; break-inside: avoid; }
                                            .bg-background { background: white !important; }
                                            button { display: none !important; }
                                            .text-foreground, .text-white { color: black !important; }
                                            .text-foreground-muted, .text-gray-400, .text-gray-500 { color: #6b7280 !important; }
                                            [draggable="true"] { cursor: default !important; }
                                        }
                                    `;
                                    document.head.appendChild(printStyles);
                                    window.print();
                                    document.getElementById('runflow-print-styles')?.remove();
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-surface text-foreground-muted hover:text-foreground border border-glass-border"
                            >
                                <Download className="w-4 h-4" />
                                Export PDF
                            </button>
                            {/* Show Unlinked Toggle */}
                            <button
                                onClick={() => setShowUnlinked(!showUnlinked)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showUnlinked
                                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                                    : 'bg-surface text-foreground-muted hover:text-foreground border border-glass-border'
                                    }`}
                            >
                                {showUnlinked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                {showUnlinked ? 'Unlinked On' : 'Show Unlinked'}
                            </button>
                        </div>
                    </div>

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        {/* Weeks List */}
                        <div className="space-y-6">
                            {sortedWeeks.map((weekStartIso, index) => {
                                const weekStart = new Date(weekStartIso);
                                const weekEnd = addDays(weekStart, 6);
                                const weeksUntilRace = differenceInWeeks(raceDate, weekStart);
                                const phase = getPhase(weeksUntilRace, {
                                    taperWeeks: goal.taperWeeks ?? undefined,
                                    peakWeeks: goal.peakWeeks ?? undefined,
                                    buildWeeks: goal.buildWeeks ?? undefined,
                                });
                                const weekWorkouts = weeks[weekStartIso];

                                const isPastOrCurrent = isBefore(weekStart, new Date());

                                // Metrics Calculation
                                let plannedMileage = 0;
                                let actualRunMileage = 0;
                                let totalMovingTime = 0;
                                let runTime = 0;
                                let crossTime = 0;

                                weekWorkouts.forEach((w) => {
                                    // Planned
                                    if (RUN_TYPES.includes(w.workoutType) && (w.targetDistance ?? 0) > 0) {
                                        plannedMileage += (w.targetDistance ?? 0);
                                    }

                                    // Actual
                                    if (w.linkedActivity) {
                                        const act = w.linkedActivity;
                                        totalMovingTime += act.movingTime;

                                        if (isRunningActivity(act.type)) {
                                            actualRunMileage += act.distance;
                                            runTime += act.movingTime;
                                        } else if (isCrossTrainingActivity(act.type)) {
                                            crossTime += act.movingTime;
                                        }
                                    }
                                });

                                const runTimePct = totalMovingTime > 0 ? Math.round((runTime / totalMovingTime) * 100) : 0;
                                const crossTimePct = totalMovingTime > 0 ? Math.round((crossTime / totalMovingTime) * 100) : 0;

                                return (
                                    <div key={weekStartIso} className="glass-card overflow-hidden">
                                        {/* Week Header */}
                                        <div className="p-4 border-b border-glass-border flex flex-col md:flex-row md:items-center justify-between bg-surface sticky top-[env(safe-area-inset-top)] z-10 backdrop-blur-md gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground font-semibold">Week {index + 1}</span>
                                                    <span className="text-xs text-foreground-muted">
                                                        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                                                    </span>
                                                </div>

                                                {/* Summary Metrics */}
                                                {isPastOrCurrent ? (
                                                    <div className="flex flex-col space-y-1 ml-2">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
                                                                Run: {(actualRunMileage / 1000).toFixed(1)}k
                                                            </span>
                                                            <span className="text-gray-500 text-[10px]">
                                                                / {(plannedMileage / 1000).toFixed(1)}k planned
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                            <span>Time: {formatDuration(totalMovingTime)}</span>
                                                            {totalMovingTime > 0 && (
                                                                <span className="text-gray-500 text-[10px]">
                                                                    ({runTimePct}% Run / {crossTimePct}% Cross)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="px-2 py-1 bg-surface rounded text-xs text-foreground-muted border border-glass-border">
                                                        {(plannedMileage / 1000).toFixed(1)} km planned
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${phase.color}`}>
                                                    {phase.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Days Grid (List View) */}
                                        <div className="p-2 space-y-1">
                                            {Array.from({ length: 7 }).map((_, i) => {
                                                const dayDate = addDays(weekStart, i);
                                                const isTodayItem = isToday(dayDate);
                                                const dayWorkouts = weekWorkouts.filter((w) => isSameDay(new Date(w.scheduledDate), dayDate));

                                                return (
                                                    <DroppableDay
                                                        key={dayDate.toISOString()}
                                                        date={dayDate}
                                                        isTodayItem={isTodayItem}
                                                        onAdd={handleCreate}
                                                        id={isTodayItem ? 'plan-today-anchor' : undefined}
                                                    >
                                                        {dayWorkouts.map((workout) => (
                                                            <DraggableWorkout
                                                                key={workout.id}
                                                                workout={workout}
                                                                isTodayItem={isTodayItem}
                                                                onClick={handleEdit}
                                                                onComplete={handleComplete}
                                                                onActivityClick={handleActivityClick}
                                                            />
                                                        ))}

                                                        {/* Unlinked Activities for this day */}
                                                        {showUnlinked && data?.unlinkedActivities?.filter(a =>
                                                            isSameDay(new Date(a.startDate), dayDate)
                                                        ).map((activity) => (
                                                            <div
                                                                key={activity.id}
                                                                onClick={() => {
                                                                    setSelectedActivity(activity);
                                                                    setIsActivityModalOpen(true);
                                                                }}
                                                                className="group p-3 rounded-lg flex items-center gap-3 transition-colors border border-dashed border-accent-cyan/40 bg-accent-cyan/5 cursor-pointer hover:bg-accent-cyan/10"
                                                            >
                                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-cyan/20 text-accent-cyan">
                                                                    <span className="text-xs font-bold">+</span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-medium text-accent-cyan truncate">
                                                                        {activity.name}
                                                                    </h4>
                                                                    <p className="text-xs text-foreground-muted">
                                                                        {(activity.distance / 1000).toFixed(1)}km •
                                                                        {Math.floor(activity.movingTime / 60)}min •
                                                                        <span className="text-accent-cyan">Unlinked</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </DroppableDay>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </DndContext>
                </div>

                <EditWorkoutModal
                    key={editingWorkout?.id ?? 'new'}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        refetch();
                    }}
                    workout={editingWorkout}
                    defaultDate={createDate}
                    goalId={goal.id}
                    initialComplete={initialComplete}
                />

                <ActivityDetailsModal
                    isOpen={isActivityModalOpen}
                    onClose={() => setIsActivityModalOpen(false)}
                    activity={selectedActivity}
                />
                <Footer />
            </div>
        </ErrorBoundary>
    );
}
