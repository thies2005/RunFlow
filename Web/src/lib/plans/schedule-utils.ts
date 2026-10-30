import { WorkoutType } from '@/generated/prisma/browser';
import { startOfWeek, endOfWeek, addDays, isAfter, format, parseISO } from 'date-fns';
import type { GeneratedWorkout } from './index';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayDiff(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function sameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function dayOfWeek(date: Date): number {
    return date.getDay();
}

type FixOptions = {
    raceDate?: Date;
    restDays?: number[];
    protectedTypes?: WorkoutType[];
};

export function fixBackToBackSameType(
    workouts: GeneratedWorkout[],
    options: FixOptions = {},
): GeneratedWorkout[] {
    const protectedTypes = new Set(options.protectedTypes ?? [WorkoutType.RACE]);
    const restDays = new Set(options.restDays ?? []);
    const sorted = workouts
        .map((w) => ({ ...w, date: new Date(w.date) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    let i = 1;
    let iterations = 0;
    const maxIterations = workouts.length * 4;

    while (i < sorted.length && iterations < maxIterations) {
        iterations++;
        const prev = sorted[i - 1];
        const curr = sorted[i];

        if (dayDiff(prev.date, curr.date) !== 1 || prev.type !== curr.type) {
            i++;
            continue;
        }

        if (protectedTypes.has(curr.type) || (options.raceDate && curr.date >= options.raceDate)) {
            i++;
            continue;
        }

        let changed = false;

        const sameSundayWeek = (a: Date, b: Date): boolean => {
            const sunA = new Date(a);
            sunA.setDate(sunA.getDate() - sunA.getDay());
            sunA.setHours(0, 0, 0, 0);
            const sunB = new Date(b);
            sunB.setDate(sunB.getDate() - sunB.getDay());
            sunB.setHours(0, 0, 0, 0);
            return sunA.getTime() === sunB.getTime();
        };

        for (let offset = 2; offset <= 3 && !changed; offset++) {
            const candidate = sorted[i + offset];
            if (!candidate || protectedTypes.has(candidate.type)) continue;
            if (candidate.type === curr.type || candidate.type === prev.type) continue;
            if (candidate.phase && curr.phase && candidate.phase !== curr.phase) continue;

            const candidateDate = new Date(candidate.date);
            const currDate = new Date(curr.date);
            if (!sameSundayWeek(currDate, candidateDate)) continue;
            if (restDays.has(dayOfWeek(candidateDate)) || restDays.has(dayOfWeek(currDate))) continue;
            if (options.raceDate && candidateDate >= options.raceDate) continue;

            curr.date = candidateDate;
            candidate.date = currDate;
            changed = true;
        }

        if (!changed && restDays.size === 0) {
            const shifted = new Date(curr.date);
            shifted.setDate(shifted.getDate() + 1);

            const next = sorted[i + 1];
            const overlapsNext = next && (sameCalendarDay(shifted, next.date) || shifted > next.date);
            const crossesRace = options.raceDate && shifted >= options.raceDate;
            const crossesWeek = !sameSundayWeek(curr.date, shifted);

            if (!overlapsNext && !crossesRace && !crossesWeek) {
                curr.date = shifted;
                changed = true;
            }
        }

        if (!changed) {
            i++;
            continue;
        }

        sorted.sort((a, b) => a.date.getTime() - b.date.getTime());
        i = Math.max(1, i - 1);
    }

    if (iterations >= maxIterations) {
        console.warn(`[fixBackToBackSameType] Trip guard at ${iterations} iterations (workouts limit reached)`);
    }

    return sorted;
}

// ==========================================
// Smart Rescheduling (Task 1.5 / Decision U3)
// ==========================================

export const HARD_TYPES = new Set([
    'INTERVALS',
    'REPETITIONS',
    'TEMPO',
    'FARTLEK',
    'LONG_RUN',
    'RACE',
    'RIDE_INTERVALS',
    'LONG_RIDE',
]);

export function isHardWorkoutType(type?: string | null): boolean {
    if (!type) return false;
    const clean = type.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return HARD_TYPES.has(clean);
}

export function isEasyOrRecoveryType(type?: string | null): boolean {
    if (!type) return false;
    const clean = type.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return clean === 'EASY' || clean === 'RECOVERY' || clean === 'REST' || clean === 'CROSS_TRAIN';
}

export interface WorkoutScheduleItem {
    id?: string;
    workoutType?: string | null;
    type?: string | null;
    scheduledDate: string | Date;
    isCompleted?: boolean;
    customName?: string | null;
}

function normalizeScheduleDate(d: string | Date): Date {
    if (typeof d === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m - 1, day);
        }
        return parseISO(d);
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Finds a smart reschedule day for a workout within the current Monday-Sunday week.
 *
 * Rules:
 * - Candidate day must be in the future relative to `today` (`day > today`).
 * - Candidate day must be within the same Monday-Sunday calendar week as `today`.
 * - Maintains a >= 48h (at least 2 calendar days) buffer from other HARD_TYPES in the week if `workout` is a HARD_TYPE.
 * - Preference order:
 *   1. Open days (no workouts scheduled)
 *   2. Easy / Recovery days (suitable for swapping)
 * - Returns candidate date string ('YYYY-MM-DD') or null if no valid slot exists.
 */
export function findSmartRescheduleDay(
    workout: WorkoutScheduleItem,
    weekWorkouts: WorkoutScheduleItem[],
    today: string | Date
): string | null {
    const todayNorm = normalizeScheduleDate(today);
    // Week starts on Monday (weekStartsOn: 1)
    const weekSun = endOfWeek(todayNorm, { weekStartsOn: 1 });

    const workoutId = workout.id;
    const targetType = (workout.workoutType || workout.type || '').toUpperCase();
    const isTargetHard = isHardWorkoutType(targetType);

    // Map existing workouts by YYYY-MM-DD
    const workoutsByDay = new Map<string, WorkoutScheduleItem[]>();
    for (const w of weekWorkouts) {
        if (workoutId && w.id === workoutId) continue; // Exclude workout being rescheduled
        const dateKey = format(normalizeScheduleDate(w.scheduledDate), 'yyyy-MM-dd');
        if (!workoutsByDay.has(dateKey)) {
            workoutsByDay.set(dateKey, []);
        }
        workoutsByDay.get(dateKey)!.push(w);
    }

    // Identify days with other hard workouts
    const hardDays = new Set<string>();
    for (const [dayKey, list] of workoutsByDay.entries()) {
        if (list.some((item) => isHardWorkoutType(item.workoutType || item.type))) {
            hardDays.add(dayKey);
        }
    }

    // Collect candidate days from tomorrow through Sunday
    interface CandidateSlot {
        date: Date;
        dateKey: string;
        score: number; // 0 = open, 1 = easy/recovery, 2 = other non-hard
    }

    const candidates: CandidateSlot[] = [];

    let cursor = addDays(todayNorm, 1);
    while (!isAfter(cursor, weekSun)) {
        const dateKey = format(cursor, 'yyyy-MM-dd');

        // Check 48h buffer from other hard workouts if the moving workout is hard
        let bufferOk = true;
        if (isTargetHard) {
            for (const hDayStr of hardDays) {
                const hDate = parseISO(hDayStr);
                const dayDiff = Math.abs(Math.round((cursor.getTime() - hDate.getTime()) / 86400000));
                if (dayDiff < 2) {
                    bufferOk = false;
                    break;
                }
            }
        }

        if (bufferOk) {
            const dayWorkouts = workoutsByDay.get(dateKey) || [];
            if (dayWorkouts.length === 0) {
                // Tier 0: Open day
                candidates.push({ date: cursor, dateKey, score: 0 });
            } else if (dayWorkouts.every((w) => isEasyOrRecoveryType(w.workoutType || w.type))) {
                // Tier 1: Easy / recovery day
                candidates.push({ date: cursor, dateKey, score: 1 });
            }
        }

        cursor = addDays(cursor, 1);
    }

    if (candidates.length === 0) {
        return null;
    }

    // Sort by preference score asc (open first, then easy), then by date asc (earliest)
    candidates.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.date.getTime() - b.date.getTime();
    });

    return candidates[0].dateKey;
}

