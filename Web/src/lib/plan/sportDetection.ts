/**
 * Sport detection & fallback TSS estimation for training plans and workouts.
 */

export interface GoalSportInput {
    name?: string | null;
    sport?: string | null;
    raceType?: string | null;
    runsPerWeek?: number | null;
    swimsPerWeek?: number | null;
    ridesPerWeek?: number | null;
}

export interface WorkoutSportInput {
    workoutType?: string | null;
    sport?: string | null;
    targetDuration?: number | null;
    plannedTss?: number | null;
    targetPowerWatts?: number | null;
}

const BIKE_WORKOUT_TYPES = new Set([
    'RIDE',
    'LONG_RIDE',
    'RIDE_INTERVALS',
    'BIKE_EASY',
    'BIKE_TEMPO',
    'BIKE_INTERVALS',
]);

const RUN_WORKOUT_TYPES = new Set([
    'EASY',
    'LONG_RUN',
    'TEMPO',
    'INTERVALS',
    'FARTLEK',
    'HILL_REPEATS',
    'RECOVERY',
    'RACE',
]);

/**
 * Detects whether a plan effectively represents a dedicated cycling plan, triathlon, or running plan.
 */
export function detectEffectivePlanSport(
    goal: GoalSportInput | null | undefined,
    workouts?: Array<{ workoutType?: string | null; sport?: string | null }>
): 'CYCLING' | 'TRIATHLON' | 'RUN' {
    if (/cycling|bike|mywhoosh|zwift|ftp|criterium|gran fondo|indoor ride/i.test(goal?.name || '')) {
        return 'CYCLING';
    }

    if (
        goal?.sport === 'TRIATHLON' &&
        (goal?.runsPerWeek ?? 0) === 0 &&
        (goal?.swimsPerWeek ?? 0) === 0 &&
        (goal?.ridesPerWeek ?? 0) > 0
    ) {
        return 'CYCLING';
    }

    if (workouts && workouts.length > 0) {
        const hasBike = workouts.some(
            (w) => w.sport === 'BIKE' || BIKE_WORKOUT_TYPES.has(w.workoutType || '')
        );
        const hasRun = workouts.some(
            (w) => w.sport === 'RUN' || RUN_WORKOUT_TYPES.has(w.workoutType || '')
        );
        const hasSwim = workouts.some(
            (w) => w.sport === 'SWIM' || (w.workoutType || '').includes('SWIM')
        );

        if (hasBike && !hasRun && !hasSwim) {
            return 'CYCLING';
        }
    }

    return goal?.sport === 'TRIATHLON' ? 'TRIATHLON' : 'RUN';
}

/**
 * Returns user-facing sport badge label and CSS class for a plan.
 */
export function getEffectiveSportLabel(
    goal: any,
    workouts?: any[]
): { label: string; badgeClass: string } {
    if (detectEffectivePlanSport(goal, workouts) === 'CYCLING') {
        const hasStrength =
            workouts?.some(
                (w) =>
                    w.sport === 'STRENGTH' ||
                    w.workoutType === 'STRENGTH' ||
                    w.workoutType === 'CORE'
            ) || /strength/i.test(goal?.name || '');
        return {
            label: hasStrength ? 'Cycling & Strength' : 'Cycling Plan',
            badgeClass: 'badge-bike',
        };
    }

    if (goal?.sport === 'TRIATHLON') {
        return {
            label: goal?.raceType ? goal.raceType.replace(/_/g, ' ') : 'Triathlon',
            badgeClass: 'badge-tri',
        };
    }

    return {
        label: goal?.raceType ? goal.raceType.replace(/_/g, ' ') : 'Running Plan',
        badgeClass: 'badge-run',
    };
}

/**
 * Computes an estimated fallback Training Stress Score (TSS) for a workout
 * when plannedTss is missing or 0.
 */
export function estimateFallbackWorkoutTss(w: {
    workoutType?: string | null;
    targetDuration?: number | null;
    plannedTss?: number | null;
    targetPowerWatts?: number | null;
}): number {
    if (w.plannedTss != null && w.plannedTss > 0) {
        return Math.round(w.plannedTss);
    }
    if (!w.targetDuration || w.targetDuration <= 0 || w.workoutType === 'REST') {
        return 0;
    }
    const hours = w.targetDuration / 3600;
    const type = w.workoutType || '';
    let rate = 50; // default (EASY / RIDE / SWIM)
    if (type === 'INTERVALS' || type === 'RIDE_INTERVALS') {
        rate = 75;
    } else if (type === 'TEMPO') {
        rate = 65;
    } else if (type === 'LONG_RUN' || type === 'LONG_RIDE') {
        rate = 55;
    } else if (type === 'STRENGTH') {
        rate = 40;
    }
    return Math.round(hours * rate);
}
