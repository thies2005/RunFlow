'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Minus, Ruler } from 'lucide-react';

const PACE_ZONES = ['E', 'M', 'T', 'I', 'R'] as const;
const PACE_ZONE_LABELS: Record<string, string> = {
    E: 'Easy',
    M: 'Marathon',
    T: 'Threshold',
    I: 'Interval',
    R: 'Repetition',
};

interface WarmupCooldown {
    distance: number;
    pace: string;
}

interface MainSetStep {
    reps: number;
    distance: number;
    pace: string;
    restSeconds: number;
}

interface StructuredSteps {
    warmup: WarmupCooldown;
    main: MainSetStep[];
    cooldown: WarmupCooldown;
}

const DEFAULT_STEPS: StructuredSteps = {
    warmup: { distance: 1000, pace: 'E' },
    main: [{ reps: 4, distance: 400, pace: 'I', restSeconds: 90 }],
    cooldown: { distance: 1000, pace: 'E' },
};

interface StructuredWorkoutEditorProps {
    value: any;
    onChange: (steps: any) => void;
    targetPace?: number;
}

export function StructuredWorkoutEditor({ value, onChange, targetPace }: StructuredWorkoutEditorProps) {
    const steps: StructuredSteps = value || DEFAULT_STEPS;

    const updateSection = useCallback(
        (section: 'warmup' | 'cooldown', field: keyof WarmupCooldown, val: any) => {
            onChange({
                ...steps,
                [section]: { ...steps[section], [field]: val },
            });
        },
        [steps, onChange],
    );

    const updateMainSet = useCallback(
        (index: number, field: keyof MainSetStep, val: any) => {
            const newMain = steps.main.map((s, i) => (i === index ? { ...s, [field]: val } : s));
            onChange({ ...steps, main: newMain });
        },
        [steps, onChange],
    );

    const addMainSetStep = useCallback(() => {
        onChange({
            ...steps,
            main: [...steps.main, { reps: 1, distance: 400, pace: 'I', restSeconds: 60 }],
        });
    }, [steps, onChange]);

    const removeMainSetStep = useCallback(
        (index: number) => {
            if (steps.main.length <= 1) return;
            onChange({ ...steps, main: steps.main.filter((_, i) => i !== index) });
        },
        [steps, onChange],
    );

    const totalDistance = useMemo(() => {
        let total = steps.warmup.distance + steps.cooldown.distance;
        for (const s of steps.main) {
            total += s.reps * s.distance;
        }
        return total;
    }, [steps]);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <SectionInput
                    label="Warmup"
                    distance={steps.warmup.distance}
                    pace={steps.warmup.pace}
                    onDistanceChange={(d) => updateSection('warmup', 'distance', d)}
                    onPaceChange={(p) => updateSection('warmup', 'pace', p)}
                />
                <SectionInput
                    label="Cooldown"
                    distance={steps.cooldown.distance}
                    pace={steps.cooldown.pace}
                    onDistanceChange={(d) => updateSection('cooldown', 'distance', d)}
                    onPaceChange={(p) => updateSection('cooldown', 'pace', p)}
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground-secondary">Main Set</span>
                    <button
                        type="button"
                        onClick={addMainSetStep}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add
                    </button>
                </div>
                <div className="space-y-1.5">
                    {steps.main.map((step, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-background-tertiary/50 rounded-md px-2 py-1.5">
                            <input
                                type="number"
                                min={1}
                                value={step.reps}
                                onChange={(e) => updateMainSet(i, 'reps', Math.max(1, Number(e.target.value)))}
                                className="w-12 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                title="Reps"
                            />
                            <span className="text-xs text-foreground-muted">&times;</span>
                            <input
                                type="number"
                                min={0}
                                value={step.distance}
                                onChange={(e) => updateMainSet(i, 'distance', Math.max(0, Number(e.target.value)))}
                                className="w-16 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                title="Distance (m)"
                            />
                            <span className="text-xs text-foreground-muted">m</span>
                            <select
                                value={step.pace}
                                onChange={(e) => updateMainSet(i, 'pace', e.target.value)}
                                className="bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            >
                                {PACE_ZONES.map((z) => (
                                    <option key={z} value={z}>
                                        {PACE_ZONE_LABELS[z]}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min={0}
                                value={step.restSeconds}
                                onChange={(e) => updateMainSet(i, 'restSeconds', Math.max(0, Number(e.target.value)))}
                                className="w-14 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                title="Rest (seconds)"
                            />
                            <span className="text-xs text-foreground-muted">s rest</span>
                            <button
                                type="button"
                                onClick={() => removeMainSetStep(i)}
                                disabled={steps.main.length <= 1}
                                className="ml-auto p-0.5 text-foreground-muted hover:text-red-400 disabled:opacity-30 transition-colors"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-glass-border">
                <Ruler className="w-3.5 h-3.5 text-foreground-muted" />
                <span className="text-xs text-foreground-secondary">
                    Total: {totalDistance >= 1000 ? `${(totalDistance / 1000).toFixed(1)} km` : `${totalDistance} m`}
                </span>
            </div>
        </div>
    );
}

function SectionInput({
    label,
    distance,
    pace,
    onDistanceChange,
    onPaceChange,
}: {
    label: string;
    distance: number;
    pace: string;
    onDistanceChange: (d: number) => void;
    onPaceChange: (p: string) => void;
}) {
    return (
        <div className="space-y-1">
            <span className="text-[10px] text-foreground-muted uppercase tracking-wide">{label}</span>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    min={0}
                    value={distance}
                    onChange={(e) => onDistanceChange(Math.max(0, Number(e.target.value)))}
                    className="flex-1 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                />
                <span className="text-xs text-foreground-muted">m</span>
                <select
                    value={pace}
                    onChange={(e) => onPaceChange(e.target.value)}
                    className="w-12 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                >
                    {PACE_ZONES.map((z) => (
                        <option key={z} value={z}>
                            {z}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
