'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Scissors } from 'lucide-react';
import { toast } from 'sonner';

interface BulkScaleDialogProps {
    goalId: string;
    workoutIds: string[];
    onClose: () => void;
    onComplete: () => void;
}

export function BulkScaleDialog({ goalId, workoutIds, onClose, onComplete }: BulkScaleDialogProps) {
    const queryClient = useQueryClient();
    const [volumeFactor, setVolumeFactor] = useState(100);
    const [intensityFactor, setIntensityFactor] = useState(100);

    const { data: planData } = useQuery({
        queryKey: ['plan-advanced', goalId],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}`);
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        enabled: workoutIds.length > 0,
    });

    const selectedWorkouts = useMemo(() => {
        if (!planData?.plan?.workouts) return [];
        return planData.plan.workouts.filter((w: any) => workoutIds.includes(w.id));
    }, [planData, workoutIds]);

    const previewDistance = useMemo(() => {
        const total = selectedWorkouts.reduce(
            (sum: number, w: any) => sum + (w.targetDistance || 0),
            0,
        );
        return Math.round(total * (volumeFactor / 100));
    }, [selectedWorkouts, volumeFactor]);

    const originalDistance = useMemo(() => {
        return selectedWorkouts.reduce(
            (sum: number, w: any) => sum + (w.targetDistance || 0),
            0,
        );
    }, [selectedWorkouts]);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/bulk`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'SCALE',
                    workoutIds,
                    params: {
                        volumeFactor: volumeFactor / 100,
                        intensityFactor: intensityFactor / 100,
                    },
                }),
            });
            if (!res.ok) throw new Error('Scale failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success('Workouts scaled successfully');
            onComplete();
        },
        onError: () => {
            toast.error('Failed to scale workouts');
        },
    });

    const isDefault = volumeFactor === 100 && intensityFactor === 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-zinc-400" />
                    Scale Workouts
                </h3>

                <div className="space-y-4 mb-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-zinc-500">Volume</label>
                            <span className="text-xs text-zinc-300 font-medium">{volumeFactor}%</span>
                        </div>
                        <input
                            type="range"
                            min={50}
                            max={200}
                            step={5}
                            value={volumeFactor}
                            onChange={(e) => setVolumeFactor(Number(e.target.value))}
                            className="w-full accent-zinc-400"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600">
                            <span>50%</span>
                            <span>200%</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-zinc-500">Intensity</label>
                            <span className="text-xs text-zinc-300 font-medium">{intensityFactor}%</span>
                        </div>
                        <input
                            type="range"
                            min={50}
                            max={200}
                            step={5}
                            value={intensityFactor}
                            onChange={(e) => setIntensityFactor(Number(e.target.value))}
                            className="w-full accent-zinc-400"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600">
                            <span>50%</span>
                            <span>200%</span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 p-2 rounded-md bg-zinc-800/50 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Current distance</span>
                        <span className="text-zinc-300">
                            {originalDistance >= 1000
                                ? `${(originalDistance / 1000).toFixed(1)} km`
                                : `${originalDistance} m`}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">New distance</span>
                        <span className={`font-medium ${isDefault ? 'text-zinc-500' : 'text-emerald-400'}`}>
                            {previewDistance >= 1000
                                ? `${(previewDistance / 1000).toFixed(1)} km`
                                : `${previewDistance} m`}
                        </span>
                    </div>
                    {volumeFactor !== 100 && (
                        <div className="text-[10px] text-zinc-600">
                            {volumeFactor > 100 ? '+' : ''}{volumeFactor - 100}% volume change
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || isDefault}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-700 text-zinc-200 text-xs hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Apply Scale
                    </button>
                </div>
            </div>
        </div>
    );
}
