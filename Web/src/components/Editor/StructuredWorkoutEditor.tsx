'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plus,
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    Repeat,
    Zap,
    Timer,
    MapPin,
    Heart,
    Gauge,
    Sliders,
    Layers,
} from 'lucide-react';
import {
    parseStructuredWorkout,
    flattenStructuredWorkout,
    summarizeStructuredWorkout,
    resolveWorkoutSport,
    calculateMaxNestingDepth,
    type StructuredWorkoutV2,
    type StepNode,
    type RepeatGroup,
    type StructuredStep,
    type Duration,
    type Target,
} from '@/lib/plans/structured';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';

export interface StructuredWorkoutEditorProps {
    value: unknown;
    onChange: (workout: StructuredWorkoutV2) => void;
    workoutType?: string | null;
    sport?: string | null;
    vdot?: number;
    ftpWatts?: number;
    onSummaryChange?: (summary: {
        targetDistance: number;
        targetDuration: number;
        targetPaceMin?: number;
        targetPaceMax?: number;
        targetPowerMinWatts?: number;
        targetPowerMaxWatts?: number;
        plannedTss: number;
    }) => void;
    targetPace?: number;
    paceZoneLabels?: string[];
}

const STEP_KINDS: Array<StructuredStep['kind']> = [
    'warmup',
    'work',
    'recovery',
    'cooldown',
    'steady',
    'transition',
];

const COGGAN_ZONES = [
    { label: 'Z1', name: 'Recovery', minPct: 0, maxPct: 55, color: '#94a3b8' },
    { label: 'Z2', name: 'Endurance', minPct: 55, maxPct: 75, color: '#3b82f6' },
    { label: 'Z3', name: 'Tempo', minPct: 76, maxPct: 90, color: '#10b981' },
    { label: 'Z4', name: 'Threshold', minPct: 91, maxPct: 105, color: '#f59e0b' },
    { label: 'Z5', name: 'VO2Max', minPct: 106, maxPct: 120, color: '#f97316' },
    { label: 'Z6', name: 'Anaerobic', minPct: 121, maxPct: 150, color: '#ef4444' },
    { label: 'Z7', name: 'Neuromusc', minPct: 151, maxPct: 200, color: '#a855f7' },
];

function formatSecondsToMmSs(totalSec: number): string {
    if (!totalSec || isNaN(totalSec) || totalSec <= 0) return '00:00';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.round(totalSec % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseMmSsToSeconds(val: string): number {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (!trimmed.includes(':')) {
        const num = parseFloat(trimmed);
        return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }
    const parts = trimmed.split(':').map((p) => parseFloat(p));
    if (parts.some((p) => isNaN(p))) return 0;
    if (parts.length === 2) {
        return Math.max(0, Math.round(parts[0] * 60 + parts[1]));
    }
    if (parts.length === 3) {
        return Math.max(0, Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]));
    }
    return 0;
}

function getStepColor(step: StructuredStep): string {
    if (step.target?.type === 'power') {
        const pct = step.target.ftpPercent || (step.target.minWatts && step.target.maxWatts ? (step.target.minWatts + step.target.maxWatts) / 4 : 70);
        if (pct < 56) return '#94a3b8';
        if (pct < 76) return '#3b82f6';
        if (pct < 91) return '#10b981';
        if (pct < 106) return '#f59e0b';
        if (pct < 121) return '#f97316';
        if (pct < 151) return '#ef4444';
        return '#a855f7';
    }
    switch (step.kind) {
        case 'warmup':
            return '#0284c7';
        case 'cooldown':
            return '#64748b';
        case 'recovery':
            return '#10b981';
        case 'steady':
            return '#0ea5e9';
        case 'transition':
            return '#8b5cf6';
        case 'work':
        default:
            return '#f97316';
    }
}

export function StructuredWorkoutEditor({
    value,
    onChange,
    workoutType,
    sport,
    vdot = 45,
    ftpWatts = 200,
    onSummaryChange,
    targetPace,
    paceZoneLabels,
}: StructuredWorkoutEditorProps) {
    const resolvedSport = useMemo(() => resolveWorkoutSport(workoutType, sport), [workoutType, sport]);
    const trainingPaces = useMemo(() => calculateTrainingPaces(vdot > 0 ? vdot : 45), [vdot]);

    // Parse incoming value into canonical v2
    const parsedValue = useMemo(() => {
        const parsed = parseStructuredWorkout(value, workoutType || sport, vdot, ftpWatts);
        if (parsed) return parsed;
        // Default workout with Warmup, 4x(400m Work + 60s Rest), Cooldown
        return {
            version: 2 as const,
            source: 'editor' as const,
            steps: [
                {
                    kind: 'warmup' as const,
                    label: 'Warmup',
                    duration: { type: 'distance' as const, meters: 1000 },
                    target: {
                        type: 'pace' as const,
                        unit: resolvedSport === 'SWIM' ? ('sec_per_100m' as const) : ('sec_per_km' as const),
                        min: trainingPaces.easy.min,
                        max: trainingPaces.easy.max,
                        zoneLabel: 'E',
                    },
                },
                {
                    kind: 'repeat' as const,
                    times: 4,
                    setRest: { type: 'time' as const, seconds: 60 },
                    steps: [
                        {
                            kind: 'work' as const,
                            label: 'Interval',
                            duration: { type: 'distance' as const, meters: 400 },
                            target: {
                                type: 'pace' as const,
                                unit: resolvedSport === 'SWIM' ? ('sec_per_100m' as const) : ('sec_per_km' as const),
                                min: trainingPaces.interval,
                                max: trainingPaces.interval,
                                zoneLabel: 'I',
                            },
                        },
                    ],
                },
                {
                    kind: 'cooldown' as const,
                    label: 'Cooldown',
                    duration: { type: 'distance' as const, meters: 1000 },
                    target: {
                        type: 'pace' as const,
                        unit: resolvedSport === 'SWIM' ? ('sec_per_100m' as const) : ('sec_per_km' as const),
                        min: trainingPaces.easy.min,
                        max: trainingPaces.easy.max,
                        zoneLabel: 'E',
                    },
                },
            ],
        };
    }, [value, workoutType, sport, vdot, ftpWatts, resolvedSport, trainingPaces]);

    const [workout, setWorkout] = useState<StructuredWorkoutV2>(parsedValue);

    // Sync if outside value changes significantly
    useEffect(() => {
        if (parsedValue) {
            setWorkout(parsedValue);
        }
    }, [parsedValue]);

    // Live computed summary
    const summary = useMemo(() => {
        return summarizeStructuredWorkout(workout, targetPace, ftpWatts);
    }, [workout, targetPace, ftpWatts]);

    // Flattened steps for preview bar
    const flattenedSteps = useMemo(() => {
        return flattenStructuredWorkout(workout);
    }, [workout]);

    // Sync summary changes back to parent
    useEffect(() => {
        if (onSummaryChange) {
            let minPace: number | undefined;
            let maxPace: number | undefined;
            let minWatts: number | undefined;
            let maxWatts: number | undefined;

            for (const s of flattenedSteps) {
                if (s.target?.type === 'pace') {
                    if (s.target.min) minPace = minPace ? Math.min(minPace, s.target.min) : s.target.min;
                    if (s.target.max) maxPace = maxPace ? Math.max(maxPace, s.target.max) : s.target.max;
                } else if (s.target?.type === 'power') {
                    if (s.target.minWatts) minWatts = minWatts ? Math.min(minWatts, s.target.minWatts) : s.target.minWatts;
                    if (s.target.maxWatts) maxWatts = maxWatts ? Math.max(maxWatts, s.target.maxWatts) : s.target.maxWatts;
                }
            }

            onSummaryChange({
                targetDistance: summary.totalDistanceMeters,
                targetDuration: summary.totalDurationSeconds,
                targetPaceMin: minPace,
                targetPaceMax: maxPace,
                targetPowerMinWatts: minWatts,
                targetPowerMaxWatts: maxWatts,
                plannedTss: summary.estimatedTss,
            });
        }
    }, [flattenedSteps, summary, onSummaryChange]);

    const emitChange = useCallback(
        (updated: StructuredWorkoutV2) => {
            setWorkout(updated);
            onChange(updated);
        },
        [onChange]
    );

    const updateStepNodes = useCallback(
        (newNodes: StepNode[]) => {
            const updated: StructuredWorkoutV2 = {
                ...workout,
                version: 2,
                steps: newNodes,
            };
            emitChange(updated);
        },
        [workout, emitChange]
    );

    const addStep = (kind: StructuredStep['kind'] = 'work') => {
        const newStep: StructuredStep = {
            kind,
            duration: { type: 'distance', meters: 1000 },
            target:
                resolvedSport === 'BIKE'
                    ? { type: 'power', ftpPercent: 75, minWatts: Math.round(ftpWatts * 0.7), maxWatts: Math.round(ftpWatts * 0.8) }
                    : {
                          type: 'pace',
                          unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                          min: trainingPaces.easy.min,
                          max: trainingPaces.easy.max,
                          zoneLabel: 'E',
                      },
        };
        updateStepNodes([...workout.steps, newStep]);
    };

    const addRepeatGroup = () => {
        const currentDepth = calculateMaxNestingDepth(workout.steps);
        if (currentDepth >= 3) return;

        const newGroup: RepeatGroup = {
            kind: 'repeat',
            times: 4,
            setRest: { type: 'time', seconds: 60 },
            steps: [
                {
                    kind: 'work',
                    duration: { type: 'distance', meters: 400 },
                    target:
                        resolvedSport === 'BIKE'
                            ? { type: 'power', ftpPercent: 100, minWatts: Math.round(ftpWatts * 0.95), maxWatts: Math.round(ftpWatts * 1.05) }
                            : {
                                  type: 'pace',
                                  unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                                  min: trainingPaces.interval,
                                  max: trainingPaces.interval,
                                  zoneLabel: 'I',
                              },
                },
            ],
        };
        updateStepNodes([...workout.steps, newGroup]);
    };

    return (
        <div className="space-y-4 text-xs font-sans">
            {/* Live Computed Totals & Summary */}
            <div className="p-3 bg-background-tertiary/40 border border-glass-border rounded-md flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <div>
                        <span className="text-[10px] text-foreground-muted block uppercase tracking-wider font-semibold">Distance</span>
                        <span className="text-sm font-mono font-medium text-foreground">
                            {summary.totalDistanceMeters >= 1000
                                ? `${(summary.totalDistanceMeters / 1000).toFixed(2)} km`
                                : `${summary.totalDistanceMeters} m`}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-glass-border" />
                    <div>
                        <span className="text-[10px] text-foreground-muted block uppercase tracking-wider font-semibold">Duration</span>
                        <span className="text-sm font-mono font-medium text-foreground">
                            {formatSecondsToMmSs(summary.totalDurationSeconds)}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-glass-border" />
                    <div>
                        <span className="text-[10px] text-foreground-muted block uppercase tracking-wider font-semibold">Est. TSS</span>
                        <span className="text-sm font-mono font-medium text-workout-tempo">
                            {summary.estimatedTss}
                        </span>
                    </div>
                </div>
                <div className="text-[11px] text-foreground-secondary truncate max-w-xs font-mono" title={summary.summaryText}>
                    {summary.summaryText || 'Empty structured workout'}
                </div>
            </div>

            {/* SVG/CSS Intensity Bar Preview (height 16) */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                    <span>Intensity Preview</span>
                    <span>{flattenedSteps.length} flattened steps</span>
                </div>
                <div className="h-4 w-full bg-background-tertiary rounded flex overflow-hidden border border-glass-border">
                    {flattenedSteps.length === 0 ? (
                        <div className="w-full h-full bg-foreground/10 flex items-center justify-center text-[9px] text-foreground-muted">
                            No steps
                        </div>
                    ) : (
                        flattenedSteps.map((s, idx) => {
                            const stepDuration =
                                s.duration.type === 'time'
                                    ? s.duration.seconds
                                    : s.duration.type === 'distance'
                                    ? Math.round((s.duration.meters / 1000) * 300)
                                    : 60;
                            const flexGrow = Math.max(1, stepDuration);
                            const color = getStepColor(s);
                            const label = s.label || s.kind;
                            return (
                                <div
                                    key={idx}
                                    style={{ flex: flexGrow, backgroundColor: color }}
                                    className="h-full border-r border-background/20 last:border-0 hover:opacity-80 transition-opacity"
                                    title={`${label} (${s.duration.type === 'distance' ? `${s.duration.meters}m` : s.duration.type === 'time' ? `${s.duration.seconds}s` : 'Lap'})`}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            {/* Step Tree Editor */}
            <div className="space-y-2">
                <StepNodeList
                    nodes={workout.steps}
                    onChange={updateStepNodes}
                    depth={0}
                    resolvedSport={resolvedSport}
                    trainingPaces={trainingPaces}
                    ftpWatts={ftpWatts}
                />
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-glass-border">
                <button
                    type="button"
                    onClick={() => addStep('work')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-background-tertiary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary/80 transition-colors text-xs font-medium"
                >
                    <Plus className="w-3.5 h-3.5 text-accent-blue" />
                    <span>Add Step</span>
                </button>
                <button
                    type="button"
                    onClick={addRepeatGroup}
                    disabled={calculateMaxNestingDepth(workout.steps) >= 3}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-background-tertiary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary/80 transition-colors text-xs font-medium disabled:opacity-40"
                    title={calculateMaxNestingDepth(workout.steps) >= 3 ? 'Maximum nesting depth (3) reached' : 'Add Repeat Group'}
                >
                    <Repeat className="w-3.5 h-3.5 text-workout-tempo" />
                    <span>Add Repeat Group</span>
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// StepNodeList (Handles recursion up to depth 3)
// ---------------------------------------------------------------------------

interface StepNodeListProps {
    nodes: StepNode[];
    onChange: (nodes: StepNode[]) => void;
    depth: number;
    resolvedSport: 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
    trainingPaces: ReturnType<typeof calculateTrainingPaces>;
    ftpWatts: number;
}

function StepNodeList({ nodes, onChange, depth, resolvedSport, trainingPaces, ftpWatts }: StepNodeListProps) {
    const updateNode = (index: number, updated: StepNode) => {
        const copy = [...nodes];
        copy[index] = updated;
        onChange(copy);
    };

    const removeNode = (index: number) => {
        onChange(nodes.filter((_, i) => i !== index));
    };

    const duplicateNode = (index: number) => {
        const target = JSON.parse(JSON.stringify(nodes[index]));
        const copy = [...nodes];
        copy.splice(index + 1, 0, target);
        onChange(copy);
    };

    const moveNode = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= nodes.length) return;
        const copy = [...nodes];
        const [removed] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, removed);
        onChange(copy);
    };

    return (
        <div className="space-y-2">
            {nodes.map((node, idx) => {
                if (node.kind === 'repeat') {
                    return (
                        <RepeatGroupCard
                            key={idx}
                            group={node}
                            onChange={(updated) => updateNode(idx, updated)}
                            onDelete={() => removeNode(idx)}
                            onDuplicate={() => duplicateNode(idx)}
                            onMoveUp={() => moveNode(idx, 'up')}
                            onMoveDown={() => moveNode(idx, 'down')}
                            isFirst={idx === 0}
                            isLast={idx === nodes.length - 1}
                            depth={depth}
                            resolvedSport={resolvedSport}
                            trainingPaces={trainingPaces}
                            ftpWatts={ftpWatts}
                        />
                    );
                }

                return (
                    <StepCard
                        key={idx}
                        step={node}
                        onChange={(updated) => updateNode(idx, updated)}
                        onDelete={() => removeNode(idx)}
                        onDuplicate={() => duplicateNode(idx)}
                        onMoveUp={() => moveNode(idx, 'up')}
                        onMoveDown={() => moveNode(idx, 'down')}
                        isFirst={idx === 0}
                        isLast={idx === nodes.length - 1}
                        resolvedSport={resolvedSport}
                        trainingPaces={trainingPaces}
                        ftpWatts={ftpWatts}
                    />
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// RepeatGroupCard
// ---------------------------------------------------------------------------

interface RepeatGroupCardProps {
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

function RepeatGroupCard({
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
        onChange({ ...group, setRest: { type: 'time', seconds: Math.max(1, sec) } });
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
                {group.setRest && group.setRest.type === 'time' && (
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

// ---------------------------------------------------------------------------
// StepCard
// ---------------------------------------------------------------------------

interface StepCardProps {
    step: StructuredStep;
    onChange: (updated: StructuredStep) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    resolvedSport: 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
    trainingPaces: ReturnType<typeof calculateTrainingPaces>;
    ftpWatts: number;
}

function StepCard({
    step,
    onChange,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    resolvedSport,
    trainingPaces,
    ftpWatts,
}: StepCardProps) {
    const [expanded, setExpanded] = useState(false);

    const kindColor = getStepColor(step);

    const handleKindChange = (kind: StructuredStep['kind']) => {
        onChange({ ...step, kind });
    };

    const handleDurationTypeChange = (type: Duration['type']) => {
        if (type === 'distance') {
            onChange({ ...step, duration: { type: 'distance', meters: 1000 } });
        } else if (type === 'time') {
            onChange({ ...step, duration: { type: 'time', seconds: 300 } });
        } else {
            onChange({ ...step, duration: { type: 'lap_press' } });
        }
    };

    const handleDistanceMeters = (meters: number) => {
        onChange({
            ...step,
            duration: { type: 'distance', meters: Math.max(1, meters) },
        });
    };

    const handleDurationTimeMmSs = (val: string) => {
        const sec = parseMmSsToSeconds(val);
        onChange({
            ...step,
            duration: { type: 'time', seconds: Math.max(1, sec) },
        });
    };

    // Quick-Fill Pace Chip
    const applyPaceZone = (label: 'E' | 'M' | 'T' | 'I' | 'R') => {
        let minPace = trainingPaces.threshold;
        let maxPace = trainingPaces.threshold;
        if (label === 'E') {
            minPace = trainingPaces.easy.min;
            maxPace = trainingPaces.easy.max;
        } else if (label === 'M') {
            minPace = trainingPaces.marathon;
            maxPace = trainingPaces.marathon;
        } else if (label === 'T') {
            minPace = trainingPaces.threshold;
            maxPace = trainingPaces.threshold;
        } else if (label === 'I') {
            minPace = trainingPaces.interval;
            maxPace = trainingPaces.interval;
        } else if (label === 'R') {
            minPace = trainingPaces.repetition;
            maxPace = trainingPaces.repetition;
        }

        onChange({
            ...step,
            target: {
                type: 'pace',
                unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                min: minPace,
                max: maxPace,
                zoneLabel: label,
            },
        });
    };

    // Quick-Fill Power Chip
    const applyPowerZone = (zone: typeof COGGAN_ZONES[0]) => {
        const minWatts = Math.round((ftpWatts * zone.minPct) / 100);
        const maxWatts = Math.round((ftpWatts * zone.maxPct) / 100);
        const avgPct = Math.round((zone.minPct + zone.maxPct) / 2);

        onChange({
            ...step,
            target: {
                type: 'power',
                minWatts,
                maxWatts,
                ftpPercent: avgPct,
                zoneLabel: zone.label,
            },
        });
    };

    return (
        <div className="border border-glass-border bg-background-secondary rounded-md p-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: kindColor }} />
                    <select
                        value={step.kind}
                        onChange={(e) => handleKindChange(e.target.value as StructuredStep['kind'])}
                        className="bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground font-medium uppercase tracking-wide focus:outline-none"
                    >
                        {STEP_KINDS.map((k) => (
                            <option key={k} value={k}>
                                {k}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Label (optional)"
                        value={step.label || ''}
                        onChange={(e) => onChange({ ...step, label: e.target.value || undefined })}
                        className="bg-transparent border-b border-glass-border px-1 py-0.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-foreground-muted w-24 sm:w-32"
                    />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-background-tertiary"
                        title="Toggle options"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                    </button>
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
                        title="Duplicate Step"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 rounded text-foreground-muted hover:text-negative hover:bg-negative/10"
                        title="Delete Step"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Duration Editor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-glass-border">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-foreground-muted uppercase w-12 shrink-0">Duration</span>
                    <select
                        value={step.duration.type}
                        onChange={(e) => handleDurationTypeChange(e.target.value as Duration['type'])}
                        className="bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                    >
                        <option value="distance">Distance</option>
                        <option value="time">Time</option>
                        <option value="lap_press">Lap Button</option>
                    </select>

                    {step.duration.type === 'distance' && (
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={1}
                                max={100000}
                                value={step.duration.meters}
                                onChange={(e) => handleDistanceMeters(parseInt(e.target.value, 10))}
                                className="w-16 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                            />
                            <span className="text-[10px] text-foreground-muted">m</span>
                        </div>
                    )}

                    {step.duration.type === 'time' && (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                placeholder="mm:ss"
                                defaultValue={formatSecondsToMmSs(step.duration.seconds)}
                                onBlur={(e) => handleDurationTimeMmSs(e.target.value)}
                                className="w-16 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                            />
                            <span className="text-[10px] text-foreground-muted">time</span>
                        </div>
                    )}
                </div>

                {/* Target Type selector */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-foreground-muted uppercase w-12 shrink-0">Target</span>
                    <select
                        value={step.target?.type || 'free'}
                        onChange={(e) => {
                            const newType = e.target.value;
                            if (newType === 'pace') {
                                onChange({
                                    ...step,
                                    target: {
                                        type: 'pace',
                                        unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                                        min: trainingPaces.threshold,
                                        max: trainingPaces.threshold,
                                    },
                                });
                            } else if (newType === 'power') {
                                onChange({
                                    ...step,
                                    target: {
                                        type: 'power',
                                        minWatts: Math.round(ftpWatts * 0.75),
                                        maxWatts: Math.round(ftpWatts * 0.85),
                                        ftpPercent: 80,
                                    },
                                });
                            } else if (newType === 'hr') {
                                onChange({
                                    ...step,
                                    target: { type: 'hr', zone: 2 },
                                });
                            } else if (newType === 'rpe') {
                                onChange({
                                    ...step,
                                    target: { type: 'rpe', value: 6 },
                                });
                            } else {
                                onChange({
                                    ...step,
                                    target: { type: 'free' },
                                });
                            }
                        }}
                        className="bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                    >
                        <option value="pace">Pace</option>
                        <option value="power">Power</option>
                        <option value="hr">HR</option>
                        <option value="rpe">RPE</option>
                        <option value="free">Free</option>
                    </select>

                    {/* Quick-fill chips */}
                    {step.target?.type === 'pace' && (
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {(['E', 'M', 'T', 'I', 'R'] as const).map((chip) => (
                                <button
                                    key={chip}
                                    type="button"
                                    onClick={() => applyPaceZone(chip)}
                                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                                        step.target?.type === 'pace' && step.target.zoneLabel === chip
                                            ? 'bg-accent-blue/20 border-accent-blue text-accent-blue font-semibold'
                                            : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
                                    }`}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    {step.target?.type === 'power' && (
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {COGGAN_ZONES.map((zone) => (
                                <button
                                    key={zone.label}
                                    type="button"
                                    onClick={() => applyPowerZone(zone)}
                                    className={`px-1 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                                        step.target?.type === 'power' && step.target.zoneLabel === zone.label
                                            ? 'bg-workout-tempo/20 border-workout-tempo text-workout-tempo font-semibold'
                                            : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
                                    }`}
                                    title={`${zone.name} (${zone.minPct}-${zone.maxPct}%)`}
                                >
                                    {zone.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Target Value Detail row */}
            {step.target?.type === 'pace' && (
                <div className="flex items-center gap-2 pl-14 text-xs">
                    <span className="text-[10px] text-foreground-muted">Range:</span>
                    <input
                        type="text"
                        placeholder="Min (mm:ss)"
                        defaultValue={step.target.min ? formatSecondsToMmSs(step.target.min) : ''}
                        onBlur={(e) => {
                            const sec = parseMmSsToSeconds(e.target.value);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'pace' }>),
                                    min: sec > 0 ? sec : undefined,
                                },
                            });
                        }}
                        className="w-16 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-foreground-muted">-</span>
                    <input
                        type="text"
                        placeholder="Max (mm:ss)"
                        defaultValue={step.target.max ? formatSecondsToMmSs(step.target.max) : ''}
                        onBlur={(e) => {
                            const sec = parseMmSsToSeconds(e.target.value);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'pace' }>),
                                    max: sec > 0 ? sec : undefined,
                                },
                            });
                        }}
                        className="w-16 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-[10px] text-foreground-muted">
                        {step.target.unit === 'sec_per_100m' ? '/100m' : '/km'}
                    </span>
                </div>
            )}

            {step.target?.type === 'power' && (
                <div className="flex items-center gap-2 pl-14 text-xs">
                    <span className="text-[10px] text-foreground-muted">Watts:</span>
                    <input
                        type="number"
                        placeholder="Min"
                        value={step.target.minWatts ?? ''}
                        onChange={(e) => {
                            const minW = parseInt(e.target.value, 10);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'power' }>),
                                    minWatts: !isNaN(minW) ? minW : undefined,
                                },
                            });
                        }}
                        className="w-14 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-foreground-muted">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        value={step.target.maxWatts ?? ''}
                        onChange={(e) => {
                            const maxW = parseInt(e.target.value, 10);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'power' }>),
                                    maxWatts: !isNaN(maxW) ? maxW : undefined,
                                },
                            });
                        }}
                        className="w-14 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-[10px] text-foreground-muted">W</span>

                    <span className="text-[10px] text-foreground-muted ml-2">%FTP:</span>
                    <input
                        type="number"
                        placeholder="%FTP"
                        value={step.target.ftpPercent ?? ''}
                        onChange={(e) => {
                            const pct = parseInt(e.target.value, 10);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'power' }>),
                                    ftpPercent: !isNaN(pct) ? pct : undefined,
                                },
                            });
                        }}
                        className="w-14 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                </div>
            )}

            {step.target?.type === 'hr' && (
                <div className="flex items-center gap-2 pl-14 text-xs">
                    <span className="text-[10px] text-foreground-muted">HR Zone:</span>
                    <select
                        value={step.target.zone ?? 2}
                        onChange={(e) => {
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'hr' }>),
                                    zone: parseInt(e.target.value, 10),
                                },
                            });
                        }}
                        className="bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                    >
                        {[1, 2, 3, 4, 5, 6].map((z) => (
                            <option key={z} value={z}>
                                Zone {z}
                            </option>
                        ))}
                    </select>

                    <span className="text-[10px] text-foreground-muted ml-2">BPM:</span>
                    <input
                        type="number"
                        placeholder="Min"
                        value={step.target.minBpm ?? ''}
                        onChange={(e) => {
                            const bpm = parseInt(e.target.value, 10);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'hr' }>),
                                    minBpm: !isNaN(bpm) ? bpm : undefined,
                                },
                            });
                        }}
                        className="w-14 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-foreground-muted">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        value={step.target.maxBpm ?? ''}
                        onChange={(e) => {
                            const bpm = parseInt(e.target.value, 10);
                            onChange({
                                ...step,
                                target: {
                                    ...(step.target as Extract<Target, { type: 'hr' }>),
                                    maxBpm: !isNaN(bpm) ? bpm : undefined,
                                },
                            });
                        }}
                        className="w-14 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                    />
                </div>
            )}

            {step.target?.type === 'rpe' && (
                <div className="flex items-center gap-2 pl-14 text-xs">
                    <span className="text-[10px] text-foreground-muted">RPE (1-10):</span>
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={step.target.value}
                        onChange={(e) => {
                            onChange({
                                ...step,
                                target: { type: 'rpe', value: parseInt(e.target.value, 10) },
                            });
                        }}
                        className="w-28 accent-workout-tempo cursor-pointer"
                    />
                    <span className="font-mono text-xs font-semibold text-foreground">{step.target.value}</span>
                </div>
            )}

            {/* Expanded secondary fields */}
            {expanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-glass-border/60 bg-background-tertiary/20 p-2 rounded">
                    <div className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-foreground-muted" />
                        <span className="text-[10px] text-foreground-muted">Sec HR Zone:</span>
                        <select
                            value={step.hrZone || ''}
                            onChange={(e) => {
                                const z = parseInt(e.target.value, 10);
                                onChange({ ...step, hrZone: !isNaN(z) ? z : undefined });
                            }}
                            className="bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                        >
                            <option value="">None</option>
                            {[1, 2, 3, 4, 5, 6].map((z) => (
                                <option key={z} value={z}>
                                    Zone {z}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-foreground-muted" />
                        <span className="text-[10px] text-foreground-muted">Cadence (RPM):</span>
                        <input
                            type="number"
                            min={40}
                            max={220}
                            value={step.cadenceRpm || ''}
                            onChange={(e) => {
                                const c = parseInt(e.target.value, 10);
                                onChange({ ...step, cadenceRpm: !isNaN(c) ? c : undefined });
                            }}
                            placeholder="e.g. 90"
                            className="w-16 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-center font-mono text-xs text-foreground focus:outline-none"
                        />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-foreground-muted">Step Note:</span>
                        <input
                            type="text"
                            placeholder="Coaching instructions / technique cues"
                            value={step.note || ''}
                            onChange={(e) => onChange({ ...step, note: e.target.value || undefined })}
                            className="flex-1 bg-background-tertiary border border-glass-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default StructuredWorkoutEditor;
