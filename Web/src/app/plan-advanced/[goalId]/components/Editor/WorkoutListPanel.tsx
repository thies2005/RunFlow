'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GripVertical, Dumbbell } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';
import { useSelection } from '../MassEdit/SelectionOverlay';
import { WeekSummaryBar } from './WeekSummaryBar';
import type { PlanPhase } from './PhaseSelector';
import type { Workout } from './WorkoutDetailPanel';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekData {
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    workouts: Workout[];
}

interface WorkoutListPanelProps {
    week: WeekData;
    goalId: string;
    focusGoal?: string;
    onWorkoutClick: (workout: Workout) => void;
    onPhaseChange: (phase: PlanPhase) => void;
}

export function WorkoutListPanel({ week, goalId, focusGoal, onWorkoutClick, onPhaseChange }: WorkoutListPanelProps) {
    const queryClient = useQueryClient();
    const { selectWorkout, isSelected, selectAllInWeek, anchorId, setAnchorId } = useSelection();
    const [dragId, setDragId] = useState<string | null>(null);

    const days = Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i));
    
    let runDistance = 0;
    let swimDistance = 0;
    let bikeDuration = 0;

    for (const w of week.workouts) {
        if (w.workoutType.includes('SWIM')) {
            swimDistance += (w.targetDistance || 0);
        } else if (w.workoutType.includes('RIDE') || w.workoutType === 'BRICK') {
            bikeDuration += (w.targetDuration || 0);
        } else if (w.workoutType !== 'STRENGTH' && w.workoutType !== 'CROSS_TRAINING' && w.workoutType !== 'REST') {
            runDistance += (w.targetDistance || 0);
        }
    }

    const weekPhase = (week.workouts[0]?.phase as PlanPhase) || 'BASE';

    const createWorkoutMutation = useMutation({
        mutationFn: async (date: Date) => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduledDate: date.toISOString(),
                    workoutType: 'EASY',
                    description: '',
                    targetDistance: null,
                    targetDuration: null,
                    phase: weekPhase,
                }),
            });
            if (!res.ok) throw new Error('Failed to create workout');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Workout added');
        },
        onError: () => {
            toast.error('Failed to add workout');
        },
    });

    const handleWorkoutClick = useCallback(
        (workout: Workout, e: React.MouseEvent) => {
            const multi = e.ctrlKey || e.metaKey;
            const range = e.shiftKey;

            if (multi || range) {
                e.stopPropagation();
            }

            selectWorkout(workout.id, multi, range, anchorId ?? undefined);

            if (!multi && !range) {
                setAnchorId(workout.id);
            }

            if (!multi && !range) {
                onWorkoutClick(workout);
            }
        },
        [selectWorkout, anchorId, setAnchorId, onWorkoutClick],
    );

    const allWorkoutsSelected = week.workouts.length > 0 && week.workouts.every((w) => isSelected(w.id));

    return (
        <div className="mx-4 mb-3 rounded-xl border border-glass-border bg-background-secondary overflow-hidden">
            <WeekSummaryBar
                weekIndex={week.weekNumber}
                phase={weekPhase}
                runDistance={runDistance}
                swimDistance={swimDistance}
                bikeDuration={bikeDuration}
                focusGoal={focusGoal}
                goalId={goalId}
                onPhaseChange={onPhaseChange}
            />

            <div className="px-4 py-1.5 flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={allWorkoutsSelected}
                    onChange={() => selectAllInWeek(week.workouts)}
                    className="w-3.5 h-3.5 rounded border-foreground/25 bg-background-tertiary text-foreground-secondary focus:ring-foreground-muted"
                />
                <span className="text-[10px] text-foreground-muted uppercase tracking-wide">Select all in week</span>
            </div>

            <div className="divide-y divide-glass-border">
                {days.map((day, dayIdx) => {
                    const dayWorkouts = week.workouts.filter((w) =>
                        isSameDay(new Date(w.scheduledDate), day),
                    );

                    return (
                        <div key={day.toISOString()} className="flex items-center px-4 py-2 hover:bg-background-tertiary/40 transition-colors group">
                            <div className="w-16 shrink-0">
                                <span className="text-xs text-foreground-muted">{DAY_NAMES[dayIdx]}</span>
                                <span className="text-xs text-foreground-secondary ml-1.5">{format(day, 'd')}</span>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-1.5">
                                {dayWorkouts.length === 0 ? (
                                    <span className="text-xs text-foreground-muted italic">Rest</span>
                                ) : (
                                    dayWorkouts.map((w) => {
                                        const colors = WORKOUT_COLORS[w.workoutType] || WORKOUT_COLORS.OTHER;
                                        const selected = isSelected(w.id);
                                        const name = w.customName || w.workoutType.replace(/_/g, ' ');

                                        return (
                                            <div
                                                key={w.id}
                                                onClick={(e) => handleWorkoutClick(w, e)}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                                                    selected
                                                        ? `${colors.bg} ring-1 ring-foreground-muted`
                                                        : `${colors.bg} hover:brightness-125`
                                                } ${dragId === w.id ? 'opacity-40' : ''}`}
                                            >
                                                <GripVertical className="w-3 h-3 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                                                <span className={`truncate max-w-[100px] ${colors.text}`}>{name}</span>
                                                {w.description && (
                                                    <span className="text-foreground-muted truncate max-w-[120px] hidden sm:inline">
                                                        {w.description}
                                                    </span>
                                                )}
                                                {w.targetDistance != null && w.targetDistance > 0 && (
                                                    <span className="text-foreground-muted shrink-0">
                                                        {w.targetDistance >= 1000
                                                            ? `${(w.targetDistance / 1000).toFixed(1)}k`
                                                            : `${w.targetDistance}m`}
                                                    </span>
                                                )}
                                                {selected && (
                                                    <input
                                                        type="checkbox"
                                                        checked
                                                        readOnly
                                                        className="w-3 h-3 rounded border-foreground/30 bg-foreground/15 text-foreground-secondary shrink-0"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => createWorkoutMutation.mutate(day)}
                                className="ml-auto p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                title="Add workout"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
