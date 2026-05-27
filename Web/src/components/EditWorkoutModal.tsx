'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, Clock, Link2, Route, Save, Trash2 } from 'lucide-react';
import ActivityPicker from './ActivityPicker';
import { Modal } from '@/components/ui/Modal';
import type { Workout } from '@/lib/types';

interface EditWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    workout?: Workout | null;
    goalId?: string;
    defaultDate?: Date;
    initialComplete?: boolean;
}

const WORKOUT_TYPES = [
    { value: 'EASY', label: 'Easy Run' },
    { value: 'LONG_RUN', label: 'Long Run' },
    { value: 'TEMPO', label: 'Tempo / Threshold' },
    { value: 'INTERVALS', label: 'Intervals' },
    { value: 'FARTLEK', label: 'Fartlek' },
    { value: 'REPETITIONS', label: 'Repetitions' },
    { value: 'RECOVERY', label: 'Recovery Run' },
    { value: 'RACE', label: 'Race' },
    { value: 'REST', label: 'Rest Day' },
    { value: 'RIDE', label: 'Bike Ride' },
    { value: 'LONG_RIDE', label: 'Long Ride' },
    { value: 'RIDE_INTERVALS', label: 'Bike Intervals' },
    { value: 'BRICK', label: 'Brick' },
    { value: 'SWIM', label: 'Endurance Swim' },
    { value: 'SWIM_DRILL', label: 'Swim Drill' },
    { value: 'OPEN_WATER_SWIM', label: 'Open Water Swim' },
    { value: 'TRANSITION_PRACTICE', label: 'Transition Practice' },
    { value: 'STRENGTH', label: 'Strength' },
    { value: 'CROSS_TRAIN', label: 'Cross Training' },
    { value: 'OTHER', label: 'Other' },
];

const SWIM_TYPES = new Set(['SWIM', 'SWIM_DRILL', 'OPEN_WATER_SWIM']);
const TIME_FIRST_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK', 'STRENGTH', 'CROSS_TRAIN', 'TRANSITION_PRACTICE']);

function toInputDate(value?: string | Date): string {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function readNumber(value: string): number {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export default function EditWorkoutModal({ isOpen, onClose, workout, goalId, defaultDate, initialComplete }: EditWorkoutModalProps) {
    const queryClient = useQueryClient();
    const initialCompleteRef = useRef(initialComplete);

    useEffect(() => {
        initialCompleteRef.current = initialComplete;
    }, [initialComplete]);

    const [type, setType] = useState('EASY');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [distanceKm, setDistanceKm] = useState('0');
    const [distanceM, setDistanceM] = useState('0');
    const [durationMin, setDurationMin] = useState('0');
    const [isCompleted, setIsCompleted] = useState(false);
    const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
    const [wasCompleted, setWasCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSwim = SWIM_TYPES.has(type);
    const isTimeFirst = TIME_FIRST_TYPES.has(type);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);

        if (workout) {
            setType(workout.workoutType);
            setDescription(workout.description || '');
            setDate(toInputDate(workout.scheduledDate));
            if (SWIM_TYPES.has(workout.workoutType)) {
                setDistanceM(`${workout.targetDistance ?? 0}`);
                setDistanceKm('0');
            } else {
                setDistanceKm(`${((workout.targetDistance ?? 0) / 1000).toFixed(1)}`);
                setDistanceM('0');
            }
            setDurationMin(`${Math.round((workout.targetDuration ?? 0) / 60)}`);
            setIsCompleted(Boolean(initialCompleteRef.current || workout.isCompleted));
            setWasCompleted(Boolean(workout.isCompleted));
            setLinkedActivityId(workout.linkedActivityId || null);
        } else if (defaultDate) {
            setType('EASY');
            setDescription('Easy Run');
            setDate(toInputDate(defaultDate));
            setDistanceKm('5.0');
            setDistanceM('1500');
            setDurationMin('30');
            setIsCompleted(false);
            setWasCompleted(false);
            setLinkedActivityId(null);
        }
    }, [isOpen, workout, defaultDate]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            setError(null);
            if (!date) throw new Error('Choose a workout date.');
            if (!description.trim()) throw new Error('Add a workout description.');

            const targetDistance = isSwim
                ? Math.max(0, Math.round(readNumber(distanceM)))
                : Math.max(0, Math.round(readNumber(distanceKm) * 1000));
            const targetDuration = Math.max(0, Math.round(readNumber(durationMin) * 60));

            const payload = {
                workoutType: type,
                description: description.trim(),
                scheduledDate: date,
                targetDistance,
                targetDuration,
                isCompleted,
                linkedActivityId: isCompleted ? linkedActivityId : null,
            };

            const useAdvancedRoute = Boolean(goalId);
            const url = useAdvancedRoute
                ? workout
                    ? `/api/plan-advanced/${goalId}/workouts/${workout.id}`
                    : `/api/plan-advanced/${goalId}/workouts`
                : workout
                    ? `/api/workouts/${workout.id}`
                    : '/api/workouts';
            const method = workout ? 'PATCH' : 'POST';
            const body = useAdvancedRoute ? payload : { ...payload, goalId };

            const res = await fetch(url, {
                method,
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Failed to save workout.');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            if (goalId) queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            onClose();
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to save workout.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!workout) return;
            setError(null);
            const url = goalId
                ? `/api/plan-advanced/${goalId}/workouts/${workout.id}`
                : `/api/workouts/${workout.id}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Failed to delete workout.');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            if (goalId) queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            onClose();
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to delete workout.');
        },
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={workout ? 'Edit Workout' : 'Add Workout'}
            maxWidth="lg"
        >
            <div className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                        <span className="text-xs font-medium uppercase text-foreground-muted">Workout Type</span>
                        <select
                            id="workout-type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full rounded-lg border border-glass-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-orange"
                        >
                            {WORKOUT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-foreground-muted">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Date
                        </span>
                        <input
                            id="workout-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-lg border border-glass-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-orange"
                        />
                    </label>
                </div>

                <label className="space-y-1.5">
                    <span className="text-xs font-medium uppercase text-foreground-muted">Description</span>
                    <input
                        id="workout-description"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border border-glass-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent-orange"
                    />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-foreground-muted">
                            <Route className="h-3.5 w-3.5" />
                            {isSwim ? 'Distance (m)' : 'Distance (km)'}
                        </span>
                        <input
                            id="workout-distance"
                            type="number"
                            min="0"
                            step={isSwim ? '50' : '0.1'}
                            value={isSwim ? distanceM : distanceKm}
                            onChange={(e) => isSwim ? setDistanceM(e.target.value) : setDistanceKm(e.target.value)}
                            className="w-full rounded-lg border border-glass-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-orange"
                        />
                    </label>

                    <label className="space-y-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-foreground-muted">
                            <Clock className="h-3.5 w-3.5" />
                            Duration (min)
                        </span>
                        <input
                            id="workout-duration"
                            type="number"
                            min="0"
                            step={isTimeFirst ? '5' : '1'}
                            value={durationMin}
                            onChange={(e) => setDurationMin(e.target.value)}
                            className="w-full rounded-lg border border-glass-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-orange"
                        />
                    </label>
                </div>

                {workout && (
                    <div className="rounded-lg border border-glass-border bg-surface p-3">
                        <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                                id="workout-completed"
                                type="checkbox"
                                checked={isCompleted}
                                onChange={(e) => setIsCompleted(e.target.checked)}
                                className="h-4 w-4 rounded border-glass-border bg-background accent-accent-orange"
                            />
                            Mark as completed
                        </label>

                        {isCompleted && !wasCompleted && (
                            <div className="mt-3 max-h-64 overflow-y-auto border-t border-glass-border pt-3">
                                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-foreground-muted">
                                    <Link2 className="h-3.5 w-3.5" />
                                    Link Activity
                                </div>
                                <ActivityPicker
                                    selectedId={linkedActivityId}
                                    onSelect={setLinkedActivityId}
                                />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    {workout && (
                        <button
                            onClick={() => deleteMutation.mutate()}
                            disabled={deleteMutation.isPending || saveMutation.isPending}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                            aria-label="Delete workout"
                            title="Delete workout"
                        >
                            {deleteMutation.isPending ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
                            ) : (
                                <Trash2 className="h-5 w-5" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || deleteMutation.isPending}
                        className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
