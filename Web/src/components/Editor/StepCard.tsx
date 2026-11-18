'use client';

import React, { useState } from 'react';
import {
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    Heart,
    Gauge,
    Sliders,
} from 'lucide-react';
import type {
    StructuredStep,
    Duration,
    Target,
} from '@/lib/plans/structured';
import type { calculateTrainingPaces } from '@/lib/metrics/vdot';
import {
    STEP_KINDS,
    COGGAN_ZONES,
    formatSecondsToMmSs,
    parseMmSsToSeconds,
    getStepColor,
} from './structuredEditorUtils';

export interface StepCardProps {
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

export function StepCard({
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
                                key={`dur-${step.duration.seconds}`}
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
                        key={`min-${step.target.min ?? 0}-${step.target.zoneLabel ?? ''}`}
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
                        key={`max-${step.target.max ?? 0}-${step.target.zoneLabel ?? ''}`}
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
