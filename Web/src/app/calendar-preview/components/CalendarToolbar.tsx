'use client';

import { ChevronLeft, ChevronRight, CalendarDays, Rows3, Activity } from 'lucide-react';

export type CalendarViewMode = 'month' | 'week';

interface CalendarToolbarProps {
    mode: CalendarViewMode;
    onModeChange: (_mode: CalendarViewMode) => void;
    /** current period label, e.g. "July 2026" or "06 Jul – 12 Jul" */
    label: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export function CalendarToolbar({
    mode,
    onModeChange,
    label,
    onPrev,
    onNext,
    onToday,
}: CalendarToolbarProps) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border border-zinc-800 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => onModeChange('month')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                            mode === 'month'
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        }`}
                        title="Monthly grid"
                    >
                        <CalendarDays className="w-3.5 h-3.5" />
                        Month
                    </button>
                    <button
                        type="button"
                        onClick={() => onModeChange('week')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                            mode === 'week'
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        }`}
                        title="Weekly list"
                    >
                        <Rows3 className="w-3.5 h-3.5" />
                        Week
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onPrev}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    title="Previous"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-zinc-100 min-w-[140px] text-center">
                    {label}
                </span>
                <button
                    type="button"
                    onClick={onNext}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    title="Next"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={onToday}
                    className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                >
                    Today
                </button>
            </div>

            <TrimpLegend />
        </div>
    );
}

/** Runalyze-style daily-load colour ramp legend. */
function TrimpLegend() {
    const tiers: { label: string; cls: string }[] = [
        { label: 'Rest', cls: 'bg-zinc-700/60' },
        { label: 'Easy', cls: 'bg-emerald-500/30' },
        { label: 'Mod', cls: 'bg-yellow-500/30' },
        { label: 'Hard', cls: 'bg-orange-500/35' },
        { label: 'Max', cls: 'bg-red-600/45' },
    ];
    return (
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Activity className="w-3 h-3 text-zinc-600" />
            <span>Load</span>
            <div className="flex items-center gap-0.5">
                {tiers.map((t) => (
                    <div key={t.label} className="flex items-center gap-0.5">
                        <span className={`w-3.5 h-3.5 rounded-sm ${t.cls}`} />
                    </div>
                ))}
            </div>
            <span>low → high</span>
        </div>
    );
}
