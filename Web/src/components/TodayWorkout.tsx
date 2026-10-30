'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle,
    Heart,
    Clock,
    TrendingUp,
    Activity,
    Route,
    Zap,
    Flame,
    Sparkles,
    Moon,
    Bike,
    Waves,
    Dumbbell,
    Target,
    AlertTriangle,
    ArrowRight,
    X,
} from 'lucide-react';
import { findSmartRescheduleDay } from '@/lib/plans/schedule-utils';

interface Workout {
    id: string;
    type: 'EASY' | 'LONG_RUN' | 'TEMPO' | 'INTERVALS' | 'FARTLEK' | 'RECOVERY' | 'REST' | 'RIDE' | 'SWIM' | 'STRENGTH' | 'OTHER';
    description: string;
    targetDistance?: number; // meters
    targetDuration?: number; // seconds
    targetPace?: { min: number; max: number }; // sec/km
    targetHrZone?: number;
    plannedTss?: number;
    isCompleted?: boolean;
    notes?: string;
    scheduledDate?: string | Date;
}

interface TodayWorkoutProps {
    workout: Workout | null;
    onComplete?: (_id: string) => void;
    isLoading?: boolean;
    readinessScore?: number | null;
    weekWorkouts?: any[];
    onAdapt?: (_action: 'REDUCE' | 'RESCHEDULE' | 'DISMISS', _dateKey?: string) => void;
}

const workoutConfig = {
    EASY: {
        label: 'Easy Run',
        color: 'bg-workout-recovery/15',
        badge: 'badge-easy',
        icon: <Activity className="w-8 h-8 text-workout-recovery" />,
    },
    LONG_RUN: {
        label: 'Long Run',
        color: 'bg-workout-long-run/15',
        badge: 'badge-easy',
        icon: <Route className="w-8 h-8 text-workout-long-run" />,
    },
    TEMPO: {
        label: 'Tempo',
        color: 'bg-workout-tempo/15',
        badge: 'badge-tempo',
        icon: <Zap className="w-8 h-8 text-workout-tempo" />,
    },
    INTERVALS: {
        label: 'Intervals',
        color: 'bg-workout-interval/15',
        badge: 'badge-interval',
        icon: <Flame className="w-8 h-8 text-workout-interval" />,
    },
    FARTLEK: {
        label: 'Fartlek',
        color: 'bg-accent-orange/15',
        badge: 'badge-tempo',
        icon: <Zap className="w-8 h-8 text-accent-orange" />,
    },
    RECOVERY: {
        label: 'Recovery',
        color: 'bg-accent-cyan/15',
        badge: 'badge-recovery',
        icon: <Sparkles className="w-8 h-8 text-accent-cyan" />,
    },
    REST: {
        label: 'Rest Day',
        color: 'bg-foreground-muted/15',
        badge: 'badge-recovery',
        icon: <Moon className="w-8 h-8 text-foreground-muted" />,
    },
    RIDE: {
        label: 'Ride',
        color: 'bg-workout-tempo/15',
        badge: 'badge-tempo',
        icon: <Bike className="w-8 h-8 text-workout-tempo" />,
    },
    SWIM: {
        label: 'Swim',
        color: 'bg-accent-blue/15',
        badge: 'badge-interval',
        icon: <Waves className="w-8 h-8 text-accent-blue" />,
    },
    STRENGTH: {
        label: 'Strength',
        color: 'bg-workout-strength/15',
        badge: 'badge-recovery',
        icon: <Dumbbell className="w-8 h-8 text-workout-strength" />,
    },
    OTHER: {
        label: 'Other',
        color: 'bg-foreground-muted/15',
        badge: 'badge-easy',
        icon: <Target className="w-8 h-8 text-foreground-muted" />,
    },
};

function formatPace(secsPerKm: number): string {
    const mins = Math.floor(secsPerKm / 60);
    const secs = Math.round(secsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
}

export function TodayWorkout({
    workout,
    onComplete,
    isLoading,
    readinessScore: propReadinessScore,
    weekWorkouts = [],
    onAdapt,
}: TodayWorkoutProps) {
    const queryClient = useQueryClient();
    const [dismissedAdapt, setDismissedAdapt] = useState(false);
    const [isAdapting, setIsAdapting] = useState(false);

    const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    // Fetch daily readiness if not supplied as a prop
    const { data: readinessData } = useQuery({
        queryKey: ['readiness-today', todayStr],
        queryFn: async () => {
            const res = await fetch(`/api/health/readiness/daily?date=${todayStr}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: propReadinessScore === undefined,
        staleTime: 60000,
    });

    const effectiveReadinessScore = propReadinessScore ?? readinessData?.readinessScore ?? null;

    const showAdaptationBanner =
        Boolean(workout) &&
        !workout?.isCompleted &&
        workout?.type !== 'REST' &&
        !dismissedAdapt &&
        effectiveReadinessScore !== null &&
        effectiveReadinessScore < 65;

    const recommendedDayKey = useMemo(() => {
        if (!workout || !showAdaptationBanner || weekWorkouts.length === 0) return null;
        return findSmartRescheduleDay(workout as any, weekWorkouts as any, new Date());
    }, [workout, showAdaptationBanner, weekWorkouts]);

    const handleReduce = async () => {
        if (!workout) return;
        if (onAdapt) {
            onAdapt('REDUCE');
            setDismissedAdapt(true);
            return;
        }
        setIsAdapting(true);
        try {
            const patch: Record<string, any> = {};
            if (workout.targetDistance) patch.targetDistance = Math.round(workout.targetDistance * 0.75);
            if (workout.targetDuration) patch.targetDuration = Math.round(workout.targetDuration * 0.75);
            if (workout.plannedTss) patch.plannedTss = Math.round(workout.plannedTss * 0.75);
            patch.notes = (workout.notes ? `${workout.notes} ` : '') + `(Adapted: reduced -25% for readiness ${effectiveReadinessScore})`;
            await fetch(`/api/mobile/v1/workouts/${workout.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            queryClient.invalidateQueries();
            setDismissedAdapt(true);
        } catch {
            // ignore
        } finally {
            setIsAdapting(false);
        }
    };

    const handleReschedule = async () => {
        if (!workout || !recommendedDayKey) return;
        if (onAdapt) {
            onAdapt('RESCHEDULE', recommendedDayKey);
            setDismissedAdapt(true);
            return;
        }
        setIsAdapting(true);
        try {
            await fetch(`/api/mobile/v1/workouts/${workout.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledDate: recommendedDayKey }),
            });
            queryClient.invalidateQueries();
            setDismissedAdapt(true);
        } catch {
            // ignore
        } finally {
            setIsAdapting(false);
        }
    };

    const handleDismiss = () => {
        setDismissedAdapt(true);
        if (onAdapt) onAdapt('DISMISS');
    };

    if (!workout) {
        return (
            <div className="glass-card p-6 animate-slide-in">
                <h2 className="text-lg font-semibold text-foreground-muted mb-4">Today&apos;s Workout</h2>
                <div className="text-center py-8">
                    <Target className="w-16 h-16 mx-auto text-foreground-muted mb-4 block" />
                    <p className="text-foreground-muted">No workout scheduled today</p>
                    <p className="text-sm text-foreground-muted mt-2">Set a race goal to generate your training plan</p>
                </div>
            </div>
        );
    }

    const config = workoutConfig[workout.type] || workoutConfig.EASY;

    return (
        <div className="glass-card intensity-border p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground-muted">Today&apos;s Workout</h2>
                <span className={`badge ${config.badge}`}>{config.label}</span>
            </div>

            {/* Readiness < 65 Adaptation Prompt */}
            {showAdaptationBanner && (
                <div className="mb-4 p-3 rounded-md bg-accent-orange/10 border border-accent-orange/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-accent-orange font-semibold">
                        <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Readiness {effectiveReadinessScore} — Adapt Today&apos;s Workout:
                        </span>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="p-0.5 text-foreground-muted hover:text-foreground"
                            title="Keep Original"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                            type="button"
                            disabled={isAdapting}
                            onClick={handleReduce}
                            className="px-2.5 py-1 rounded bg-accent-orange text-background font-semibold hover:bg-accent-orange/90 transition-colors text-xs"
                        >
                            Reduce (-25%)
                        </button>
                        {recommendedDayKey && (
                            <button
                                type="button"
                                disabled={isAdapting}
                                onClick={handleReschedule}
                                className="px-2.5 py-1 rounded border border-accent-orange/40 text-accent-orange hover:bg-accent-orange/10 transition-colors text-xs flex items-center gap-1"
                            >
                                Move to {format(parseISO(recommendedDayKey), 'EEE d')}
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="px-2 py-1 rounded text-foreground-muted hover:text-foreground text-xs"
                        >
                            Keep Original
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 rounded-md ${config.color} flex items-center justify-center`}>
                    {config.icon}
                </div>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-1">{config.label}</h3>
                    <p className="text-foreground-muted">{workout.description}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {workout.targetDistance && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground-muted mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">Distance</span>
                        </div>
                        <p className="text-xl font-semibold font-mono tabular-nums text-foreground">
                            {(workout.targetDistance / 1000).toFixed(1)} km
                        </p>
                    </div>
                )}

                {workout.targetDuration && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground-muted mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Duration</span>
                        </div>
                        <p className="text-xl font-semibold font-mono tabular-nums text-foreground">
                            {formatDuration(workout.targetDuration)}
                        </p>
                    </div>
                )}

                {workout.targetPace && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground-muted mb-1">
                            <span className="text-xs">Pace</span>
                        </div>
                        <p className="text-xl font-semibold font-mono tabular-nums text-foreground">
                            {formatPace(workout.targetPace.min)}-{formatPace(workout.targetPace.max)}
                        </p>
                    </div>
                )}

                {workout.targetHrZone && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground-muted mb-1">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">HR Zone</span>
                        </div>
                        <p className={`text-xl font-semibold zone-${workout.targetHrZone}`}>
                            Zone {workout.targetHrZone}
                        </p>
                    </div>
                )}
            </div>

            {workout.type !== 'REST' && !workout.isCompleted && (
                <button
                    onClick={() => onComplete?.(workout.id)}
                    disabled={isLoading}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    {isLoading ? 'Marking...' : 'Mark as Complete'}
                </button>
            )}

            {workout.isCompleted && (
                <div className="w-full py-3 bg-positive/10 border border-positive/30 rounded-md flex items-center justify-center gap-2 text-positive">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Workout Completed</span>
                </div>
            )}
        </div>
    );
}

export default TodayWorkout;
