'use client';

import { useState, memo, useCallback, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { List } from 'react-window';
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

function extractWattsFromTitle(title: string | null | undefined): number | null {
    if (!title) return null;
    const match = title.match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
    if (!match) return null;
    const val = parseInt(match[1], 10);
    return val >= 40 && val <= 1500 ? val : null;
}

function getCyclingClassificationBadge(activity: ActivityListItem): { label: string; className: string } {
    const title = activity.name || '';
    const ifVal = (activity as any).intensityFactor as number | null | undefined;
    const tType = activity.trainingType;

    if (/\bftp\s*test\b|\bramp\s*test\b/i.test(title)) {
        return { label: 'FTP Test', className: 'bg-workout-race/15 text-workout-race border-workout-race/30' };
    }
    if (tType === 'RACE' || /\brace\b/i.test(title)) {
        return { label: 'Bike Race', className: 'bg-workout-race/15 text-workout-race border-workout-race/30' };
    }
    if (
        tType === 'INTERVALS' ||
        tType === 'RIDE_INTERVALS' ||
        /\binterval|\bvo2|\banaerobic|\bsprint|\bhiit\b/i.test(title) ||
        (typeof ifVal === 'number' && ifVal >= 0.88)
    ) {
        return { label: 'Bike Intervals', className: 'bg-workout-interval/15 text-workout-interval border-workout-interval/30' };
    }
    if (
        tType === 'TEMPO' ||
        /\btempo|\bsweet\s*spot|\bthreshold|\bsst\b/i.test(title) ||
        (typeof ifVal === 'number' && ifVal >= 0.78)
    ) {
        return { label: 'Tempo / Threshold', className: 'bg-workout-tempo/15 text-workout-tempo border-workout-tempo/30' };
    }
    if (
        tType === 'LONG_RIDE' ||
        tType === 'LONG_RUN' ||
        (activity.movingTime && activity.movingTime >= 7200)
    ) {
        return { label: 'Long Ride', className: 'bg-workout-long-run/15 text-workout-long-run border-workout-long-run/30' };
    }
    if (
        tType === 'RECOVERY' ||
        /\brecovery\b|\beasy\s*spin\b/i.test(title) ||
        (typeof ifVal === 'number' && ifVal > 0 && ifVal < 0.60)
    ) {
        return { label: 'Recovery Spin', className: 'bg-workout-recovery/15 text-workout-recovery border-workout-recovery/30' };
    }
    return { label: 'Cycling', className: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30' };
}

const getWorkoutTypeStyle = (type: WorkoutType) => {
    switch (type) {
        case 'LONG_RUN':
        case 'LONG_RIDE': return 'bg-workout-long-run/10 text-workout-long-run border-workout-long-run/20';
        case 'TEMPO': return 'bg-workout-tempo/10 text-workout-tempo border-workout-tempo/20';
        case 'INTERVALS':
        case 'RIDE_INTERVALS': return 'bg-workout-interval/10 text-workout-interval border-workout-interval/20';
        case 'FARTLEK': return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20';
        case 'RACE': return 'bg-workout-race/10 text-workout-race border-workout-race/20';
        case 'RECOVERY': return 'bg-workout-recovery/10 text-workout-recovery border-workout-recovery/20';
        case 'STRENGTH': return 'bg-workout-strength/10 text-workout-strength border-workout-strength/20';
        default: return 'bg-workout-easy/10 text-workout-easy border-workout-easy/20';
    }
};

// Bolt: Wrapped in memo to prevent unnecessary re-renders during list updates
const ActivityCard = memo(function ActivityCard({ activity }: { activity: ActivityListItem }) {
    const crossTraining = isCrossTraining(activity.type);
    const cyclingBadge = crossTraining ? getCyclingClassificationBadge(activity) : null;
    const showTag = !crossTraining && activity.trainingType && activity.trainingType !== 'EASY' && activity.trainingType !== 'OTHER';
    const rideWatts = crossTraining
        ? ((activity as any).npWatts ?? (activity as any).averageWatts ?? extractWattsFromTitle(activity.name))
        : null;
    const bikeTss = crossTraining ? ((activity as any).bikeTss as number | null | undefined) : null;

    return (
        <div className="w-full text-left glass-card glass-card-hover p-4 transition-all duration-200">
            <div className="flex items-start gap-4">
                {/* Activity type icon */}
                <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 ${crossTraining
                    ? 'bg-accent-cyan/15 text-accent-cyan'
                    : 'bg-accent-orange/15 text-accent-orange'
                    }`}>
                    {activityIcons[activity.type]}
                </div>

                {/* Activity details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-foreground font-semibold truncate">{activity.name}</h4>
                        {cyclingBadge && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cyclingBadge.className}`}>
                                {cyclingBadge.label}
                            </span>
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
                                <span className="text-accent-pink">Invalid Date</span>
                            );
                        })()}
                    </p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                        {/* Distance */}
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-foreground-muted" />
                            <span className="text-foreground font-medium font-mono tabular-nums">
                                {(activity.distance / 1000).toFixed(2)} km
                            </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-foreground-muted" />
                            <span className="text-foreground font-medium font-mono tabular-nums">
                                {formatDuration(activity.movingTime)}
                            </span>
                        </div>

                        {/* Pace (for runs) or Speed & Power (for rides) */}
                        {activity.type === 'RUN' && activity.averageSpeed && (
                            <div className="text-foreground-muted font-mono tabular-nums">
                                {formatPace(activity.averageSpeed)}
                            </div>
                        )}
                        {crossTraining && activity.averageSpeed && activity.averageSpeed > 0 && (
                            <div className="text-foreground-muted font-mono tabular-nums">
                                {(activity.averageSpeed * 3.6).toFixed(1)} km/h
                            </div>
                        )}
                        {crossTraining && rideWatts && rideWatts > 0 && (
                            <div className="flex items-center gap-1 text-accent-orange font-mono font-semibold tabular-nums">
                                <Zap className="w-3.5 h-3.5" />
                                <span>{Math.round(rideWatts)} W</span>
                            </div>
                        )}

                        {/* Heart rate */}
                        {activity.hasHeartrate && activity.averageHr && (
                            <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-accent-pink" />
                                <span className="text-foreground-muted font-mono tabular-nums">{Math.round(activity.averageHr)} bpm</span>
                            </div>
                        )}

                        {/* Elevation */}
                        {activity.totalElevation && activity.totalElevation > 10 && (
                            <div className="flex items-center gap-1">
                                <Mountain className="w-4 h-4 text-foreground-muted" />
                                <span className="text-foreground-muted font-mono tabular-nums">{Math.round(activity.totalElevation)}m</span>
                            </div>
                        )}
                    </div>

                    {/* TRIMP / TSS if available */}
                    {(activity.trimp || (!crossTraining && activity.runningTss) || (crossTraining && bikeTss)) && (
                        <div className="flex items-center gap-4 mt-2">
                            {activity.trimp && (
                                <span className="text-xs text-foreground-muted">
                                    TRIMP: <span className="text-accent-cyan font-mono tabular-nums">{activity.trimp.toFixed(0)}</span>
                                </span>
                            )}
                            {!crossTraining && activity.runningTss && (
                                <span className="text-xs text-foreground-muted">
                                    rTSS: <span className="text-accent-orange font-mono tabular-nums">{activity.runningTss.toFixed(0)}</span>
                                </span>
                            )}
                            {crossTraining && bikeTss && (
                                <span className="text-xs text-foreground-muted">
                                    Bike TSS: <span className="text-accent-orange font-mono tabular-nums">{Math.round(bikeTss)}</span>
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

interface ActivityRowData {
    activities: ActivityListItem[];
    onClick: (_activity: ActivityListItem) => void;
}

const ActivityRow = ({ index, style, activities, onClick, ariaAttributes }: ActivityRowData & {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
        "aria-posinset": number;
        "aria-setsize": number;
        role: "listitem";
    };
}) => {
    const activity = activities[index];
    return (
        <div {...ariaAttributes} style={{ ...style, top: (style.top as number) + 12, height: (style.height as number) - 12 }}>
            <button
                type="button"
                className="appearance-none cursor-pointer text-left bg-transparent border-0 p-0 w-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
                onClick={() => onClick(activity)}
                aria-label={`View details for ${activity.name}`}
            >
                <ActivityCard activity={activity} />
            </button>
        </div>
    );
};

export function ActivityList({ activities, isLoading, userHrMax, vdotCorrectionFactor }: ActivityListProps) {
    const [selectedActivity, setSelectedActivity] = useState<ActivityListItem | null>(null);
    const [windowHeight, setWindowHeight] = useState(800);

    useEffect(() => {
        setWindowHeight(window.innerHeight - 200);
        const handleResize = () => setWindowHeight(window.innerHeight - 200);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                    <div key={i} className="glass-card p-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-md bg-background-tertiary" />
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
                <Activity className="w-16 h-16 mx-auto text-foreground-muted mb-4 block" />
                <p className="text-foreground-muted">No activities yet</p>
                <p className="text-sm text-foreground-muted mt-2">
                    Connect Strava and sync your activities to get started
                </p>
            </div>
        );
    }

    return (
        <>
            <div className={activities.length > 50 ? "" : "space-y-3"}>
                {activities.length > 50 ? (
                    <List
                        style={{ height: windowHeight }}
                        rowCount={activities.length}
                        rowHeight={160}
                        rowComponent={ActivityRow}
                        rowProps={{ activities, onClick: handleActivityClick }}
                    />
                ) : (
                    activities.map((activity, index) => (
                        <button
                            key={activity.id}
                            type="button"
                            className="animate-slide-in appearance-none cursor-pointer text-left bg-transparent border-0 p-0 w-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => handleActivityClick(activity)}
                            aria-label={`View details for ${activity.name}`}
                        >
                            <ActivityCard activity={activity} />
                        </button>
                    ))
                )}
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
