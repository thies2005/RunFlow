'use client';

import { useState, memo, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
    Activity,
    Bike,
    Heart,
    TrendingUp,
    Clock,
    Mountain,
    Zap
} from 'lucide-react';
import type { WorkoutType, ActivityListItem } from '@/lib/types';
import ActivityDetailsModal from './ActivityDetailsModal';

interface ActivityListProps {
    activities: ActivityListItem[];
    isLoading?: boolean;
    userHrMax?: number;
    vdotCorrectionFactor?: number;
}

const activityIcons: Record<string, React.ReactNode> = {
    RUN: <Activity className="w-5 h-5" />,
    VIRTUAL_RIDE: <Bike className="w-5 h-5" />,
    RIDE: <Bike className="w-5 h-5" />,
    WALK: <Activity className="w-5 h-5" />,
    HIKE: <Mountain className="w-5 h-5" />,
    SWIM: <Activity className="w-5 h-5" />,
    WORKOUT: <Zap className="w-5 h-5" />,
    OTHER: <Activity className="w-5 h-5" />,
};

function formatPace(speedMs: number | null | undefined): string {
    if (speedMs === null || speedMs === undefined || speedMs <= 0) return '--:--';
    const paceSecsPerKm = 1000 / speedMs;
    const mins = Math.floor(paceSecsPerKm / 60);
    const secs = Math.round(paceSecsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || seconds <= 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isCrossTraining(type: string): boolean {
    return type === 'VIRTUAL_RIDE' || type === 'RIDE';
}

const getWorkoutTypeStyle = (type: WorkoutType) => {
    switch (type) {
        case 'LONG_RUN': return 'bg-workout-long-run/10 text-workout-long-run border-workout-long-run/20';
        case 'TEMPO': return 'bg-workout-tempo/10 text-workout-tempo border-workout-tempo/20';
        case 'INTERVALS': return 'bg-workout-interval/10 text-workout-interval border-workout-interval/20';
        case 'RACE': return 'bg-workout-race/10 text-workout-race border-workout-race/20';
        case 'RECOVERY': return 'bg-workout-recovery/10 text-workout-recovery border-workout-recovery/20';
        case 'STRENGTH': return 'bg-workout-strength/10 text-workout-strength border-workout-strength/20';
        default: return 'bg-workout-easy/10 text-workout-easy border-workout-easy/20';
    }
};

// Bolt: Wrapped in memo to prevent unnecessary re-renders during list updates
const ActivityCard = memo(function ActivityCard({ activity }: { activity: ActivityListItem }) {
    const crossTraining = isCrossTraining(activity.type);
    const showTag = activity.trainingType && activity.trainingType !== 'EASY' && activity.trainingType !== 'OTHER';

    return (
        <div
            className={`w-full text-left glass-card glass-card-hover p-4 transition-all duration-200 ${crossTraining ? 'recovery-border' : ''
                }`}
        >
            <div className="flex items-start gap-4">
                {/* Activity type icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${crossTraining
                    ? 'bg-gradient-to-br from-cyan-500/20 to-green-500/20 text-cyan-400'
                    : 'bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-400'
                    }`}>
                    {activityIcons[activity.type]}
                </div>

                {/* Activity details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-foreground font-semibold truncate">{activity.name}</h4>
                        {crossTraining && (
                            <span className="badge badge-recovery text-xs">Recovery</span>
                        )}
                        {showTag && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getWorkoutTypeStyle(activity.trainingType!)}`}>
                                {activity.trainingType!.replace('_', ' ')}
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-foreground-muted">
                        {(() => {
                            const d = new Date(activity.startDate);
                            return !isNaN(d.getTime()) ? (
                                <>
                                    {formatDistanceToNow(d, { addSuffix: true })}
                                    {' • '}
                                    {format(d, 'EEE, MMM d')}
                                </>
                            ) : (
                                <span className="text-red-400">Invalid Date</span>
                            );
                        })()}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                        {/* Distance */}
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-foreground-muted" />
                            <span className="text-foreground font-medium">
                                {(activity.distance / 1000).toFixed(2)} km
                            </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-foreground-muted" />
                            <span className="text-foreground font-medium">
                                {formatDuration(activity.movingTime)}
                            </span>
                        </div>

                        {/* Pace (for runs) */}
                        {activity.type === 'RUN' && activity.averageSpeed && (
                            <div className="text-foreground-muted">
                                {formatPace(activity.averageSpeed)}
                            </div>
                        )}

                        {/* Heart rate */}
                        {activity.hasHeartrate && activity.averageHr && (
                            <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-red-400" />
                                <span className="text-foreground-muted">{Math.round(activity.averageHr)} bpm</span>
                            </div>
                        )}

                        {/* Elevation */}
                        {activity.totalElevation && activity.totalElevation > 10 && (
                            <div className="flex items-center gap-1">
                                <Mountain className="w-4 h-4 text-foreground-muted" />
                                <span className="text-foreground-muted">{Math.round(activity.totalElevation)}m</span>
                            </div>
                        )}
                    </div>

                    {/* TRIMP / TSS if available */}
                    {(activity.trimp || activity.runningTss) && (
                        <div className="flex items-center gap-4 mt-2">
                            {activity.trimp && (
                                <span className="text-xs text-gray-500">
                                    TRIMP: <span className="text-cyan-400">{activity.trimp.toFixed(0)}</span>
                                </span>
                            )}
                            {activity.runningTss && (
                                <span className="text-xs text-gray-500">
                                    rTSS: <span className="text-orange-400">{activity.runningTss.toFixed(0)}</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

ActivityCard.displayName = 'ActivityCard';

export function ActivityList({ activities, isLoading, userHrMax, vdotCorrectionFactor }: ActivityListProps) {
    const [selectedActivity, setSelectedActivity] = useState<ActivityListItem | null>(null);

    // Memoized handlers to prevent re-creating functions on each render
    const handleActivityClick = useCallback((activity: ActivityListItem) => {
        setSelectedActivity(activity);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedActivity(null);
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card p-4 animate-pulse">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-background-tertiary" />
                            <div className="flex-1">
                                <div className="h-5 bg-background-tertiary rounded w-1/3 mb-2" />
                                <div className="h-4 bg-background-tertiary rounded w-1/4 mb-3" />
                                <div className="flex gap-4">
                                    <div className="h-4 bg-background-tertiary rounded w-16" />
                                    <div className="h-4 bg-background-tertiary rounded w-16" />
                                    <div className="h-4 bg-background-tertiary rounded w-16" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4 block" />
                <p className="text-foreground-muted">No activities yet</p>
                <p className="text-sm text-foreground-muted mt-2">
                    Connect Strava and sync your activities to get started
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {activities.map((activity, index) => (
                    <button
                        key={activity.id}
                        type="button"
                        className="animate-slide-in appearance-none cursor-pointer text-left bg-transparent border-0 p-0 w-full"
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => handleActivityClick(activity)}
                        aria-label={`View details for ${activity.name}`}
                    >
                        <ActivityCard activity={activity} />
                    </button>
                ))}
            </div>

            <ActivityDetailsModal
                isOpen={!!selectedActivity}
                onClose={handleModalClose}
                activity={selectedActivity}
                userHrMax={userHrMax}
                vdotCorrectionFactor={vdotCorrectionFactor}
            />
        </>
    );
}
