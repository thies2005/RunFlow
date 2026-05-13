'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Copy, Loader2, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ProgressionWeekCard } from './ProgressionWeekCard';
import { ProgressionTimeline } from './ProgressionTimeline';
import { AiProgressionSuggest } from './AiProgressionSuggest';
import type { ProgressionWorkoutType, ProgressionWeekData, IntervalProgression } from './types';
import { weekTotalDistance } from './types';

const WORKOUT_TYPES: ProgressionWorkoutType[] = ['INTERVALS', 'REPETITIONS', 'FARTLEK', 'TEMPO'];

function createDefaultWeek(weekOffset: number, workoutType: ProgressionWorkoutType): ProgressionWeekData {
    const mainPace = workoutType === 'TEMPO' ? 'T' : workoutType === 'REPETITIONS' ? 'R' : 'I';
    return {
        weekOffset,
        warmup: { distance: 1000, pace: 'E' },
        main: [{ reps: 4, distance: 400, pace: mainPace, restSeconds: 90 }],
        cooldown: { distance: 1000, pace: 'E' },
    };
}

interface ProgressionBuilderProps {
    goalId: string;
    vdot: number;
    raceType: string;
    isOpen: boolean;
    onClose: () => void;
    existingProgression?: IntervalProgression | null;
}

export function ProgressionBuilder({
    goalId,
    vdot,
    raceType,
    isOpen,
    onClose,
    existingProgression,
}: ProgressionBuilderProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState(existingProgression?.name || '');
    const [workoutType, setWorkoutType] = useState<ProgressionWorkoutType>(
        existingProgression?.workoutType || 'INTERVALS',
    );
    const [startWeek, setStartWeek] = useState(existingProgression?.startWeek || 1);
    const [endWeek, setEndWeek] = useState(existingProgression?.endWeek || 8);
    const [weeks, setWeeks] = useState<ProgressionWeekData[]>(
        existingProgression?.weeks || [],
    );
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const body = {
                name,
                workoutType,
                startWeek,
                endWeek,
                weeks,
            };
            if (existingProgression?.id) {
                const res = await fetch(`/api/plan-advanced/${goalId}/progression/${existingProgression.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error('Save failed');
                return res.json();
            }
            const res = await fetch(`/api/plan-advanced/${goalId}/progression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Save failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Progression saved');
        },
        onError: () => {
            toast.error('Failed to save progression');
        },
    });

    const applyMutation = useMutation({
        mutationFn: async () => {
            const body = { name, workoutType, startWeek, endWeek, weeks };
            if (existingProgression?.id) {
                const res = await fetch(`/api/plan-advanced/${goalId}/progression/${existingProgression.id}/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error('Apply failed');
                return res.json();
            }
            const res = await fetch(`/api/plan-advanced/${goalId}/progression/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Apply failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Progression applied to plan');
            onClose();
        },
        onError: () => {
            toast.error('Failed to apply progression');
        },
    });

    const generateWeeks = useCallback(() => {
        const count = endWeek - startWeek + 1;
        if (count <= 0) return;
        const generated: ProgressionWeekData[] = [];
        for (let i = 0; i < count; i++) {
            generated.push(createDefaultWeek(startWeek + i, workoutType));
        }
        setWeeks(generated);
    }, [startWeek, endWeek, workoutType]);

    const copyPreviousWeek = useCallback(
        (index: number) => {
            if (index === 0) return;
            setWeeks((prev) => {
                const next = [...prev];
                next[index] = JSON.parse(JSON.stringify(next[index - 1]));
                next[index].weekOffset = next[index - 1].weekOffset + 1;
                return next;
            });
            setEditingIndex(index);
        },
        [],
    );

    const addWeek = useCallback(() => {
        if (weeks.length === 0) {
            setWeeks([createDefaultWeek(endWeek + 1, workoutType)]);
        } else {
            const lastWeek = weeks[weeks.length - 1];
            const newWeek: ProgressionWeekData = JSON.parse(JSON.stringify(lastWeek));
            newWeek.weekOffset = lastWeek.weekOffset + 1;
            setWeeks((prev) => [...prev, newWeek]);
        }
    }, [weeks, endWeek, workoutType]);

    const deleteWeek = useCallback((index: number) => {
        setWeeks((prev) => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    }, [editingIndex]);

    const handleWeekSave = useCallback(
        (data: ProgressionWeekData) => {
            setWeeks((prev) => prev.map((w, i) => (i === editingIndex ? data : w)));
            setEditingIndex(null);
        },
        [editingIndex],
    );

    const handleWeekClick = useCallback((index: number) => {
        setEditingIndex(index);
    }, []);

    const handleAiApply = useCallback(
        (aiWeeks: ProgressionWeekData[]) => {
            setWeeks(aiWeeks);
        },
        [],
    );

    if (!isOpen) return null;

    const progressionForTimeline: IntervalProgression = {
        goalId,
        name,
        workoutType,
        startWeek,
        endWeek,
        weeks,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-100">
                        {existingProgression ? 'Edit Progression' : 'Create Progression'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Tuesday Intervals"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">Workout Type</label>
                            <select
                                value={workoutType}
                                onChange={(e) => setWorkoutType(e.target.value as ProgressionWorkoutType)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            >
                                {WORKOUT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">Start Week</label>
                            <input
                                type="number"
                                min={1}
                                value={startWeek}
                                onChange={(e) => setStartWeek(Math.max(1, Number(e.target.value)))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">End Week</label>
                            <input
                                type="number"
                                min={startWeek}
                                value={endWeek}
                                onChange={(e) => setEndWeek(Math.max(startWeek, Number(e.target.value)))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                        </div>
                    </div>

                    {weeks.length === 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">Week-by-week definition</span>
                                <AiProgressionSuggest
                                    goalId={goalId}
                                    workoutType={workoutType}
                                    startWeek={startWeek}
                                    endWeek={endWeek}
                                    raceType={raceType}
                                    vdot={vdot}
                                    onApply={handleAiApply}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={generateWeeks}
                                className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                            >
                                Generate {endWeek - startWeek + 1} weeks
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">
                                    Week-by-week ({weeks.length} weeks,{' '}
                                    {weeks.reduce((sum, w) => sum + weekTotalDistance(w), 0) >= 1000
                                        ? `${(weeks.reduce((sum, w) => sum + weekTotalDistance(w), 0) / 1000).toFixed(1)}km total`
                                        : `${weeks.reduce((sum, w) => sum + weekTotalDistance(w), 0)}m total`}
                                    )
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <AiProgressionSuggest
                                        goalId={goalId}
                                        workoutType={workoutType}
                                        startWeek={startWeek}
                                        endWeek={endWeek}
                                        raceType={raceType}
                                        vdot={vdot}
                                        onApply={handleAiApply}
                                    />
                                </div>
                            </div>

                            <ProgressionTimeline
                                progression={progressionForTimeline}
                                onWeekClick={handleWeekClick}
                            />

                            <div className="space-y-2">
                                {weeks.map((week, i) => (
                                    <div key={i} className="relative">
                                        <ProgressionWeekCard
                                            weekIndex={week.weekOffset}
                                            data={week}
                                            workoutType={workoutType}
                                            isEditing={editingIndex === i}
                                            onEdit={() => setEditingIndex(i)}
                                            onDelete={() => deleteWeek(i)}
                                            onSave={handleWeekSave}
                                            onCancelEdit={() => setEditingIndex(null)}
                                        />
                                        {i > 0 && editingIndex !== i && (
                                            <button
                                                type="button"
                                                onClick={() => copyPreviousWeek(i)}
                                                className="absolute right-3 top-3 text-[10px] text-zinc-600 hover:text-zinc-300 flex items-center gap-0.5 transition-colors"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copy prev
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addWeek}
                                    className="flex items-center gap-1 w-full py-2 border border-dashed border-zinc-700 rounded-lg text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add week
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        {weeks.length > 0 && (
                            <button
                                type="button"
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending || !name}
                                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 text-xs hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                            >
                                {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                Save
                            </button>
                        )}
                        {weeks.length > 0 && (
                            <button
                                type="button"
                                onClick={() => applyMutation.mutate()}
                                disabled={applyMutation.isPending || !name}
                                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 transition-colors"
                            >
                                {applyMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Play className="w-3 h-3" />
                                )}
                                Apply to Plan
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
