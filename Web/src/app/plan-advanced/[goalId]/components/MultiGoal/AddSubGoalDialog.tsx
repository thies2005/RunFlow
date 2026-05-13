'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PrioritySelector } from './PrioritySelector';
import type { GoalPriority } from '../Progression/types';

const SPORTS = [
    { value: 'RUNNING', label: 'Running' },
    { value: 'TRIATHLON', label: 'Triathlon' },
    { value: 'CYCLING', label: 'Cycling' },
    { value: 'SWIMMING', label: 'Swimming' },
];

const RACE_TYPES = [
    '5K', '10K', 'HALF_MARATHON', 'MARATHON', 'ULTRA',
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'IRONMAN',
    'OTHER',
];

interface AddSubGoalDialogProps {
    parentGoalId: string;
    parentSport: string;
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function AddSubGoalDialog({
    parentGoalId,
    parentSport,
    isOpen,
    onClose,
    onCreated,
}: AddSubGoalDialogProps) {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [sport, setSport] = useState(parentSport);
    const [raceType, setRaceType] = useState('');
    const [raceDate, setRaceDate] = useState('');
    const [priority, setPriority] = useState<GoalPriority>('SECONDARY');

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${parentGoalId}/sub-goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    sport,
                    raceType,
                    raceDate: raceDate || null,
                    priority,
                    parentId: parentGoalId,
                }),
            });
            if (!res.ok) throw new Error('Failed to create sub-goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', parentGoalId] });
            toast.success('Sub-goal added');
            setName('');
            setSport(parentSport);
            setRaceType('');
            setRaceDate('');
            setPriority('SECONDARY');
            onCreated();
            onClose();
        },
        onError: () => {
            toast.error('Failed to add sub-goal');
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Add Event</h3>
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
                            placeholder="e.g. Local Half Marathon"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">Sport</label>
                            <select
                                value={sport}
                                onChange={(e) => setSport(e.target.value)}
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
                                {RACE_TYPES.map((t) => (
                                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
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

                <div className="flex justify-end gap-2 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !name}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}
