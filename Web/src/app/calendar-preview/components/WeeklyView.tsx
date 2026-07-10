'use client';

import { useMemo } from 'react';
import { addDays, format, isToday } from 'date-fns';
import { Check, Clock, MapPin, Heart, TrendingUp, AlertCircle } from 'lucide-react';
import type { WeekEntry } from './metrics';
import { fmtDuration, fmtKm, fmtPace } from './metrics';
import { colorsFor } from './workoutColors';

interface WeeklyViewProps {
    weeks: WeekEntry[];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyView({ weeks }: WeeklyViewProps) {
    if (weeks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                No data in range.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-4">
            {weeks.map((week, idx) => (
                <WeekCard key={week.weekStart.toISOString()} week={week} highlight={idx === weeks.length - 1} />
            ))}
        </div>
    );
}

function WeekCard({ week, highlight }: { week: WeekEntry; highlight: boolean }) {
    const days = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i)),
        [week],
    );

    return (
        <div className={`rounded-xl border bg-zinc-900 overflow-hidden ${highlight ? 'border-orange-500/30' : 'border-zinc-800'}`}>
            {/* summary bar */}
            <WeekSummary week={week} />

            {/* 7-day rows */}
            <div className="divide-y divide-zinc-800/60">
                {days.map((day, i) => {
                    const key = day.toISOString().split('T')[0];
                    const dayEntry = week.days.find((d) => d.date === key);
                    return <DayRow key={key} day={day} dayName={DAY_NAMES[i]} entry={dayEntry} />;
                })}
            </div>
        </div>
    );
}

function WeekSummary({ week }: { week: WeekEntry }) {
    const tsbPositive = week.tsb >= 0;
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-100">{week.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
                <Stat label="TRIMP" value={week.trimp.toFixed(0)} className="text-red-400" />
                <Stat label="Distance" value={fmtKm(week.distance)} className="text-blue-400" />
                <Stat
                    label="VO₂"
                    value={week.avgVdot != null ? week.avgVdot.toFixed(1) : '—'}
                    className="text-emerald-400"
                />
                <Stat label="CTL" value={week.ctl.toFixed(0)} className="text-green-400" />
                <Stat label="ATL" value={week.atl.toFixed(0)} className="text-orange-400" />
                <Stat
                    label="TSB"
                    value={`${week.tsb >= 0 ? '+' : ''}${week.tsb.toFixed(0)}`}
                    className={tsbPositive ? 'text-green-400' : 'text-red-400'}
                />
                {week.plannedTss > 0 && (
                    <Stat
                        label="Planned"
                        value={week.plannedTss.toFixed(0)}
                        className="text-zinc-400"
                    />
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <span className="inline-flex items-baseline gap-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</span>
            <span className={`font-medium ${className ?? 'text-zinc-300'}`}>{value}</span>
        </span>
    );
}

function DayRow({ day, dayName, entry }: { day: Date; dayName: string; entry?: import('./metrics').DayEntry }) {
    const today = isToday(day);
    const trimp = entry?.trimp ?? 0;
    const fill = trimpFillBg(trimp);

    const activities = entry?.activities ?? [];
    const planned = entry?.workouts ?? [];
    const unfulfilled = planned.filter((w) => !w.completed);

    return (
        <div className={`flex items-stretch hover:bg-zinc-800/30 transition-colors ${fill}`}>
            {/* date column */}
            <div className="w-16 shrink-0 flex flex-col items-center justify-center py-2 border-r border-zinc-800/50">
                <span className="text-[10px] text-zinc-500 uppercase">{dayName}</span>
                <span className={`text-base font-semibold ${today ? 'text-orange-400' : 'text-zinc-200'}`}>
                    {format(day, 'd')}
                </span>
                {trimp > 0 && <span className="text-[9px] text-zinc-600">{trimp.toFixed(0)}</span>}
            </div>

            {/* cards */}
            <div className="flex-1 flex flex-wrap gap-1.5 py-2 px-3">
                {activities.length === 0 && unfulfilled.length === 0 && (
                    <span className="text-xs text-zinc-600 italic self-center">Rest</span>
                )}

                {/* completed activities */}
                {activities.map((a) => {
                    const c = colorsFor(a.type);
                    const pace = a.duration > 0 ? fmtPace(a.duration / (a.distance / 1000)) : null;
                    return (
                        <div
                            key={a.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${c.bg} ${c.text} ring-1 ring-inset ring-zinc-700/40`}
                        >
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="font-medium">{a.name}</span>
                            <span className="flex items-center gap-0.5 text-zinc-400">
                                <MapPin className="w-3 h-3" />
                                {fmtKm(a.distance)}
                            </span>
                            <span className="flex items-center gap-0.5 text-zinc-400">
                                <Clock className="w-3 h-3" />
                                {fmtDuration(a.duration)}
                            </span>
                            {pace && <span className="text-zinc-400">{pace}</span>}
                            {a.averageHr != null && (
                                <span className="flex items-center gap-0.5 text-zinc-400">
                                    <Heart className="w-3 h-3" />
                                    {a.averageHr}
                                </span>
                            )}
                            {a.vdot != null && (
                                <span className="flex items-center gap-0.5 text-emerald-400">
                                    <TrendingUp className="w-3 h-3" />
                                    {a.vdot.toFixed(1)}
                                </span>
                            )}
                            {a.trimp != null && (
                                <span className="text-red-400/80">TRIMP {a.trimp.toFixed(0)}</span>
                            )}
                        </div>
                    );
                })}

                {/* planned-only workouts */}
                {unfulfilled.map((w) => {
                    const c = colorsFor(w.type);
                    return (
                        <div
                            key={w.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${c.bg} ${c.text} border border-dashed border-zinc-700 opacity-80`}
                            title="Planned — not yet completed"
                        >
                            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="font-medium">{w.name}</span>
                            {w.targetDistance ? (
                                <span className="flex items-center gap-0.5 text-zinc-400">
                                    <MapPin className="w-3 h-3" />
                                    {fmtKm(w.targetDistance)}
                                </span>
                            ) : null}
                            {w.targetDuration ? (
                                <span className="flex items-center gap-0.5 text-zinc-400">
                                    <Clock className="w-3 h-3" />
                                    {fmtDuration(w.targetDuration)}
                                </span>
                            ) : null}
                            {w.plannedTss ? (
                                <span className="text-zinc-500">TSS {w.plannedTss.toFixed(0)}</span>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function trimpFillBg(trimp: number): string {
    if (trimp <= 0) return '';
    if (trimp < 20) return 'bg-emerald-500/5';
    if (trimp < 40) return 'bg-emerald-500/10';
    if (trimp < 70) return 'bg-yellow-500/10';
    if (trimp < 100) return 'bg-orange-500/12';
    if (trimp < 140) return 'bg-red-500/15';
    return 'bg-red-600/20';
}
