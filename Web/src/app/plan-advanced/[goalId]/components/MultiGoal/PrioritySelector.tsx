'use client';

import type { GoalPriority } from '../Progression/types';
import { PRIORITY_CONFIG } from '../Progression/types';

interface PrioritySelectorProps {
    value: GoalPriority;
    onChange: (priority: GoalPriority) => void;
    hasPrimary: boolean;
}

const PRIORITIES: GoalPriority[] = ['PRIMARY', 'SECONDARY', 'TUNE_UP', 'MILESTONE'];

const DESCRIPTIONS: Record<GoalPriority, string> = {
    PRIMARY: 'Main race goal',
    SECONDARY: 'Important secondary race',
    TUNE_UP: 'Preparation race',
    MILESTONE: 'Training milestone',
};

export function PrioritySelector({ value, onChange, hasPrimary }: PrioritySelectorProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Priority</label>
            <div className="grid grid-cols-2 gap-1.5">
                {PRIORITIES.map((p) => {
                    const config = PRIORITY_CONFIG[p];
                    const isDisabled = p === 'PRIMARY' && hasPrimary;
                    const isSelected = value === p;

                    return (
                        <button
                            key={p}
                            type="button"
                            onClick={() => !isDisabled && onChange(p)}
                            disabled={isDisabled}
                            className={`flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors ${
                                isDisabled
                                    ? 'opacity-30 cursor-not-allowed border-zinc-800'
                                    : isSelected
                                        ? config.color
                                        : 'border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-300'
                            }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isDisabled ? 'bg-zinc-600' : config.dotColor}`} />
                                <span className="text-xs font-medium">{config.label}</span>
                            </div>
                            <span className="text-[10px] mt-0.5 opacity-70">{DESCRIPTIONS[p]}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
