'use client';

import { CheckCircle, Heart, Clock, TrendingUp, Activity, Route, Zap, Flame, Sparkles, Moon, Bike, Waves, Dumbbell, Target } from 'lucide-react';

interface Workout {
    id: string;
    type: 'EASY' | 'LONG_RUN' | 'TEMPO' | 'INTERVALS' | 'FARTLEK' | 'RECOVERY' | 'REST' | 'RIDE' | 'SWIM' | 'STRENGTH' | 'OTHER';
    description: string;
    targetDistance?: number; // meters
    targetDuration?: number; // seconds
    targetPace?: { min: number; max: number }; // sec/km
    targetHrZone?: number;
    isCompleted?: boolean;
}

interface TodayWorkoutProps {
    workout: Workout | null;
    onComplete?: (_id: string) => void;
    isLoading?: boolean;
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

export function TodayWorkout({ workout, onComplete, isLoading }: TodayWorkoutProps) {
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
