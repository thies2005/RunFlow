'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PrioritySelector } from './PrioritySelector';
import type { Goal, GoalPriority } from '../Progression/types';

interface EditSubGoalDialogProps {
    subGoal: Goal;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
}

export function EditSubGoalDialog({ subGoal, isOpen, onClose, onUpdated }: EditSubGoalDialogProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState(subGoal.name);
    const [raceDate, setRaceDate] = useState(
        subGoal.raceDate ? new Date(subGoal.raceDate).toISOString().split('T')[0] : '',
    );
    const [priority, setPriority] = useState<GoalPriority>(subGoal.priority);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${subGoal.parentId}/sub-goals/${subGoal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    raceDate: raceDate || null,
                    priority,
                }),
            });
            if (!res.ok) throw new Error('Failed to update sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', subGoal.parentId] });
            toast.success('Sub-goal updated');
            onUpdated();
            onClose();
        },
        onError: () => {
            toast.error('Failed to update sub-goal');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${subGoal.parentId}/sub-goals/${subGoal.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', subGoal.parentId] });
            toast.success('Sub-goal removed');
            onUpdated();
            onClose();
        },
        onError: () => {
            toast.error('Failed to remove sub-goal');
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Edit Event</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Event Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Event Date</label>
                        <input
                            type="date"
                            value={raceDate}
                            onChange={(e) => setRaceDate(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>

                    <PrioritySelector
                        value={priority}
                        onChange={setPriority}
                        hasPrimary={true}
                    />
                </div>

                <div className="flex items-center justify-between mt-5">
                    <div>
                        {!showDeleteConfirm ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                Remove
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-red-400">Confirm?</span>
                                <button
                                    type="button"
                                    onClick={() => deleteMutation.mutate()}
                                    disabled={deleteMutation.isPending}
                                    className="px-3 py-2 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                >
                                    {deleteMutation.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Yes, remove'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-3 py-2 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !name}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 transition-colors"
                        >
                            {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
