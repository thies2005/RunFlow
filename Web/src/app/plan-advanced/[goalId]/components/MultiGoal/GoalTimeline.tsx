'use client';

import { useMemo } from 'react';
import type { Goal } from '../Progression/types';
import { PRIORITY_CONFIG } from '../Progression/types';
import { GoalTimelineMarker } from './GoalTimelineMarker';

interface GoalTimelineProps {
    goals: Goal[];
    planStartDate: Date;
    planEndDate: Date;
    currentWeek: number;
    onMarkerClick: (goalId: string) => void;
}

export function GoalTimeline({
    goals,
    planStartDate,
    planEndDate,
    currentWeek,
    onMarkerClick,
}: GoalTimelineProps) {
    const totalMs = planEndDate.getTime() - planStartDate.getTime();
    if (totalMs <= 0 || goals.length === 0) return null;

    const markers = useMemo(() => {
        return goals
            .filter((g) => g.raceDate)
            .map((g) => {
                const eventDate = new Date(g.raceDate!);
                const offsetMs = eventDate.getTime() - planStartDate.getTime();
                const x = Math.max(0, Math.min(100, (offsetMs / totalMs) * 100));
                return { goal: g, x };
            })
            .sort((a, b) => a.x - b.x);
    }, [goals, planStartDate, totalMs]);

    const currentX = useMemo(() => {
        const totalDays = totalMs / (24 * 60 * 60 * 1000);
        if (totalDays <= 0) return 0;
        return Math.max(0, Math.min(100, ((currentWeek - 1) * 7 / totalDays) * 100));
    }, [currentWeek, totalMs]);

    const phases = useMemo(() => {
        const sorted = markers.map((m) => m.x);
        return sorted;
    }, [markers]);

    return (
        <div className="relative px-4 py-2 border-b border-zinc-800">
            <div className="relative h-10">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-800" />

                {phases.map((x, i) => (
                    <div
                        key={i}
                        className="absolute top-4 w-px h-3 bg-zinc-700"
                        style={{ left: `${x}%` }}
                    />
                ))}

                <div
                    className="absolute top-1 w-px h-7 bg-zinc-500"
                    style={{ left: `${currentX}%` }}
                >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 whitespace-nowrap mt-2">
                        Now
                    </span>
                </div>

                {markers.map(({ goal, x }) => (
                    <GoalTimelineMarker
                        key={goal.id}
                        goal={goal}
                        x={x}
                        onClick={() => onMarkerClick(goal.id)}
                    />
                ))}
            </div>
        </div>
    );
}
