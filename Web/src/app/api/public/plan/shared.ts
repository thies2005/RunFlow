import type { GeneratedWorkout } from '@/lib/plans';

// Training plans are at most ~2 years. Bound the accepted raceDate horizon so a
// single request cannot drive an unbounded generation loop (the generators also
// clamp totalWeeks defensively to PLAN_CONSTANTS.MAX_TOTAL_WEEKS).
export const MAX_PLAN_HORIZON_DAYS = 104 * 7;

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type PlanWorkout = {
    date: string;
    dayOfWeek: string;
    type: string;
    description: string;
    displayDescription: string;
    distanceKm: string;
    durationMin: string;
    pace: string;
    phase: string;
    intensityZone: string | null;
};

export type PlanWeek = {
    weekNumber: number;
    phase: string;
    workouts: PlanWorkout[];
    totalDistanceKm: string;
};

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatPace(secPerKm: number | undefined): string {
    if (!secPerKm || secPerKm <= 0) return '-';
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.round(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export function formatDuration(seconds: number | undefined): string {
    if (!seconds || seconds <= 0) return '-';
    return `${Math.round(seconds / 60)}min`;
}

export function groupWorkoutsByWeek(workouts: GeneratedWorkout[]): PlanWeek[] {
    const weeks: PlanWeek[] = [];
    let currentWeek: PlanWorkout[] = [];
    let currentWeekStart: Date | null = null;
    let weekNum = 0;

    const sorted = [...workouts].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const w of sorted) {
        const d = new Date(w.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());

        if (!currentWeekStart || weekStart.getTime() !== currentWeekStart.getTime()) {
            if (currentWeek.length > 0) {
                const totalDist = currentWeek.reduce((s, item) => s + parseFloat(item.distanceKm) || 0, 0);
                weeks.push({
                    weekNumber: weekNum,
                    phase: currentWeek[0]?.phase || 'BASE',
                    workouts: currentWeek,
                    totalDistanceKm: totalDist.toFixed(1),
                });
            }
            currentWeekStart = weekStart;
            weekNum++;
            currentWeek = [];
        }

        currentWeek.push({
            date: d.toISOString().split('T')[0],
            dayOfWeek: DAY_NAMES[d.getDay()],
            type: w.type,
            description: w.description,
            displayDescription: w.displayDescription || w.description,
            distanceKm: (w.totalDistance / 1000).toFixed(1),
            durationMin: formatDuration(w.targetDuration),
            pace: formatPace(w.targetPace),
            phase: w.phase || 'BASE',
            intensityZone: w.intensityZone || null,
        });
    }

    if (currentWeek.length > 0) {
        const totalDist = currentWeek.reduce((s, item) => s + parseFloat(item.distanceKm) || 0, 0);
        weeks.push({
            weekNumber: weekNum,
            phase: currentWeek[0]?.phase || 'BASE',
            workouts: currentWeek,
            totalDistanceKm: totalDist.toFixed(1),
        });
    }

    return weeks;
}

export function parseStrictRaceDate(raceDate: string): { date: Date } | { error: string } {
    const raceDateObj = new Date(raceDate);
    const ymdMatch = raceDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    const isRolloverDate =
        ymdMatch &&
        (raceDateObj.getUTCFullYear() !== Number(ymdMatch[1]) ||
            raceDateObj.getUTCMonth() + 1 !== Number(ymdMatch[2]) ||
            raceDateObj.getUTCDate() !== Number(ymdMatch[3]));
    if (isNaN(raceDateObj.getTime()) || isRolloverDate) {
        return { error: 'Invalid race date' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (raceDateObj <= today) {
        return { error: 'Race date must be in the future' };
    }

    const horizonDays = (raceDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (horizonDays > MAX_PLAN_HORIZON_DAYS) {
        return {
            error: `Race date is too far in the future. Plans are limited to ${MAX_PLAN_HORIZON_DAYS / 7} weeks.`,
        };
    }

    return { date: raceDateObj };
}
