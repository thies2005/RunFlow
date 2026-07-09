/**
 * Planned-TSS / Planned-vs-Actual PMC (audit item G3)
 *
 * The engine already computes ACTUAL CTL/ATL/TSB from completed activities
 * (see fitness.ts). This module adds PLANNED TSS so that future (not-yet-
 * completed) workouts contribute to a projected fitness curve, mirroring
 * TrainingPeaks' Planned-vs-Actual PMC.
 *
 * The module is pure: it takes data as arguments (no DB / Prisma imports) so
 * it is fully unit-testable.
 */

import { WorkoutType } from '@/generated/prisma/client';
import { calculateDecayFactor } from './fitness';

/**
 * Structural type describing the fields read from a Workout when estimating
 * planned TSS. It is intentionally a subset of the Prisma `Workout` model so
 * that callers can pass full Workout rows (or `WorkoutGetPayload` results)
 * directly, while keeping this module free of Prisma coupling.
 */
export interface WorkoutForPlannedTss {
    workoutType: WorkoutType;
    sport?: string | null;
    targetDistance?: number | null;
    targetDuration?: number | null;
    targetPace?: number | null;
    targetPaceMinSecondsPerKm?: number | null;
    targetPaceMaxSecondsPerKm?: number | null;
    structuredSteps?: unknown;
    isCompleted?: boolean;
    scheduledDate?: Date;
    plannedTss?: number | null;
}

/**
 * Intensity Factor (IF) by workout type.
 *
 * IF approximates the fraction of threshold/HR/lactate effort the workout is
 * performed at. rTSS = duration_hours * IF^2 * 100 (same formula as
 * `calculateRunningTss` in fitness.ts).
 *
 * Values are the same conventions TrainingPeaks uses for estimated TSS by
 * workout type; they are approximations meant to project a fitness curve, not
 * to replace measured TSS from completed activities.
 *
 * NOTE: THRESHOLD is not a `WorkoutType` enum member (threshold efforts are
 * expressed via INTERVALS / RIDE_INTERVALS / TEMPO). The spec's threshold
 * intensity (~0.92) is mapped onto those higher-intensity interval types.
 */
const INTENSITY_FACTOR_BY_TYPE: Record<WorkoutType, number> = {
    EASY: 0.75,
    RECOVERY: 0.75,
    LONG_RUN: 0.7, // "LONG" intent
    TEMPO: 0.85,
    INTERVALS: 0.95, // "INTERVAL" intent (incl. threshold intervals)
    FARTLEK: 0.95,
    REPETITIONS: 1.0, // "REPETITION"
    RACE: 1.0,
    REST: 0,
    CROSS_TRAIN: 0.8,
    RIDE: 0.75,
    LONG_RIDE: 0.7,
    RIDE_INTERVALS: 0.92, // threshold cycling
    SWIM: 0.8,
    OPEN_WATER_SWIM: 0.8,
    SWIM_DRILL: 0.7,
    STRENGTH: 0.6,
    BRICK: 0.85,
    TRANSITION_PRACTICE: 0.7,
    DOUBLE_DAY: 0.8,
    OTHER: 0.8,
};

const FALLBACK_INTENSITY_FACTOR = 0.8;

/**
 * Derive an Intensity Factor from a workout's type / sport.
 * Falls back to {@link FALLBACK_INTENSITY_FACTOR} (0.8) when no specific match.
 */
function deriveIntensityFactor(workout: Pick<WorkoutForPlannedTss, 'workoutType' | 'sport'>): number {
    const ifByType = INTENSITY_FACTOR_BY_TYPE[workout.workoutType];
    if (ifByType !== undefined) {
        return ifByType;
    }

    // Fallback based on sport label for cross-training scenarios not covered above.
    const sport = (workout.sport || '').toUpperCase();
    if (sport === 'RIDE' || sport === 'BIKE' || sport === 'CYCLING') return 0.75;
    if (sport === 'SWIM') return 0.8;
    if (sport === 'STRENGTH') return 0.6;
    if (sport === 'BRICK') return 0.85;

    return FALLBACK_INTENSITY_FACTOR;
}

interface StructuredStepWithDuration {
    duration?: number;
    durationValue?: number;
    durationSeconds?: number;
    length?: number;
    time?: number;
}

/**
 * Sum the durations (seconds) of a structured workout, if present and parseable.
 * Returns null when steps are missing or unparseable.
 *
 * NOTE: v1 uses `targetDuration` directly and only sums structured steps when
 * they are present and trivially parseable. This keeps the estimate robust.
 */
function sumStructuredStepSeconds(steps: unknown): number | null {
    if (!Array.isArray(steps) || steps.length === 0) return null;

    let total = 0;
    let foundAny = false;
    for (const raw of steps) {
        if (!raw || typeof raw !== 'object') continue;
        const step = raw as StructuredStepWithDuration;
        // Accept a few common key shapes (duration / durationSeconds / time / length).
        const seconds =
            typeof step.durationSeconds === 'number' ? step.durationSeconds
            : typeof step.duration === 'number' ? step.duration
            : typeof step.durationValue === 'number' ? step.durationValue
            : typeof step.time === 'number' ? step.time
            : typeof step.length === 'number' ? step.length
            : null;

        if (seconds !== null && seconds > 0) {
            total += seconds;
            foundAny = true;
        }
    }

    return foundAny ? total : null;
}

/**
 * Round to one decimal place (matches the convention in fitness.ts).
 */
function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Estimate the TSS of a PLANNED (not-yet-completed) workout from its target
 * fields.
 *
 * - If `workout.plannedTss` is already persisted (set at generation time),
 *   return it directly.
 * - If `targetDuration` (seconds) is missing -> return null (cannot estimate).
 * - Derive an Intensity Factor from workout type (see {@link deriveIntensityFactor}).
 * - durationHours = targetDuration / 3600.
 * - rTSS = durationHours * IF^2 * 100.
 *
 * If `structuredSteps` is present and trivially parseable, its summed step
 * durations are used instead of `targetDuration` for a more accurate duration
 * (v1 best-effort; falls back to `targetDuration`).
 */
export function calculateWorkoutPlannedTss(workout: WorkoutForPlannedTss): number | null {
    // Persisted estimate wins when present.
    if (typeof workout.plannedTss === 'number' && workout.plannedTss > 0) {
        return round1(workout.plannedTss);
    }

    // Determine duration in seconds, preferring structured steps when available.
    let durationSeconds = workout.targetDuration ?? null;
    const stepSeconds = sumStructuredStepSeconds(workout.structuredSteps);
    if (stepSeconds !== null && stepSeconds > 0) {
        durationSeconds = stepSeconds;
    }

    if (durationSeconds === null || durationSeconds <= 0) {
        return null;
    }

    const intensityFactor = deriveIntensityFactor(workout);
    const durationHours = durationSeconds / 3600;
    const tss = durationHours * Math.pow(intensityFactor, 2) * 100;

    return round1(tss);
}

/**
 * One day's planned-vs-actual load. `actualTss` comes from completed workouts /
 * activities (DailyFitness), `plannedTss` from {@link calculateWorkoutPlannedTss}.
 */
export interface PlannedDailyLoad {
    date: Date;
    plannedTss: number;
    actualTss: number;
}

export interface ProjectedFitnessPoint {
    date: Date;
    plannedCtl: number;
    plannedAtl: number;
    plannedTsb: number;
    actualTss: number;
    plannedTss: number;
}

/**
 * Run the same Banister impulse-response decay as `calculateFitnessHistory`
 * (fitness.ts) but over the planned loads, producing a combined Planned-vs-
 * Actual curve. For each day we feed the model `actualTss` when present (a
 * completed workout / measured day) and otherwise `plannedTss` (a future day).
 *
 * Decay formula (matches fitness.ts):
 *   ctl = ctl * ctlDecay + load * (1 - ctlDecay)
 *   atl = atl * atlDecay + load * (1 - atlDecay)
 *   tsb = ctl - atl
 * Defaults: ctlDays = 42, atlDays = 7.
 */
export function calculateProjectedFitness(
    plannedLoads: PlannedDailyLoad[],
    opts?: { ctlDays?: number; atlDays?: number; initialCtl?: number; initialAtl?: number }
): ProjectedFitnessPoint[] {
    if (plannedLoads.length === 0) return [];

    const ctlDays = opts?.ctlDays ?? 42;
    const atlDays = opts?.atlDays ?? 7;
    let ctl = opts?.initialCtl ?? 0;
    let atl = opts?.initialAtl ?? 0;

    const ctlDecay = calculateDecayFactor(ctlDays);
    const atlDecay = calculateDecayFactor(atlDays);

    // Index by dateKey (YYYY-MM-DD) for stable lookups.
    const loadMap = new Map<string, PlannedDailyLoad>();
    for (const l of plannedLoads) {
        loadMap.set(dateKey(l.date), l);
    }

    const timestamps = plannedLoads.map(l => new Date(l.date).getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    const points: ProjectedFitnessPoint[] = [];

    // Iterate from the earliest to the latest planned day (inclusive, contiguous).
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        const key = dateKey(d);
        const day = loadMap.get(key);
        const actualTss = day?.actualTss ?? 0;
        const plannedTss = day?.plannedTss ?? 0;

        // Actual takes precedence over planned for completed days.
        const load = actualTss > 0 ? actualTss : plannedTss;

        ctl = ctl * ctlDecay + load * (1 - ctlDecay);
        atl = atl * atlDecay + load * (1 - atlDecay);
        const tsb = ctl - atl;

        points.push({
            date: new Date(d),
            plannedCtl: round1(ctl),
            plannedAtl: round1(atl),
            plannedTsb: round1(tsb),
            actualTss: round1(actualTss),
            plannedTss: round1(plannedTss),
        });
    }

    return points;
}

/**
 * Given all workouts for a goal, return a Map of dateKey (YYYY-MM-DD) -> total
 * planned TSS for that day. Completed workouts are skipped: they already have
 * actual TSS recorded elsewhere (via DailyFitness), so we don't want to double
 * count them in the projection.
 */
export function calculatePlanPlannedTss(workouts: WorkoutForPlannedTss[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const w of workouts) {
        if (w.isCompleted) continue;
        if (!w.scheduledDate) continue;

        const tss = calculateWorkoutPlannedTss(w);
        if (tss === null || tss <= 0) continue;

        const key = dateKey(w.scheduledDate);
        map.set(key, round1((map.get(key) ?? 0) + tss));
    }
    return map;
}

/**
 * Format a Date into a `YYYY-MM-DD` key using UTC to avoid off-by-one from
 * local timezone shifts. Mirrors the `toISOString().split('T')[0]` convention
 * used in fitness.ts.
 */
function dateKey(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
}
