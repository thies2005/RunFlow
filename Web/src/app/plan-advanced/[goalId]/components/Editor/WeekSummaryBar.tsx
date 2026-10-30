'use client';

import { PlanPhase } from './PhaseSelector';
import { PhaseSelector } from './PhaseSelector';
import { Target } from 'lucide-react';

const PHASE_COLORS: Record<PlanPhase, string> = {
    BASE: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30',
    BUILD: 'bg-workout-tempo/10 text-workout-tempo border-workout-tempo/30',
    PEAK: 'bg-workout-long-run/10 text-workout-long-run border-workout-long-run/30',
    TAPER: 'bg-workout-recovery/10 text-workout-recovery border-workout-recovery/30',
    RACE_WEEK: 'bg-workout-race/10 text-workout-race border-workout-race/30',
    RECOVERY: 'bg-workout-recovery/10 text-workout-recovery border-workout-recovery/30',
    OFF: 'bg-foreground/20 text-foreground-secondary border-foreground/30',
};

interface WeekSummaryBarProps {
    weekIndex: number;
    phase: PlanPhase;
    runDistance: number;
    swimDistance: number;
    bikeDuration: number;
    strengthDuration?: number;
    actualWeekTss?: number;
    plannedTss?: number;
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
    strengthDuration = 0,
    actualWeekTss = 0,
    plannedTss = 0,
    focusGoal,
    goalId,
    onPhaseChange,
}: WeekSummaryBarProps) {
    const phaseColor = PHASE_COLORS[phase] || PHASE_COLORS.OFF;

    const hasTss = plannedTss > 0 || actualWeekTss > 0;
    const pct = plannedTss > 0 ? Math.round((actualWeekTss / plannedTss) * 100) : 0;
    const complianceBadgeClass =
        pct >= 85 && pct <= 115
            ? 'bg-positive/15 text-positive border-positive/30'
            : (pct >= 60 && pct < 85) || (pct > 115 && pct <= 135)
            ? 'bg-workout-tempo/15 text-workout-tempo border-workout-tempo/30'
            : 'bg-negative/15 text-negative border-negative/30';

    return (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-glass-border bg-background-secondary">
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">Week <span className="font-mono tabular-nums">{weekIndex}</span></span>
                <PhaseSelector
                    currentPhase={phase}
                    goalId={goalId}
                    weekIndex={weekIndex}
                    onPhaseChange={onPhaseChange}
                />
            </div>
            <div className="flex items-center gap-3">
                {runDistance > 0 && (
                    <span className="text-xs text-accent-blue font-medium font-mono tabular-nums">
                        🏃 {(runDistance / 1000).toFixed(1)}k
                    </span>
                )}
                {swimDistance > 0 && (
                    <span className="text-xs text-accent-blue font-medium font-mono tabular-nums">
                        🏊 {swimDistance >= 1000 ? `${(swimDistance / 1000).toFixed(1)}k` : `${swimDistance}m`}
                    </span>
                )}
                {bikeDuration > 0 && (
                    <span className="text-xs text-positive font-medium font-mono tabular-nums">
                        🚴 {Math.round(bikeDuration / 60)}m
                    </span>
                )}
                {strengthDuration > 0 && (
                    <span className="text-xs text-foreground font-medium font-mono tabular-nums">
                        🏋️ {Math.round(strengthDuration / 60)}m
                    </span>
                )}
                {hasTss && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${complianceBadgeClass}`}>
                        Effort: {actualWeekTss} / {plannedTss} TSS ({pct}%)
                    </span>
                )}
                {focusGoal && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive/10 text-positive text-xs border border-positive/30">
                        <Target className="w-3 h-3" />
                        {focusGoal}
                    </span>
                )}
            </div>
        </div>
    );
}
