'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';

const WORKOUT_TYPES = [
    'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS',
    'RECOVERY', 'RACE', 'REST', 'RIDE', 'SWIM', 'STRENGTH',
    'CROSS_TRAIN', 'OTHER', 'BRICK', 'OPEN_WATER_SWIM', 'LONG_RIDE',
    'RIDE_INTERVALS', 'SWIM_DRILL', 'TRANSITION_PRACTICE', 'DOUBLE_DAY',
];

interface BulkTypeChangeDialogProps {
    goalId: string;
    workoutIds: string[];
    onClose: () => void;
    onComplete: () => void;
}

export function BulkTypeChangeDialog({ goalId, workoutIds, onClose, onComplete }: BulkTypeChangeDialogProps) {
    const queryClient = useQueryClient();
    const [newType, setNewType] = useState('EASY');

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/bulk`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'CHANGE_TYPE',
                    workoutIds,
                    params: { newType },
                }),
            });
            if (!res.ok) throw new Error('Type change failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success(`${workoutIds.length} workout${workoutIds.length !== 1 ? 's' : ''} changed to ${newType.replace(/_/g, ' ')}`);
            onComplete();
        },
        onError: () => {
            toast.error('Failed to change workout type');
        },
    });

    const previewColors = WORKOUT_COLORS[newType] || WORKOUT_COLORS.OTHER;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-zinc-400" />
                    Change Workout Type
                </h3>

                <div className="mb-4">
                    <label className="block text-xs text-zinc-500 mb-1">New Type</label>
                    <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    >
                        {WORKOUT_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {t.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4 p-2 rounded-md bg-zinc-800/50 border border-zinc-800">
                    <span className="text-xs text-zinc-500">Preview: </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${previewColors.bg} ${previewColors.text}`}>
                        {newType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-zinc-500 ml-1">
                        ({workoutIds.length} workout{workoutIds.length !== 1 ? 's' : ''})
                    </span>
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
                        disabled={mutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-700 text-zinc-200 text-xs hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
