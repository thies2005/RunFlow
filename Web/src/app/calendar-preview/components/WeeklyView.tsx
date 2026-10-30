'use client';

import { useMemo } from 'react';
import { addDays, format, isToday } from 'date-fns';
import { Check, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import { downloadWorkoutFit } from '@/lib/plans/fit-export';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';
import type { WeekEntry } from './metrics';
import { fmtDuration, fmtKm, fmtPace } from './metrics';
import { colorsFor } from './workoutColors';
import type { MockActivity, MockWorkout } from './mockData';

interface WeeklyViewProps {
    weeks: WeekEntry[];
    onWorkoutClick?: (workout: MockWorkout) => void;
    onActivityClick?: (activity: MockActivity) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyView({ weeks, onWorkoutClick, onActivityClick }: WeeklyViewProps) {
    if (weeks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-foreground-muted text-sm">
                No data in range.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-4">
            {weeks.map((week, idx) => (
                <WeekCard
                    key={week.weekStart.toISOString()}
                    week={week}
                    highlight={idx === weeks.length - 1}
                    onWorkoutClick={onWorkoutClick}
                    onActivityClick={onActivityClick}
                />
            ))}
        </div>
    );
}

function WeekCard({
    week,
    highlight,
    onWorkoutClick,
    onActivityClick,
}: {
    week: WeekEntry;
    highlight: boolean;
    onWorkoutClick?: (workout: MockWorkout) => void;
    onActivityClick?: (activity: MockActivity) => void;
}) {
    const days = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i)),
        [week],
    );

    return (
        <div className={`rounded-md border bg-background-secondary overflow-hidden ${highlight ? 'border-accent-orange/40' : 'border-line'}`}>
            {/* summary bar */}
            <WeekSummary week={week} />

            {/* 7-day rows */}
            <div className="divide-y divide-glass-border">
                {days.map((day, i) => {
                    const key = day.toISOString().split('T')[0];
                    const dayEntry = week.days.find((d) => d.date === key);
                    return (
                        <DayRow
                            key={key}
                            day={day}
                            dayName={DAY_NAMES[i]}
                            entry={dayEntry}
                            onWorkoutClick={onWorkoutClick}
                            onActivityClick={onActivityClick}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function WeekSummary({ week }: { week: WeekEntry }) {
    const tsbPositive = week.tsb >= 0;
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 border-b border-line bg-background-secondary">
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{week.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
                <Stat label="TRIMP" value={week.trimp.toFixed(0)} className="text-negative" />
                <Stat label="Distance" value={fmtKm(week.distance)} className="text-accent-blue" />
                <Stat
                    label="VO₂"
                    value={week.avgVdot != null ? week.avgVdot.toFixed(1) : '—'}
                    className="text-positive"
                />
                <Stat label="CTL" value={week.ctl.toFixed(0)} className="text-accent-blue" />
                <Stat label="ATL" value={week.atl.toFixed(0)} className="text-workout-tempo" />
                <Stat
                    label="TSB"
                    value={`${week.tsb >= 0 ? '+' : ''}${week.tsb.toFixed(0)}`}
                    className={tsbPositive ? 'text-positive' : 'text-negative'}
                />
                <Stat
                    label="TSS"
                    value={`${week.tss.toFixed(0)} / ${week.plannedTss.toFixed(0)}`}
                    className="text-workout-tempo"
                />
            </div>
        </div>
    );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <span className="inline-flex items-baseline gap-1">
            <span className="text-[10px] text-foreground-muted">{label}</span>
            <span className={`font-medium font-mono ${className ?? 'text-foreground-secondary'}`}>{value}</span>
        </span>
    );
}

function DayRow({
    day,
    dayName: _dayName,
    entry,
    onWorkoutClick,
    onActivityClick,
}: {
    day: Date;
    dayName: string;
    entry?: import('./metrics').DayEntry;
    onWorkoutClick?: (workout: MockWorkout) => void;
    onActivityClick?: (activity: MockActivity) => void;
}) {
    const key = format(day, 'yyyy-MM-dd');
    const { isOver, setNodeRef } = useDroppable({
        id: `day-${key}`,
        data: { date: key },
    });

    const today = isToday(day);
    const trimp = entry?.trimp ?? 0;
    const fill = trimpFillBg(trimp);

    const activities = entry?.activities ?? [];
    const planned = entry?.workouts ?? [];
    const unfulfilled = planned.filter((w) => !w.completed);

    return (
        <div
            ref={setNodeRef}
            id={today ? 'calendar-today-anchor' : undefined}
            className={`flex items-stretch hover:bg-background-tertiary transition-colors ${fill} ${
                isOver ? 'ring-2 ring-inset ring-accent-orange bg-accent-orange/5' : ''
            }`}
        >
            {/* date column */}
            <div className="w-16 shrink-0 flex flex-col items-center justify-center py-2 border-r border-line">
                <span className="text-[10px] text-foreground-muted">{format(day, 'EEE')}</span>
                <span className={`text-base font-semibold font-mono ${today ? 'text-accent-orange' : 'text-foreground'}`}>
                    {format(day, 'd')}
                </span>
                {trimp > 0 && <span className="text-[9px] text-foreground-muted font-mono">{trimp.toFixed(0)}</span>}
            </div>

            {/* cards */}
            <div className="flex-1 flex flex-wrap items-center gap-1.5 py-2 px-3">
                {activities.length === 0 && unfulfilled.length === 0 && (
                    <span className="text-xs text-foreground-muted italic self-center">Rest</span>
                )}

                {/* completed activities */}
                {activities.map((a) => {
                    const c = colorsFor(a.type);
                    const isBike = a.type === 'RIDE' || (a.type as string) === 'VIRTUAL_RIDE' || a.sport === 'BIKE';
                    const isSwim = a.type === 'SWIM' || a.sport === 'SWIM';
                    const isRun = (a.type as string) === 'RUN' || a.sport === 'RUN';

                    let effortMetric: string | null = null;
                    if (isBike) {
                        const titleWattsMatch = (a.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
                        const titleWatts = titleWattsMatch ? parseInt(titleWattsMatch[1], 10) : null;
                        const watts = a.npWatts ?? a.averageWatts ?? (titleWatts && titleWatts >= 40 && titleWatts <= 1500 ? titleWatts : null);
                        if (watts && watts > 0) {
                            effortMetric = `${Math.round(watts)}W`;
                        } else if (a.duration > 0 && a.distance > 0) {
                            effortMetric = `${((a.distance / 1000) / (a.duration / 3600)).toFixed(1)} km/h`;
                        }
                    } else if (isSwim) {
                        if (a.duration > 0 && a.distance > 0) {
                            effortMetric = fmtPace(a.duration / (a.distance / 100), '100m');
                        }
                    } else if (isRun) {
                        if (a.duration > 0 && a.distance > 0) {
                            effortMetric = fmtPace(a.duration / (a.distance / 1000), 'km');
                        }
                    }

                    const loadMetric = isBike && a.bikeTss != null
                        ? `TSS ${Math.round(a.bikeTss)}`
                        : a.trimp != null
                            ? `TRIMP ${Math.round(a.trimp)}`
                            : null;

                    return (
                        <div
                            key={a.id}
                            onClick={() => onActivityClick?.(a)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:brightness-110 transition-[filter] ${c.bg} ${c.text} ring-1 ring-inset ring-foreground/40`}
                            title="Completed activity — click for details"
                        >
                            <Check className="w-3 h-3 text-positive shrink-0" />
                            <span className="font-medium">{a.name}</span>
                            {a.distance > 0 ? (
                                <span className="flex items-center gap-0.5 text-foreground-secondary font-mono">
                                    <MapPin className="w-3 h-3" />
                                    {fmtKm(a.distance)}
                                </span>
                            ) : a.duration > 0 ? (
                                <span className="flex items-center gap-0.5 text-foreground-secondary font-mono">
                                    <Clock className="w-3 h-3" />
                                    {fmtDuration(a.duration)}
                                </span>
                            ) : null}
                            {effortMetric && <span className="text-foreground-secondary font-mono">{effortMetric}</span>}
                            {loadMetric && <span className="text-negative/80 font-mono">{loadMetric}</span>}
                        </div>
                    );
                })}

                {/* planned-only workouts */}
                {unfulfilled.map((w) => (
                    <DraggableWorkoutPill
                        key={w.id}
                        workout={w}
                        onClick={() => onWorkoutClick?.(w)}
                    />
                ))}
            </div>
        </div>
    );
}

function DraggableWorkoutPill({
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
    const isBike = workout.type === 'RIDE' || workout.sport === 'BIKE';
    const isSwim = workout.type === 'SWIM' || workout.sport === 'SWIM';

    const scheduled = new Date(workout.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDue = scheduled < today && !workout.completed;

    const handleExportFit = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            downloadWorkoutFit(workout);
            toast.success('Downloaded .fit file');
        } catch {
            toast.error('Failed to export .fit file');
        }
    };

    const handleExportZwo = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const xml = generateMyWhooshZwoXml({
                name: workout.name,
                description: `Target TSS: ${workout.plannedTss || 50}`,
                workoutType: workout.type,
                targetDurationSeconds: workout.targetDuration || 3600,
                phase: workout.phase,
                structuredSteps: (workout as any).structuredSteps || null,
            });
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(workout.name || workout.type).replace(/[^a-z0-9-_]+/gi, '_')}.zwo`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Downloaded .zwo file');
        } catch {
            toast.error('Failed to export .zwo file');
        }
    };

    let targetChip: string | null = null;
    if (isBike) {
        if (workout.targetPowerMinWatts && workout.targetPowerMaxWatts) {
            targetChip = `${workout.targetPowerMinWatts}-${workout.targetPowerMaxWatts}W`;
        } else if (workout.targetPowerWatts) {
            targetChip = `${workout.targetPowerWatts}W`;
        }
    } else if (isSwim) {
        if (workout.targetPaceMinSecondsPerKm) {
            targetChip = fmtPace(workout.targetPaceMinSecondsPerKm, '100m');
        }
    } else {
        if (workout.targetPaceMinSecondsPerKm && workout.targetPaceMaxSecondsPerKm) {
            targetChip = `${fmtPace(workout.targetPaceMinSecondsPerKm, '')}–${fmtPace(workout.targetPaceMaxSecondsPerKm, 'km')}`;
        } else if (workout.targetPaceMinSecondsPerKm) {
            targetChip = fmtPace(workout.targetPaceMinSecondsPerKm, 'km');
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer select-none transition-all ${
                isDragging ? 'opacity-50 ring-2 ring-accent-orange' : 'opacity-90 hover:opacity-100 hover:brightness-110'
            } ${c.bg} ${c.text} border border-dashed border-foreground/20`}
            title="Planned workout — click for details, drag to reschedule"
        >
            {isPastDue ? (
                <span title="Past due" className="inline-flex shrink-0">
                    <AlertCircle className="w-3 h-3 text-workout-tempo" />
                </span>
            ) : (
                <span title="Scheduled" className="inline-flex shrink-0">
                    <Clock className="w-3 h-3 text-foreground-muted" />
                </span>
            )}
            <span className="font-medium">{workout.name}</span>
            {workout.targetDistance ? (
                <span className="flex items-center gap-0.5 text-foreground-secondary font-mono">
                    <MapPin className="w-3 h-3" />
                    {fmtKm(workout.targetDistance)}
                </span>
            ) : workout.targetDuration ? (
                <span className="flex items-center gap-0.5 text-foreground-secondary font-mono">
                    <Clock className="w-3 h-3" />
                    {fmtDuration(workout.targetDuration)}
                </span>
            ) : null}
            {targetChip && (
                <span className="text-foreground-secondary font-mono font-medium">{targetChip}</span>
            )}
            {workout.plannedTss != null && workout.plannedTss > 0 && (
                <span className="text-foreground-muted font-mono">TSS {workout.plannedTss.toFixed(0)}</span>
            )}
            <div className="flex items-center gap-1 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={handleExportFit}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-background-tertiary hover:bg-background border border-line text-foreground-muted hover:text-foreground"
                    title="Export as Garmin/Wahoo/Coros .fit"
                >
                    .FIT
                </button>
                {isBike && (
                    <button
                        type="button"
                        onClick={handleExportZwo}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-background-tertiary hover:bg-background border border-line text-accent-cyan hover:text-accent-cyan"
                        title="Export as MyWhoosh/Zwift .zwo"
                    >
                        .ZWO
                    </button>
                )}
            </div>
        </div>
    );
}

function trimpFillBg(trimp: number): string {
    if (trimp <= 0) return '';
    if (trimp < 20) return 'bg-zone-1/5';
    if (trimp < 40) return 'bg-zone-1/10';
    if (trimp < 70) return 'bg-zone-3/10';
    if (trimp < 100) return 'bg-zone-4/15';
    if (trimp < 140) return 'bg-zone-5/20';
    return 'bg-zone-5/30';
}
