'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plus,
    Repeat,
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
} from '@/lib/plans/structured';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { buildStructuredStepsForWorkout } from '@/lib/plans';
import { formatSecondsToMmSs, getStepColor } from './structuredEditorUtils';
import { StepNodeList } from './StepNodeList';

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
    targetDistance?: number | null;
    targetDuration?: number | null;
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
    targetDistance,
    targetDuration,
}: StructuredWorkoutEditorProps) {
    const resolvedSport = useMemo(() => resolveWorkoutSport(workoutType, sport), [workoutType, sport]);
    const trainingPaces = useMemo(() => calculateTrainingPaces(vdot > 0 ? vdot : 45), [vdot]);

    // Parse incoming value into canonical v2
    const parsedValue = useMemo(() => {
        const parsed = parseStructuredWorkout(value, workoutType || sport, vdot, ftpWatts);
        if (parsed) return parsed;

        // Try building sensible structured steps using buildStructuredStepsForWorkout
        const built = buildStructuredStepsForWorkout(
            {
                workoutType: (workoutType as any) || 'EASY',
                sport: sport || undefined,
                description: workoutType || 'Workout',
                distanceMeters: targetDistance && targetDistance > 0 ? targetDistance : undefined,
                targetDistance: targetDistance && targetDistance > 0 ? targetDistance : undefined,
                targetDuration: targetDuration && targetDuration > 0 ? targetDuration : undefined,
                targetPace,
                vdot,
                ftpWatts,
            } as any,
            { vdot, ftpWatts }
        );
        if (built) return built;

        // Fallback: build a single steady step matching targetDistance / targetDuration
        const hasDist = targetDistance && targetDistance > 0;
        const dist = hasDist ? Math.round(targetDistance) : 5000;
        const dur = targetDuration && targetDuration > 0 ? Math.round(targetDuration) : 1800;

        return {
            version: 2 as const,
            source: 'editor' as const,
            steps: [
                {
                    kind: 'steady' as const,
                    label: workoutType ? workoutType.replace(/_/g, ' ') : 'Steady',
                    duration: hasDist
                        ? ({ type: 'distance' as const, meters: dist })
                        : ({ type: 'time' as const, seconds: dur }),
                    target: resolvedSport === 'BIKE'
                        ? {
                              type: 'power' as const,
                              minWatts: Math.round(ftpWatts * 0.65),
                              maxWatts: Math.round(ftpWatts * 0.75),
                              ftpPercent: 70,
                              zoneLabel: 'Z2',
                          }
                        : {
                              type: 'pace' as const,
                              unit: resolvedSport === 'SWIM' ? ('sec_per_100m' as const) : ('sec_per_km' as const),
                              min: trainingPaces.easy.min,
                              max: trainingPaces.easy.max,
                              zoneLabel: 'E',
                          },
                },
            ],
        };
    }, [value, workoutType, sport, vdot, ftpWatts, resolvedSport, trainingPaces, targetDistance, targetDuration, targetPace]);

    const [workout, setWorkout] = useState<StructuredWorkoutV2>(parsedValue);

    const emitSummary = useCallback(
        (sw: StructuredWorkoutV2) => {
            if (!onSummaryChange) return;
            const updatedSummary = summarizeStructuredWorkout(sw, targetPace, ftpWatts);
            const updatedFlattened = flattenStructuredWorkout(sw);
            let minPace: number | undefined;
            let maxPace: number | undefined;
            let minWatts: number | undefined;
            let maxWatts: number | undefined;

            for (const s of updatedFlattened) {
                if (s.target?.type === 'pace') {
                    if (s.target.min) minPace = minPace ? Math.min(minPace, s.target.min) : s.target.min;
                    if (s.target.max) maxPace = maxPace ? Math.max(maxPace, s.target.max) : s.target.max;
                } else if (s.target?.type === 'power') {
                    if (s.target.minWatts) minWatts = minWatts ? Math.min(minWatts, s.target.minWatts) : s.target.minWatts;
                    if (s.target.maxWatts) maxWatts = maxWatts ? Math.max(maxWatts, s.target.maxWatts) : s.target.maxWatts;
                }
            }

            onSummaryChange({
                targetDistance: updatedSummary.totalDistanceMeters,
                targetDuration: updatedSummary.totalDurationSeconds,
                targetPaceMin: minPace,
                targetPaceMax: maxPace,
                targetPowerMinWatts: minWatts,
                targetPowerMaxWatts: maxWatts,
                plannedTss: updatedSummary.estimatedTss,
            });
        },
        [onSummaryChange, targetPace, ftpWatts]
    );

    // Sync if outside value changes significantly, and trigger initial summary
    useEffect(() => {
        if (parsedValue) {
            setWorkout(parsedValue);
            emitSummary(parsedValue);
        }
    }, [parsedValue, emitSummary]);

    // Live computed summary
    const summary = useMemo(() => {
        return summarizeStructuredWorkout(workout, targetPace, ftpWatts);
    }, [workout, targetPace, ftpWatts]);

    // Flattened steps for preview bar
    const flattenedSteps = useMemo(() => {
        return flattenStructuredWorkout(workout);
    }, [workout]);

    const emitChange = useCallback(
        (updated: StructuredWorkoutV2) => {
            setWorkout(updated);
            onChange(updated);
            emitSummary(updated);
        },
        [onChange, emitSummary]
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

export default StructuredWorkoutEditor;
