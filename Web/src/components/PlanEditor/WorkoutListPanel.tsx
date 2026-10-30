'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    GripVertical,
    Copy,
    Clipboard,
    ChevronDown,
    ChevronUp,
    Activity,
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import {
    DndContext,
    useDraggable,
    useDroppable,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { WORKOUT_COLORS } from '@/app/plan-advanced/[goalId]/components/Shared/WorkoutTypeColors';
import { useSelection } from '@/app/plan-advanced/[goalId]/components/MassEdit/SelectionOverlay';
import { WeekSummaryBar } from '@/app/plan-advanced/[goalId]/components/Editor/WeekSummaryBar';
import type { PlanPhase } from '@/app/plan-advanced/[goalId]/components/Editor/PhaseSelector';
import type { Workout } from './WorkoutDetailPanel';
import { calculateWorkoutPlannedTss, calculateProjectedFitness, type PlannedDailyLoad } from '@/lib/metrics/plannedTss';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface WeekData {
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
    copiedWeekStart?: string | null;
    onCopyWeek?: (weekStartIso: string) => void;
}

// ---------------------------------------------------------------------------
// Draggable Workout Item
// ---------------------------------------------------------------------------

function DraggableWorkoutItem({
    workout,
    isSelected,
    onClick,
}: {
    workout: Workout;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: workout.id,
        data: { workout },
    });

    const style: React.CSSProperties = {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 50 : undefined,
    };

    const colors = WORKOUT_COLORS[workout.workoutType] || WORKOUT_COLORS.OTHER;
    const name = workout.customName || workout.workoutType.replace(/_/g, ' ');

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer select-none transition-all ${
                isSelected
                    ? `${colors.bg} ring-1 ring-foreground-muted`
                    : `${colors.bg} hover:brightness-125`
            } ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-accent-blue scale-105' : ''}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 text-foreground-muted hover:text-foreground shrink-0"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="w-3 h-3" />
            </div>

            <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
            {workout.isCompleted && (
                <span className="text-positive font-bold text-xs shrink-0" title="Completed">✓</span>
            )}
            <span className={`truncate max-w-[220px] sm:max-w-[280px] font-medium ${colors.text}`}>{name}</span>

            {workout.description && (
                <span className="text-foreground-muted truncate max-w-[130px] hidden sm:inline">
                    {workout.description}
                </span>
            )}

            {workout.targetDistance != null && workout.targetDistance > 0 && (
                <span className="text-foreground-muted font-mono shrink-0">
                    {workout.targetDistance >= 1000
                        ? `${(workout.targetDistance / 1000).toFixed(1)}k`
                        : `${workout.targetDistance}m`}
                </span>
            )}

            {workout.plannedTss != null && workout.plannedTss > 0 && (
                <span className="text-workout-tempo/80 font-mono text-[10px] shrink-0">
                    {workout.plannedTss} TSS
                </span>
            )}

            {isSelected && (
                <input
                    type="checkbox"
                    checked
                    readOnly
                    className="w-3 h-3 rounded border-foreground/30 bg-foreground/15 text-foreground-secondary shrink-0"
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Droppable Day Row
// ---------------------------------------------------------------------------

function DroppableDayRow({
    day,
    dayIdx,
    workouts,
    isSelected,
    onWorkoutClick,
    onAddWorkout,
}: {
    day: Date;
    dayIdx: number;
    workouts: Workout[];
    isSelected: (id: string) => boolean;
    onWorkoutClick: (w: Workout, e: React.MouseEvent) => void;
    onAddWorkout: (day: Date) => void;
}) {
    const dayIso = day.toISOString();
    const { setNodeRef, isOver } = useDroppable({
        id: dayIso,
        data: { day },
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center px-4 py-2 transition-colors group ${
                isOver ? 'bg-accent-blue/15 border-l-2 border-accent-blue' : 'hover:bg-background-tertiary/40'
            }`}
        >
            <div className="w-16 shrink-0">
                <span className="text-xs text-foreground-muted font-medium">{DAY_NAMES[dayIdx]}</span>
                <span className="text-xs text-foreground-secondary ml-1.5 font-mono">{format(day, 'd')}</span>
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[28px]">
                {workouts.length === 0 ? (
                    <span className="text-xs text-foreground-muted italic">Rest</span>
                ) : (
                    workouts.map((w) => (
                        <DraggableWorkoutItem
                            key={w.id}
                            workout={w}
                            isSelected={isSelected(w.id)}
                            onClick={(e) => onWorkoutClick(w, e)}
                        />
                    ))
                )}
            </div>

            <button
                type="button"
                onClick={() => onAddWorkout(day)}
                className="ml-auto p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title="Add workout"
            >
                <Plus className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WorkoutListPanel
// ---------------------------------------------------------------------------

export function WorkoutListPanel({
    week,
    goalId,
    focusGoal,
    onWorkoutClick,
    onPhaseChange,
    copiedWeekStart,
    onCopyWeek,
}: WorkoutListPanelProps) {
    const queryClient = useQueryClient();
    const { selectWorkout, isSelected, selectAllInWeek, anchorId, setAnchorId } = useSelection();

    const [showPmcStrip, setShowPmcStrip] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(1.0);
    const [overwriteOnPaste, setOverwriteOnPaste] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i)), [week.weekStart]);

    let runDistance = 0;
    let swimDistance = 0;
    let bikeDuration = 0;
    let strengthDuration = 0;
    let totalPlannedTss = 0;
    let actualWeekTss = 0;

    for (const w of week.workouts) {
        const isBike =
            w.sport === 'BIKE' ||
            w.workoutType.includes('RIDE') ||
            w.workoutType === 'BRICK' ||
            (w.customName && /mywhoosh|zwift|indoor bike|trainer/i.test(w.customName));
        const isSwim = w.sport === 'SWIM' || w.workoutType.includes('SWIM');
        const isStrength =
            w.sport === 'STRENGTH' ||
            w.workoutType === 'STRENGTH' ||
            (w.customName && /strength|gym|core|weights/i.test(w.customName));

        if (isSwim) {
            swimDistance += w.targetDistance || 0;
        } else if (isBike) {
            bikeDuration += w.targetDuration || 0;
        } else if (isStrength) {
            strengthDuration += w.targetDuration || 0;
        } else if (w.workoutType !== 'CROSS_TRAINING' && w.workoutType !== 'REST') {
            runDistance += w.targetDistance || 0;
        }

        const tss = w.plannedTss ?? calculateWorkoutPlannedTss(w as any);
        if (tss) totalPlannedTss += tss;

        if (w.isCompleted) {
            const actTss =
                (w as any).actualTss ??
                (w.plannedTss ?? (isStrength ? Math.round(((w.targetDuration || 3000) / 3600) * 36) : (tss || 40)));
            actualWeekTss += actTss;
        }
    }

    const weekPhase = (week.workouts[0]?.phase as PlanPhase) || 'BASE';

    // Move workout via Drag-and-Drop mutation
    const moveWorkoutMutation = useMutation({
        mutationFn: async ({ workoutId, scheduledDate }: { workoutId: string; scheduledDate: string }) => {
            // Snapshot first
            await fetch(`/api/plan-advanced/${goalId}/snapshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: 'Auto-snapshot before rescheduling workout',
                    operation: 'reschedule_workout',
                }),
            });

            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/${workoutId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledDate }),
            });
            if (!res.ok) throw new Error('Failed to move workout');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Workout rescheduled');
        },
        onError: () => {
            toast.error('Failed to reschedule workout');
        },
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const targetDayIso = over.id as string;
        const workout = active.data.current?.workout as Workout;

        if (workout && targetDayIso) {
            const targetDate = new Date(targetDayIso);
            const currentDate = new Date(workout.scheduledDate);
            if (!isSameDay(targetDate, currentDate)) {
                targetDate.setHours(currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
                moveWorkoutMutation.mutate({
                    workoutId: workout.id,
                    scheduledDate: targetDate.toISOString(),
                });
            }
        }
    };

    const createWorkoutMutation = useMutation({
        mutationFn: async (date: Date) => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduledDate: date.toISOString(),
                    workoutType: 'EASY',
                    sport: 'RUN',
                    description: 'Easy Run: 5.0km',
                    targetDistance: 5000,
                    targetDuration: 1500,
                    phase: weekPhase,
                }),
            });
            if (!res.ok) throw new Error('Failed to create workout');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Workout added');
            if (data?.workout) {
                onWorkoutClick(data.workout);
            }
        },
        onError: () => {
            toast.error('Failed to add workout');
        },
    });

    // Copy / Paste Week Mutation
    const copyWeekMutation = useMutation({
        mutationFn: async ({
            sourceWeekStart,
            targetWeekStart,
            scaleFactor,
            overwrite,
        }: {
            sourceWeekStart: string;
            targetWeekStart: string;
            scaleFactor?: number;
            overwrite?: boolean;
        }) => {
            const res = await fetch(`/api/plan-advanced/${goalId}/copy-week`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceWeekStart,
                    targetWeekStart,
                    scaleFactor,
                    overwrite,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to copy week');
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success(`Copied ${data.count} workouts to Week ${week.weekNumber}`);
            setShowPasteModal(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to paste week');
        },
    });

    const handleCopyWeek = () => {
        const iso = week.weekStart.toISOString();
        if (onCopyWeek) {
            onCopyWeek(iso);
        }
        toast.success(`Week ${week.weekNumber} copied to clipboard`);
    };

    const handlePasteClick = () => {
        if (!copiedWeekStart) {
            toast.error('No week in clipboard. Click "Copy Week" on a source week first.');
            return;
        }
        setShowPasteModal(true);
    };

    const handleExecutePaste = () => {
        if (!copiedWeekStart) return;
        copyWeekMutation.mutate({
            sourceWeekStart: copiedWeekStart,
            targetWeekStart: week.weekStart.toISOString(),
            scaleFactor,
            overwrite: overwriteOnPaste,
        });
    };

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
        [selectWorkout, anchorId, setAnchorId, onWorkoutClick]
    );

    const allWorkoutsSelected = week.workouts.length > 0 && week.workouts.every((w) => isSelected(w.id));

    // Mini PMC metrics calculation
    const miniPmcMetrics = useMemo(() => {
        const loads: PlannedDailyLoad[] = days.map((d) => {
            const dayWorkouts = week.workouts.filter((w) => isSameDay(new Date(w.scheduledDate), d));
            let planned = 0;
            for (const w of dayWorkouts) {
                const tss = w.plannedTss ?? calculateWorkoutPlannedTss(w as any);
                if (tss) planned += tss;
            }
            return {
                date: d,
                plannedTss: planned,
                actualTss: 0,
            };
        });

        const points = calculateProjectedFitness(loads, { initialCtl: 50, initialAtl: 50 });
        const last = points[points.length - 1];
        return {
            plannedTss: totalPlannedTss,
            ctl: last?.plannedCtl ?? 50,
            atl: last?.plannedAtl ?? 50,
            tsb: last?.plannedTsb ?? 0,
        };
    }, [days, week.workouts, totalPlannedTss]);

    return (
        <div className="mx-4 mb-3 rounded-md border border-glass-border bg-background-secondary overflow-hidden shadow-sm">
            {/* Week Summary Bar */}
            <WeekSummaryBar
                weekIndex={week.weekNumber}
                phase={weekPhase}
                runDistance={runDistance}
                swimDistance={swimDistance}
                bikeDuration={bikeDuration}
                strengthDuration={strengthDuration}
                actualWeekTss={actualWeekTss}
                plannedTss={totalPlannedTss}
                focusGoal={focusGoal}
                goalId={goalId}
                onPhaseChange={onPhaseChange}
            />

            {/* Sub-header Controls: Select All, Copy/Paste, Mini-PMC Toggle */}
            <div className="px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 bg-background-tertiary/30 border-b border-glass-border">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allWorkoutsSelected}
                            onChange={() => selectAllInWeek(week.workouts)}
                            className="w-3.5 h-3.5 rounded border-foreground/25 bg-background-tertiary text-foreground-secondary focus:ring-foreground-muted"
                        />
                        <span className="text-[10px] text-foreground-muted">Select all</span>
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowPmcStrip(!showPmcStrip)}
                        className="flex items-center gap-1 text-[10px] text-foreground-muted hover:text-foreground font-mono"
                    >
                        <Activity className="w-3 h-3 text-workout-tempo" />
                        <span>PMC: {miniPmcMetrics.plannedTss} TSS</span>
                        {showPmcStrip ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleCopyWeek}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-background-tertiary hover:bg-background-tertiary/80 text-foreground-secondary hover:text-foreground border border-glass-border transition-colors"
                        title="Copy Week"
                    >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                    </button>

                    <button
                        type="button"
                        onClick={handlePasteClick}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-background-tertiary hover:bg-background-tertiary/80 text-foreground-secondary hover:text-foreground border border-glass-border transition-colors"
                        title="Paste Week"
                    >
                        <Clipboard className="w-3 h-3 text-accent-blue" />
                        <span>Paste</span>
                    </button>
                </div>
            </div>

            {/* Collapsible Mini-PMC Strip */}
            {showPmcStrip && (
                <div className="px-4 py-2 bg-background-tertiary/50 border-b border-glass-border flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-foreground-muted text-[10px] uppercase block">Proj. CTL</span>
                            <span className="text-accent-blue font-semibold">{miniPmcMetrics.ctl}</span>
                        </div>
                        <div>
                            <span className="text-foreground-muted text-[10px] uppercase block">Proj. ATL</span>
                            <span className="text-workout-tempo font-semibold">{miniPmcMetrics.atl}</span>
                        </div>
                        <div>
                            <span className="text-foreground-muted text-[10px] uppercase block">Proj. TSB</span>
                            <span
                                className={`font-semibold ${
                                    miniPmcMetrics.tsb >= 0 ? 'text-positive' : 'text-negative'
                                }`}
                            >
                                {miniPmcMetrics.tsb > 0 ? `+${miniPmcMetrics.tsb}` : miniPmcMetrics.tsb}
                            </span>
                        </div>
                    </div>
                    <div className="text-[10px] text-foreground-muted font-sans">
                        Week load: {miniPmcMetrics.plannedTss} TSS
                    </div>
                </div>
            )}

            {/* Drag & Drop Context for Days */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="divide-y divide-glass-border">
                    {days.map((day, dayIdx) => {
                        const dayWorkouts = week.workouts.filter((w) =>
                            isSameDay(new Date(w.scheduledDate), day)
                        );

                        return (
                            <DroppableDayRow
                                key={day.toISOString()}
                                day={day}
                                dayIdx={dayIdx}
                                workouts={dayWorkouts}
                                isSelected={isSelected}
                                onWorkoutClick={handleWorkoutClick}
                                onAddWorkout={(d) => createWorkoutMutation.mutate(d)}
                            />
                        );
                    })}
                </div>
            </DndContext>

            {/* Paste Week Modal with Scaling */}
            {showPasteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-background-secondary border border-glass-border rounded-lg p-4 max-w-sm w-full space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-foreground">
                                Paste Week to Week {week.weekNumber}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowPasteModal(false)}
                                className="text-foreground-muted hover:text-foreground"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-[11px] text-foreground-muted mb-1">
                                    Volume / Watt Scaling Factor
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0.8"
                                        max="1.2"
                                        step="0.05"
                                        value={scaleFactor}
                                        onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                                        className="w-full accent-accent-blue"
                                    />
                                    <span className="font-mono text-xs w-10 text-right">
                                        {Math.round(scaleFactor * 100)}%
                                    </span>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={overwriteOnPaste}
                                    onChange={(e) => setOverwriteOnPaste(e.target.checked)}
                                    className="rounded border-glass-border text-accent-blue"
                                />
                                <span className="text-[11px] text-foreground-secondary">
                                    Overwrite existing workouts in target week
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-glass-border">
                            <button
                                type="button"
                                onClick={() => setShowPasteModal(false)}
                                className="px-2.5 py-1 rounded text-xs text-foreground-muted hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecutePaste}
                                disabled={copyWeekMutation.isPending}
                                className="px-3 py-1 rounded bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 disabled:opacity-50"
                            >
                                {copyWeekMutation.isPending ? 'Pasting...' : 'Paste Workouts'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkoutListPanel;
