'use client';

import { useState, useCallback } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';
import type { ProgressionWeekData, ProgressionWorkoutType } from '../Progression/types';
import { weekTotalDistance, mainSetSummary } from '../Progression/types';

const PACE_ZONES = ['E', 'M', 'T', 'I', 'R'] as const;

interface ProgressionWeekCardProps {
    weekIndex: number;
    data: ProgressionWeekData;
    workoutType: ProgressionWorkoutType;
    isEditing: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onSave: (data: ProgressionWeekData) => void;
    onCancelEdit: () => void;
}

export function ProgressionWeekCard({
    weekIndex,
    data,
    workoutType,
    isEditing,
    onEdit,
    onDelete,
    onSave,
    onCancelEdit,
}: ProgressionWeekCardProps) {
    const [editData, setEditData] = useState<ProgressionWeekData>(data);
    const total = weekTotalDistance(data);
    const typeColor = WORKOUT_COLORS[workoutType] || WORKOUT_COLORS.OTHER;

    const updateWarmup = useCallback((field: string, val: any) => {
        setEditData((prev) => ({ ...prev, warmup: { ...prev.warmup, [field]: val } }));
    }, []);

    const updateCooldown = useCallback((field: string, val: any) => {
        setEditData((prev) => ({ ...prev, cooldown: { ...prev.cooldown, [field]: val } }));
    }, []);

    const updateMainStep = useCallback((index: number, field: string, val: any) => {
        setEditData((prev) => {
            const main = prev.main.map((s, i) => (i === index ? { ...s, [field]: val } : s));
            return { ...prev, main };
        });
    }, []);

    const addMainStep = useCallback(() => {
        setEditData((prev) => ({
            ...prev,
            main: [...prev.main, { reps: 1, distance: 400, pace: 'I', restSeconds: 60 }],
        }));
    }, []);

    const removeMainStep = useCallback((index: number) => {
        setEditData((prev) => {
            if (prev.main.length <= 1) return prev;
            return { ...prev, main: prev.main.filter((_, i) => i !== index) };
        });
    }, []);

    const handleSave = useCallback(() => {
        onSave(editData);
    }, [editData, onSave]);

    if (isEditing) {
        return (
            <div className="bg-background-tertiary/50 border border-foreground/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground-secondary">Week {weekIndex}</span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="px-2 py-0.5 rounded text-[10px] text-foreground-secondary hover:text-foreground hover:bg-foreground/15 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <span className="text-[10px] text-foreground-muted uppercase">Warmup</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={0}
                                value={editData.warmup.distance}
                                onChange={(e) => updateWarmup('distance', Math.max(0, Number(e.target.value)))}
                                className="flex-1 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            />
                            <span className="text-xs text-foreground-muted">m</span>
                            <select
                                value={editData.warmup.pace}
                                onChange={(e) => updateWarmup('pace', e.target.value)}
                                className="w-12 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            >
                                {PACE_ZONES.map((z) => (
                                    <option key={z} value={z}>{z}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] text-foreground-muted uppercase">Cooldown</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={0}
                                value={editData.cooldown.distance}
                                onChange={(e) => updateCooldown('distance', Math.max(0, Number(e.target.value)))}
                                className="flex-1 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            />
                            <span className="text-xs text-foreground-muted">m</span>
                            <select
                                value={editData.cooldown.pace}
                                onChange={(e) => updateCooldown('pace', e.target.value)}
                                className="w-12 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            >
                                {PACE_ZONES.map((z) => (
                                    <option key={z} value={z}>{z}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-foreground-muted uppercase">Main Set</span>
                        <button
                            type="button"
                            onClick={addMainStep}
                            className="text-[10px] text-foreground-muted hover:text-foreground-secondary"
                        >
                            + Add step
                        </button>
                    </div>
                    <div className="space-y-1">
                        {editData.main.map((step, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={1}
                                    value={step.reps}
                                    onChange={(e) => updateMainStep(i, 'reps', Math.max(1, Number(e.target.value)))}
                                    className="w-10 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                />
                                <span className="text-xs text-foreground-muted">&times;</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={step.distance}
                                    onChange={(e) => updateMainStep(i, 'distance', Math.max(0, Number(e.target.value)))}
                                    className="w-14 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                />
                                <span className="text-xs text-foreground-muted">m</span>
                                <select
                                    value={step.pace}
                                    onChange={(e) => updateMainStep(i, 'pace', e.target.value)}
                                    className="w-10 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                >
                                    {PACE_ZONES.map((z) => (
                                        <option key={z} value={z}>{z}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min={0}
                                    value={step.restSeconds}
                                    onChange={(e) => updateMainStep(i, 'restSeconds', Math.max(0, Number(e.target.value)))}
                                    className="w-12 bg-background-tertiary border border-foreground/20 rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                                />
                                <span className="text-[10px] text-foreground-muted">s</span>
                                <button
                                    type="button"
                                    onClick={() => removeMainStep(i)}
                                    disabled={editData.main.length <= 1}
                                    className="ml-auto p-0.5 text-foreground-muted hover:text-red-400 disabled:opacity-30 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-secondary border border-glass-border rounded-lg p-3 hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">Week {weekIndex}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColor.bg} ${typeColor.text}`}>
                        {workoutType}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="p-1 text-foreground-muted hover:text-foreground-secondary transition-colors"
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 text-foreground-muted hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
            <div className="space-y-1">
                <div className="text-xs text-foreground-secondary">{mainSetSummary(data)}</div>
                <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                    <span>WU: {data.warmup.distance}m @ {data.warmup.pace} | CD: {data.cooldown.distance}m @ {data.cooldown.pace}</span>
                    <span>{total >= 1000 ? `${(total / 1000).toFixed(1)} km` : `${total} m`}</span>
                </div>
            </div>
        </div>
    );
}
