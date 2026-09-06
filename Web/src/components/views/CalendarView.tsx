'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { addMonths, endOfWeek, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { PencilRuler } from 'lucide-react';
import { CalendarToolbar, type CalendarViewMode } from '@/app/calendar-preview/components/CalendarToolbar';
import { MonthlyView } from '@/app/calendar-preview/components/MonthlyView';
import { WeeklyView } from '@/app/calendar-preview/components/WeeklyView';
import { SummaryStats } from '@/app/calendar-preview/components/SummaryStats';
import { buildDays, buildWeeks, buildMonth, fillFitness } from '@/app/calendar-preview/components/metrics';
import type { MockActivity, MockWorkout, WorkoutType } from '@/app/calendar-preview/components/mockData';
import type { ActivityListItem } from '@/lib/types';

/**
 * Live training calendar view.
 *
 * Fetches real activities (/api/activities) and the active training plan's
 * workouts (/api/plan-advanced/[goalId]) and renders the Runalyze/TrainingPeaks-
 * style weekly + monthly calendar with planned-vs-actual, TRIMP load shading,
 * and CTL/ATL/TSB fitness metrics.
 *
 * Reuses the presentational components built for /calendar-preview — only the
 * data source differs (mock -> live API).
 */

interface PlanWorkout {
    id: string;
    scheduledDate: string | Date;
    workoutType: string;
    phase: string;
    targetDistance: number | null;
    targetDuration: number | null;
    plannedTss: number | null;
    isCompleted: boolean;
    linkedActivityId: string | null;
    customName: string | null;
    displayDesc: string | null;
}

interface PlanResponse {
    plan: {
        id: string;
        workouts: PlanWorkout[];
    };
}

interface GoalsResponse {
    goals: Array<{
        id: string;
        isActive: boolean;
        raceDate: string | Date | null;
        raceType: string | null;
        parentGoalId: string | null;
        deletedAt: string | Date | null;
    }>;
}

interface CalendarViewProps {
    /** Reserved for parity with other views (DashboardView, etc.). The calendar
     *  always renders its own toolbar; the shell-provided header is separate. */
    showHeader?: boolean;
}

export function CalendarView({ showHeader: _showHeader = true }: CalendarViewProps) {
    const [mode, setMode] = useState<CalendarViewMode>('week');
    const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

    // 1. Active goal (to know which plan's workouts to fetch)
    const { data: goalsData } = useQuery<GoalsResponse>({
        queryKey: ['plans', 'parentOnly'],
        queryFn: async () => {
            const res = await fetch('/api/plans?parentOnly=true');
            if (!res.ok) throw new Error('Failed to load plans');
            return res.json();
        },
    });

    const activeGoal = useMemo(() => {
        const goals = goalsData?.goals ?? [];
        return goals.find((g) => g.isActive && !g.deletedAt) ?? goals[0] ?? null;
    }, [goalsData]);

    // 2. Plan workouts (planned training) — only if there's an active goal
    const { data: planData } = useQuery<PlanResponse>({
        queryKey: ['plan-advanced', activeGoal?.id],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${activeGoal!.id}`);
            if (!res.ok) throw new Error('Failed to load plan');
            return res.json();
        },
        enabled: !!activeGoal?.id,
    });

    // 3. Activities (completed training) — fetch a wide window for context
    const from = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6); // 6 months back
        return startOfWeek(d, { weekStartsOn: 1 });
    }, []);
    const to = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3); // 3 months ahead (planned)
        return endOfWeek(d, { weekStartsOn: 1 });
    }, []);

    const { data: activitiesData, isLoading: activitiesLoading } = useQuery<{ activities: ActivityListItem[] }>({
        queryKey: ['activities', 'calendar', from.toISOString(), to.toISOString()],
        queryFn: async () => {
            // Fetch up to 100 most recent; the API caps at 100 per request.
            const res = await fetch('/api/activities?limit=100');
            if (!res.ok) throw new Error('Failed to load activities');
            return res.json();
        },
    });

    // Map live API shapes onto the calendar's internal types.
    const activities = useMemo<MockActivity[]>(() => {
        const raw = activitiesData?.activities ?? [];
        return raw.map((a) => ({
            id: a.id,
            name: a.name ?? 'Activity',
            type: normalizeType(a.trainingType ?? a.type),
            startDate: a.startDate as string,
            distance: a.distance ?? 0,
            duration: a.movingTime ?? 0,
            averageHr: a.averageHr ?? null,
            trimp: a.trimp ?? null,
            tss: a.runningTss ?? null,
            vdot: a.estimatedVdot ?? null,
            totalElevation: a.totalElevation ?? null,
        }));
    }, [activitiesData]);

    const workouts = useMemo<MockWorkout[]>(() => {
        const raw = planData?.plan?.workouts ?? [];
        return raw.map((w) => ({
            id: w.id,
            name: w.displayDesc ?? w.customName ?? w.workoutType.replace(/_/g, ' '),
            type: normalizeType(w.workoutType),
            phase: (w.phase as MockWorkout['phase']) ?? 'BASE',
            scheduledDate: w.scheduledDate as string,
            targetDistance: w.targetDistance ?? null,
            targetDuration: w.targetDuration ?? null,
            plannedTss: w.plannedTss ?? null,
            linkedActivityId: w.linkedActivityId ?? null,
            completed: w.isCompleted ?? false,
        }));
    }, [planData]);

    // Build the day/week/month aggregations + fitness curve.
    const days = useMemo(() => buildDays(activities, workouts, from, to), [activities, workouts, from, to]);
    const allWeeks = useMemo(
        () => fillFitness(buildWeeks(days, from, to), { initialCtl: 50, initialAtl: 55 }),
        [days, from, to],
    );

    const visibleWeeks = useMemo(() => {
        const monthStart = startOfMonth(cursor);
        const leadWeeks = startOfWeek(monthStart, { weekStartsOn: 1 });
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return allWeeks.filter((w) => w.weekStart >= leadWeeks && w.weekStart <= end);
    }, [cursor, allWeeks]);

    const monthEntry = useMemo(
        () => buildMonth(days, cursor.getFullYear(), cursor.getMonth()),
        [days, cursor],
    );

    const label = useMemo(() => {
        if (mode === 'month') return monthEntry.label;
        if (visibleWeeks.length === 0) return '';
        const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return `${fmt(visibleWeeks[0].weekStart)} – ${fmt(visibleWeeks[visibleWeeks.length - 1].weekEnd)}`;
    }, [mode, monthEntry, visibleWeeks]);

    const period = mode === 'month'
        ? monthEntry
        : {
            trimp: visibleWeeks.reduce((s, w) => s + w.trimp, 0),
            tss: visibleWeeks.reduce((s, w) => s + w.tss, 0),
            plannedTss: visibleWeeks.reduce((s, w) => s + w.plannedTss, 0),
            distance: visibleWeeks.reduce((s, w) => s + w.distance, 0),
            avgVdot: avgOrNull(visibleWeeks.map((w) => w.avgVdot)),
        };
    const fitness = visibleWeeks.length > 0 ? visibleWeeks[visibleWeeks.length - 1] : undefined;

    const hasAnyData = activities.length > 0 || workouts.length > 0;

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            <CalendarToolbar
                mode={mode}
                onModeChange={setMode}
                label={label}
                onPrev={() => setCursor((c) => subMonths(c, 1))}
                onNext={() => setCursor((c) => addMonths(c, 1))}
                onToday={() => setCursor(startOfMonth(new Date()))}
                actions={activeGoal ? (
                    <Link
                        href={`/plan-advanced/${activeGoal.id}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 rounded-md text-xs font-medium text-accent-orange hover:text-accent-pink hover:bg-accent-orange/10 border border-accent-orange/30 transition-colors"
                        title="Open this plan in the advanced editor"
                    >
                        <PencilRuler className="w-3.5 h-3.5" />
                        Advanced Editor
                    </Link>
                ) : undefined}
            />
            <SummaryStats period={period} fitness={fitness} />

            <div className="flex-1 overflow-auto">
                {activitiesLoading && !hasAnyData ? (
                    <div className="flex items-center justify-center h-full text-foreground-muted text-sm">
                        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mr-2" />
                        Loading your training history…
                    </div>
                ) : !hasAnyData ? (
                    <div className="flex flex-col items-center justify-center h-full text-foreground-muted text-sm gap-2 px-6 text-center">
                        <p>No activities or planned workouts found for this period.</p>
                        <p className="text-xs text-foreground-muted">
                            Sync your Strava activities or create a training plan to populate the calendar.
                        </p>
                    </div>
                ) : mode === 'month' ? (
                    <MonthlyView month={cursor} days={days} />
                ) : (
                    <WeeklyView weeks={visibleWeeks} />
                )}
            </div>
        </div>
    );
}

/** Map an activity training type / plan workout type onto the calendar's union. */
function normalizeType(t: string): WorkoutType {
    const u = (t || '').toUpperCase();
    // Activity trainingType values already overlap with the workout union
    // (EASY, TEMPO, INTERVALS, ...). Anything unknown falls back to OTHER.
    const known = new Set([
        'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS',
        'RECOVERY', 'RACE', 'REST', 'RIDE', 'SWIM', 'STRENGTH', 'CROSS_TRAIN',
        'OTHER', 'BRICK', 'OPEN_WATER_SWIM', 'LONG_RIDE', 'RIDE_INTERVALS',
        'SWIM_DRILL', 'TRANSITION_PRACTICE', 'DOUBLE_DAY',
    ]);
    if (known.has(u as WorkoutType)) return u as WorkoutType;
    // Coarse activity-type fallbacks
    if (u === 'RUN' || u === 'VIRTUALRUN') return 'EASY';
    if (u === 'RIDE' || u === 'VIRTUAL_RIDE' || u === 'CYCLING') return 'RIDE';
    if (u === 'SWIM') return 'SWIM';
    if (u === 'WALK' || u === 'HIKE') return 'EASY';
    if (u === 'WORKOUT') return 'STRENGTH';
    return 'OTHER';
}

function avgOrNull(values: (number | null)[]): number | null {
    const valid = values.filter((v): v is number => v != null);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}
