'use client';

import React from 'react';
import {
    Plus,
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    Repeat,
} from 'lucide-react';
import type {
    RepeatGroup,
    StructuredStep,
} from '@/lib/plans/structured';
import type { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { StepNodeList } from './StepNodeList';

export interface RepeatGroupCardProps {
    group: RepeatGroup;
    onChange: (updated: RepeatGroup) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    depth: number;
    resolvedSport: 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
    trainingPaces: ReturnType<typeof calculateTrainingPaces>;
    ftpWatts: number;
}

export function RepeatGroupCard({
    group,
    onChange,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    depth,
    resolvedSport,
    trainingPaces,
    ftpWatts,
}: RepeatGroupCardProps) {
    const handleTimesChange = (val: number) => {
        const clamped = Math.max(1, Math.min(100, Math.round(val || 1)));
        onChange({ ...group, times: clamped });
    };

    const handleRestToggle = (enabled: boolean) => {
        if (!enabled) {
            onChange({ ...group, setRest: undefined });
        } else {
            onChange({ ...group, setRest: { type: 'time', seconds: 60 } });
        }
    };

    const handleRestSeconds = (sec: number) => {
        onChange({ ...group, setRest: { type: 'time', seconds: Math.max(1, isNaN(sec) ? 60 : sec) } });
    };

    const handleRestMeters = (meters: number) => {
        onChange({ ...group, setRest: { type: 'distance', meters: Math.max(1, isNaN(meters) ? 100 : meters) } });
    };

    const handleRestTypeChange = (type: 'time' | 'distance') => {
        if (type === 'distance') {
            onChange({ ...group, setRest: { type: 'distance', meters: 200 } });
        } else {
            onChange({ ...group, setRest: { type: 'time', seconds: 60 } });
        }
    };

    const addChildStep = () => {
        const newChild: StructuredStep = {
            kind: 'work',
            duration: { type: 'distance', meters: 400 },
            target: {
                type: 'pace',
                unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                min: trainingPaces.interval,
                max: trainingPaces.interval,
                zoneLabel: 'I',
            },
        };
        onChange({ ...group, steps: [...group.steps, newChild] });
    };

    const addNestedGroup = () => {
        if (depth >= 2) return;
        const nested: RepeatGroup = {
            kind: 'repeat',
            times: 2,
            steps: [
                {
                    kind: 'work',
                    duration: { type: 'distance', meters: 200 },
                },
            ],
        };
        onChange({ ...group, steps: [...group.steps, nested] });
    };

    return (
        <div className="border border-workout-tempo/30 bg-background-secondary rounded-md p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-workout-tempo" />
                    <span className="font-semibold text-foreground text-xs">Repeat Block</span>
                    <div className="flex items-center gap-1 bg-background-tertiary px-1.5 py-0.5 rounded border border-glass-border">
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={group.times}
                            onChange={(e) => handleTimesChange(parseInt(e.target.value, 10))}
                            className="w-10 bg-transparent text-center font-mono text-xs text-foreground focus:outline-none"
                        />
                        <span className="text-[10px] text-foreground-muted">times</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={isFirst}
                        onClick={onMoveUp}
                        className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-background-tertiary disabled:opacity-30"
                        title="Move Up"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={isLast}
                        onClick={onMoveDown}
                        className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-background-tertiary disabled:opacity-30"
                        title="Move Down"
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDuplicate}
                        className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-background-tertiary"
                        title="Duplicate Block"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 rounded text-foreground-muted hover:text-negative hover:bg-negative/10"
                        title="Delete Block"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Set Rest Configuration */}
            <div className="flex items-center gap-2 text-[11px] text-foreground-secondary pl-5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!group.setRest}
                        onChange={(e) => handleRestToggle(e.target.checked)}
                        className="rounded border-glass-border text-workout-tempo focus:ring-0"
                    />
                    <span>Rest between sets:</span>
                </label>
                {group.setRest && (
                    <div className="flex items-center gap-1.5">
                        <select
                            value={group.setRest.type === 'distance' ? 'distance' : 'time'}
                            onChange={(e) => handleRestTypeChange(e.target.value as 'time' | 'distance')}
                            className="bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                        >
                            <option value="time">Time</option>
                            <option value="distance">Distance</option>
                        </select>
                        {group.setRest.type === 'distance' ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={1}
                                    max={100000}
                                    value={group.setRest.meters}
                                    onChange={(e) => handleRestMeters(parseInt(e.target.value, 10))}
                                    className="w-16 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                                />
                                <span className="text-[10px] text-foreground-muted">m</span>
                            </div>
                        ) : group.setRest.type === 'time' ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={1}
                                    max={3600}
                                    value={group.setRest.seconds}
                                    onChange={(e) => handleRestSeconds(parseInt(e.target.value, 10))}
                                    className="w-14 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                                />
                                <span className="text-[10px] text-foreground-muted">sec</span>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Nested Child Steps */}
            <div className="pl-3 border-l-2 border-workout-tempo/30 space-y-2 mt-2">
                <StepNodeList
                    nodes={group.steps}
                    onChange={(updatedSteps) => onChange({ ...group, steps: updatedSteps })}
                    depth={depth + 1}
                    resolvedSport={resolvedSport}
                    trainingPaces={trainingPaces}
                    ftpWatts={ftpWatts}
                />
                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={addChildStep}
                        className="flex items-center gap-1 text-[11px] text-accent-blue hover:underline font-medium"
                    >
                        <Plus className="w-3 h-3" />
                        <span>Add Step in Repeat</span>
                    </button>
                    {depth < 2 && (
                        <button
                            type="button"
                            onClick={addNestedGroup}
                            className="flex items-center gap-1 text-[11px] text-workout-tempo hover:underline font-medium ml-2"
                        >
                            <Repeat className="w-3 h-3" />
                            <span>Add Nested Repeat</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
