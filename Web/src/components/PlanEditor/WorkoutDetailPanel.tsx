'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Trash2, Save, Loader2, Check, Download, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { WORKOUT_COLORS } from '@/app/plan-advanced/[goalId]/components/Shared/WorkoutTypeColors';
import { StructuredWorkoutEditor } from '@/components/Editor/StructuredWorkoutEditor';
import { PaceZoneSlider, formatPaceShort } from '@/app/plan-advanced/[goalId]/components/Editor/PaceZoneSlider';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { resolveWorkoutSport, type StructuredWorkoutV2 } from '@/lib/plans/structured';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';
import { downloadWorkoutFit } from '@/lib/plans/fit-export';
import ActivityPicker from '@/components/ActivityPicker';

export type WorkoutType =
    | 'EASY'
    | 'LONG_RUN'
    | 'TEMPO'
    | 'INTERVALS'
    | 'FARTLEK'
    | 'REPETITIONS'
    | 'RECOVERY'
    | 'RACE'
    | 'REST'
    | 'RIDE'
    | 'SWIM'
    | 'STRENGTH'
    | 'CROSS_TRAIN'
    | 'OTHER'
    | 'BRICK'
    | 'OPEN_WATER_SWIM'
    | 'LONG_RIDE'
    | 'RIDE_INTERVALS'
    | 'SWIM_DRILL'
    | 'TRANSITION_PRACTICE'
    | 'DOUBLE_DAY';

export type PlanPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK' | 'RECOVERY' | 'OFF';

const WORKOUT_TYPES: WorkoutType[] = [
    'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS',
    'RECOVERY', 'RACE', 'REST', 'RIDE', 'SWIM', 'STRENGTH',
    'CROSS_TRAIN', 'OTHER', 'BRICK', 'OPEN_WATER_SWIM', 'LONG_RIDE',
    'RIDE_INTERVALS', 'SWIM_DRILL', 'TRANSITION_PRACTICE', 'DOUBLE_DAY',
];

const PHASES: PlanPhase[] = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE_WEEK', 'RECOVERY', 'OFF'];

const SPORTS = ['RUN', 'BIKE', 'SWIM', 'STRENGTH'] as const;

const CYCLING_WORKOUT_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);

export interface Workout {
    id: string;
    scheduledDate: string | Date;
    workoutType: string;
    description: string;
    displayDesc?: string | null;
    targetDistance: number | null;
    targetPace: number | null;
    targetDuration: number | null;
    targetHrZone: number | null;
    notes: string;
    phase: string;
    customName: string;
    color: string;
    structuredSteps: any;
    isCompleted: boolean;
    linkedActivityId?: string | null;
    linkedActivity?: any;
    sport?: string | null;
    targetPaceMinSecondsPerKm?: number | null;
    targetPaceMaxSecondsPerKm?: number | null;
    targetPaceZoneLabel?: string | null;
    targetPowerWatts?: number | null;
    targetPowerMinWatts?: number | null;
    targetPowerMaxWatts?: number | null;
    targetPowerZone?: number | null;
    targetFtpPercent?: number | null;
    targetCadenceRpm?: number | null;
    targetHrMinBpm?: number | null;
    targetHrMaxBpm?: number | null;
    targetRpe?: number | null;
    plannedTss?: number | null;
}

interface WorkoutDetailPanelProps {
    workout: Workout;
    goalId: string;
    onClose: () => void;
    onUpdate: (workout: Workout) => void;
}

function exportMyWhooshZwo(workout: Workout) {
    const xml = generateMyWhooshZwoXml({
        name: workout.customName || workout.description || workout.workoutType,
        description: workout.description || '',
        workoutType: workout.workoutType,
        targetDurationSeconds: workout.targetDuration || 3600,
        phase: workout.phase || undefined,
        structuredSteps: workout.structuredSteps ?? null,
    });
    const blob = new Blob([xml], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (workout.customName || workout.description || workout.workoutType || 'ride')
        .replace(/[^a-z0-9-_]+/gi, '_')
        .slice(0, 48);
    a.download = `RunFlow_${safeName}.zwo`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function getDisplayActivityTitle(activity: { name?: string | null; startDate?: string | Date; type?: string | null }): string {
    if (activity.name && activity.name.trim().length > 0) {
        return activity.name.trim();
    }
    const d = activity.startDate ? new Date(activity.startDate) : new Date();
    const typeLabel = (activity.type || 'Activity').replace(/_/g, ' ');
    return `${format(d, 'EEE')} ${typeLabel}`;
}

function formatSecToMmSs(sec?: number | null): string {
    if (!sec || isNaN(sec) || sec <= 0) return '';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseMmSsToSec(val: string): number | null {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (!trimmed.includes(':')) {
        const n = parseFloat(trimmed);
        return isNaN(n) ? null : Math.round(n);
    }
    const parts = trimmed.split(':').map((p) => parseFloat(p));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return Math.round(parts[0] * 60 + parts[1]);
    }
    return null;
}

export function WorkoutDetailPanel({ workout, goalId, onClose, onUpdate }: WorkoutDetailPanelProps) {
    const queryClient = useQueryClient();
    const planData = queryClient.getQueryData(['plan-advanced', goalId]) as any;
    const currentVdot = planData?.goal?.currentVdot ?? planData?.plan?.currentVdot ?? 45;
    const ftpWatts = planData?.goal?.ftpWatts ?? planData?.plan?.ftpWatts ?? 220;

    const paceZoneOptions = useMemo(() => {
        const paces = calculateTrainingPaces(currentVdot);
        return [
            { label: `E — Easy (${Math.floor(paces.easy.min / 60)}:${String(Math.round(paces.easy.min % 60)).padStart(2, '0')})`, value: Math.round((paces.easy.min + paces.easy.max) / 2) },
            { label: `M — Marathon (${Math.floor(paces.marathon / 60)}:${String(Math.round(paces.marathon % 60)).padStart(2, '0')})`, value: paces.marathon },
            { label: `T — Threshold (${Math.floor(paces.threshold / 60)}:${String(Math.round(paces.threshold % 60)).padStart(2, '0')})`, value: paces.threshold },
            { label: `I — Interval (${Math.floor(paces.interval / 60)}:${String(Math.round(paces.interval % 60)).padStart(2, '0')})`, value: paces.interval },
            { label: `R — Repetition (${Math.floor(paces.repetition / 60)}:${String(Math.round(paces.repetition % 60)).padStart(2, '0')})`, value: paces.repetition },
        ];
    }, [currentVdot]);

    const paceZoneLetters = ['E', 'M', 'T', 'I', 'R'];
    const paceZoneLabels = useMemo(
        () => paceZoneOptions.map((z) => formatPaceShort(z.value)),
        [paceZoneOptions],
    );

    const [form, setForm] = useState<Workout>({
        ...workout,
        sport: workout.sport || resolveWorkoutSport(workout.workoutType, workout.sport),
    });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showStructuredEditor, setShowStructuredEditor] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);

    useEffect(() => {
        setForm({
            ...workout,
            sport: workout.sport || resolveWorkoutSport(workout.workoutType, workout.sport),
        });
        isDirtyRef.current = false;
        setSaveState('idle');
        setShowDeleteConfirm(false);
    }, [workout.id]);

    const updateField = useCallback((field: keyof Workout, value: any) => {
        isDirtyRef.current = true;
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    const effectiveSport = useMemo(() => {
        return (form.sport || resolveWorkoutSport(form.workoutType, form.sport)) as 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
    }, [form.sport, form.workoutType]);

    const paceZoneLetter = useMemo(() => {
        if (form.targetPace == null) return 'E';
        let best = 0;
        let bestDiff = Infinity;
        paceZoneOptions.forEach((z, i) => {
            const diff = Math.abs(z.value - (form.targetPace as number));
            if (diff < bestDiff) {
                bestDiff = diff;
                best = i;
            }
        });
        return paceZoneLetters[best];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.targetPace, paceZoneOptions]);

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<Workout>) => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/${workout.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Save failed');
            return res.json();
        },
        onMutate: () => setSaveState('saving'),
        onSuccess: (data) => {
            setSaveState('saved');
            onUpdate(data.workout ?? { ...workout, ...form });
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            setTimeout(() => setSaveState('idle'), 2000);
        },
        onError: () => {
            setSaveState('idle');
            toast.error('Failed to save workout');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/${workout.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Workout deleted');
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            onClose();
        },
        onError: () => {
            toast.error('Failed to delete workout');
        },
    });

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const triggerAutoSave = useCallback(() => {
        if (!isDirtyRef.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (!isDirtyRef.current) return;
            const { id, ...patch } = form;
            void saveMutation.mutate(patch);
        }, 600);
    }, [form, saveMutation]);

    useEffect(() => {
        if (isDirtyRef.current) {
            triggerAutoSave();
        }
    }, [form, triggerAutoSave]);

    const handleManualSave = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const { id, ...patch } = form;
        void saveMutation.mutate(patch);
    }, [form, saveMutation]);

    // Handle Structured Steps Update & Auto-sync summaries
    const handleStructuredChange = useCallback(
        (v2Workout: StructuredWorkoutV2) => {
            isDirtyRef.current = true;
            updateField('structuredSteps', v2Workout);
        },
        [updateField]
    );

    const handleSummaryChange = useCallback(
        (summary: {
            targetDistance: number;
            targetDuration: number;
            targetPaceMin?: number;
            targetPaceMax?: number;
            targetPowerMinWatts?: number;
            targetPowerMaxWatts?: number;
            plannedTss: number;
        }) => {
            setForm((prev) => ({
                ...prev,
                targetDistance: summary.targetDistance > 0 ? summary.targetDistance : prev.targetDistance,
                targetDuration: summary.targetDuration > 0 ? summary.targetDuration : prev.targetDuration,
                targetPaceMinSecondsPerKm: summary.targetPaceMin ?? prev.targetPaceMinSecondsPerKm,
                targetPaceMaxSecondsPerKm: summary.targetPaceMax ?? prev.targetPaceMaxSecondsPerKm,
                targetPowerMinWatts: summary.targetPowerMinWatts ?? prev.targetPowerMinWatts,
                targetPowerMaxWatts: summary.targetPowerMaxWatts ?? prev.targetPowerMaxWatts,
                plannedTss: summary.plannedTss > 0 ? summary.plannedTss : prev.plannedTss,
            }));
        },
        []
    );

    const colors = WORKOUT_COLORS[form.workoutType] || WORKOUT_COLORS.OTHER;

    return (
        <div className="w-88 border-l border-glass-border bg-background-secondary flex flex-col overflow-hidden shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border shrink-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-semibold text-foreground">Edit Workout</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {saveState === 'saving' && (
                        <span className="flex items-center gap-1 text-xs text-foreground-muted">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                        </span>
                    )}
                    {saveState === 'saved' && (
                        <span className="flex items-center gap-1 text-xs text-positive">
                            <Check className="w-3 h-3" />
                            Saved
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
                {/* Custom Name */}
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 font-medium">Custom Name</label>
                    <input
                        type="text"
                        value={form.customName || ''}
                        onChange={(e) => updateField('customName', e.target.value)}
                        placeholder={form.workoutType.replace(/_/g, ' ')}
                        className="w-full bg-background-tertiary border border-glass-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder-foreground-muted focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                    />
                </div>

                {/* Sport Selector */}
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 font-medium">Sport</label>
                    <div className="grid grid-cols-4 gap-1">
                        {SPORTS.map((sp) => (
                            <button
                                key={sp}
                                type="button"
                                onClick={() => updateField('sport', sp)}
                                className={`py-1.5 px-2 rounded border text-center text-xs font-medium transition-colors ${
                                    effectiveSport === sp
                                        ? 'bg-accent-blue/20 border-accent-blue text-accent-blue font-semibold'
                                        : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
                                }`}
                            >
                                {sp}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Workout Type & Phase */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 font-medium">Type</label>
                        <select
                            value={form.workoutType}
                            onChange={(e) => {
                                const newType = e.target.value;
                                updateField('workoutType', newType);
                                updateField('sport', resolveWorkoutSport(newType, form.sport));
                            }}
                            className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none"
                        >
                            {WORKOUT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 font-medium">Phase</label>
                        <select
                            value={form.phase}
                            onChange={(e) => updateField('phase', e.target.value)}
                            className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none"
                        >
                            {PHASES.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 font-medium">Description</label>
                    <input
                        type="text"
                        value={form.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="Workout instructions / overview"
                        className="w-full bg-background-tertiary border border-glass-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder-foreground-muted focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                    />
                </div>

                {/* Distance & Duration */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 font-medium">Distance (m)</label>
                        <input
                            type="number"
                            value={form.targetDistance ?? ''}
                            onChange={(e) => updateField('targetDistance', e.target.value ? Number(e.target.value) : null)}
                            placeholder="e.g. 8000"
                            className="w-full bg-background-tertiary border border-glass-border rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 font-medium">Duration (min)</label>
                        <input
                            type="number"
                            value={form.targetDuration ? Math.round(form.targetDuration / 60) : ''}
                            onChange={(e) => updateField('targetDuration', e.target.value ? Number(e.target.value) * 60 : null)}
                            placeholder="e.g. 45"
                            className="w-full bg-background-tertiary border border-glass-border rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none"
                        />
                    </div>
                </div>

                {/* Sport-Specific Targets */}
                {(effectiveSport === 'RUN' || effectiveSport === 'SWIM') && (
                    <div className="p-2.5 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2">
                        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                            {effectiveSport === 'RUN' ? 'Running' : 'Swimming'} Pace Targets
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Min Pace (mm:ss)</label>
                                <input
                                    key={`${form.id}-min-${form.targetPaceMinSecondsPerKm ?? ''}`}
                                    type="text"
                                    placeholder="e.g. 4:30"
                                    defaultValue={formatSecToMmSs(form.targetPaceMinSecondsPerKm)}
                                    onBlur={(e) => updateField('targetPaceMinSecondsPerKm', parseMmSsToSec(e.target.value))}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Max Pace (mm:ss)</label>
                                <input
                                    key={`${form.id}-max-${form.targetPaceMaxSecondsPerKm ?? ''}`}
                                    type="text"
                                    placeholder="e.g. 5:00"
                                    defaultValue={formatSecToMmSs(form.targetPaceMaxSecondsPerKm)}
                                    onBlur={(e) => updateField('targetPaceMaxSecondsPerKm', parseMmSsToSec(e.target.value))}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Pace Zone</label>
                            <select
                                value={form.targetPace ?? ''}
                                onChange={(e) => updateField('targetPace', e.target.value ? parseInt(e.target.value, 10) : null)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                                <option value="">Custom / None</option>
                                {paceZoneOptions.map((z) => (
                                    <option key={z.value} value={z.value}>
                                        {z.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {form.targetPace != null && (
                            <PaceZoneSlider
                                value={paceZoneLetter}
                                paceLabels={paceZoneLabels}
                                onChange={(letter) => {
                                    const idx = ['E', 'M', 'T', 'I', 'R'].indexOf(letter);
                                    if (idx >= 0) updateField('targetPace', paceZoneOptions[idx].value);
                                }}
                            />
                        )}
                    </div>
                )}

                {effectiveSport === 'BIKE' && (
                    <div className="p-2.5 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2">
                        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                            Bike Power Targets
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Target Watts</label>
                                <input
                                    type="number"
                                    value={form.targetPowerWatts ?? ''}
                                    onChange={(e) => updateField('targetPowerWatts', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    placeholder="W"
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Min Watts</label>
                                <input
                                    type="number"
                                    value={form.targetPowerMinWatts ?? ''}
                                    onChange={(e) => updateField('targetPowerMinWatts', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    placeholder="Min W"
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Max Watts</label>
                                <input
                                    type="number"
                                    value={form.targetPowerMaxWatts ?? ''}
                                    onChange={(e) => updateField('targetPowerMaxWatts', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    placeholder="Max W"
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">% FTP</label>
                                <input
                                    type="number"
                                    value={form.targetFtpPercent ?? ''}
                                    onChange={(e) => updateField('targetFtpPercent', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    placeholder="%"
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Power Zone</label>
                                <select
                                    value={form.targetPowerZone ?? ''}
                                    onChange={(e) => updateField('targetPowerZone', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none"
                                >
                                    <option value="">None</option>
                                    {[1, 2, 3, 4, 5, 6, 7].map((z) => (
                                        <option key={z} value={z}>Z{z}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-0.5">Cadence (RPM)</label>
                                <input
                                    type="number"
                                    value={form.targetCadenceRpm ?? ''}
                                    onChange={(e) => updateField('targetCadenceRpm', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    placeholder="RPM"
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Export Workout to MyWhoosh (.zwo) */}
                        <div className="pt-2 border-t border-glass-border space-y-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    const xml = generateMyWhooshZwoXml({
                                        name: form.customName || form.description || 'RunFlow Bike Workout',
                                        description: form.description || '',
                                        workoutType: form.workoutType,
                                        targetDurationSeconds: form.targetDuration || 3600,
                                        phase: form.phase,
                                        structuredSteps: form.structuredSteps,
                                    });
                                    const blob = new Blob([xml], { type: 'application/octet-stream' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${(form.customName || form.workoutType).replace(/[^a-z0-9-_]+/gi, '_')}.zwo`;
                                    document.body.appendChild(a);
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                }}
                                className="w-full py-1.5 px-2.5 rounded border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 text-[11px] font-medium transition-colors"
                            >
                                Export Workout to MyWhoosh (.zwo)
                            </button>
                            <p className="text-[10px] text-foreground-muted">
                                Upload the exported <code>.zwo</code> file to <strong>workout.mywhoosh.com</strong> to ride it in MyWhoosh.
                            </p>
                        </div>
                    </div>
                )}

                {/* Heart Rate & Load Targets */}
                <div className="p-2.5 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2">
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                        Heart Rate & Intensity Load
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">HR Zone</label>
                            <select
                                value={form.targetHrZone ?? ''}
                                onChange={(e) => updateField('targetHrZone', e.target.value ? parseInt(e.target.value, 10) : null)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                            >
                                <option value="">None</option>
                                {[1, 2, 3, 4, 5, 6].map((z) => (
                                    <option key={z} value={z}>Zone {z}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Min BPM</label>
                            <input
                                type="number"
                                value={form.targetHrMinBpm ?? ''}
                                onChange={(e) => updateField('targetHrMinBpm', e.target.value ? parseInt(e.target.value, 10) : null)}
                                placeholder="BPM"
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Max BPM</label>
                            <input
                                type="number"
                                value={form.targetHrMaxBpm ?? ''}
                                onChange={(e) => updateField('targetHrMaxBpm', e.target.value ? parseInt(e.target.value, 10) : null)}
                                placeholder="BPM"
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Target RPE (1-10)</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={form.targetRpe ?? ''}
                                onChange={(e) => updateField('targetRpe', e.target.value ? parseInt(e.target.value, 10) : null)}
                                placeholder="1-10"
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Planned TSS</label>
                            <input
                                type="number"
                                value={form.plannedTss ?? ''}
                                onChange={(e) => updateField('plannedTss', e.target.value ? parseInt(e.target.value, 10) : null)}
                                placeholder="TSS"
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 font-medium">Notes</label>
                    <textarea
                        value={form.notes || ''}
                        onChange={(e) => updateField('notes', e.target.value)}
                        rows={2}
                        className="w-full bg-background-tertiary border border-glass-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder-foreground-muted focus:outline-none focus:ring-1 focus:ring-foreground-muted resize-none"
                    />
                </div>

                {/* Completion & Linked Activity */}
                <div className="pt-2 border-t border-glass-border space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isCompleted}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    updateField('isCompleted', checked);
                                    if (!checked) {
                                        updateField('linkedActivityId', null);
                                        updateField('linkedActivity', null);
                                    }
                                }}
                                className="h-4 w-4 rounded border-line bg-background accent-accent-orange"
                            />
                            <span>Mark as Completed</span>
                        </label>
                        {form.isCompleted && (
                            <span className="text-[10px] text-positive font-mono font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Completed
                            </span>
                        )}
                    </div>

                    {form.isCompleted && (
                        <div className="p-2.5 rounded bg-background-tertiary/60 border border-glass-border space-y-2">
                            <div className="flex items-center justify-between text-xs font-medium text-foreground-muted">
                                <span className="flex items-center gap-1.5">
                                    <Link2 className="w-3.5 h-3.5" />
                                    Linked Activity
                                </span>
                                {form.linkedActivity && (
                                    <span className="text-[10px] text-accent-cyan truncate max-w-[180px]">
                                        {getDisplayActivityTitle(form.linkedActivity)}
                                    </span>
                                )}
                            </div>
                            <ActivityPicker
                                selectedId={form.linkedActivityId || null}
                                onSelect={(activityId) => {
                                    updateField('linkedActivityId', activityId);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Structured Workout Editor - Available for ALL workout types */}
                <div className="pt-2 border-t border-glass-border">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Structured Steps (V2)
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowStructuredEditor(!showStructuredEditor)}
                            className="text-[10px] text-accent-blue hover:underline"
                        >
                            {showStructuredEditor ? 'Hide Steps' : 'Show Steps'}
                        </button>
                    </div>

                    {showStructuredEditor && (
                        <StructuredWorkoutEditor
                            value={form.structuredSteps}
                            onChange={handleStructuredChange}
                            workoutType={form.workoutType}
                            sport={effectiveSport}
                            vdot={currentVdot}
                            ftpWatts={ftpWatts}
                            onSummaryChange={handleSummaryChange}
                            targetPace={form.targetPace ?? undefined}
                            paceZoneLabels={paceZoneLabels}
                            targetDistance={form.targetDistance}
                            targetDuration={form.targetDuration}
                        />
                    )}
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-glass-border p-4 space-y-2 shrink-0">
                {/* Export Buttons */}
                <div className="flex items-center gap-2 pb-1">
                    <button
                        type="button"
                        onClick={() => downloadWorkoutFit(form)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-glass-border bg-background-tertiary text-foreground text-xs font-medium hover:bg-surface-hover transition-colors"
                        title="Download Garmin/Coros/Wahoo FIT workout file"
                    >
                        <Download className="w-3.5 h-3.5 text-accent-cyan" />
                        Export .FIT
                    </button>
                    {(effectiveSport === 'BIKE' || CYCLING_WORKOUT_TYPES.has(form.workoutType)) && (
                        <button
                            type="button"
                            onClick={() => exportMyWhooshZwo(form)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-accent-orange/30 bg-accent-orange/10 text-accent-orange text-xs font-medium hover:bg-accent-orange/20 transition-colors"
                            title="Download MyWhoosh ZWO workout file"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export .ZWO
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleManualSave}
                    disabled={saveState === 'saving'}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-foreground/15 text-foreground text-xs font-medium hover:bg-foreground/20 disabled:opacity-50 transition-colors"
                >
                    {saveState === 'saving' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                </button>

                {showDeleteConfirm ? (
                    <div className="space-y-2">
                        <p className="text-xs text-negative text-center">Delete this workout?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-3 py-2 rounded-md bg-background-tertiary text-foreground-secondary text-xs hover:bg-foreground/15 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-negative text-white text-xs hover:bg-negative/85 disabled:opacity-50 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-negative text-xs hover:bg-negative/10 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Workout
                    </button>
                )}
            </div>
        </div>
    );
}

export default WorkoutDetailPanel;
