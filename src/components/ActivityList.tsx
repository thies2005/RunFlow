'use client';

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

interface ActivityItem {
    id: string;
    stravaId: string;
    type: 'RUN' | 'VIRTUAL_RIDE' | 'RIDE' | 'WALK' | 'HIKE' | 'SWIM' | 'WORKOUT' | 'OTHER';
    sportType: string | null;
    name: string;
    startDate: string;
    distance: number; // meters
    movingTime: number; // seconds
    averageSpeed: number | null;
    averageHr: number | null;
    maxHr: number | null;
    hasHeartrate: boolean;
    totalElevation: number | null;
    trimp: number | null;
    runningTss: number | null;
    estimatedVdot: number | null;
}

interface ActivityListProps {
    activities: ActivityItem[];
    isLoading?: boolean;
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

function formatPace(speedMs: number): string {
    if (speedMs <= 0) return '--:--';
    const paceSecsPerKm = 1000 / speedMs;
    const mins = Math.floor(paceSecsPerKm / 60);
    const secs = Math.round(paceSecsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isCrossTraining(type: string): boolean {
    return type === 'VIRTUAL_RIDE' || type === 'RIDE';
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
    const crossTraining = isCrossTraining(activity.type);

    return (
        <div
            className={`glass-card glass-card-hover p-4 transition-all duration-200 ${crossTraining ? 'recovery-border' : ''
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
                        <h4 className="text-white font-semibold truncate">{activity.name}</h4>
                        {crossTraining && (
                            <span className="badge badge-recovery text-xs">Recovery</span>
                        )}
                    </div>

                    <p className="text-sm text-gray-400">
                        {formatDistanceToNow(new Date(activity.startDate), { addSuffix: true })}
                        {' • '}
                        {format(new Date(activity.startDate), 'EEE, MMM d')}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                        {/* Distance */}
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-gray-500" />
                            <span className="text-white font-medium">
                                {(activity.distance / 1000).toFixed(2)} km
                            </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-white font-medium">
                                {formatDuration(activity.movingTime)}
                            </span>
                        </div>

                        {/* Pace (for runs) */}
                        {activity.type === 'RUN' && activity.averageSpeed && (
                            <div className="text-gray-300">
                                {formatPace(activity.averageSpeed)}
                            </div>
                        )}

                        {/* Heart rate */}
                        {activity.hasHeartrate && activity.averageHr && (
                            <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-red-400" />
                                <span className="text-gray-300">{Math.round(activity.averageHr)} bpm</span>
                            </div>
                        )}

                        {/* Elevation */}
                        {activity.totalElevation && activity.totalElevation > 10 && (
                            <div className="flex items-center gap-1">
                                <Mountain className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">{Math.round(activity.totalElevation)}m</span>
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
}

export function ActivityList({ activities, isLoading }: ActivityListProps) {
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
                <span className="text-4xl mb-4 block">🏃</span>
                <p className="text-gray-400">No activities yet</p>
                <p className="text-sm text-gray-500 mt-2">
                    Connect Strava and sync your activities to get started
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {activities.map((activity, index) => (
                <div
                    key={activity.id}
                    className="animate-slide-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                >
                    <ActivityCard activity={activity} />
                </div>
            ))}
        </div>
    );
}
