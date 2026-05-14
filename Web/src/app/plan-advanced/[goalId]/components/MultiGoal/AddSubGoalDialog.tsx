'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PrioritySelector } from './PrioritySelector';
import type { GoalPriority } from '../Progression/types';

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
    const [raceType, setRaceType] = useState('');
    const [raceDate, setRaceDate] = useState('');
    const [targetTime, setTargetTime] = useState('');
    const [priority, setPriority] = useState<GoalPriority>('SECONDARY');
    const [generateWorkouts, setGenerateWorkouts] = useState(true);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${parentGoalId}/sub-goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    sport: parentSport,
                    raceType: raceType || null,
                    raceDate: raceDate || null,
                    targetTime: targetTime ? parseTargetTime(targetTime) : null,
                    priority,
                    parentId: parentGoalId,
                    generateWorkouts,
                }),
            });
            if (!res.ok) throw new Error('Failed to create sub-goal');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', parentGoalId] });
            const msg = data.workoutsCreated
                ? `Sub-goal added with ${data.workoutsCreated} workouts`
                : 'Sub-goal added';
            toast.success(msg);
            setName('');
            setRaceType('');
            setRaceDate('');
            setTargetTime('');
            setPriority('SECONDARY');
            setGenerateWorkouts(true);
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
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
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
                            <label className="text-xs text-zinc-400">Distance</label>
                            <select
                                value={raceType}
                                onChange={(e) => setRaceType(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
                            <label className="text-xs text-zinc-400">Event Date</label>
                            <input
                                type="date"
                                value={raceDate}
                                onChange={(e) => setRaceDate(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Target Time (optional, HH:MM:SS)</label>
                        <input
                            type="text"
                            value={targetTime}
                            onChange={(e) => setTargetTime(e.target.value)}
                            placeholder="e.g. 1:45:00"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        />
                    </div>

                    <PrioritySelector
                        value={priority}
                        onChange={setPriority}
                        hasPrimary={true}
                    />

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="generateWorkouts"
                            checked={generateWorkouts}
                            onChange={(e) => setGenerateWorkouts(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <label htmlFor="generateWorkouts" className="text-xs text-zinc-400">
                            Auto-generate workouts for this event
                        </label>
                    </div>
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

function parseTargetTime(input: string): number | null {
    const parts = input.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
}
