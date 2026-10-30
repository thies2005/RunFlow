'use client';

import { useMemo } from 'react';
import { addDays, format, isSameMonth, isToday, startOfMonth, endOfMonth, startOfWeek } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { DayEntry } from './metrics';
import { fmtKm } from './metrics';
import { colorsFor } from './workoutColors';
import type { MockActivity, MockWorkout } from './mockData';

interface MonthlyViewProps {
    month: Date;
    days: Map<string, DayEntry>;
    weeksCount?: number;
    onWorkoutClick?: (workout: MockWorkout) => void;
    onActivityClick?: (activity: MockActivity) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthlyView({ month, days, weeksCount, onWorkoutClick, onActivityClick }: MonthlyViewProps) {
    const weeks = useMemo(() => {
        const monthStart = startOfMonth(month);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        if (weeksCount === 4) {
            const rows: Date[][] = [];
            let cur = gridStart;
            for (let w = 0; w < 4; w++) {
                rows.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)));
                cur = addDays(cur, 7);
            }
            return rows;
        }
        const monthEnd = endOfMonth(month);
        const rows: Date[][] = [];
        let cur = gridStart;
        while (cur <= monthEnd) {
            rows.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)));
            cur = addDays(cur, 7);
        }
        return rows;
    }, [month, weeksCount]);

    const gridRowsClass =
        weeks.length === 4
            ? 'grid-rows-4'
            : weeks.length === 5
            ? 'grid-rows-5'
            : 'grid-rows-6';

    return (
        <div className="flex flex-col h-full">
            {/* weekday header */}
            <div className="grid grid-cols-7 border-b border-line sticky top-0 bg-background z-10">
                {DAY_LABELS.map((d) => (
                    <div
                        key={d}
                        className="text-center text-[11px] font-medium text-foreground-muted py-1.5"
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* grid */}
            <div className={`flex-1 grid ${gridRowsClass} min-h-0`}>
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 min-h-0">
                        {week.map((day) => (
                            <DayCell
                                key={day.toISOString()}
                                day={day}
                                month={month}
                                days={days}
                                onWorkoutClick={onWorkoutClick}
                                onActivityClick={onActivityClick}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DayCell({
    day,
    month,
    days,
    onWorkoutClick,
    onActivityClick,
}: {
    day: Date;
    month: Date;
    days: Map<string, DayEntry>;
    onWorkoutClick?: (workout: MockWorkout) => void;
    onActivityClick?: (activity: MockActivity) => void;
}) {
    const key = format(day, 'yyyy-MM-dd');
    const { isOver, setNodeRef } = useDroppable({
        id: `day-${key}`,
        data: { date: key },
    });

    const entry = days.get(key);
    const inMonth = isSameMonth(day, month);
    const today = isToday(day);

    const trimp = entry?.trimp ?? 0;
    const fill = trimpFillBg(trimp);

    const plannedWorkouts = entry?.workouts ?? [];
    const completedActivities = entry?.activities ?? [];
    const hasUnfinishedPlan = plannedWorkouts.some((w) => !w.completed);

    return (
        <div
            ref={setNodeRef}
            className={`
                relative flex flex-col p-1 border-b border-r border-line min-h-[78px]
                ${fill || 'bg-background'}
                ${!inMonth ? 'opacity-75' : ''}
                ${today ? 'ring-1 ring-inset ring-accent-orange' : ''}
                ${isOver ? 'ring-2 ring-inset ring-accent-orange bg-accent-orange/10' : ''}
                hover:brightness-110 transition-[filter]
            `}
            title={entry ? `${format(day, 'EEE d')}: TRIMP ${trimp.toFixed(0)} · ${completedActivities.length} done / ${plannedWorkouts.length} planned` : format(day, 'EEE d')}
        >
            <div className="flex items-center justify-between">
                <span
                    className={`text-[11px] leading-none ${today ? 'text-accent-orange font-bold' : inMonth ? 'text-foreground-secondary' : 'text-foreground-muted'}`}
                >
                    {format(day, 'd')}
                </span>
                {trimp > 0 && (
                    <span className="text-[9px] text-foreground-muted font-medium font-mono">{trimp.toFixed(0)}</span>
                )}
            </div>

            {/* workout dots / planned dots */}
            {entry && (
                <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                    {/* completed activities */}
                    {completedActivities.slice(0, 3).map((a) => {
                        const c = colorsFor(a.type);
                        return (
                            <div
                                key={a.id}
                                onClick={() => onActivityClick?.(a)}
                                className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-none cursor-pointer hover:brightness-110 ${c.bg} ${c.text} truncate`}
                                title="Completed activity — click for details"
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                <span className="truncate">{a.name}</span>
                                {a.distance > 0 && <span className="opacity-70 shrink-0 font-mono">{fmtKm(a.distance)}</span>}
                            </div>
                        );
                    })}
                    {/* planned-only workouts (draggable) */}
                    {plannedWorkouts.filter((w) => !w.completed).slice(0, 2).map((w) => (
                        <MonthlyDraggableWorkoutPill
                            key={w.id}
                            workout={w}
                            onClick={() => onWorkoutClick?.(w)}
                        />
                    ))}
                </div>
            )}

            {/* leftover count */}
            {entry && completedActivities.length + plannedWorkouts.filter((w) => !w.completed).length > 5 && (
                <span className="text-[8px] text-foreground-muted mt-0.5">
                    +{completedActivities.length + plannedWorkouts.filter((w) => !w.completed).length - 5}
                </span>
            )}

            {/* unfulfilled-plan indicator */}
            {hasUnfinishedPlan && entry && completedActivities.length === 0 && (
                <span className="absolute bottom-0.5 right-1 text-[8px] text-workout-tempo" title="Planned, not yet completed">●</span>
            )}
        </div>
    );
}

function MonthlyDraggableWorkoutPill({
    workout,
    onClick,
}: {
    workout: MockWorkout;
    onClick?: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: workout.id,
        data: { workout },
    });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 40,
          }
        : undefined;

    const c = colorsFor(workout.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-none border border-dashed border-foreground/20 cursor-pointer select-none transition-all ${
                isDragging ? 'opacity-50 ring-1 ring-accent-orange' : 'opacity-80 hover:opacity-100 hover:brightness-110'
            } ${c.bg} ${c.text} truncate`}
            title="Planned workout — click for details, drag to reschedule"
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
            <span className="truncate">{workout.name}</span>
            {workout.targetDistance ? <span className="opacity-70 shrink-0 font-mono">{fmtKm(workout.targetDistance)}</span> : null}
        </div>
    );
}

/** daily-load background ramp (Runalyze red-intensity style, adapted for dark) */
function trimpFillBg(trimp: number): string {
    if (trimp <= 0) return 'bg-background-secondary';
    if (trimp < 20) return 'bg-zone-1/10';
    if (trimp < 40) return 'bg-zone-1/20';
    if (trimp < 70) return 'bg-zone-3/20';
    if (trimp < 100) return 'bg-zone-4/25';
    if (trimp < 140) return 'bg-zone-5/30';
    return 'bg-zone-5/45';
}
