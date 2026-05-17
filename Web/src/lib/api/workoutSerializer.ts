import { inferSport } from '@/lib/plans/descriptions';

const INTENSITY_NOTE_PREFIX = '[auto] intensity:';

export function extractIntensityZone(notes?: string | null): string | null {
    if (!notes) return null;
    if (!notes.startsWith(INTENSITY_NOTE_PREFIX)) return null;
    return notes.slice(INTENSITY_NOTE_PREFIX.length).trim() || null;
}

type WorkoutRow = { customName?: string | null; notes?: string | null; workoutType: string };

export function enrichWorkoutForResponse<T extends WorkoutRow>(workout: T) {
    return {
        ...workout,
        displayDesc: workout.customName ?? null,
        intensityZone: extractIntensityZone(workout.notes),
        sport: inferSport(workout.workoutType),
    };
}
