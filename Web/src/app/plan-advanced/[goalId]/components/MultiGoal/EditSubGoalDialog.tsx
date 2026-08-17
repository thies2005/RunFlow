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
    const parentId = subGoal.parentId || subGoal.parentGoalId;

    const [name, setName] = useState(subGoal.name);
    const [raceType, setRaceType] = useState(subGoal.raceType || '');
    const [raceDate, setRaceDate] = useState(
        subGoal.raceDate ? new Date(subGoal.raceDate).toISOString().split('T')[0] : '',
    );
    const [priority, setPriority] = useState<GoalPriority>(subGoal.priority);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${parentId}/sub-goals/${subGoal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    raceType: raceType || null,
                    raceDate: raceDate || null,
                    priority,
                }),
            });
            if (!res.ok) throw new Error('Failed to update sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', parentId] });
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
            const res = await fetch(`/api/plan-advanced/${parentId}/sub-goals/${subGoal.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', parentId] });
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
            <div className="relative bg-background-secondary border border-foreground/20 rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Edit Event</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs text-foreground-secondary">Event Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-foreground-secondary">Distance</label>
                            <select
                                value={raceType}
                                onChange={(e) => setRaceType(e.target.value)}
                                className="w-full bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            >
                                <option value="">Select...</option>
                                <optgroup label="Running">
                                    <option value="FIVE_K">5K</option>
                                    <option value="TEN_K">10K</option>
                                    <option value="HALF_MARATHON">Half Marathon</option>
                                    <option value="MARATHON">Marathon</option>
                                </optgroup>
                                <optgroup label="Ultra">
                                    <option value="FIFTY_K">50K</option>
                                    <option value="FIFTY_MILE">50 Mile</option>
                                    <option value="HUNDRED_K">100K</option>
                                    <option value="HUNDRED_MILE">100 Mile</option>
                                    <option value="TWELVE_HOUR">12 Hour</option>
                                    <option value="TWENTY_FOUR_HOUR">24 Hour</option>
                                    <option value="BACKYARD_ULTRA">Backyard Ultra</option>
                                </optgroup>
                                <optgroup label="Triathlon">
                                    <option value="SPRINT_TRI">Sprint Triathlon</option>
                                    <option value="OLYMPIC_TRI">Olympic Triathlon</option>
                                    <option value="HALF_IRONMAN">Half Ironman (70.3)</option>
                                    <option value="FULL_IRONMAN">Full Ironman</option>
                                    <option value="CUSTOM_TRI">Custom Triathlon</option>
                                </optgroup>
                                <optgroup label="Other">
                                    <option value="CUSTOM_DISTANCE">Custom Distance</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-foreground-secondary">Event Date</label>
                            <input
                                type="date"
                                value={raceDate}
                                onChange={(e) => setRaceDate(e.target.value)}
                                className="w-full bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                            />
                        </div>
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
                                    className="px-3 py-2 rounded-lg text-xs text-foreground-secondary hover:bg-background-tertiary transition-colors"
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
                            className="px-4 py-2 rounded-lg bg-background-tertiary text-foreground-secondary text-xs hover:bg-foreground/15 transition-colors"
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
