import { Activity, Calendar, Target, Trophy, CheckCircle, Loader2, Trash2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { differenceInDays, differenceInWeeks, format, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';
import { detectEffectivePlanSport, getEffectiveSportLabel, estimateFallbackWorkoutTss } from '@/lib/plan/sportDetection';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Goal, SuggestedRaceActivity, Workout, AnalyticsStats } from '@/lib/types';
import type { RaceDistance } from '@/lib/metrics/vdot';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { estimateTriathlonTime } from '@/lib/plans/triathlon-time';
import { RaceType } from '@/generated/prisma/browser';
import { useUserMetrics } from './providers/UserMetricsProvider';
import { useDeviceType } from '@/hooks/useDeviceType';
import { formatDistanceWithUnit, formatPace as formatPaceWithUnits, useUnits } from '@/lib/units';
import * as TrainingStatusCardModule from '@/components/dashboard/TrainingStatusCard';
import { EVENT_DASHBOARD_LAYOUT_CHANGE } from '@/components/dashboard/TrainingStatusCard';

export type CountdownStyleMode = 'COMPACT_BAR' | 'HEADER_PILL' | 'CLASSIC_2BOX';
export type EffortCardMode = 'WEEK_AND_MONTH' | 'WEEK_ONLY' | 'LEGACY_KM';
export type PrimaryLoadMetricMode = 'TSS' | 'DUAL' | 'TRIMP';

export function readCountdownStyle(): CountdownStyleMode {
    if (typeof (TrainingStatusCardModule as any).readCountdownStyle === 'function') {
        return (TrainingStatusCardModule as any).readCountdownStyle();
    }
    if (typeof window === 'undefined') return 'COMPACT_BAR';
    try {
        const raw = localStorage.getItem('runflow_countdown_style_v1');
        if (raw === 'COMPACT_BAR' || raw === 'HEADER_PILL' || raw === 'CLASSIC_2BOX') return raw;
    } catch {}
    return 'COMPACT_BAR';
}

export function readEffortCardMode(): EffortCardMode {
    if (typeof (TrainingStatusCardModule as any).readEffortCardMode === 'function') {
        return (TrainingStatusCardModule as any).readEffortCardMode();
    }
    if (typeof window === 'undefined') return 'WEEK_AND_MONTH';
    try {
        const raw = localStorage.getItem('runflow_effort_card_mode_v1');
        if (raw === 'WEEK_AND_MONTH' || raw === 'WEEK_ONLY' || raw === 'LEGACY_KM') return raw;
    } catch {}
    return 'WEEK_AND_MONTH';
}

export function readPrimaryLoadMetric(): PrimaryLoadMetricMode {
    if (typeof (TrainingStatusCardModule as any).readPrimaryLoadMetric === 'function') {
        return (TrainingStatusCardModule as any).readPrimaryLoadMetric();
    }
    if (typeof window === 'undefined') return 'TSS';
    try {
        const raw = localStorage.getItem('runflow_load_metric_v1');
        if (raw === 'TSS' || raw === 'DUAL' || raw === 'TRIMP') return raw;
    } catch {}
    return 'TSS';
}

interface RaceCountdownProps {
    goal: Goal | null;
    className?: string;
    onSelectRace?: (_goal: Goal, _activity: SuggestedRaceActivity | null, _mode: 'suggest' | 'review' | 'pick') => void;
    isIncompleteArchived?: boolean;
    weeklyWorkouts?: Workout[];
    statsData?: AnalyticsStats | any | null;
}

const raceLabels: Record<string, string> = {
    FIVE_K: '5K',
    TEN_K: '10K',
    HALF_MARATHON: 'Half Marathon',
    MARATHON: 'Marathon',
    SPRINT_TRI: 'Sprint Triathlon',
    OLYMPIC_TRI: 'Olympic Triathlon',
    HALF_IRONMAN: 'Middle Distance Triathlon',
    FULL_IRONMAN: 'Long Distance Triathlon',
    CUSTOM_TRI: 'Custom Triathlon',
};

const raceDistanceMap: Record<string, RaceDistance> = {
    'FIVE_K': '5K',
    'TEN_K': '10K',
    'HALF_MARATHON': 'HALF',
    'MARATHON': 'MARATHON',
};

const TRI_RACE_TYPES = new Set(['SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI']);

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function fmtDuration(sec: number): string {
    if (sec <= 0) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function RaceCountdown({
    goal,
    className = '',
    onSelectRace,
    isIncompleteArchived = false,
    weeklyWorkouts,
    statsData,
}: RaceCountdownProps) {
    const router = useRouter();
    const {
        marathonShape,
        aerobicVo2max,
        currentWeekMileage
    } = useUserMetrics();
    const { isMobile } = useDeviceType();
    const queryClient = useQueryClient();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [countdownStyle, setCountdownStyle] = useState<CountdownStyleMode>('COMPACT_BAR');
    const [effortMode, setEffortMode] = useState<EffortCardMode>('WEEK_AND_MONTH');
    const [primaryLoadMetric, setPrimaryLoadMetric] = useState<PrimaryLoadMetricMode>('TSS');

    useEffect(() => {
        const syncPrefs = () => {
            setCountdownStyle(readCountdownStyle());
            setEffortMode(readEffortCardMode());
            setPrimaryLoadMetric(readPrimaryLoadMetric());
        };
        syncPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncPrefs);
        window.addEventListener('storage', syncPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncPrefs);
            window.removeEventListener('storage', syncPrefs);
        };
    }, []);

    // Delete plan mutation (soft-delete via the advanced plan endpoint: snapshots + cleans sub-goals)
    const deletePlanMutation = useMutation({
        mutationFn: async (goalId: string) => {
            const res = await fetch(`/api/plan-advanced/${goalId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete plan');
            return res.json();
        },
        onSuccess: (_data, goalId) => {
            toast.success('Plan deleted');
            setIsDeleteConfirmOpen(false);
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['plan-advanced'] });
            queryClient.removeQueries({ queryKey: ['plan-advanced', goalId] });
        },
        onError: () => {
            toast.error('Failed to delete plan');
        },
    });

    const shapePercent = marathonShape?.shape || 0;

    if (!goal) {
        return (
            <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-semibold text-foreground-muted mb-4">Race Goal</h2>
                <div className="text-center py-8">
                    <Trophy className="w-16 h-16 mx-auto text-foreground-muted mb-4 block" />
                    <p className="text-foreground-muted">No race goal set</p>
                    <button
                        onClick={() => router.push('/onboarding?step=4')}
                        className="btn-secondary mt-4"
                    >
                        Set Your Goal
                    </button>
                </div>
            </div>
        );
    }

    if (!goal.raceDate || !goal.raceType) {
        return (
            <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-semibold text-foreground-muted mb-4">{goal.name}</h2>
                <p className="text-foreground-muted text-sm">No race goal set.</p>
            </div>
        );
    }

    const raceDate = new Date(goal.raceDate);
    const today = new Date();
    const daysToRace = differenceInDays(raceDate, today);
    const weeksToRace = differenceInWeeks(raceDate, today);

    // Auto-archive check: 14 days past race date with no race result
    const isOverdue = !isIncompleteArchived && daysToRace < -14 && !goal.raceResult;

    // POST-RACE STATE: Race date passed, no race result linked
    if ((daysToRace <= 0 || isIncompleteArchived) && !goal.raceResult && !isOverdue) {
        return <PostRacePending goal={goal} daysToRace={daysToRace} onSelectRace={onSelectRace} className={className} isIncompleteArchived={isIncompleteArchived} />;
    }

    if (isOverdue) {
        return <PostRaceOverdue goal={goal} className={className} />;
    }

    // ACTIVE STATE: Race is in the future
    const exactWeeks = Math.floor(Math.max(0, daysToRace) / 7);
    const remDays = Math.max(0, daysToRace) % 7;
    const totalWeeks = goal.planWeeks || 12;
    const weeksCompleted = Math.max(0, Math.min(totalWeeks, totalWeeks - weeksToRace));
    const progressPercent = Math.min(100, (weeksCompleted / totalWeeks) * 100);

    // Effort calculations
    let fallbackWeeklyPlannedTss = 0;
    let fallbackWeeklyActualTss = 0;
    let fallbackWeeklyPlannedDuration = 0;
    let fallbackWeeklyActualDuration = 0;
    if (weeklyWorkouts && weeklyWorkouts.length > 0) {
        for (const w of weeklyWorkouts) {
            const pTss = estimateFallbackWorkoutTss(w as any);
            fallbackWeeklyPlannedTss += pTss;
            fallbackWeeklyPlannedDuration += w.targetDuration || 3000;
            if (w.isCompleted) {
                fallbackWeeklyActualTss += (w as any).actualTss ?? pTss;
                fallbackWeeklyActualDuration += w.targetDuration || 3000;
            }
        }
    }

    const weeklyActualTss = Math.max(statsData?.weeklyActualTss ?? 0, fallbackWeeklyActualTss);
    const weeklyActualDurationSec = Math.max(statsData?.weeklyActualDurationSec ?? 0, fallbackWeeklyActualDuration);
    const weeklyPlannedTss = (statsData?.weeklyPlannedTss && statsData.weeklyPlannedTss > 0)
        ? statsData.weeklyPlannedTss
        : fallbackWeeklyPlannedTss;
    const weeklyPlannedDurationSec = (statsData?.weeklyPlannedDurationSec && statsData.weeklyPlannedDurationSec > 0)
        ? statsData.weeklyPlannedDurationSec
        : fallbackWeeklyPlannedDuration;
    const weeklyPlannedTrimp = statsData?.weeklyPlannedTrimp ?? Math.round(weeklyPlannedTss * 1.15);
    const weeklyActualTrimp = statsData?.weeklyActualTrimp ?? Math.round(weeklyActualTss * 1.15);

    // 4-Week Block (Monthly) breakdown & totals
    const rawBreakdown = statsData?.blockWeeksBreakdown || statsData?.monthlyWeeksBreakdown;
    const hasValidBreakdown = rawBreakdown && rawBreakdown.length > 0 && rawBreakdown.some((w: any) => ((w.plannedTss ?? 0) > 0 || (w.actualTss ?? 0) > 0));

    const now = new Date();
    const currentWeekMon = startOfWeek(now, { weekStartsOn: 1 });
    const mesoWeeksFallback = [
        { label: 'W1', start: subDays(currentWeekMon, 7), end: endOfWeek(subDays(currentWeekMon, 7), { weekStartsOn: 1 }), isCurrent: false },
        { label: 'W2', start: currentWeekMon, end: endOfWeek(currentWeekMon, { weekStartsOn: 1 }), isCurrent: true },
        { label: 'W3', start: addDays(currentWeekMon, 7), end: endOfWeek(addDays(currentWeekMon, 7), { weekStartsOn: 1 }), isCurrent: false },
        { label: 'W4', start: addDays(currentWeekMon, 14), end: endOfWeek(addDays(currentWeekMon, 14), { weekStartsOn: 1 }), isCurrent: false },
    ];

    const fallbackBlockBreakdown = mesoWeeksFallback.map((mw) => {
        const wWorkouts = (goal.workouts || []).filter((w: any) => {
            const d = new Date(w.scheduledDate);
            return d >= mw.start && d <= mw.end;
        });
        let plannedTss = 0;
        let actualTss = 0;
        for (const w of wWorkouts) {
            const tss = estimateFallbackWorkoutTss(w as any);
            plannedTss += tss;
            if (w.isCompleted) {
                actualTss += (w as any).actualTss ?? tss;
            }
        }
        return {
            label: mw.label,
            plannedTss: Math.round(plannedTss),
            actualTss: Math.round(actualTss),
            isCurrentWeek: mw.isCurrent,
        };
    });

    const blockWeeks = hasValidBreakdown
        ? rawBreakdown.slice(0, 4)
        : ((goal.workouts && goal.workouts.length > 0)
            ? fallbackBlockBreakdown
            : [
                { label: 'W1', plannedTss: Math.round(weeklyPlannedTss || 200), actualTss: weeklyActualTss, isCurrentWeek: true },
                { label: 'W2', plannedTss: Math.round(weeklyPlannedTss || 200), actualTss: 0, isCurrentWeek: false },
                { label: 'W3', plannedTss: Math.round(weeklyPlannedTss || 200), actualTss: 0, isCurrentWeek: false },
                { label: 'W4', plannedTss: Math.round(weeklyPlannedTss || 200), actualTss: 0, isCurrentWeek: false },
            ]);

    const sumBlockPlannedTss = blockWeeks.reduce((acc: number, w: any) => acc + (w.plannedTss || 0), 0);
    const sumBlockActualTss = blockWeeks.reduce((acc: number, w: any) => acc + (w.actualTss || 0), 0);

    const monthlyPlannedTss = (statsData?.monthlyPlannedTss && statsData.monthlyPlannedTss > 0)
        ? statsData.monthlyPlannedTss
        : (sumBlockPlannedTss > 0 ? sumBlockPlannedTss : (weeklyPlannedTss > 0 ? weeklyPlannedTss * 4 : 800));
    const monthlyActualTss = Math.max(statsData?.monthlyActualTss ?? 0, sumBlockActualTss, weeklyActualTss);

    const weeklyPct = weeklyPlannedTss > 0 ? Math.round((weeklyActualTss / weeklyPlannedTss) * 100) : 0;
    const monthlyPct = monthlyPlannedTss > 0 ? Math.round((monthlyActualTss / monthlyPlannedTss) * 100) : 0;
    const dayOfWeekIndex = (new Date().getDay() + 6) % 7; // Mon=0 .. Sun=6
    const dayTickPercent = Math.round(((dayOfWeekIndex + 0.5) / 7) * 100);

    const isCustomOrOther = goal.raceType === 'CUSTOM_TRI' || (goal.raceType as string) === 'OTHER' || (goal.raceType as string) === 'CUSTOM_DISTANCE';
    const planWorkouts = goal.workouts || [];
    const pastOrTodayWorkouts = planWorkouts.filter(w => new Date(w.scheduledDate) <= new Date());
    const compliantCount = pastOrTodayWorkouts.filter(w => w.isCompleted).length;
    const planCompliancePct = pastOrTodayWorkouts.length > 0
        ? Math.round((compliantCount / pastOrTodayWorkouts.length) * 100)
        : (weeklyPct > 0 ? weeklyPct : 100);

    // CURRENT-fitness prediction for the goal's distance, from the HR-based
    // Aerobic Fitness (VO2max) metric — the SAME inputs the Analytics page
    // passes to calculateAllRacePredictions (effectiveVO2max + server shape +
    // the goal's marathon shape calibration factor), so the card and the
    // Analytics page can never disagree for the same distance.
    const predictionDistanceNames: Record<RaceDistance, string> = {
        '5K': '5K',
        '10K': '10K',
        'HALF': 'Half',
        'MARATHON': 'Marathon',
    };
    const nowPredictedTime = (() => {
        if (aerobicVo2max <= 0) return 0;
        if (isCustomOrOther) return 0; // Suppress Sprint Triathlon prediction mismatch for custom/other
        if (TRI_RACE_TYPES.has(goal.raceType)) {
            return estimateTriathlonTime({ vdot: aerobicVo2max, raceType: goal.raceType as RaceType })?.optimal.totalSeconds ?? 0;
        }
        const goalDistance = raceDistanceMap[goal.raceType];
        if (!goalDistance) return 0;
        const predictions = calculateAllRacePredictions(aerobicVo2max, shapePercent, goal.marathonShapeFactor || 1.0);
        return predictions.find(p => p.distance === predictionDistanceNames[goalDistance])?.predicted ?? 0;
    })();

    return (
        <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground-muted">Race Goal</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/calendar')}
                        className="text-xs text-accent-orange hover:opacity-80 transition-opacity"
                    >
                        {isMobile ? 'View Full Plan →' : 'View Calendar →'}
                    </button>
                    {(() => {
                        const effectiveSport = getEffectiveSportLabel(goal, weeklyWorkouts || goal.workouts);
                        const badgeStyle =
                            effectiveSport.badgeClass === 'badge-bike'
                                ? 'badge-bike bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                                : effectiveSport.badgeClass === 'badge-tri'
                                ? 'badge-tri bg-accent-blue/10 text-accent-blue border border-accent-blue/30'
                                : 'badge-run';
                        return (
                            <span className={`badge ${badgeStyle}`}>
                                {effectiveSport.label}
                            </span>
                        );
                    })()}
                    <button
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        disabled={deletePlanMutation.isPending}
                        className="p-1.5 rounded-md text-foreground-muted hover:text-negative hover:bg-negative/10 transition-colors disabled:opacity-50"
                        title="Delete plan"
                        aria-label="Delete plan"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <h3 className="text-xl font-bold text-foreground mb-1">{goal.name}</h3>
                <div className="flex items-center gap-2 text-foreground-muted text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(raceDate, 'MMMM d, yyyy')}</span>
                </div>
            </div>

            {/* Countdown Display: Compact Bar by default, or classic 2-box */}
            {countdownStyle === 'CLASSIC_2BOX' ? (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="glass-card p-4 text-center">
                            <p className="stat-value-accent">{daysToRace}</p>
                            <p className="text-sm text-foreground-muted mt-1">days to go</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="stat-value">{weeksToRace}</p>
                            <p className="text-sm text-foreground-muted mt-1">weeks</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-foreground-muted">Training Progress</span>
                            <span className="text-foreground font-medium tabular-nums">Week {weeksCompleted} of {totalWeeks}</span>
                        </div>
                        <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent-orange rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </>
            ) : (
                /* COMPACT_BAR (Default) */
                <div className="bg-background-tertiary/60 border border-line rounded-lg p-3.5 mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-foreground">
                            {daysToRace} days to go <span className="font-mono text-foreground-muted text-[11px]">({exactWeeks}w {remDays}d)</span>
                        </span>
                        <span className="font-mono text-foreground-muted text-xs">
                            Week {weeksCompleted} of {totalWeeks}
                        </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent-orange rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Planned vs. Actual Effort Subcard */}
            {effortMode !== 'LEGACY_KM' && (
                <div className="bg-background-tertiary/40 border border-line rounded-lg p-3.5 mb-4 space-y-3">
                    {/* This Week Effort Bar */}
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-foreground-muted font-medium">This Week Effort</span>
                            <span className="font-mono tabular-nums text-foreground font-semibold text-xs">
                                {primaryLoadMetric === 'TRIMP'
                                    ? `${weeklyActualTrimp} / ${weeklyPlannedTrimp} TRIMP`
                                    : primaryLoadMetric === 'DUAL'
                                    ? `${weeklyActualTss}/${weeklyPlannedTss} TSS · ${weeklyActualTrimp}/${weeklyPlannedTrimp} TR`
                                    : `${weeklyActualTss} / ${weeklyPlannedTss} TSS`}
                                <span className="ml-1 text-[11px] text-accent-cyan">({weeklyPct}%)</span>
                            </span>
                        </div>
                        <div className="relative h-2 bg-background rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    weeklyPct >= 85 && weeklyPct <= 115
                                        ? 'bg-positive'
                                        : weeklyPct >= 60 && weeklyPct <= 135
                                        ? 'bg-workout-tempo'
                                        : 'bg-accent-orange'
                                }`}
                                style={{ width: `${Math.min(100, weeklyPct)}%` }}
                            />
                            {/* Day-of-week tick marker */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                                style={{ left: `${dayTickPercent}%` }}
                                title={`Today: Day ${dayOfWeekIndex + 1} of 7`}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-1 font-mono">
                            <span>Today marker: Day {dayOfWeekIndex + 1}/7</span>
                            <span>{fmtDuration(weeklyActualDurationSec)} / {fmtDuration(weeklyPlannedDurationSec)}</span>
                        </div>
                    </div>

                    {/* 4-Week Block (Monthly) Effort Bar */}
                    {effortMode === 'WEEK_AND_MONTH' && (
                        <div className="pt-2 border-t border-line/60">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-foreground-muted font-medium">4-Week Block</span>
                                <span className="font-mono tabular-nums text-foreground font-semibold text-xs">
                                    {monthlyActualTss} / {monthlyPlannedTss} TSS
                                    <span className="ml-1 text-[11px] text-accent-cyan">({monthlyPct}%)</span>
                                </span>
                            </div>
                            <div className="h-1.5 bg-background rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-accent-blue rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, monthlyPct)}%` }}
                                />
                            </div>

                            {/* 4 Mini Week Pills (W1..W4) */}
                            <div className="grid grid-cols-4 gap-1.5">
                                {blockWeeks.map((w: any, idx: number) => {
                                    const isCurrent = w.isCurrentWeek ?? (idx === 0);
                                    return (
                                        <div
                                            key={idx}
                                            className={`p-1 rounded text-center border ${
                                                isCurrent
                                                    ? 'bg-accent-orange/10 border-accent-orange/40 text-foreground'
                                                    : 'bg-background-secondary border-line/60 text-foreground-muted'
                                            }`}
                                        >
                                            <div className="text-[9px] font-semibold flex items-center justify-center gap-1">
                                                <span>{w.label || `W${idx + 1}`}</span>
                                                {isCurrent && <span className="w-1 h-1 rounded-full bg-accent-orange" />}
                                            </div>
                                            <div className="text-[8px] font-mono mt-0.5 truncate">
                                                {w.actualTss > 0 ? `${w.actualTss}/${w.plannedTss}T` : `${w.plannedTss}T`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
                {goal.targetTime && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-workout-long-run/15 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-workout-long-run" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted">Goal</p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(goal.targetTime)}</p>
                        </div>
                    </div>
                )}

                {!isCustomOrOther && nowPredictedTime > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted flex items-center gap-1">
                                Now
                                <span className="cursor-help inline-flex items-center ml-0.5" title="Current predicted finish time based on your calibrated Effective VO2max and Marathon Shape">
                                    <Info className="w-3.5 h-3.5 text-foreground-muted inline" />
                                </span>
                            </p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-foreground">{formatTime(nowPredictedTime)}</p>
                        </div>
                    </div>
                )}

                {isCustomOrOther && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-positive/15 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5 text-positive" />
                        </div>
                        <div>
                            <p className="text-xs text-foreground-muted">Plan Compliance</p>
                            <p className="text-xl font-mono tabular-nums font-semibold text-positive">{planCompliancePct}%</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Legacy KM Mode */}
            {effortMode === 'LEGACY_KM' && goal.workouts && goal.workouts.length > 0 && (() => {
                const plannedWeekMileage = goal.workouts.reduce((acc, workout) => {
                    const isRun = ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(workout.workoutType);
                    if (isRun && workout.targetDistance) {
                        return acc + workout.targetDistance;
                    }
                    return acc;
                }, 0) / 1000;

                if (plannedWeekMileage <= 0) return null;

                return (
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-foreground-muted">This Week&apos;s Mileage</span>
                            <span className="text-sm text-foreground font-mono tabular-nums">
                                {currentWeekMileage.toFixed(1)} / {plannedWeekMileage.toFixed(1)} km
                            </span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div
                                className="h-full bg-positive rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (currentWeekMileage / plannedWeekMileage) * 100)}%` }}
                            />
                        </div>
                    </div>
                );
            })()}

            <ConfirmDialog
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
                planName={goal.name}
                onConfirm={() => deletePlanMutation.mutate(goal.id)}
                busy={deletePlanMutation.isPending}
            />
        </div>
    );
}

function PostRacePending({ goal, daysToRace, onSelectRace, className, isIncompleteArchived = false }: {
    goal: Goal;
    daysToRace: number;
    onSelectRace?: RaceCountdownProps['onSelectRace'];
    className: string;
    isIncompleteArchived?: boolean;
}) {
    const { useImperial } = useUnits();
    const queryClient = useQueryClient();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Delete plan mutation (soft-delete via the advanced plan endpoint: snapshots + cleans sub-goals)
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goal.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete plan');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Plan deleted');
            setIsDeleteConfirmOpen(false);
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        },
        onError: () => {
            toast.error('Failed to delete plan');
        },
    });
    const { data: suggestData, isLoading: suggestLoading } = useQuery({
        queryKey: ['suggest-race', goal.id],
        queryFn: async () => {
            const res = await fetch(`/api/goals/${goal.id}/suggest-race`);
            if (!res.ok) throw new Error('Failed to suggest race');
            return res.json();
        },
        staleTime: 60000,
        retry: false,
    });

    const { data: planData } = useQuery({
        queryKey: ['plan', goal.id, 'full'],
        queryFn: async () => {
            const res = await fetch(`/api/plan?goalId=${goal.id}`);
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        staleTime: 60000,
    });

    const suggestions: SuggestedRaceActivity[] = suggestData?.suggestions || [];
    const topSuggestion = suggestions.length > 0 ? suggestions[0] : null;

    const workouts = planData?.goal?.workouts || goal.workouts || [];
    const workoutStats = workouts
        ? {
            total: workouts.length,
            completed: workouts.filter((w: NonNullable<Goal['workouts']>[number]) => w.isCompleted).length,
        }
        : { total: 0, completed: 0 };
    const completionRate = workoutStats.total > 0
        ? Math.round((workoutStats.completed / workoutStats.total) * 100)
        : 0;

    return (
        <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground-muted">Race Goal</h2>
                <span className="badge badge-run">{raceLabels[goal.raceType ?? 'MARATHON'] ?? goal.raceType}</span>
            </div>

            <div className="mb-4">
                <h3 className="text-xl font-bold text-foreground mb-1">{goal.name}</h3>
                <div className="flex items-center gap-2 text-foreground-muted">
                    <Calendar className="w-4 h-4" />
                    <span>{goal.raceDate ? format(new Date(goal.raceDate), 'MMMM d, yyyy') : 'No date'}</span>
                </div>
            </div>

            <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-md p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-accent-orange" />
                    <p className="font-semibold text-accent-orange">
                        {isIncompleteArchived ? 'Unfinished Race' : 'Race Week!'}
                    </p>
                </div>
                <p className="text-sm text-foreground-muted">
                    {isIncompleteArchived
                        ? 'This race was not recorded. Would you like to link your race result or remove this plan?'
                        : daysToRace === 0 ? "Today is race day!" : daysToRace >= -1 ? "The race has passed!" : `The race was ${Math.abs(daysToRace)} days ago.`}
                </p>
            </div>

            {/* Training completion summary */}
            <div className="bg-background-tertiary border border-line rounded-md p-3 mb-4">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground-muted">Training Completion</span>
                    <span className="text-sm font-medium text-foreground tabular-nums">{completionRate}%</span>
                </div>
                <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${completionRate >= 80 ? 'bg-positive' : completionRate >= 60 ? 'bg-workout-tempo' : 'bg-negative'}`}
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
                <p className="text-[10px] text-foreground-muted mt-1 tabular-nums">{workoutStats.completed}/{workoutStats.total} workouts completed</p>
            </div>

            {/* Auto-detect section */}
            {suggestLoading ? (
                <div className="flex items-center justify-center py-4 text-foreground-muted">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Looking for your race...</span>
                </div>
            ) : topSuggestion ? (
                <div className="space-y-3">
                    <p className="text-sm text-foreground-muted">We found a run near your race date:</p>

                    <div className="bg-background-tertiary border border-line rounded-md p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-orange/20 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-accent-orange" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{topSuggestion.name}</p>
                                <div className="flex items-center gap-2 text-xs text-foreground-muted tabular-nums">
                                    <span>{format(new Date(topSuggestion.startDate), 'MMM d')}</span>
                                    <span>{formatDistanceWithUnit(topSuggestion.distance, useImperial, 1)}</span>
                                    <span className="font-mono">{formatTime(topSuggestion.movingTime)}</span>
                                    {topSuggestion.averageSpeed && (
                                        <span className="font-mono">{formatPaceWithUnits(1000 / topSuggestion.averageSpeed, useImperial)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onSelectRace?.(goal, topSuggestion, 'suggest')}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Yes, that&apos;s my race!
                    </button>

                    <button
                        onClick={() => onSelectRace?.(goal, null, 'pick')}
                        className="w-full py-2.5 border border-line text-foreground-muted rounded-md hover:bg-surface-hover transition-colors text-sm"
                    >
                        Pick a different run
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-foreground-muted">No matching run found near your race date.</p>
                    <button
                        onClick={() => onSelectRace?.(goal, null, 'pick')}
                        className="w-full btn-primary py-3"
                    >
                        Select your race run
                    </button>
                </div>
            )}

            {isIncompleteArchived ? (
                <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={deleteMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 text-xs text-negative hover:bg-negative/10 transition-colors py-2 rounded-md disabled:opacity-50"
                >
                    {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete Plan
                </button>
            ) : (
                <button
                    onClick={() => onSelectRace?.(goal, null, 'suggest')}
                    className="w-full text-xs text-foreground-muted hover:text-foreground-muted transition-colors py-2"
                >
                    I didn&apos;t race / Skip for now
                </button>
            )}

            <ConfirmDialog
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
                planName={goal.name}
                onConfirm={() => deleteMutation.mutate()}
                busy={deleteMutation.isPending}
            />
        </div>
    );
}

function PostRaceOverdue({ goal, className }: { goal: Goal; className: string }) {
    const router = useRouter();

    return (
        <div className={`glass-card p-6 animate-slide-in ${className}`} style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-semibold text-foreground-muted mb-4">Race Goal</h2>
            <div className="text-center py-6">
                <Trophy className="w-16 h-16 mx-auto text-foreground-muted mb-4 block" />
                <h3 className="text-lg font-bold text-foreground mb-1">{goal.name}</h3>
                <p className="text-foreground-muted text-sm mb-4">
                    {goal.raceDate ? format(new Date(goal.raceDate), 'MMMM d, yyyy') : 'No date'} &middot; {raceLabels[goal.raceType ?? 'MARATHON'] ?? goal.raceType}
                </p>
                <p className="text-foreground-muted text-sm mb-6">This training block has concluded.</p>
                <button
                    onClick={() => router.push('/onboarding?step=4')}
                    className="btn-primary"
                >
                    Create Training Plan
                </button>
            </div>
        </div>
    );
}
