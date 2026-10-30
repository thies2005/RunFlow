'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Edit2,
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

    if (!weeklyWorkouts || weeklyWorkouts.length === 0) {
        return null;
    }

    const firstUncompletedIndex = weeklyWorkouts.findIndex((w: Workout) => !w.isCompleted);

    // Separate completed vs pending workouts
    const completedWorkouts = weeklyWorkouts.filter((w) => w.isCompleted);
    const pendingWorkouts = weeklyWorkouts.filter((w) => !w.isCompleted);

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

    const isOptionC = workoutCardStyle === 'OPTION_C';

    return (
        <>
            <div className="glass-card p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-lg font-semibold text-foreground">This Week&apos;s Workouts</h2>
                    <span className="text-xs font-mono text-foreground-muted">
                        {completedWorkouts.length}/{weeklyWorkouts.length} Done
                    </span>
                </div>

                <div className="space-y-2 flex-1 min-h-0 max-h-[480px] overflow-y-auto pr-1">
                    {/* Render Pending / Active Workouts First */}
                    {pendingWorkouts.map((workout) => {
                        const dw = workout as DashboardWorkout;
                        const workoutDate = new Date(workout.scheduledDate);
                        const isWorkoutToday = workoutDate.toDateString() === today;
                        const originalIndex = weeklyWorkouts.findIndex((w) => w.id === workout.id);
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
                            ? findSmartRescheduleDay(workout as any, weeklyWorkouts as any, new Date())
                            : null;

                        if (isOptionC) {
                            return (
                                <div
                                    key={workout.id}
                                    className={`p-2.5 rounded-md border transition-all text-xs ${
                                        isTodayPending
                                            ? 'bg-accent-orange/10 border-accent-orange/50 shadow-sm'
                                            : isNextPending
                                            ? 'bg-accent-orange/5 border-accent-orange/30'
                                            : 'bg-surface border-line hover:bg-surface-hover'
                                    }`}
                                >
                                    {/* Main Row */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="font-mono text-[11px] text-foreground-muted w-14 shrink-0 font-medium">
                                                {dateLabel}
                                            </span>
                                            <div
                                                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                                    isTodayPending || isNextPending
                                                        ? 'bg-accent-orange/20 text-accent-orange'
                                                        : 'bg-background-tertiary text-foreground-muted'
                                                }`}
                                            >
                                                {getWorkoutIcon(workout.workoutType, isCyclingWorkout, 'w-3.5 h-3.5')}
                                            </div>
                                            <span
                                                className={`font-medium truncate ${
                                                    isTodayPending ? 'text-accent-orange' : 'text-foreground'
                                                }`}
                                                title={title}
                                            >
                                                {title}
                                            </span>
                                            {isWorkoutToday && (
                                                <span className="text-[9px] bg-accent-orange/20 text-accent-orange px-1 py-0.2 rounded font-semibold shrink-0">
                                                    Today
                                                </span>
                                            )}
                                            {durationStr && (
                                                <span className="text-foreground-muted text-[11px] font-mono shrink-0">
                                                    · {durationStr}
                                                </span>
                                            )}
                                            {tssStr && (
                                                <span className="text-accent-cyan text-[11px] font-mono shrink-0 hidden sm:inline">
                                                    · {tssStr}
                                                </span>
                                            )}
                                            {powerStr && (
                                                <span className="text-accent-orange text-[11px] font-mono shrink-0 hidden md:inline">
                                                    · {powerStr}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onCompleteWorkout(workout)}
                                                className="px-2 py-1 rounded bg-background-tertiary hover:bg-background-secondary border border-line text-[11px] font-medium text-foreground-secondary hover:text-foreground transition-colors"
                                                title="Link completed activity"
                                            >
                                                Link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEditWorkout(workout)}
                                                className="p-1 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded transition-colors"
                                                title="Edit workout"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onCompleteWorkout(workout)}
                                                className="btn-primary py-1 px-2 text-[11px] flex items-center gap-1"
                                                title="Mark as done"
                                            >
                                                <Check className="w-3 h-3" />
                                                Done
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
                        }

                        // Option A / Option B Classic Card Layout (with Decision U4: NO .zwo buttons)
                        return (
                            <div
                                key={workout.id}
                                className={`p-3 rounded-md border transition-colors ${
                                    isTodayPending
                                        ? 'bg-accent-orange/10 border-accent-orange/50 intensity-border'
                                        : isNextPending
                                        ? 'bg-accent-orange/10 border-accent-orange/30'
                                        : 'bg-surface border-line hover:bg-surface-hover'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                isTodayPending || isNextPending
                                                    ? 'bg-accent-orange/20'
                                                    : 'bg-surface'
                                            }`}
                                        >
                                            {getWorkoutIcon(workout.workoutType, isCyclingWorkout)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p
                                                    className={`font-medium ${
                                                        isTodayPending || isNextPending
                                                            ? 'text-accent-orange'
                                                            : 'text-foreground'
                                                    }`}
                                                >
                                                    {title}
                                                </p>
                                                <span className="text-[10px] text-foreground-muted font-mono">
                                                    ({dateLabel})
                                                </span>
                                                {isWorkoutToday && (
                                                    <span className="text-[10px] bg-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded-full font-semibold">
                                                        Today
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-foreground-muted font-mono tabular-nums">
                                                {workout.targetDistance
                                                    ? `${(workout.targetDistance / 1000).toFixed(1)} km`
                                                    : workout.targetDuration
                                                    ? `${Math.round(workout.targetDuration / 60)} min`
                                                    : ''}
                                                {dw.plannedTss ? ` · ${dw.plannedTss} TSS` : ''}
                                                {dw.targetPowerWatts ? ` · ${dw.targetPowerWatts}W` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onEditWorkout(workout)}
                                            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
                                            title="Edit workout"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onCompleteWorkout(workout)}
                                            className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                                        >
                                            <Check className="w-3 h-3" />
                                            Done
                                        </button>
                                    </div>
                                </div>

                                {/* Auto-Link Banner */}
                                {showAutoLink && (
                                    <div className="mt-2.5 p-2 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-between gap-2 text-xs">
                                        <span className="text-accent-cyan truncate flex items-center gap-1.5">
                                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                                            Link &ldquo;{suggestedActivity.name}&rdquo;?
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleAcceptAutoLink(workout, suggestedActivity)}
                                                className="px-2 py-0.5 rounded bg-accent-cyan text-background font-semibold text-xs"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDismissAutoLink(workout.id)}
                                                className="p-0.5 text-foreground-muted hover:text-foreground"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Readiness < 65 Adaptation */}
                                {showReadinessAdapt && (
                                    <div className="mt-2.5 p-2.5 rounded bg-accent-orange/10 border border-accent-orange/30 space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between text-accent-orange font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Readiness {readinessScore} — Adapt Today&apos;s Workout:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDismissAdaptation(workout.id)}
                                                className="p-0.5 text-foreground-muted hover:text-foreground"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={() => handleReduceWorkout(workout)}
                                                className="px-2.5 py-1 rounded bg-accent-orange text-background font-semibold text-xs"
                                            >
                                                Reduce (-25%)
                                            </button>
                                            {recommendedRescheduleDay && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRescheduleWorkout(workout, recommendedRescheduleDay)
                                                    }
                                                    className="px-2.5 py-1 rounded border border-accent-orange/40 text-accent-orange text-xs"
                                                >
                                                    Move to{' '}
                                                    {format(parseISO(recommendedRescheduleDay), 'EEE d')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Render Completed Workouts in Sleek Compact Rows */}
                    {completedWorkouts.map((workout) => {
                        const dw = workout as DashboardWorkout;
                        const workoutDate = new Date(workout.scheduledDate);
                        const isCyclingWorkout = CYCLING_WORKOUT_TYPES.has(workout.workoutType) || dw.sport === 'BIKE';
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

                        if (isOptionC) {
                            return (
                                <div
                                    key={workout.id}
                                    className="p-2 rounded-md border border-positive/20 bg-positive/5 text-xs flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Check className="w-3.5 h-3.5 text-positive shrink-0" />
                                        <span className="font-mono text-[11px] text-foreground-muted w-14 shrink-0">
                                            {dateLabel}
                                        </span>
                                        <div className="w-5 h-5 rounded bg-positive/10 text-positive flex items-center justify-center shrink-0">
                                            {getWorkoutIcon(workout.workoutType, isCyclingWorkout, 'w-3 h-3')}
                                        </div>
                                        <span className="font-medium text-foreground truncate" title={title}>
                                            {title}
                                        </span>
                                        {durationStr && (
                                            <span className="text-foreground-muted text-[11px] font-mono shrink-0">
                                                · {durationStr}
                                            </span>
                                        )}
                                        {tssStr && (
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

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onEditWorkout(workout)}
                                            className="p-1 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded transition-colors"
                                            title="Link or change activity"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-positive text-[11px] font-medium flex items-center gap-0.5 px-1 py-0.5">
                                            Done
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        // Option A / B Classic completed row
                        return (
                            <div
                                key={workout.id}
                                className="p-3 rounded-md border border-positive/20 bg-positive/5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-positive/20 text-positive flex items-center justify-center">
                                        {getWorkoutIcon(workout.workoutType, isCyclingWorkout)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-positive">{title}</p>
                                            <span className="text-xs text-foreground-muted font-mono">
                                                ({dateLabel})
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground-muted font-mono">
                                            {durationStr}
                                            {tssStr ? ` · ${tssStr}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onEditWorkout(workout)}
                                        className="p-1 text-foreground-muted hover:text-foreground rounded"
                                        title="Change activity link"
                                    >
                                        <Link2 className="w-4 h-4" />
                                    </button>
                                    <span className="text-positive text-xs flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Done
                                    </span>
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
