'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, EyeOff } from 'lucide-react';
import { format, addDays, isToday, isSameDay, differenceInWeeks, isBefore } from 'date-fns';
import {
    DndContext,
    useSensor,
    useSensors,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
} from '@dnd-kit/core';
import { DraggableWorkout } from '@/app/plan/components/DraggableWorkout';
import { DroppableDay } from '@/app/plan/components/DroppableDay';
import { getPhase, formatDuration, RUN_TYPES } from '@/lib/plan/utils';
import { ErrorBoundary, Footer } from '@/components';
import { isRunningActivity, isCrossTrainingActivity, type WorkoutWithLinkedActivity, type PlanResponse } from '@/lib/types';

interface PlanViewProps {
    data: PlanResponse | undefined;
    isLoading: boolean;
    showUnlinked: boolean;
    setShowUnlinked: (show: boolean) => void;
    sensors: ReturnType<typeof useSensors>;
    handleDragEnd: (event: DragEndEvent) => void;
    handleEdit: (workout: WorkoutWithLinkedActivity) => void;
    handleComplete: (workout: WorkoutWithLinkedActivity, e: React.MouseEvent) => void;
    handleCreate: (date: Date) => void;
    handleActivityClick: (activity: NonNullable<WorkoutWithLinkedActivity['linkedActivity']>, e: React.MouseEvent) => void;
    showHeader?: boolean;
}

export function PlanView({
    data,
    isLoading,
    showUnlinked,
    setShowUnlinked,
    sensors,
    handleDragEnd,
    handleEdit,
    handleComplete,
    handleCreate,
    handleActivityClick,
    showHeader = true,
}: PlanViewProps) {
    const router = useRouter();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading plan...</div>;
    }

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
    const raceDate = !isNaN(raceDateObj.getTime()) ? raceDateObj : new Date();
    const workouts = goal.workouts || [];

    // Group by Week
    const weeks: Record<string, WorkoutWithLinkedActivity[]> = {};
    workouts.forEach((w) => {
        const d = new Date(w.scheduledDate);
        if (isNaN(d.getTime())) return;
        try {
            const { startOfWeek } = require('date-fns');
            const monday = startOfWeek(d, { weekStartsOn: 1 }).toISOString();
            if (!weeks[monday]) weeks[monday] = [];
            weeks[monday].push(w);
        } catch (e) {
            console.warn('Invalid workout date:', w);
        }
    });

    const sortedWeeks = Object.keys(weeks).sort().filter(weekStartIso => {
        const { startOfWeek } = require('date-fns');
        const weekStart = new Date(weekStartIso);
        if (isNaN(weekStart.getTime())) return false;

        if (goal.planStartDate) {
            const planStartObj = new Date(goal.planStartDate);
            if (!isNaN(planStartObj.getTime())) {
                const planStart = startOfWeek(planStartObj, { weekStartsOn: 1 });
                if (weekStart < planStart) return false;
            }
        }

        if (!isNaN(raceDate.getTime())) {
            const raceWeekStart = startOfWeek(raceDate, { weekStartsOn: 1 });
            if (weekStart > raceWeekStart) return false;
        }

        return true;
    });

    return (
        <ErrorBoundary componentName="Training Plan" showRetry>
            <div className="min-h-screen bg-background p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    {showHeader && (
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
                    )}

                    {!showHeader && (
                        <div className="flex items-center justify-between pt-4">
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{goal.name} Plan</h1>
                                <p className="text-foreground-muted text-xs flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Race: {format(raceDate, 'MMM d, yyyy')}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUnlinked(!showUnlinked)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${showUnlinked
                                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                                    : 'bg-surface text-foreground-muted hover:text-foreground border border-glass-border'
                                    }`}
                            >
                                {showUnlinked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                        </div>
                    )}

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        {/* Weeks List */}
                        <div className="space-y-6">
                            {sortedWeeks.map((weekStartIso, index) => {
                                const { startOfWeek } = require('date-fns');
                                const weekStart = new Date(weekStartIso);
                                const weekEnd = addDays(weekStart, 6);
                                const weeksUntilRace = differenceInWeeks(raceDate, weekStart);
                                const phase = getPhase(weeksUntilRace);
                                const weekWorkouts = weeks[weekStartIso];

                                const isPastOrCurrent = isBefore(weekStart, new Date());

                                let plannedMileage = 0;
                                let actualRunMileage = 0;
                                let totalMovingTime = 0;
                                let runTime = 0;
                                let crossTime = 0;

                                weekWorkouts.forEach((w) => {
                                    if (RUN_TYPES.includes(w.workoutType) && (w.targetDistance ?? 0) > 0) {
                                        plannedMileage += (w.targetDistance ?? 0);
                                    }

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

                                        {/* Days Grid */}
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

                                                        {/* Unlinked Activities */}
                                                        {showUnlinked && data?.unlinkedActivities?.filter(a =>
                                                            isSameDay(new Date(a.startDate), dayDate)
                                                        ).map((activity) => (
                                                            <div
                                                                key={activity.id}
                                                                onClick={() => {
                                                                    handleActivityClick(activity as any, {} as React.MouseEvent);
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

                {showHeader && <Footer />}
            </div>
        </ErrorBoundary>
    );
}

export default PlanView;
