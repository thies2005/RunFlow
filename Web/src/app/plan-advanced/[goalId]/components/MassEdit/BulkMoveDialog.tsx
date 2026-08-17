'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface BulkMoveDialogProps {
    goalId: string;
    workoutIds: string[];
    onClose: () => void;
    onComplete: () => void;
}

export function BulkMoveDialog({ goalId, workoutIds, onClose, onComplete }: BulkMoveDialogProps) {
    const queryClient = useQueryClient();
    const [days, setDays] = useState(0);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/bulk`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'SHIFT',
                    workoutIds,
                    params: { days },
                }),
            });
            if (!res.ok) throw new Error('Bulk move failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success(`${workoutIds.length} workout${workoutIds.length !== 1 ? 's' : ''} moved ${days} day${Math.abs(days) !== 1 ? 's' : ''}`);
            onComplete();
        },
        onError: () => {
            toast.error('Failed to move workouts');
        },
    });

    const previewDate = addDays(new Date(), days);
    const direction = days >= 0 ? 'forward' : 'backward';
    const absDays = Math.abs(days);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-background-secondary border border-foreground/20 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-foreground-secondary" />
                    Move Workouts
                </h3>

                <div className="mb-4">
                    <label className="block text-xs text-foreground-muted mb-1">
                        Shift by ({direction})
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDays((d) => d - 1)}
                            className="w-8 h-8 rounded-md bg-background-tertiary text-foreground-secondary hover:bg-foreground/15 transition-colors text-sm font-bold"
                        >
                            &minus;
                        </button>
                        <input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="flex-1 bg-background-tertiary border border-foreground/20 rounded-md px-3 py-1.5 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                        />
                        <button
                            type="button"
                            onClick={() => setDays((d) => d + 1)}
                            className="w-8 h-8 rounded-md bg-background-tertiary text-foreground-secondary hover:bg-foreground/15 transition-colors text-sm font-bold"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                        {days === 0
                            ? 'No change'
                            : `${absDays} day${absDays !== 1 ? 's' : ''} ${direction}`}
                    </p>
                </div>

                {days !== 0 && (
                    <div className="mb-4 p-2 rounded-md bg-background-tertiary/50 border border-glass-border">
                        <span className="text-xs text-foreground-muted">
                            Example: today &rarr;{' '}
                            <span className="text-foreground-secondary">{format(previewDate, 'MMM d, yyyy')}</span>
                        </span>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-md bg-background-tertiary text-foreground-secondary text-xs hover:bg-foreground/15 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || days === 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-foreground/15 text-foreground text-xs hover:bg-foreground/20 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Move
                    </button>
                </div>
            </div>
        </div>
    );
}
