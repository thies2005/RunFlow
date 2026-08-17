'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkDeleteDialogProps {
    goalId: string;
    workoutIds: string[];
    onClose: () => void;
    onComplete: () => void;
}

export function BulkDeleteDialog({ goalId, workoutIds, onClose, onComplete }: BulkDeleteDialogProps) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/workouts/bulk`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'DELETE',
                    workoutIds,
                }),
            });
            if (!res.ok) throw new Error('Bulk delete failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success(`${workoutIds.length} workout${workoutIds.length !== 1 ? 's' : ''} deleted`);
            onComplete();
        },
        onError: () => {
            toast.error('Failed to delete workouts');
        },
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-background-secondary border border-foreground/20 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-full bg-red-500/10">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Delete {workoutIds.length} workout{workoutIds.length !== 1 ? 's' : ''}?</h3>
                        <p className="text-xs text-foreground-secondary mt-1">This action cannot be undone.</p>
                    </div>
                </div>
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
                        disabled={mutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs hover:bg-red-500 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
