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
import {
    parseStructuredWorkout,
    resolveWorkoutSport,
    type StepNode,
    type StructuredStep,
} from '@/lib/plans/structured';

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
    /** Bike target power (whole-workout) in watts. */
    targetPowerWatts?: number | null;
    /** Bike target power as % of FTP. */
    targetFtpPercent?: number | null;
    /** Athlete bike FTP in watts — grounds power-based planned TSS. */
    ftpWatts?: number | null;
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
 * Sum the durations (seconds) of a LEGACY flat structured workout array, if
 * present and trivially parseable. Returns null when steps are missing or
 * unparseable. Kept as a fallback for stored v1 arrays that
 * `parseStructuredWorkout` cannot upgrade (bare `{ durationSeconds }` rows).
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

// ---------------------------------------------------------------------------
// Canonical v2 tree walking (task A2, step 3)
// ---------------------------------------------------------------------------

/** Result of walking a v2 step tree. */
interface V2TreeTotals {
    /** Seconds from non-power steps (or power steps without a usable FTP). */
    plainSeconds: number;
    /** TSS already computed with the true power formula for power-targeted steps. */
    powerTss: number;
    /** True when at least one step contributed a power-formula TSS. */
    usedPower: boolean;
}

const WARMUP_COOLDOWN_PACE_FACTOR = 1.15;

/** Watts implied by a power target, grounded on the athlete's FTP. */
function wattsFromPowerTarget(
    target: Extract<StructuredStep['target'], { type: 'power' }>,
    ftpWatts: number,
): number | null {
    if (ftpWatts <= 0) return null;
    if (target.ftpPercent !== undefined && target.ftpPercent > 0) {
        return (target.ftpPercent / 100) * ftpWatts;
    }
    const watts = target.minWatts !== undefined && target.maxWatts !== undefined
        ? (target.minWatts + target.maxWatts) / 2
        : target.maxWatts ?? target.minWatts;
    return watts && watts > 0 ? watts : null;
}

/** True power-based planned TSS for one step (task A2 formula). */
function powerStepTss(durationSeconds: number, watts: number, ftpWatts: number): number {
    if (durationSeconds <= 0 || watts <= 0 || ftpWatts <= 0) return 0;
    return (durationSeconds * watts * (watts / ftpWatts)) / (ftpWatts * 3600) * 100;
}

/**
 * Seconds for one distance-based v2 step. Uses the step's own pace target
 * (unit-aware) and falls back to `workout.targetPace` — slowed by 15% for
 * warmup / cooldown / recovery steps, which are walked rather than raced.
 * Returns null when neither is available (the caller then abandons the whole
 * tree and falls back to `workout.targetDuration`).
 */
function distanceStepSeconds(
    step: StructuredStep,
    workout: WorkoutForPlannedTss,
    isSwim: boolean,
): number | null {
    if (step.duration.type !== 'distance') return null;
    const meters = step.duration.meters;

    const target = step.target;
    if (target && target.type === 'pace') {
        const pace = target.max ?? target.min;
        if (pace && pace > 0) {
            const perUnitMeters = target.unit === 'sec_per_100m' ? 100 : 1000;
            return (meters / perUnitMeters) * pace;
        }
    }

    const fallbackPace = workout.targetPace ?? null;
    if (fallbackPace && fallbackPace > 0) {
        const pace = fallbackPace * (step.kind === 'warmup' || step.kind === 'cooldown' || step.kind === 'recovery'
            ? WARMUP_COOLDOWN_PACE_FACTOR
            : 1);
        const perUnitMeters = isSwim ? 100 : 1000;
        return (meters / perUnitMeters) * pace;
    }
    return null;
}

/**
 * Recursively sum a validated v2 step tree into `{ plainSeconds, powerTss }`.
 * Repeat groups contribute `times * childSeconds + (times - 1) * setRest`.
 * `lap_press` steps (and distance steps without any convertible pace) make the
 * whole tree unusable → null, so the caller falls back to `targetDuration`.
 */
function sumV2TreeSeconds(
    nodes: StepNode[],
    workout: WorkoutForPlannedTss,
    isSwim: boolean,
    ftpWatts: number,
    depth = 0,
): V2TreeTotals | null {
    // parseStructuredWorkout bounds nesting at MAX_REPEAT_DEPTH; the depth
    // check is defensive for hand-built trees.
    if (depth > 3) return null;

    let plainSeconds = 0;
    let powerTss = 0;
    let usedPower = false;

    for (const node of nodes) {
        if (node.kind === 'repeat') {
            const childTotals = sumV2TreeSeconds(node.steps, workout, isSwim, ftpWatts, depth + 1);
            if (!childTotals) return null;
            plainSeconds += childTotals.plainSeconds * node.times;
            powerTss += childTotals.powerTss * node.times;
            usedPower = usedPower || childTotals.usedPower;
            if (node.setRest) {
                if (node.setRest.type === 'time') {
                    plainSeconds += node.setRest.seconds * (node.times - 1);
                } else {
                    // Distance- or lap-press rest cannot be resolved to seconds.
                    return null;
                }
            }
            continue;
        }

        const step = node as StructuredStep;
        let seconds: number | null;
        switch (step.duration.type) {
            case 'time':
                seconds = step.duration.seconds;
                break;
            case 'distance':
                seconds = distanceStepSeconds(step, workout, isSwim);
                break;
            case 'lap_press':
            default:
                return null;
        }
        if (seconds === null || seconds <= 0) return null;

        const target = step.target;
        if (target && target.type === 'power' && ftpWatts > 0) {
            const watts = wattsFromPowerTarget(target, ftpWatts);
            if (watts != null) {
                powerTss += powerStepTss(seconds, watts, ftpWatts);
                usedPower = true;
                continue;
            }
        }
        plainSeconds += seconds;
    }

    return { plainSeconds, powerTss, usedPower };
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
 * - If a canonical v2 (or upgradable legacy) `structuredSteps` tree parses:
 *   durations are summed recursively across `StructuredStep`s and
 *   `RepeatGroup`s (`times * steps + (times - 1) * setRest`), distance steps
 *   convert via their pace target (fallback `targetPace`, ×1.15 for
 *   warmup/cooldown/recovery, unit-aware for `sec_per_100m` swims), and steps
 *   with power targets compute TRUE power-based TSS
 *   `(seconds * watts * (watts / ftp)) / (ftp * 3600) * 100` when `ftpWatts`
 *   is known. `lap_press` steps (or unconvertible distance steps) make the
 *   tree unusable and the estimate falls back to `targetDuration`.
 * - Otherwise the workout-level duration is used: `targetDuration`, then a
 *   legacy flat-array step sum.
 * - Bike workouts with `targetPowerWatts` / `targetFtpPercent` and `ftpWatts`
 *   use the same power formula over the whole duration.
 * - Remaining cases: durationHours × IF² × 100 with the type-derived IF.
 */
export function calculateWorkoutPlannedTss(workout: WorkoutForPlannedTss): number | null {
    // Persisted estimate wins when present.
    if (typeof workout.plannedTss === 'number' && workout.plannedTss > 0) {
        return round1(workout.plannedTss);
    }

    const ftpWatts = typeof workout.ftpWatts === 'number' && workout.ftpWatts > 0 ? workout.ftpWatts : 0;
    const isSwim = resolveWorkoutSportSafe(workout) === 'SWIM';

    // Preferred path: canonical v2 (or upgradable legacy) structured tree.
    const parsed = parseStructuredWorkout(workout.structuredSteps, workout.workoutType, 45, ftpWatts || 200);
    if (parsed && parsed.steps.length > 0) {
        const totals = sumV2TreeSeconds(parsed.steps, workout, isSwim, ftpWatts);
        if (totals) {
            const totalSeconds = totals.plainSeconds;
            if (totalSeconds <= 0 && !totals.usedPower) {
                return null;
            }
            const intensityFactor = deriveIntensityFactor(workout);
            const plainTss = (totalSeconds / 3600) * Math.pow(intensityFactor, 2) * 100;
            const tss = plainTss + totals.powerTss;
            return tss > 0 ? round1(tss) : null;
        }
        // Tree unusable (lap_press / unconvertible) → fall through to duration.
    }

    // Determine duration in seconds, preferring legacy structured steps when available.
    let durationSeconds = workout.targetDuration ?? null;
    const stepSeconds = sumStructuredStepSeconds(workout.structuredSteps);
    if (stepSeconds !== null && stepSeconds > 0) {
        durationSeconds = stepSeconds;
    }

    if (durationSeconds === null || durationSeconds <= 0) {
        return null;
    }

    // Bike power-based planned TSS from the first-class target columns.
    if (resolveWorkoutSportSafe(workout) === 'BIKE' && ftpWatts > 0) {
        const watts = workout.targetPowerWatts != null && workout.targetPowerWatts > 0
            ? workout.targetPowerWatts
            : (workout.targetFtpPercent != null && workout.targetFtpPercent > 0
                ? (workout.targetFtpPercent / 100) * ftpWatts
                : null);
        if (watts != null && watts > 0) {
            return round1(powerStepTss(durationSeconds, watts, ftpWatts));
        }
    }

    const intensityFactor = deriveIntensityFactor(workout);
    const durationHours = durationSeconds / 3600;
    const tss = durationHours * Math.pow(intensityFactor, 2) * 100;

    return round1(tss);
}

/** Sport resolution that never throws and never imports Prisma enums. */
function resolveWorkoutSportSafe(workout: Pick<WorkoutForPlannedTss, 'workoutType' | 'sport'>): 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH' {
    return resolveWorkoutSport(workout.workoutType as string | null, workout.sport ?? null);
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
