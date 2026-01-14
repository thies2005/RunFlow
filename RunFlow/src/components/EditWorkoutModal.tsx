'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Trash2 } from 'lucide-react';
import ActivityPicker from './ActivityPicker';
import type { Workout } from '@/lib/types';

interface EditWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    workout?: Workout | null;
    goalId?: string; // If creating
    defaultDate?: Date; // If creating
    initialComplete?: boolean; // If marking complete immediately
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

export default function EditWorkoutModal({ isOpen, onClose, workout, goalId, defaultDate, initialComplete }: EditWorkoutModalProps) {
    const queryClient = useQueryClient();
    const initialCompleteRef = useRef(initialComplete);

    // Update ref when prop changes
    useEffect(() => {
        initialCompleteRef.current = initialComplete;
    }, [initialComplete]);

    const [type, setType] = useState('EASY');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [distanceKm, setDistanceKm] = useState('0');
    const [distanceM, setDistanceM] = useState('0'); // For swimming (meters)
    const [durationMin, setDurationMin] = useState('0');
    const [isCompleted, setIsCompleted] = useState(false);
    const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
    const [wasCompleted, setWasCompleted] = useState(false); // Track initial state

    const isSwim = type === 'SWIM';

    useEffect(() => {
        if (isOpen) {
            if (workout) {
                setType(workout.workoutType);
                setDescription(workout.description);
                setDate(new Date(workout.scheduledDate).toISOString().split('T')[0]);
                // For swimming, use meters directly; for other types, convert to km
                if (workout.workoutType === 'SWIM') {
                    setDistanceM((workout.targetDistance ?? 0).toString());
                    setDistanceKm('0');
                } else {
                    setDistanceKm(((workout.targetDistance ?? 0) / 1000).toString());
                    setDistanceM('0');
                }
                setDurationMin(((workout.targetDuration ?? 0) / 60).toString());
                // Use ref to avoid dependency on initialComplete
                setIsCompleted(initialCompleteRef.current || workout.isCompleted);
                setWasCompleted(workout.isCompleted);
                setLinkedActivityId(workout.linkedActivityId || null);
            } else if (defaultDate) {
                setType('EASY');
                setDescription('New Workout');
                setDate(defaultDate.toISOString().split('T')[0]);
                setDistanceKm('5');
                setDistanceM('1500');
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
                // For swimming, use meters directly; for other types, convert km to meters
                targetDistance: type === 'SWIM'
                    ? parseFloat(distanceM)
                    : parseFloat(distanceKm) * 1000,
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
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">
                    {workout ? 'Edit Workout' : 'Add Workout'}
                </h2>

                <div className="space-y-4">
                    {/* Type */}
                    <div>
                        <label htmlFor="workout-type" className="block text-xs text-gray-400 mb-1 uppercase">Type</label>
                        <select
                            id="workout-type"
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
                        <label htmlFor="workout-date" className="block text-xs text-gray-400 mb-1 uppercase">Date</label>
                        <input
                            id="workout-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="workout-description" className="block text-xs text-gray-400 mb-1 uppercase">Description</label>
                        <input
                            id="workout-description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Distance */}
                        <div>
                            <label htmlFor="workout-distance" className="block text-xs text-gray-400 mb-1 uppercase">
                                {isSwim ? 'Distance (m)' : 'Distance (km)'}
                            </label>
                            <input
                                id="workout-distance"
                                type="number"
                                step={isSwim ? '50' : '0.1'}
                                value={isSwim ? distanceM : distanceKm}
                                onChange={(e) => isSwim
                                    ? setDistanceM(e.target.value)
                                    : setDistanceKm(e.target.value)
                                }
                                className={inputClass}
                            />
                        </div>
                        {/* Duration */}
                        <div>
                            <label htmlFor="workout-duration" className="block text-xs text-gray-400 mb-1 uppercase">Duration (min)</label>
                            <input
                                id="workout-duration"
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
                                    id="workout-completed"
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={(e) => setIsCompleted(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-500 bg-white/10 accent-accent-orange"
                                />
                                <label htmlFor="workout-completed" className="text-sm text-gray-300">Mark as Completed</label>
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
                                aria-label="Delete workout"
                                title="Delete workout"
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
