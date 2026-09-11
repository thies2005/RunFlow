import { format, startOfWeek, addDays } from 'date-fns';

/**
 * Shared plan-export engine: turns a Prisma goal (+workouts) into the
 * week-grouped export shape, a CSV string, or a styled PDF — the same
 * content the web's public export and plan page show, served to the
 * mobile app via /api/mobile/v1/goals/[id]/export.
 */

export interface ExportWorkoutRow {
    date: string; // YYYY-MM-DD
    day: string; // Mon
    type: string; // EASY, LONG_RUN, BRICK…
    title: string; // customName ?? description (first line)
    distanceKm: string; // "42.2" | "-"
    duration: string; // "1:30:00" | "-"
    pace: string; // "5:00 /km" | "-"
    phase: string; // BASE, BUILD…
    intensityZone: string | null;
}

export interface ExportWeek {
    weekNumber: number;
    dateRange: string; // "Sep 7 – Sep 13"
    phase: string;
    totalDistanceKm: string;
    rows: ExportWorkoutRow[];
}

export interface ExportPlan {
    goalName: string;
    raceTypeLabel: string;
    raceDate: string; // formatted or "-"
    targetTime: string | null; // "4:30:00"
    peakWeeklyKm: string | null; // "80.0"
    planWeeks: number;
    weeks: ExportWeek[];
}

/** Goal/prisma shape this engine needs (subset, kept structural for tests). */
export interface ExportGoalInput {
    name: string;
    raceType: string | null;
    raceDate: Date | null;
    targetTime: number | null; // seconds
    weeklyMileageGoal: number | null; // meters
    planWeeks: number;
    workouts: Array<{
        scheduledDate: Date;
        workoutType: string;
        phase: string;
        description: string;
        customName: string | null;
        targetDistance: number | null; // meters
        targetDuration: number | null; // seconds
        targetPace: number | null; // sec/km
        intensityZone?: string | null;
    }>;
}

/** User-facing race labels (mirrors the app's RaceType labels / web maps). */
export const RACE_LABELS: Record<string, string> = {
    FIVE_K: '5K',
    TEN_K: '10K',
    HALF_MARATHON: 'Half Marathon',
    MARATHON: 'Marathon',
    FIFTY_K: '50K',
    FIFTY_MILE: '50 Mile',
    HUNDRED_K: '100K',
    HUNDRED_MILE: '100 Mile',
    TWELVE_HOUR: '12 Hour',
    TWENTY_FOUR_HOUR: '24 Hour',
    BACKYARD_ULTRA: 'Backyard Ultra',
    CUSTOM_DISTANCE: 'Custom Distance',
    SPRINT_TRI: 'Sprint Triathlon',
    OLYMPIC_TRI: 'Olympic Triathlon',
    HALF_IRONMAN: 'Middle Distance Triathlon',
    FULL_IRONMAN: 'Long Distance Triathlon',
    CUSTOM_TRI: 'Custom Triathlon',
};

export function raceLabel(raceType: string | null): string {
    if (!raceType) return 'Training';
    return RACE_LABELS[raceType] ?? raceType.replace(/_/g, ' ');
}

/** Shifts an instant so its local (format/`startOfWeek`) fields read as UTC. */
function asUtc(d: Date): Date {
    return new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
}

export function formatDuration(totalSec: number | null): string {
    if (!totalSec || totalSec <= 0) return '-';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.round(totalSec % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secPerKm: number | null): string {
    if (!secPerKm || secPerKm <= 0) return '-';
    const total = Math.round(secPerKm); // round first so "5:60" is impossible
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** Monday-based week grouping (same as the plan page), always in UTC so the
 * output is independent of the server's timezone. */
export function buildExportPlan(goal: ExportGoalInput): ExportPlan {
    const sorted = [...goal.workouts].sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
    );

    const byMonday = new Map<number, ExportGoalInput['workouts']>();
    for (const w of sorted) {
        const monday = startOfWeek(asUtc(w.scheduledDate), { weekStartsOn: 1 });
        const key = monday.getTime();
        const bucket = byMonday.get(key) ?? [];
        bucket.push(w);
        byMonday.set(key, bucket);
    }

    const weeks: ExportWeek[] = [...byMonday.entries()]
        .sort(([a], [b]) => a - b)
        .map(([mondayTs, workouts], i) => {
        const monday = new Date(mondayTs);
        return ({
        weekNumber: i + 1,
        dateRange: `${format(monday, 'MMM d')} – ${format(addDays(monday, 6), 'MMM d')}`,
        phase: workouts[0].phase.replace(/_/g, ' '),
        totalDistanceKm: (workouts.reduce((sum, w) => sum + (w.targetDistance ?? 0), 0) / 1000).toFixed(1),
        rows: workouts.map(w => ({
            date: format(asUtc(w.scheduledDate), 'yyyy-MM-dd'),
            day: format(asUtc(w.scheduledDate), 'EEE'),
            type: w.workoutType,
            title: w.customName?.trim() || w.description,
            distanceKm: w.targetDistance ? (w.targetDistance / 1000).toFixed(1) : '-',
            duration: formatDuration(w.targetDuration),
            pace: formatPace(w.targetPace),
            phase: w.phase.replace(/_/g, ' '),
            intensityZone: w.intensityZone ?? null,
        })),
    });
    });

    return {
        goalName: goal.name,
        raceTypeLabel: raceLabel(goal.raceType),
        raceDate: goal.raceDate ? format(asUtc(goal.raceDate), 'MMM d, yyyy') : '-',
        targetTime: goal.targetTime ? formatDuration(goal.targetTime) : null,
        peakWeeklyKm: goal.weeklyMileageGoal ? (goal.weeklyMileageGoal / 1000).toFixed(1) : null,
        planWeeks: goal.planWeeks,
        weeks,
    };
}

export function buildCsv(plan: ExportPlan): string {
    const headers = ['Date', 'Day', 'Type', 'Description', 'Distance (km)', 'Duration', 'Pace', 'Phase', 'Intensity Zone'];
    const lines = [headers.join(',')];
    for (const week of plan.weeks) {
        for (const w of week.rows) {
            const row = [
                w.date,
                w.day,
                w.type.replace(/_/g, ' '),
                `"${w.title.replace(/"/g, '""')}"`,
                w.distanceKm,
                w.duration,
                w.pace,
                w.phase,
                w.intensityZone ?? '',
            ];
            lines.push(row.join(','));
        }
    }
    return lines.join('\n');
}

export function exportFileName(raceType: string | null, ext: 'pdf' | 'csv'): string {
    const slug = (raceType ?? 'plan').toLowerCase();
    return `runflow-${slug}-plan.${ext}`;
}

/** Phase colors — same palette as the web export/plan UI. */
export const PHASE_COLORS: Record<string, string> = {
    BASE: '#3b82f6',
    BUILD: '#f59e0b',
    PEAK: '#ef4444',
    TAPER: '#10b981',
    'RACE WEEK': '#eab308',
    RACE_WEEK: '#eab308',
    RECOVERY: '#8b5cf6',
    ENDURANCE: '#06b6d4',
    MENTAL_PREP: '#0ea5e9',
    'MENTAL PREP': '#0ea5e9',
    TUNE_UP: '#14b8a6',
    'TUNE UP': '#14b8a6',
    MAINTAIN: '#6b7280',
};

/** Workout-type colors — same palette as the web export UI. */
export const TYPE_COLORS: Record<string, string> = {
    EASY: '#6b7280',
    LONG_RUN: '#a855f7',
    TEMPO: '#f97316',
    INTERVALS: '#ef4444',
    FARTLEK: '#ec4899',
    REPETITIONS: '#dc2626',
    RECOVERY: '#22c55e',
    RACE: '#eab308',
    RIDE: '#3b82f6',
    SWIM: '#06b6d4',
    STRENGTH: '#6366f1',
    BRICK: '#8b5cf6',
    LONG_RIDE: '#2563eb',
    OPEN_WATER_SWIM: '#0891b2',
    SWIM_DRILL: '#0e7490',
    RIDE_INTERVALS: '#4f46e5',
    TRANSITION_PRACTICE: '#a16207',
    DOUBLE_DAY: '#7c3aed',
    CROSS_TRAIN: '#059669',
    REST: '#cbd5e1',
    OTHER: '#6b7280',
};
