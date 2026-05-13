'use client';

import { Target } from 'lucide-react';
import type { GoalPriority } from '../Progression/types';
import { PRIORITY_CONFIG } from '../Progression/types';
import type { PlanPhase } from '../Editor/PhaseSelector';

interface MultiGoalPhaseLabelProps {
    phase: PlanPhase;
    focusGoalName?: string;
    focusGoalPriority?: GoalPriority;
}

export function MultiGoalPhaseLabel({
    phase,
    focusGoalName,
    focusGoalPriority,
}: MultiGoalPhaseLabelProps) {
    if (!focusGoalName || !focusGoalPriority) return null;

    const config = PRIORITY_CONFIG[focusGoalPriority] || PRIORITY_CONFIG.SECONDARY;

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${config.color}`}>
            <Target className="w-2.5 h-2.5" />
            {phase}
            <span className="opacity-60">&rarr;</span>
            {focusGoalName}
        </span>
    );
}
