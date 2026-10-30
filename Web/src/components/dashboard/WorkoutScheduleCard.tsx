'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Pencil,
    Check,
    Activity,
    Zap,
    Flame,
    Dumbbell,
    Moon,
    Bike,
    Waves,
    Target,
    Rocket,
    Link2,
    AlertTriangle,
    ArrowRight,
    X,
} from 'lucide-react';
import type { Workout, ActivityListItem } from '@/lib/types';
import {
    readWorkoutCardStyle,
    readPrimaryLoadMetric,
    EVENT_DASHBOARD_LAYOUT_CHANGE,
    type WorkoutCardStyleMode,
    type PrimaryLoadMetricMode,
} from './TrainingStatusCard';
import { findSmartRescheduleDay } from '@/lib/plans/schedule-utils';
import ActivityDetailsModal, { getDisplayActivityName } from '../ActivityDetailsModal';

export type DashboardWorkout = Workout & {
    customName?: string | null;
    plannedTss?: number | null;
    targetPowerWatts?: number | null;
    notes?: string | null;
    sport?: string | null;
    suggestedActivity?: any;
    linkedActivity?: any;
};

interface WorkoutScheduleCardProps {
    weeklyWorkouts: (Workout | DashboardWorkout)[];
    today: string;
    onEditWorkout: (_workout: Workout) => void;
    onCompleteWorkout: (_workout: Workout) => void;
}

const CYCLING_WORKOUT_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);

function getWorkoutIcon(workoutType: string, isCycling: boolean, className = 'w-4 h-4') {
    if (workoutType === 'EASY') return <Activity className={className} />;
    if (workoutType === 'LONG_RUN') return <Rocket className={className} />;
    if (workoutType === 'TEMPO') return <Zap className={className} />;
    if (workoutType === 'INTERVALS') return <Flame className={className} />;
    if (workoutType === 'FARTLEK') return <Zap className={className} />;
    if (workoutType === 'STRENGTH') return <Dumbbell className={className} />;
    if (workoutType === 'REST') return <Moon className={className} />;
    if (isCycling) return <Bike className={className} />;
    if (workoutType === 'SWIM' || workoutType === 'OPEN_WATER_SWIM') return <Waves className={className} />;
    return <Target className={className} />;
}

export default function WorkoutScheduleCard({
    weeklyWorkouts,
    today,
    onEditWorkout,
    onCompleteWorkout,
}: WorkoutScheduleCardProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [workoutCardStyle, setWorkoutCardStyle] = useState<WorkoutCardStyleMode>('OPTION_C');
    const [primaryLoadMetric, setPrimaryLoadMetric] = useState<PrimaryLoadMetricMode>('TSS');
    const [dismissedAutoLinks, setDismissedAutoLinks] = useState<Set<string>>(new Set());
    const [dismissedAdaptations, setDismissedAdaptations] = useState<Set<string>>(new Set());
    const [selectedActivityForModal, setSelectedActivityForModal] = useState<ActivityListItem | null>(null);
    const [isMutatingId, setIsMutatingId] = useState<string | null>(null);

    // Sync layout & metric preferences
    useEffect(() => {
        const syncPrefs = () => {
            setWorkoutCardStyle(readWorkoutCardStyle());
            setPrimaryLoadMetric(readPrimaryLoadMetric());
        };
        syncPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncPrefs);
        window.addEventListener('runflow-dashboard-layout-change', syncPrefs);
        window.addEventListener('storage', syncPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncPrefs);
            window.removeEventListener('runflow-dashboard-layout-change', syncPrefs);
            window.removeEventListener('storage', syncPrefs);
        };
    }, []);

    // Fetch daily readiness score
    const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const { data: readinessData } = useQuery({
        queryKey: ['readiness-today', todayStr],
        queryFn: async () => {
            const res = await fetch(`/api/health/readiness/daily?date=${todayStr}`);
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 60000,
    });

    const readinessScore: number | null = readinessData?.readinessScore ?? null;

    // Defensive 7-day filter: strictly the current Monday–Sunday week
    const currentWeekWorkouts = useMemo(() => {
        if (!weeklyWorkouts || weeklyWorkouts.length === 0) return [];
        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        return weeklyWorkouts.filter((w) => {
            const d = new Date(w.scheduledDate);
            return d >= start && d <= end;
        });
    }, [weeklyWorkouts]);

    const activePendingWorkouts = useMemo(() => {
        return currentWeekWorkouts.filter((w) => !w.isCompleted && w.workoutType !== 'REST');
    }, [currentWeekWorkouts]);

    const completedOrRestWorkouts = useMemo(() => {
        return currentWeekWorkouts.filter((w) => w.isCompleted || w.workoutType === 'REST');
    }, [currentWeekWorkouts]);

    const completedWorkouts = useMemo(() => {
        return currentWeekWorkouts.filter((w) => w.isCompleted);
    }, [currentWeekWorkouts]);

    if (!weeklyWorkouts || weeklyWorkouts.length === 0 || currentWeekWorkouts.length === 0) {
        return null;
    }

    const firstUncompletedIndex = currentWeekWorkouts.findIndex((w: Workout) => !w.isCompleted);

    // Auto-link action
    const handleAcceptAutoLink = async (workout: Workout, suggestedActivity: any) => {
        setIsMutatingId(workout.id);
        try {
            await fetch(`/api/mobile/v1/workouts/${workout.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isCompleted: true,
                    linkedActivityId: suggestedActivity.id,
                }),
            });
            queryClient.invalidateQueries();
            setDismissedAutoLinks((prev) => new Set(prev).add(workout.id));
        } catch {
            // ignore
        } finally {
            setIsMutatingId(null);
        }
    };

    const handleDismissAutoLink = (workoutId: string) => {
        setDismissedAutoLinks((prev) => new Set(prev).add(workoutId));
    };

    // Readiness adaptation actions
    const handleReduceWorkout = async (w: Workout) => {
        const dw = w as DashboardWorkout;
        setIsMutatingId(w.id);
        try {
            const patch: Record<string, any> = {};
            if (w.targetDistance) patch.targetDistance = Math.round(w.targetDistance * 0.75);
            if (w.targetDuration) patch.targetDuration = Math.round(w.targetDuration * 0.75);
            if (dw.plannedTss) patch.plannedTss = Math.round(dw.plannedTss * 0.75);
            patch.notes = (dw.notes ? `${dw.notes} ` : '') + `(Adapted: reduced -25% for readiness ${readinessScore})`;
            await fetch(`/api/mobile/v1/workouts/${w.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            queryClient.invalidateQueries();
            setDismissedAdaptations((prev) => new Set(prev).add(w.id));
        } catch {
            // ignore
        } finally {
            setIsMutatingId(null);
        }
    };

    const handleRescheduleWorkout = async (w: Workout, targetDateKey: string) => {
        setIsMutatingId(w.id);
        try {
            await fetch(`/api/mobile/v1/workouts/${w.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledDate: targetDateKey }),
            });
            queryClient.invalidateQueries();
            setDismissedAdaptations((prev) => new Set(prev).add(w.id));
        } catch {
            // ignore
        } finally {
            setIsMutatingId(null);
        }
    };

    const handleDismissAdaptation = (workoutId: string) => {
        setDismissedAdaptations((prev) => new Set(prev).add(workoutId));
    };

    const openActivityModal = (workout: Workout) => {
        const linked = (workout as any).linkedActivity;
        if (linked) {
            setSelectedActivityForModal(linked as ActivityListItem);
        } else if (workout.linkedActivityId) {
            fetch(`/api/activities/${workout.linkedActivityId}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    if (data?.activity) {
                        setSelectedActivityForModal(data.activity);
                    } else {
                        onEditWorkout(workout);
                    }
                })
                .catch(() => onEditWorkout(workout));
        } else {
            onEditWorkout(workout);
        }
    };

    return (
        <>
            <div className="glass-card p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-lg font-semibold text-foreground">This Week&apos;s Workouts</h2>
                    <span className="text-xs font-mono text-foreground-muted">
                        {completedWorkouts.length}/{currentWeekWorkouts.length} Done
                    </span>
                </div>

                <div className="space-y-2 flex-1 min-h-0 max-h-[480px] overflow-y-auto pr-1">
                    {currentWeekWorkouts.length === 0 && (
                        <div className="text-xs text-foreground-muted text-center py-6">
                            No workouts scheduled for this week.
                        </div>
                    )}

                    {/* Pending Active Workouts (2-Line Card Row) */}
                    {activePendingWorkouts.map((workout) => {
                        const dw = workout as DashboardWorkout;
                        const workoutDate = new Date(workout.scheduledDate);
                        const isWorkoutToday = workoutDate.toDateString() === today;
                        const originalIndex = currentWeekWorkouts.findIndex((w) => w.id === workout.id);
                        const isNextWorkout = originalIndex === firstUncompletedIndex;
                        const isTodayPending = isWorkoutToday;
                        const isNextPending = !isTodayPending && isNextWorkout;
                        const isCyclingWorkout = CYCLING_WORKOUT_TYPES.has(workout.workoutType) || dw.sport === 'BIKE';

                        const customName = dw.customName;
                        const title = customName || workout.description || workout.workoutType?.replace(/_/g, ' ');

                        const durationStr = workout.targetDuration
                            ? `${Math.round(workout.targetDuration / 60)}m`
                            : workout.targetDistance
                            ? `${(workout.targetDistance / 1000).toFixed(1)} km`
                            : '';

                        const tssStr = dw.plannedTss ? `${dw.plannedTss} TSS` : '';
                        const powerStr = dw.targetPowerWatts ? `${dw.targetPowerWatts}W` : '';
                        const dateLabel = format(workoutDate, 'EEE d');

                        const suggestedActivity = (workout as any).suggestedActivity;
                        const showAutoLink = suggestedActivity && !dismissedAutoLinks.has(workout.id);

                        const showReadinessAdapt =
                            isTodayPending &&
                            !dismissedAdaptations.has(workout.id) &&
                            readinessScore !== null &&
                            readinessScore < 65 &&
                            workout.workoutType !== 'REST';

                        const recommendedRescheduleDay = showReadinessAdapt
                            ? findSmartRescheduleDay(workout as any, currentWeekWorkouts as any, new Date())
                            : null;

                        return (
                            <div
                                key={workout.id}
                                className={`py-2.5 px-3 rounded-lg border transition-all text-xs ${
                                    isTodayPending
                                        ? 'bg-accent-orange/10 border-accent-orange/50 shadow-sm'
                                        : isNextPending
                                        ? 'bg-accent-orange/5 border-accent-orange/30'
                                        : 'bg-surface/50 border-glass-border hover:bg-surface-hover'
                                }`}
                            >
                                {/* Line 1 (Top Row): Date + Today pill + Sport icon + Title + Done button */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-medium text-foreground-muted w-14 shrink-0 font-mono">
                                        {dateLabel}
                                    </span>
                                    {isWorkoutToday && (
                                        <span className="text-[9px] bg-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded font-semibold shrink-0">
                                            Today
                                        </span>
                                    )}
                                    <div
                                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                                            isTodayPending || isNextPending
                                                ? 'bg-accent-orange/20 text-accent-orange'
                                                : 'bg-background-tertiary text-foreground-muted'
                                        }`}
                                    >
                                        {getWorkoutIcon(workout.workoutType, isCyclingWorkout, 'w-3.5 h-3.5')}
                                    </div>
                                    <span
                                        className={`text-sm font-semibold flex-1 min-w-0 break-words leading-snug ${
                                            isTodayPending ? 'text-accent-orange' : 'text-foreground'
                                        }`}
                                        title={title}
                                    >
                                        {title}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onCompleteWorkout(workout)}
                                        className="shrink-0 ml-2 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center gap-1 transition-colors"
                                        title="Mark as done"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Done
                                    </button>
                                </div>

                                {/* Line 2 (Bottom Metadata & Secondary Actions Row, indented pl-14) */}
                                <div className="flex items-center justify-between gap-2 mt-1.5 pl-14">
                                    <div className="flex items-center gap-2 text-xs text-foreground-muted font-mono flex-wrap">
                                        {durationStr && <span>{durationStr}</span>}
                                        {tssStr && (
                                            <span className="text-accent-cyan">
                                                {durationStr ? '· ' : ''}{tssStr}
                                            </span>
                                        )}
                                        {powerStr && (
                                            <span className="text-accent-orange">
                                                · {powerStr}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onCompleteWorkout(workout)}
                                            className="p-1 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
                                            title="Link activity"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onEditWorkout(workout)}
                                            className="p-1 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
                                            title="Edit workout"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Auto-Link Suggestion Banner (Decision U2) */}
                                {showAutoLink && (
                                    <div className="mt-2 p-2 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-between gap-2 text-[11px]">
                                        <span className="text-accent-cyan truncate flex items-center gap-1.5">
                                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                                            Link &ldquo;{suggestedActivity.name}&rdquo; to this workout?
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                disabled={isMutatingId === workout.id}
                                                onClick={() => handleAcceptAutoLink(workout, suggestedActivity)}
                                                className="px-2 py-0.5 rounded bg-accent-cyan text-background font-semibold hover:bg-accent-cyan/90 transition-colors"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDismissAutoLink(workout.id)}
                                                className="p-0.5 text-foreground-muted hover:text-foreground transition-colors"
                                                title="Dismiss"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Readiness < 65 Adaptation Banner (Decision U3 / D2) */}
                                {showReadinessAdapt && (
                                    <div className="mt-2 p-2 rounded bg-accent-orange/10 border border-accent-orange/30 space-y-1.5 text-[11px]">
                                        <div className="flex items-center justify-between text-accent-orange font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Readiness {readinessScore} — Adapt Today&apos;s Workout:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDismissAdaptation(workout.id)}
                                                className="p-0.5 text-foreground-muted hover:text-foreground"
                                                title="Keep Original"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <button
                                                type="button"
                                                disabled={isMutatingId === workout.id}
                                                onClick={() => handleReduceWorkout(workout)}
                                                className="px-2 py-0.5 rounded bg-accent-orange text-background font-semibold hover:bg-accent-orange/90 transition-colors"
                                            >
                                                Reduce (-25%)
                                            </button>
                                            {recommendedRescheduleDay && (
                                                <button
                                                    type="button"
                                                    disabled={isMutatingId === workout.id}
                                                    onClick={() =>
                                                        handleRescheduleWorkout(workout, recommendedRescheduleDay)
                                                    }
                                                    className="px-2 py-0.5 rounded border border-accent-orange/40 text-accent-orange hover:bg-accent-orange/10 transition-colors flex items-center gap-1"
                                                >
                                                    Move to{' '}
                                                    {format(parseISO(recommendedRescheduleDay), 'EEE d')}
                                                    <ArrowRight className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDismissAdaptation(workout.id)}
                                                className="px-2 py-0.5 rounded text-foreground-muted hover:text-foreground text-[10px]"
                                            >
                                                Keep Original
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Render Completed / Rest Workouts in Sleek Compact Rows */}
                    {completedOrRestWorkouts.map((workout) => {
                        const dw = workout as DashboardWorkout;
                        const workoutDate = new Date(workout.scheduledDate);
                        const isCyclingWorkout = CYCLING_WORKOUT_TYPES.has(workout.workoutType) || dw.sport === 'BIKE';
                        const isRest = workout.workoutType === 'REST';
                        const customName = dw.customName;
                        const title = customName || workout.description || workout.workoutType?.replace(/_/g, ' ');

                        const durationStr = workout.targetDuration
                            ? `${Math.round(workout.targetDuration / 60)}m`
                            : workout.targetDistance
                            ? `${(workout.targetDistance / 1000).toFixed(1)} km`
                            : '';

                        const tssStr = dw.plannedTss ? `${dw.plannedTss} TSS` : '';
                        const dateLabel = format(workoutDate, 'EEE d');
                        const linkedActivity = (workout as any).linkedActivity;
                        const linkedName = linkedActivity
                            ? getDisplayActivityName(linkedActivity)
                            : workout.linkedActivityId
                            ? 'Linked Activity'
                            : null;
                        const linkedKm = linkedActivity?.distance
                            ? `${(linkedActivity.distance / 1000).toFixed(1)} km`
                            : null;

                        return (
                            <div
                                key={workout.id}
                                className="group py-2 px-3 rounded-md border border-line/60 bg-surface/30 hover:bg-surface-hover text-xs flex items-center justify-between gap-2 transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-mono text-[11px] text-foreground-muted w-14 shrink-0">
                                        {dateLabel}
                                    </span>
                                    <div
                                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                                            workout.isCompleted
                                                ? 'bg-positive/10 text-positive'
                                                : 'bg-background-tertiary text-foreground-muted'
                                        }`}
                                    >
                                        {getWorkoutIcon(workout.workoutType, isCyclingWorkout, 'w-3 h-3')}
                                    </div>
                                    <span
                                        className={`font-medium truncate ${
                                            workout.isCompleted ? 'text-foreground' : 'text-foreground-muted'
                                        }`}
                                        title={title}
                                    >
                                        {title}
                                    </span>
                                    {durationStr && !isRest && (
                                        <span className="text-foreground-muted text-[11px] font-mono shrink-0">
                                            · {durationStr}
                                        </span>
                                    )}
                                    {tssStr && !isRest && (
                                        <span className="text-positive/80 text-[11px] font-mono shrink-0 hidden sm:inline">
                                            · {tssStr}
                                        </span>
                                    )}

                                    {/* Linked Activity Subtle Pill */}
                                    {linkedName && (
                                        <button
                                            type="button"
                                            onClick={() => openActivityModal(workout)}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/20 shrink-0 transition-colors"
                                            title="View linked activity details"
                                        >
                                            <Link2 className="w-2.5 h-2.5" />
                                            <span className="truncate max-w-[120px] sm:max-w-[160px]">
                                                {linkedName}
                                            </span>
                                            {linkedKm && <span>· {linkedKm}</span>}
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onEditWorkout(workout)}
                                        className="p-1 text-foreground-muted opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-background-tertiary rounded transition-opacity"
                                        title={workout.isCompleted ? 'Link or change activity' : 'Edit workout'}
                                    >
                                        {workout.isCompleted ? <Link2 className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                    </button>
                                    {workout.isCompleted ? (
                                        <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                            <Check className="w-3 h-3" /> Done
                                        </span>
                                    ) : (
                                        <span className="text-foreground-muted text-[11px] font-medium px-1 py-0.5">
                                            Rest
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal for viewing linked activity details */}
            {selectedActivityForModal && (
                <ActivityDetailsModal
                    isOpen={Boolean(selectedActivityForModal)}
                    onClose={() => setSelectedActivityForModal(null)}
                    activity={selectedActivityForModal}
                />
            )}
        </>
    );
}
