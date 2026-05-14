'use client';

import { PlanPhase } from './PhaseSelector';
import { PhaseSelector } from './PhaseSelector';
import { Target } from 'lucide-react';

const PHASE_COLORS: Record<PlanPhase, string> = {
    BASE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    BUILD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    PEAK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    TAPER: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    RACE_WEEK: 'bg-green-500/20 text-green-400 border-green-500/30',
    RECOVERY: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    OFF: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

interface WeekSummaryBarProps {
    weekIndex: number;
    phase: PlanPhase;
    runDistance: number;
    swimDistance: number;
    bikeDuration: number;
    focusGoal?: string;
    goalId: string;
    onPhaseChange: (phase: PlanPhase) => void;
}

export function WeekSummaryBar({
    weekIndex,
    phase,
    runDistance,
    swimDistance,
    bikeDuration,
    focusGoal,
    goalId,
    onPhaseChange,
}: WeekSummaryBarProps) {
    const phaseColor = PHASE_COLORS[phase] || PHASE_COLORS.OFF;

    return (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-100">Week {weekIndex}</span>
                <PhaseSelector
                    currentPhase={phase}
                    goalId={goalId}
                    weekIndex={weekIndex}
                    onPhaseChange={onPhaseChange}
                />
            </div>
            <div className="flex items-center gap-3">
                {runDistance > 0 && (
                    <span className="text-xs text-blue-400 font-medium">
                        🏃 {(runDistance / 1000).toFixed(1)}k
                    </span>
                )}
                {swimDistance > 0 && (
                    <span className="text-xs text-cyan-400 font-medium">
                        🏊 {swimDistance >= 1000 ? `${(swimDistance / 1000).toFixed(1)}k` : `${swimDistance}m`}
                    </span>
                )}
                {bikeDuration > 0 && (
                    <span className="text-xs text-emerald-400 font-medium">
                        🚴 {Math.round(bikeDuration / 60)}m
                    </span>
                )}
                {focusGoal && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                        <Target className="w-3 h-3" />
                        {focusGoal}
                    </span>
                )}
            </div>
        </div>
    );
}
