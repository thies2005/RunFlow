'use client';

import { useState } from 'react';
import type { Goal } from '../Progression/types';
import { PRIORITY_CONFIG } from '../Progression/types';

interface GoalTimelineMarkerProps {
    goal: Goal;
    x: number;
    onClick: () => void;
}

export function GoalTimelineMarker({ goal, x, onClick }: GoalTimelineMarkerProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const config = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG.SECONDARY;

    return (
        <div
            className="absolute"
            style={{ left: `${x}%`, transform: 'translateX(-50%)' }}
        >
            <div
                className="w-0.5 h-3 mx-auto"
                style={{ backgroundColor: goal.priority === 'PRIMARY' ? '#facc15' : undefined }}
            >
                <div className={`w-2.5 h-2.5 rounded-full -mt-1 mx-auto cursor-pointer hover:scale-125 transition-transform ${config.dotColor}`} />
            </div>
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-[7px] text-zinc-400 hover:text-zinc-200 whitespace-nowrap mt-0.5 block"
                style={{
                    maxWidth: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {goal.name}
            </button>
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-200 whitespace-nowrap z-10 pointer-events-none">
                    <div className="font-medium">{goal.name}</div>
                    <div className="text-zinc-400">
                        {goal.raceDate ? new Date(goal.raceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                    </div>
                    <div className={`inline-block mt-0.5 px-1 rounded text-[9px] border ${config.color}`}>
                        {config.label}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-700" />
                </div>
            )}
        </div>
    );
}
