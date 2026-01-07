'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Trash2 } from 'lucide-react';
import ActivityPicker from './ActivityPicker';

interface EditWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    workout?: any; // If editing
    goalId?: string; // If creating
    defaultDate?: Date; // If creating
}

// Map types to labels
const WORKOUT_TYPES = [
    { value: 'EASY', label: 'Easy Run' },
    { value: 'LONG_RUN', label: 'Long Run' },
    { value: 'TEMPO', label: 'Tempo' },
    { value: 'INTERVALS', label: 'Intervals' },
    { value: 'RECOVERY', label: 'Recovery' },
    { value: 'REST', label: 'Rest Day' },
    { value: 'RIDE', label: 'Bike Ride' },
    { value: 'SWIM', label: 'Swim' },
    { value: 'STRENGTH', label: 'Strength' },
    { value: 'OTHER', label: 'Other' },
];

export default function EditWorkoutModal({ isOpen, onClose, workout, goalId, defaultDate }: EditWorkoutModalProps) {
    const queryClient = useQueryClient();

    const [type, setType] = useState('EASY');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [distanceKm, setDistanceKm] = useState('0');
    const [durationMin, setDurationMin] = useState('0');
    const [isCompleted, setIsCompleted] = useState(false);
    const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
    const [wasCompleted, setWasCompleted] = useState(false); // Track initial state

    useEffect(() => {
        if (isOpen) {
            if (workout) {
                setType(workout.workoutType);
                setDescription(workout.description);
                setDate(new Date(workout.scheduledDate).toISOString().split('T')[0]);
                setDistanceKm((workout.targetDistance / 1000).toString());
                setDurationMin((workout.targetDuration / 60).toString());
                setIsCompleted(workout.isCompleted);
                setWasCompleted(workout.isCompleted);
                setLinkedActivityId(workout.linkedActivityId || null);
            } else if (defaultDate) {
                setType('EASY');
                setDescription('New Workout');
                setDate(defaultDate.toISOString().split('T')[0]);
                setDistanceKm('5');
                setDurationMin('30');
                setIsCompleted(false);
                setWasCompleted(false);
                setLinkedActivityId(null);
            }
        }
    }, [isOpen, workout, defaultDate]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                workoutType: type,
                description,
                scheduledDate: date,
                targetDistance: parseFloat(distanceKm) * 1000,
                targetDuration: parseInt(durationMin) * 60,
                isCompleted,
                linkedActivityId: isCompleted ? linkedActivityId : null,
                goalId // Only for create
            };

            const url = workout ? `/api/workouts/${workout.id}` : '/api/workouts';
            const method = workout ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
            onClose();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!workout) return;
            const res = await fetch(`/api/workouts/${workout.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            onClose();
        }
    });

    if (!isOpen) return null;

    const inputClass = "bg-white/5 border border-white/10 rounded-lg p-3 text-white w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-md p-6 relative animate-slide-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">
                    {workout ? 'Edit Workout' : 'Add Workout'}
                </h2>

                <div className="space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className={inputClass}
                        >
                            {WORKOUT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Distance */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Distance (km)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={distanceKm}
                                onChange={(e) => setDistanceKm(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        {/* Duration */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Duration (min)</label>
                            <input
                                type="number"
                                value={durationMin}
                                onChange={(e) => setDurationMin(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Status */}
                    {workout && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={(e) => setIsCompleted(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-500 bg-white/10 accent-accent-orange"
                                />
                                <label className="text-sm text-gray-300">Mark as Completed</label>
                            </div>

                            {/* Activity Picker - Show when marking complete for first time */}
                            {isCompleted && !wasCompleted && (
                                <div className="max-h-64 overflow-y-auto">
                                    <ActivityPicker
                                        selectedId={linkedActivityId}
                                        onSelect={setLinkedActivityId}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        {workout && (
                            <button
                                onClick={() => deleteMutation.mutate()}
                                className="px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
                        >
                            <Save className="w-4 h-4" />
                            {saveMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
