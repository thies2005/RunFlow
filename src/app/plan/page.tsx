'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
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
        queryKey: ['plan'],
        queryFn: async () => {
            const res = await fetch('/api/plan');
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        enabled: status === 'authenticated'
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active) {
            const workoutId = active.id as string;
            const overId = over.id as string;

            if (overId.startsWith('day-')) {
                const newDate = overId.replace('day-', '');
                const currentWorkout = active.data.current?.workout as WorkoutWithLinkedActivity;

                // Only mutate if date actually changed
                if (currentWorkout && !isSameDay(new Date(currentWorkout.scheduledDate), new Date(newDate))) {
                    reorderMutation.mutate({ workoutId, newDate });
                }
            }
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading plan...</div>;

    if (!data?.goal) {
        return (
            <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl text-foreground font-bold mb-4">No Active Plan</h1>
                <p className="text-foreground-muted mb-6">You don't have an active training goal.</p>
                <button onClick={() => router.push('/onboarding?step=3')} className="btn-primary">Create Goal</button>
            </div>
        );
    }

    const goal = data.goal;
    const raceDate = new Date(goal.raceDate);
    const workouts = goal.workouts || [];

    // Group by Week
    const weeks: Record<string, WorkoutWithLinkedActivity[]> = {};

    workouts.forEach((w) => {
        const monday = startOfWeek(new Date(w.scheduledDate), { weekStartsOn: 1 }).toISOString();
        if (!weeks[monday]) weeks[monday] = [];
        weeks[monday].push(w);
    });

    const sortedWeeks = Object.keys(weeks).sort().filter(weekStartIso => {
        const weekStart = new Date(weekStartIso);

        // 1. Filter out weeks before plan start date (if set)
        if (goal.planStartDate) {
            const planStart = startOfWeek(new Date(goal.planStartDate), { weekStartsOn: 1 });
            // Allow if weekStart is >= planStart's week start
            if (weekStart < planStart) return false;
        }

        // 2. Filter out weeks strictly after the race week
        const raceDateObj = new Date(goal.raceDate);
        const raceWeekStart = startOfWeek(raceDateObj, { weekStartsOn: 1 });

        if (weekStart > raceWeekStart) return false;

        // 3. Keep weeks even if they only have "Rest" days
        return true;
    });

    const handleEdit = (workout: WorkoutWithLinkedActivity) => {
        setEditingWorkout(workout);
        setCreateDate(undefined);
        setInitialComplete(false);
        setIsEditModalOpen(true);
    };

    const handleComplete = (workout: WorkoutWithLinkedActivity, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingWorkout(workout);
        setCreateDate(undefined);
        setInitialComplete(true);
        setIsEditModalOpen(true);
    };

    const handleCreate = (date: Date) => {
        setEditingWorkout(null);
        setCreateDate(date);
        setIsEditModalOpen(true);
    };

    const handleActivityClick = (activity: NonNullable<WorkoutWithLinkedActivity['linkedActivity']>, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedActivity(activity);
        setIsActivityModalOpen(true);
    };

    return (
        <ErrorBoundary componentName="Training Plan" showRetry>
            <div className="min-h-screen bg-background p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
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

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        {/* Weeks List */}
                        <div className="space-y-6">
                            {sortedWeeks.map((weekStartIso, index) => {
                                const weekStart = new Date(weekStartIso);
                                const weekEnd = addDays(weekStart, 6);
                                const weeksUntilRace = differenceInWeeks(raceDate, weekStart);
                                const phase = getPhase(weeksUntilRace);
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
                                        <div className="p-4 border-b border-glass-border flex flex-col md:flex-row md:items-center justify-between bg-surface sticky top-0 z-10 backdrop-blur-md gap-2">
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
                                                        onAdd={() => handleCreate(dayDate)}
                                                    >
                                                        {dayWorkouts.map((workout) => (
                                                            <DraggableWorkout
                                                                key={workout.id}
                                                                workout={workout}
                                                                isTodayItem={isTodayItem}
                                                                onClick={() => handleEdit(workout)}
                                                                onComplete={(e) => handleComplete(workout, e)}
                                                                onActivityClick={handleActivityClick}
                                                            />
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
                    activity={selectedActivity as any}
                />
                <Footer />
            </div>
        </ErrorBoundary>
    );
}
