'use client';

import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';
import type { IntervalProgression } from '../Progression/types';
import { weekTotalDistance } from '../Progression/types';

interface ProgressionTimelineProps {
    progression: IntervalProgression;
    currentWeek?: number;
    onWeekClick?: (weekIndex: number) => void;
}

export function ProgressionTimeline({ progression, currentWeek, onWeekClick }: ProgressionTimelineProps) {
    const { weeks, workoutType } = progression;
    if (!weeks || weeks.length === 0) return null;

    const distances = weeks.map(weekTotalDistance);
    const maxDistance = Math.max(...distances, 1);
    const typeColor = WORKOUT_COLORS[workoutType] || WORKOUT_COLORS.OTHER;

    return (
        <div className="space-y-2">
            <h4 className="text-xs font-medium text-zinc-400">Volume Timeline</h4>
            <div className="flex items-end gap-1.5 h-32 px-1">
                {weeks.map((week, i) => {
                    const dist = distances[i];
                    const heightPct = (dist / maxDistance) * 100;
                    const isCurrent = currentWeek !== undefined && week.weekOffset === currentWeek;
                    const isDeload = i > 0 && i % 4 === 3;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onWeekClick?.(i)}
                            className={`flex-1 flex flex-col items-center justify-end min-w-0 group ${onWeekClick ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                            <span className="text-[9px] text-zinc-500 mb-0.5 group-hover:text-zinc-300 transition-colors">
                                {dist >= 1000 ? `${(dist / 1000).toFixed(1)}` : `${dist}`}
                            </span>
                            <div className="w-full relative">
                                <div
                                    className={`w-full rounded-t transition-colors ${
                                        isCurrent
                                            ? typeColor.dot
                                            : isDeload
                                                ? 'bg-zinc-600'
                                                : `${typeColor.dot} opacity-70`
                                    }`}
                                    style={{ height: `${Math.max(heightPct, 2)}px` }}
                                />
                            </div>
                            <span className={`text-[9px] mt-1 ${isCurrent ? 'text-zinc-200 font-medium' : 'text-zinc-600'}`}>
                                {week.weekOffset}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-sm ${typeColor.dot}`} />
                    {workoutType}
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-zinc-600" />
                    Deload
                </span>
                {currentWeek !== undefined && (
                    <span className="ml-auto">
                        Current: Week {currentWeek}
                    </span>
                )}
            </div>
        </div>
    );
}
