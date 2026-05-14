import { WorkoutType } from '@/generated/prisma/browser';
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
    while (i < sorted.length) {
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

        for (let offset = 2; offset <= 3 && !changed; offset++) {
            const candidate = sorted[i + offset];
            if (!candidate || protectedTypes.has(candidate.type)) continue;
            if (candidate.type === curr.type || candidate.type === prev.type) continue;

            const candidateDate = new Date(candidate.date);
            const currDate = new Date(curr.date);
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

            if (!overlapsNext && !crossesRace) {
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

    return sorted;
}
