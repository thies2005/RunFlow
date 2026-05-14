'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Save, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';
import { StructuredWorkoutEditor } from './StructuredWorkoutEditor';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';

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

const PHASE_COLORS: Record<PlanPhase, string> = {
    BASE: 'bg-blue-500/20 text-blue-400',
    BUILD: 'bg-orange-500/20 text-orange-400',
    PEAK: 'bg-purple-500/20 text-purple-400',
    TAPER: 'bg-cyan-500/20 text-cyan-400',
    RACE_WEEK: 'bg-green-500/20 text-green-400',
    RECOVERY: 'bg-teal-500/20 text-teal-400',
    OFF: 'bg-zinc-500/20 text-zinc-400',
};

const STRUCTURED_TYPES = new Set(['INTERVALS', 'REPETITIONS', 'TEMPO', 'FARTLEK']);

export interface Workout {
    id: string;
    scheduledDate: string | Date;
    workoutType: string;
    description: string;
    targetDistance: number | null;
    targetPace: number | null;
    targetDuration: number | null;
    targetHrZone: number | null;
    notes: string;
    phase: string;
    customName: string;
    colorOverride: string;
    structuredSteps: any;
    isCompleted: boolean;
}

interface WorkoutDetailPanelProps {
    workout: Workout;
    goalId: string;
    onClose: () => void;
    onUpdate: (workout: Workout) => void;
}

export function WorkoutDetailPanel({ workout, goalId, onClose, onUpdate }: WorkoutDetailPanelProps) {
    const queryClient = useQueryClient();
    const planData = queryClient.getQueryData(['plan-advanced', goalId]) as any;
    const currentVdot = planData?.goal?.currentVdot ?? 40;

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
    const [form, setForm] = useState({ ...workout });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setForm({ ...workout });
        setSaveState('idle');
        setShowDeleteConfirm(false);
    }, [workout.id]);

    const updateField = useCallback((field: string, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

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
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const { id, isCompleted, ...patch } = form;
            void saveMutation.mutate(patch);
        }, 500);
    }, [form, saveMutation]);

    useEffect(() => {
        triggerAutoSave();
    }, [form]);

    const handleManualSave = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const { id, isCompleted, ...patch } = form;
        void saveMutation.mutate(patch);
    }, [form, saveMutation]);

    const colors = WORKOUT_COLORS[form.workoutType] || WORKOUT_COLORS.OTHER;
    const isStructured = STRUCTURED_TYPES.has(form.workoutType);

    return (
        <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-semibold text-zinc-100">Edit Workout</span>
                </div>
                <div className="flex items-center gap-1">
                    {saveState === 'saving' && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                        </span>
                    )}
                    {saveState === 'saved' && (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                            <Check className="w-3 h-3" />
                            Saved
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Custom Name</label>
                    <input
                        type="text"
                        value={form.customName}
                        onChange={(e) => updateField('customName', e.target.value)}
                        placeholder={form.workoutType.replace(/_/g, ' ')}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Workout Type</label>
                    <select
                        value={form.workoutType}
                        onChange={(e) => updateField('workoutType', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    >
                        {WORKOUT_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {t.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Phase</label>
                    <select
                        value={form.phase}
                        onChange={(e) => updateField('phase', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    >
                        {PHASES.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Description</label>
                    <input
                        type="text"
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Distance (m)</label>
                        <input
                            type="number"
                            value={form.targetDistance ?? ''}
                            onChange={(e) => updateField('targetDistance', e.target.value ? Number(e.target.value) : null)}
                            placeholder="e.g. 8000"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Duration (min)</label>
                        <input
                            type="number"
                            value={form.targetDuration ? Math.round(form.targetDuration / 60) : ''}
                            onChange={(e) => updateField('targetDuration', e.target.value ? Number(e.target.value) * 60 : null)}
                            placeholder="e.g. 45"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Pace Zone</label>
                        <select
                            value={form.targetPace ?? ''}
                            onChange={(e) => updateField('targetPace', e.target.value ? parseInt(e.target.value, 10) : null)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        >
                            <option value="">None</option>
                            {paceZoneOptions.map((z) => (
                                <option key={z.value} value={z.value}>
                                    {z.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">HR Zone</label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={form.targetHrZone ?? ''}
                            onChange={(e) => updateField('targetHrZone', e.target.value ? Number(e.target.value) : null)}
                            placeholder="1-5"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Color Override</label>
                    <input
                        type="color"
                        value={form.colorOverride || '#3b82f6'}
                        onChange={(e) => updateField('colorOverride', e.target.value)}
                        className="w-full h-8 rounded-md bg-zinc-800 border border-zinc-700 cursor-pointer"
                    />
                </div>

                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
                    />
                </div>

                {isStructured && (
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Structured Workout</label>
                        <StructuredWorkoutEditor
                            value={form.structuredSteps}
                            onChange={(steps) => updateField('structuredSteps', steps)}
                            targetPace={form.targetPace ?? undefined}
                        />
                    </div>
                )}
            </div>

            <div className="border-t border-zinc-800 p-4 space-y-2">
                <button
                    type="button"
                    onClick={handleManualSave}
                    disabled={saveState === 'saving'}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-zinc-700 text-zinc-200 text-sm hover:bg-zinc-600 disabled:opacity-50 transition-colors"
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
                        <p className="text-xs text-red-400 text-center">Delete this workout?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-3 py-2 rounded-md bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-red-600 text-white text-xs hover:bg-red-500 disabled:opacity-50 transition-colors"
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
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-red-400 text-sm hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Workout
                    </button>
                )}
            </div>
        </div>
    );
}
