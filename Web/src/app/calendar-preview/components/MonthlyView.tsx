'use client';

import { useMemo } from 'react';
import { addDays, format, isSameMonth, isToday, startOfMonth, endOfMonth, startOfWeek } from 'date-fns';
import type { DayEntry } from './metrics';
import { fmtKm } from './metrics';
import { colorsFor } from './workoutColors';

interface MonthlyViewProps {
    month: Date;
    days: Map<string, DayEntry>;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthlyView({ month, days }: MonthlyViewProps) {
    const weeks = useMemo(() => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const rows: Date[][] = [];
        let cur = gridStart;
        while (cur <= monthEnd) {
            rows.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)));
            cur = addDays(cur, 7);
        }
        return rows;
    }, [month]);

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
            <div className="flex-1 grid grid-rows-6 min-h-0">
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 min-h-0">
                        {week.map((day) => (
                            <DayCell key={day.toISOString()} day={day} month={month} days={days} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DayCell({ day, month, days }: { day: Date; month: Date; days: Map<string, DayEntry> }) {
    const key = day.toISOString().split('T')[0];
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
            className={`
                relative flex flex-col p-1 border-b border-r border-line min-h-[78px]
                ${inMonth ? fill : 'bg-background'}
                ${today ? 'ring-1 ring-inset ring-accent-orange' : ''}
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
                {trimp > 0 && inMonth && (
                    <span className="text-[9px] text-foreground-muted font-medium font-mono">{trimp.toFixed(0)}</span>
                )}
            </div>

            {/* workout dots / planned dots */}
            {inMonth && entry && (
                <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                    {/* completed activities */}
                    {completedActivities.slice(0, 3).map((a) => {
                        const c = colorsFor(a.type);
                        return (
                            <div
                                key={a.id}
                                className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-none ${c.bg} ${c.text} truncate`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                <span className="truncate">{a.name}</span>
                                {a.distance > 0 && <span className="opacity-70 shrink-0">{fmtKm(a.distance)}</span>}
                            </div>
                        );
                    })}
                    {/* planned-only workouts (lighter, dashed feel) */}
                    {plannedWorkouts.filter((w) => !w.completed).slice(0, 2).map((w) => {
                        const c = colorsFor(w.type);
                        return (
                            <div
                                key={w.id}
                                className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-none border border-dashed border-foreground/20 ${c.bg} ${c.text} opacity-70 truncate`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                <span className="truncate">{w.name}</span>
                                {w.targetDistance ? <span className="opacity-70 shrink-0">{fmtKm(w.targetDistance)}</span> : null}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* leftover count */}
            {inMonth && entry && completedActivities.length + plannedWorkouts.filter((w) => !w.completed).length > 5 && (
                <span className="text-[8px] text-foreground-muted mt-0.5">
                    +{completedActivities.length + plannedWorkouts.filter((w) => !w.completed).length - 5}
                </span>
            )}

            {/* unfulfilled-plan indicator */}
            {inMonth && hasUnfinishedPlan && entry && completedActivities.length === 0 && (
                <span className="absolute bottom-0.5 right-1 text-[8px] text-workout-tempo" title="Planned, not yet completed">●</span>
            )}
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
