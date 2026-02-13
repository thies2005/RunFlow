'use client';

import { CheckCircle, Heart, Clock, TrendingUp, Activity, Route, Zap, Flame, Sparkles, Moon, Bike, Waves, Dumbbell, Target } from 'lucide-react';

interface Workout {
    id: string;
    type: 'EASY' | 'LONG_RUN' | 'TEMPO' | 'INTERVALS' | 'RECOVERY' | 'REST' | 'RIDE' | 'SWIM' | 'STRENGTH' | 'OTHER';
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
        color: 'from-green-500 to-emerald-600',
        badge: 'badge-easy',
        icon: <Activity className="w-8 h-8 text-white" />,
    },
    LONG_RUN: {
        label: 'Long Run',
        color: 'from-blue-500 to-indigo-600',
        badge: 'badge-easy',
        icon: <Route className="w-8 h-8 text-white" />,
    },
    TEMPO: {
        label: 'Tempo',
        color: 'from-yellow-500 to-orange-600',
        badge: 'badge-tempo',
        icon: <Zap className="w-8 h-8 text-white" />,
    },
    INTERVALS: {
        label: 'Intervals',
        color: 'from-red-500 to-pink-600',
        badge: 'badge-interval',
        icon: <Flame className="w-8 h-8 text-white" />,
    },
    RECOVERY: {
        label: 'Recovery',
        color: 'from-cyan-500 to-teal-600',
        badge: 'badge-recovery',
        icon: <Sparkles className="w-8 h-8 text-white" />,
    },
    REST: {
        label: 'Rest Day',
        color: 'from-gray-500 to-gray-600',
        badge: 'badge-recovery',
        icon: <Moon className="w-8 h-8 text-white" />,
    },
    RIDE: {
        label: 'Ride',
        color: 'from-orange-500 to-red-600',
        badge: 'badge-tempo',
        icon: <Bike className="w-8 h-8 text-white" />,
    },
    SWIM: {
        label: 'Swim',
        color: 'from-cyan-500 to-blue-600',
        badge: 'badge-interval',
        icon: <Waves className="w-8 h-8 text-white" />,
    },
    STRENGTH: {
        label: 'Strength',
        color: 'from-purple-500 to-pink-600',
        badge: 'badge-recovery',
        icon: <Dumbbell className="w-8 h-8 text-white" />,
    },
    OTHER: {
        label: 'Other',
        color: 'from-gray-500 to-gray-600',
        badge: 'badge-easy',
        icon: <Target className="w-8 h-8 text-white" />,
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
                <h2 className="text-lg font-semibold text-gray-400 mb-4">Today&apos;s Workout</h2>
                <div className="text-center py-8">
                    <Target className="w-16 h-16 mx-auto text-gray-400 mb-4 block" />
                    <p className="text-gray-400">No workout scheduled today</p>
                    <p className="text-sm text-gray-500 mt-2">Set a race goal to generate your training plan</p>
                </div>
            </div>
        );
    }

    const config = workoutConfig[workout.type] || workoutConfig.EASY;

    return (
        <div className="glass-card intensity-border p-6 animate-pulse-glow animate-slide-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-300">Today&apos;s Workout</h2>
                <span className={`badge ${config.badge}`}>{config.label}</span>
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-3xl`}>
                    {config.icon}
                </div>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-1">{config.label}</h3>
                    <p className="text-gray-400">{workout.description}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {workout.targetDistance && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wide">Distance</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                            {(workout.targetDistance / 1000).toFixed(1)} km
                        </p>
                    </div>
                )}

                {workout.targetDuration && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wide">Duration</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                            {formatDuration(workout.targetDuration)}
                        </p>
                    </div>
                )}

                {workout.targetPace && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <span className="text-xs uppercase tracking-wide">Pace</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                            {formatPace(workout.targetPace.min)}-{formatPace(workout.targetPace.max)}
                        </p>
                    </div>
                )}

                {workout.targetHrZone && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wide">HR Zone</span>
                        </div>
                        <p className={`text-xl font-bold zone-${workout.targetHrZone}`}>
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
                <div className="w-full py-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Workout Completed</span>
                </div>
            )}
        </div>
    );
}
