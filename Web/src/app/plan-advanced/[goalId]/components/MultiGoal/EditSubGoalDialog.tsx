'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PrioritySelector } from './PrioritySelector';
import type { Goal, GoalPriority } from '../Progression/types';

const SPORTS = [
    { value: 'RUNNING', label: 'Running' },
    { value: 'TRIATHLON', label: 'Triathlon' },
    { value: 'CYCLING', label: 'Cycling' },
    { value: 'SWIMMING', label: 'Swimming' },
];

const RACE_TYPES_BY_SPORT: Record<string, { value: string; label: string }[]> = {
    RUNNING: [
        { value: 'FIVE_K', label: '5K' },
        { value: 'TEN_K', label: '10K' },
        { value: 'HALF_MARATHON', label: 'Half Marathon' },
        { value: 'MARATHON', label: 'Marathon' },
        { value: 'FIFTY_K', label: '50K' },
        { value: 'FIFTY_MILE', label: '50 Mile' },
        { value: 'HUNDRED_K', label: '100K' },
        { value: 'HUNDRED_MILE', label: '100 Mile' },
        { value: 'TWELVE_HOUR', label: '12 Hour' },
        { value: 'TWENTY_FOUR_HOUR', label: '24 Hour' },
        { value: 'BACKYARD_ULTRA', label: 'Backyard Ultra' },
        { value: 'CUSTOM_DISTANCE', label: 'Custom Distance' },
    ],
    TRIATHLON: [
        { value: 'SPRINT_TRI', label: 'Sprint Triathlon' },
        { value: 'OLYMPIC_TRI', label: 'Olympic Triathlon' },
        { value: 'HALF_IRONMAN', label: 'Half Ironman' },
        { value: 'FULL_IRONMAN', label: 'Full Ironman' },
        { value: 'CUSTOM_TRI', label: 'Custom Triathlon' },
    ],
    CYCLING: [
        { value: 'CUSTOM_DISTANCE', label: 'Custom Distance' },
    ],
    SWIMMING: [
        { value: 'CUSTOM_DISTANCE', label: 'Custom Distance' },
    ],
};

function normalizeSport(sport: string | undefined | null): string {
    if (!sport) return 'RUNNING';
    if (sport === 'RUN') return 'RUNNING';
    return sport;
}

interface EditSubGoalDialogProps {
    subGoal: Goal;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
}

export function EditSubGoalDialog({ subGoal, isOpen, onClose, onUpdated }: EditSubGoalDialogProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState(subGoal.name);
    const [sport, setSport] = useState(normalizeSport(subGoal.sport));
    const [raceType, setRaceType] = useState(subGoal.raceType || '');
    const [raceDate, setRaceDate] = useState(
        subGoal.raceDate ? new Date(subGoal.raceDate).toISOString().split('T')[0] : '',
    );
    const [priority, setPriority] = useState<GoalPriority>(subGoal.priority);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const raceTypeOptions = useMemo(() => {
        return RACE_TYPES_BY_SPORT[sport] || RACE_TYPES_BY_SPORT.RUNNING;
    }, [sport]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const parentId = subGoal.parentId || subGoal.parentGoalId;
            const res = await fetch(`/api/plan-advanced/${parentId}/sub-goals/${subGoal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    sport,
                    raceType: raceType || null,
                    raceDate: raceDate || null,
                    priority,
                }),
            });
            if (!res.ok) throw new Error('Failed to update sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', subGoal.parentId || subGoal.parentGoalId] });
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
            const parentId = subGoal.parentId || subGoal.parentGoalId;
            const res = await fetch(`/api/plan-advanced/${parentId}/sub-goals/${subGoal.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', subGoal.parentId || subGoal.parentGoalId] });
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
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
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

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">Sport</label>
                            <select
                                value={sport}
                                onChange={(e) => {
                                    setSport(e.target.value);
                                    setRaceType('');
                                }}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            >
                                {SPORTS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">Race Type</label>
                            <select
                                value={raceType}
                                onChange={(e) => setRaceType(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            >
                                <option value="">Select...</option>
                                {raceTypeOptions.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
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
