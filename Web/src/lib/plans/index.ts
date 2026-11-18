import { WorkoutType, RaceType, PlanSport, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
import { getZoneTarget, resolveHrZones } from '../metrics/hr-zones';
import { calculateWorkoutPlannedTss } from '../metrics/plannedTss';
import { generateUltraPlan } from './generators/run-ultra';
import { generateTriathlonPlan } from './generators/triathlon';
import { generateNoRacePlan } from './generators/no-race';
import {
    generateStandardPlan,
    formatPace,
    getPhase,
    getRaceWeekRunVolumeCap,
    generateRaceWeek,
    generateWeek,
    scaleQualitySessionDistance,
} from './generators/run-standard';
import { estimateBikeFtpFromVdot, calculateBikeZones } from './bike-zones';
import {
    buildStructuredStepsForWorkout,
    getPaceTarget,
    type StructuredWorkoutV2,
    type StructuredStepsContext,
    type StructuredStepsWorkout,
} from './structured';
export {
    buildStructuredStepsForWorkout,
    type StructuredStepsContext,
    type StructuredStepsWorkout,
    generateStandardPlan,
    getPhase,
    getRaceWeekRunVolumeCap,
    generateRaceWeek,
    generateWeek,
    scaleQualitySessionDistance,
};

export const ULTRA_RACE_TYPES: RaceType[] = [
    'FIFTY_K', 'FIFTY_MILE', 'HUNDRED_K', 'HUNDRED_MILE',
    'TWELVE_HOUR', 'TWENTY_FOUR_HOUR', 'BACKYARD_ULTRA',
];

export const TRIATHLON_RACE_TYPES: RaceType[] = [
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
];

export const PLAN_CONSTANTS = {
    MIN_PEAK_VOLUME: {
        FIVE_K: 20000,
        TEN_K: 30000,
        HALF_MARATHON: 40000,
        MARATHON: 50000,
    } as Partial<Record<RaceType, number>>,
    MAX_LONG_RUN_DIST: {
        FIVE_K: 18000,
        TEN_K: 22000,
        HALF_MARATHON: 24000,
        MARATHON: 32000,
    } as Partial<Record<RaceType, number>>,
    DYNAMIC_LONG_RUN_RATIO: 0.55,
    MIN_LONG_RUN: 6000,
    MIN_VOLUME_START: 15000,
    MIN_START_VOLUME: {
        FIVE_K: 8000,
        TEN_K: 10000,
        HALF_MARATHON: 12000,
        MARATHON: 15000,
        FIFTY_K: 20000,
        FIFTY_MILE: 25000,
        HUNDRED_K: 25000,
        HUNDRED_MILE: 30000,
        TWELVE_HOUR: 20000,
        TWENTY_FOUR_HOUR: 25000,
        BACKYARD_ULTRA: 20000,
        SPRINT_TRI: 10000,
        OLYMPIC_TRI: 10000,
        HALF_IRONMAN: 12000,
        FULL_IRONMAN: 15000,
        CUSTOM_TRI: 10000,
        CUSTOM_DISTANCE: 10000,
    } as Partial<Record<RaceType, number>>,
    EASY_RUN_MIN: 4000,
    EASY_RUN_MAX: 12000,
    LONG_RUN_RATIO: 0.50,
    LONG_RUN_RATIO_LOW_VOLUME: 0.65,
    LOW_VOLUME_THRESHOLD: 64000,
    START_VOLUME_RATIO: 0.60,
    WEEKLY_GROWTH_CAP: 1.10,
    RECOVERY_WEEK_FACTOR: 0.80,
    STEP_LOADING_CYCLE: 4,
    MIN_GAP_DAYS: 2,
    MAX_TIME_ON_FEET_SECONDS: 12600,
    // Defensive upper bound on plan length (~2 years). Training plans never
    // legitimately exceed this; the clamp keeps a far-future raceDate from
    // driving an unbounded generation loop, whatever the caller passes.
    MAX_TOTAL_WEEKS: 104,
};

export const TAPER_FRACTIONS: Partial<Record<RaceType, number[]>> = {
    FIVE_K: [0.75],
    TEN_K: [0.80, 0.60],
    HALF_MARATHON: [0.75, 0.55],
    MARATHON: [0.80, 0.65, 0.45],
};

export function getMinStartVolume(raceType: RaceType | null): number {
    if (raceType && PLAN_CONSTANTS.MIN_START_VOLUME[raceType]) {
        return PLAN_CONSTANTS.MIN_START_VOLUME[raceType]!;
    }
    return PLAN_CONSTANTS.MIN_VOLUME_START;
}

export function classifyCustomRunDistance(customDistanceM: number): RaceType {
    if (customDistanceM <= 6000) return 'FIVE_K';
    if (customDistanceM <= 15000) return 'TEN_K';
    if (customDistanceM <= 30000) return 'HALF_MARATHON';
    if (customDistanceM <= 45000) return 'MARATHON';
    if (customDistanceM <= 65000) return 'FIFTY_K';
    if (customDistanceM <= 90000) return 'FIFTY_MILE';
    if (customDistanceM <= 125000) return 'HUNDRED_K';
    return 'HUNDRED_MILE';
}

/**
 * Default taper length for a standard (non-ultra, non-tri) run plan, derived
 * from {@link TAPER_FRACTIONS}. Mirrors the value the standard generator passes
 * to {@link resolvePhaseBudget}, so callers that need to reproduce the generator's
 * phase budget (e.g. the regenerate route) get identical phase boundaries.
 */
export function getDefaultRunTaperWeeks(raceType: RaceType | null, customDistanceM?: number | null): number {
    if (raceType === 'CUSTOM_DISTANCE' && customDistanceM && customDistanceM > 0) {
        return TAPER_FRACTIONS[classifyCustomRunDistance(customDistanceM)]?.length || 2;
    }
    if (raceType) {
        return TAPER_FRACTIONS[raceType]?.length || 2;
    }
    return 2;
}

export interface PhaseBudget {
    taperWeeks: number;
    peakWeeks: number;
    buildWeeks: number;
    baseWeeks: number;
    enduranceWeeks?: number;
    mentalPrepWeeks?: number;
}

/**
 * Minimal subset of {@link PlanConfig} that {@link resolvePhaseBudget} reads.
 * Accepting this narrower type lets callers that only need to reproduce the
 * generator's phase boundaries (e.g. the regenerate route, which re-tags
 * existing workouts without re-running the full generator) build a small
 * config object instead of the full {@link PlanConfig}. A full {@link PlanConfig}
 * still satisfies this type, so existing callers are unaffected.
 */
export type PhaseBudgetConfig = Pick<PlanConfig, 'taperWeeks' | 'peakWeeks' | 'buildWeeks'>;

export function resolvePhaseBudget(
    totalWeeks: number,
    config: PhaseBudgetConfig,
    options: {
        isTriathlon?: boolean;
        isUltra?: boolean;
        isBackyardUltra?: boolean;
        defaultTaper?: number;
    } = {}
): PhaseBudget {
    const { isTriathlon, isUltra, isBackyardUltra, defaultTaper } = options;
    const resolvedTotal = Math.max(1, totalWeeks);
    const availableWeeks = Math.max(0, resolvedTotal - 1);

    const maxTaperAllowed = resolvedTotal >= 8
        ? Math.min(4, Math.max(1, Math.floor(availableWeeks * 0.25)))
        : availableWeeks;
    let taper = config.taperWeeks !== undefined && config.taperWeeks !== null
        ? config.taperWeeks
        : (defaultTaper ?? 2);
    taper = Math.max(0, Math.min(taper, maxTaperAllowed));

    let remaining = availableWeeks - taper;

    if (isUltra) {
        const hasExplicitUltraBuildOrPeak = config.peakWeeks !== undefined || config.buildWeeks !== undefined;
        if (hasExplicitUltraBuildOrPeak) {
            let peak = config.peakWeeks !== undefined && config.peakWeeks !== null
                ? config.peakWeeks
                : 2;
            peak = Math.max(0, Math.min(peak, remaining));
            remaining -= peak;

            let build = config.buildWeeks !== undefined && config.buildWeeks !== null
                ? config.buildWeeks
                : Math.max(2, Math.min(6, Math.floor(availableWeeks * 0.35)));
            build = Math.max(0, Math.min(build, remaining));
            remaining -= build;

            let endurance = Math.max(0, Math.min(Math.max(3, Math.min(6, Math.floor(availableWeeks * 0.25))), remaining));
            remaining -= endurance;

            let mentalPrep = 0;
            if (isBackyardUltra && remaining > 0) {
                mentalPrep = Math.min(4, remaining);
                remaining -= mentalPrep;
            }

            const base = Math.max(0, remaining);

            return {
                taperWeeks: taper,
                peakWeeks: peak,
                buildWeeks: build,
                enduranceWeeks: endurance,
                mentalPrepWeeks: mentalPrep,
                baseWeeks: base,
            };
        }

        let peak = 2;
        peak = Math.max(0, Math.min(peak, remaining));
        remaining -= peak;

        let endurance = Math.max(3, Math.min(6, Math.floor(availableWeeks * 0.25)));
        endurance = Math.max(0, Math.min(endurance, remaining));
        remaining -= endurance;

        let build = Math.max(2, Math.min(6, Math.floor(availableWeeks * 0.35)));
        build = Math.max(0, Math.min(build, remaining));
        remaining -= build;

        let mentalPrep = 0;
        if (isBackyardUltra && remaining > 0) {
            mentalPrep = Math.min(4, remaining);
            remaining -= mentalPrep;
        }

        const base = Math.max(0, remaining);

        return {
            taperWeeks: taper,
            peakWeeks: peak,
            buildWeeks: build,
            enduranceWeeks: endurance,
            mentalPrepWeeks: mentalPrep,
            baseWeeks: base,
        };
    } else {
        const explicitZeroBuildAndPeak = config.peakWeeks === 0 && config.buildWeeks === 0;
        const reserveBaseWeeks = explicitZeroBuildAndPeak
            ? 0
            : (resolvedTotal >= 10 ? 4 : resolvedTotal >= 8 ? 3 : resolvedTotal >= 6 ? 2 : 0);
        const phaseBudget = Math.max(0, remaining - reserveBaseWeeks);

        let peak = config.peakWeeks !== undefined && config.peakWeeks !== null
            ? config.peakWeeks
            : (isTriathlon ? 2 : 2);
        const maxPeak = Math.max(1, Math.floor(availableWeeks / 3));
        peak = Math.max(0, Math.min(peak, maxPeak));
        peak = Math.min(peak, reserveBaseWeeks > 0 ? phaseBudget : remaining);
        remaining -= peak;

        let build = config.buildWeeks !== undefined && config.buildWeeks !== null
            ? config.buildWeeks
            : (isTriathlon ? 4 : 4);
        const buildBudget = reserveBaseWeeks > 0 ? Math.max(0, phaseBudget - peak) : remaining;
        build = Math.max(0, Math.min(build, buildBudget));
        remaining -= build;

        const base = Math.max(0, remaining);

        return {
            taperWeeks: taper,
            peakWeeks: peak,
            buildWeeks: build,
            baseWeeks: base,
        };
    }
}

export type PlanConfig = {
    vdot: number;
    targetVdot?: number | null;
    targetTime?: number | null;
    raceType: RaceType | null;
    raceDate: Date;
    startDate?: Date;
    sport?: PlanSport;
    runsPerWeek?: number;
    ridesPerWeek?: number;
    strengthPerWeek?: number;
    swimsPerWeek?: number;
    weeklyMileageGoal?: number | null;
    startWeeklyMileage?: number | null;
    taperWeeks?: number;
    peakWeeks?: number;
    buildWeeks?: number;
    maxLongRunKm?: number;
    longRunDay?: number;
    workoutDay?: number;
    swimDay?: number;
    restDays?: number[];
    weeksTotal?: number;
    thresholdHeartRate?: number | null;
    hrZoneMethod?: string | null;
    hrZone1Max?: number | null;
    hrZone2Max?: number | null;
    hrZone3Max?: number | null;
    hrZone4Max?: number | null;
    hrZone5Max?: number | null;
    hrZone6Max?: number | null;
    hrMax?: number | null;
    hrRest?: number | null;
    customDistanceM?: number | null;
    customSwimDistM?: number;
    customBikeDistM?: number;
    customRunDistM?: number;
    /** Athlete weight in kg (used for weight-aware bike FTP estimation). */
    weightKg?: number | null;
    /** Athlete bike FTP in watts (falls back to `estimateBikeFtpFromVdot(vdot)`). */
    ftpWatts?: number | null;
    /** Athlete swim CSS in seconds per 100m (falls back to `estimateSwimPaceFromVdot(vdot)`). */
    swimCssSecPer100m?: number | null;
    /** When true, match generated cycling workouts to official MyWhoosh workouts and populate their structured steps. */
    matchToMyWhoosh?: boolean;
    /** Optional ID of a specific MyWhoosh Training Plan from mywhoosh_plans.json. */
    mywhooshPlanId?: string | null;
};

export type GeneratedWorkout = {
    date: Date;
    type: WorkoutType;
    description: string;
    totalDistance: number;
    targetPace?: number;
    targetDuration?: number;
    phase?: PlanPhase;
    targetHrZone?: number;
    displayDescription?: string;
    sport?: string;
    intensityZone?: string | null;
    /** Canonical v2 structured step tree (task A1 schema). */
    structuredSteps?: StructuredWorkoutV2 | null;
    targetHrZoneLabel?: string | null;
    targetHrMinBpm?: number | null;
    targetHrMaxBpm?: number | null;
    targetPaceZoneLabel?: string | null;
    targetPaceMinSecondsPerKm?: number | null;
    targetPaceMaxSecondsPerKm?: number | null;
    targetPowerWatts?: number | null;
    targetPowerMinWatts?: number | null;
    targetPowerMaxWatts?: number | null;
    targetPowerZone?: number | null;
    targetFtpPercent?: number | null;
    targetCadenceRpm?: number | null;
    targetRpe?: number | null;
    plannedTss?: number | null;
};

export type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

export function resolvePhaseVdot(currentVdot: number, targetVdot: number | undefined | null, phase: Phase): number {
    if (!targetVdot || targetVdot <= currentVdot) return currentVdot;
    const gap = targetVdot - currentVdot;
    const maxVdot = Math.round((currentVdot * 1.05) * 10) / 10;
    // Taper physiologically HOLDS peak fitness rather than progressing it, so
    // it should use exactly the VDOT PEAK would produce (no further gap
    // closure). Reuse the PEAK computation instead of progressing further.
    if (phase === 'TAPER') {
        return resolvePhaseVdot(currentVdot, targetVdot, 'PEAK');
    }
    let progressionVdot: number;
    switch (phase) {
        case 'BUILD':
            progressionVdot = currentVdot + gap * 0.5;
            break;
        case 'PEAK':
            progressionVdot = currentVdot + gap * 0.75;
            break;
        default:
            return currentVdot;
    }
    return Math.min(Math.round(progressionVdot * 10) / 10, maxVdot);
}

export type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    const paces = calculateTrainingPaces(config.vdot);
    const resolvedFtp = config.ftpWatts && config.ftpWatts > 0
        ? config.ftpWatts
        : estimateBikeFtpFromVdot(config.vdot, config.weightKg ?? 70);

    const enrichTargets = (workouts: GeneratedWorkout[], options?: { usePhaseVdot?: boolean }) => {
        for (const w of workouts) {
            assignWorkoutTargets(w, paces, config.sport || null);
        }
        fillDurations(workouts, paces);
        enrichWorkoutsWithTargets(workouts, paces, {
            ...config,
            usePhaseVdot: options?.usePhaseVdot,
        });
        // Task A2: emit the canonical v2 structured step tree for every
        // generated workout across ALL sports (run, bike, swim, brick,
        // strength) — both generators and the no-race path flow through here.
        for (const w of workouts) {
            if (!w.structuredSteps) {
                w.structuredSteps = buildStructuredStepsForWorkout(w, {
                    vdot: config.vdot,
                    ftpWatts: config.ftpWatts ?? undefined,
                    swimCssSecPer100m: config.swimCssSecPer100m ?? undefined,
                    weightKg: config.weightKg ?? 70,
                });
            }
            if (w.plannedTss == null) {
                w.plannedTss = calculateWorkoutPlannedTss({
                    workoutType: w.type,
                    sport: w.sport ?? null,
                    targetDistance: w.totalDistance,
                    targetDuration: w.targetDuration ?? null,
                    targetPace: w.targetPace ?? null,
                    targetPowerWatts: w.targetPowerWatts ?? null,
                    targetFtpPercent: w.targetFtpPercent ?? null,
                    ftpWatts: resolvedFtp,
                    structuredSteps: w.structuredSteps ?? null,
                });
            }
        }
        return workouts;
    };

    if (config.raceType === null) {
        return enrichTargets(generateNoRacePlan(config));
    }

    if (config.sport === 'TRIATHLON' || (config.raceType && TRIATHLON_RACE_TYPES.includes(config.raceType))) {
        return enrichTargets(generateTriathlonPlan({ ...config, raceType: config.raceType as RaceType }));
    }

    if (config.raceType === 'CUSTOM_DISTANCE' && config.customDistanceM && config.customDistanceM > 45000) {
        const ultraClass = classifyCustomRunDistance(config.customDistanceM);
        return enrichTargets(generateUltraPlan({ ...config, raceType: ultraClass }));
    }

    if (config.raceType && ULTRA_RACE_TYPES.includes(config.raceType)) {
        return enrichTargets(generateUltraPlan(config));
    }

    return enrichTargets(generateStandardPlan(config), { usePhaseVdot: true });
}

export function computeDuration(distanceMeters: number, paceSecondsPerKm: number): number {
    if (distanceMeters <= 0 || paceSecondsPerKm <= 0) return 0;
    return Math.round((distanceMeters / 1000) * paceSecondsPerKm);
}

export function computeSwimDuration(distanceMeters: number, paceSecondsPer100m: number): number {
    if (distanceMeters <= 0 || paceSecondsPer100m <= 0) return 0;
    return Math.round((distanceMeters / 100) * paceSecondsPer100m);
}

export function computeQualityDuration(
    totalDistance: number,
    qualityPace: number,
    easyPace: number,
    qualityFraction: number = 0.5
): number {
    if (totalDistance <= 0) return 0;
    const qualityDist = totalDistance * qualityFraction;
    const easyDist = totalDistance - qualityDist;
    return Math.round((qualityDist / 1000) * qualityPace + (easyDist / 1000) * easyPace);
}

export function workoutTypeToHrZone(type: WorkoutType): number | undefined {
    switch (type) {
        case WorkoutType.RECOVERY: return 1;
        case WorkoutType.EASY: return 2;
        case WorkoutType.LONG_RUN: return 2;
        case WorkoutType.TEMPO: return 3;
        case WorkoutType.FARTLEK: return 4;
        case WorkoutType.INTERVALS: return 4;
        case WorkoutType.REPETITIONS: return 5;
        case WorkoutType.RACE: return 5;
        default: return undefined;
    }
}

export function getRunQualityHrZone(workout: { type: WorkoutType; description?: string }): number | undefined {
    if (workout.type === WorkoutType.TEMPO && workout.description?.includes('Threshold')) return 4;
    return workoutTypeToHrZone(workout.type);
}

export function getQualityFraction(type: WorkoutType): number {
    switch (type) {
        case WorkoutType.INTERVALS: return 0.5;
        case WorkoutType.REPETITIONS: return 0.35;
        case WorkoutType.TEMPO: return 0.65;
        case WorkoutType.FARTLEK: return 0.45;
        default: return 0.5;
    }
}

export function fillDurations(workouts: GeneratedWorkout[], paces: TrainingPaces): void {
    const easyPace = paces.easy.max;
    const qualityTypes = new Set<WorkoutType>([
        WorkoutType.TEMPO, WorkoutType.INTERVALS,
        WorkoutType.FARTLEK, WorkoutType.REPETITIONS,
    ]);
    const swimTypes = new Set<WorkoutType>([
        WorkoutType.SWIM, WorkoutType.SWIM_DRILL, WorkoutType.OPEN_WATER_SWIM,
    ]);

    for (const w of workouts) {
        if (w.targetDuration != null && w.targetDuration > 0) continue;
        if (!w.totalDistance || w.totalDistance <= 0) continue;
        if (!w.targetPace || w.targetPace <= 0) continue;

        const type = w.type as WorkoutType;

        if (qualityTypes.has(type)) {
            w.targetDuration = computeQualityDuration(
                w.totalDistance, w.targetPace, easyPace, getQualityFraction(type)
            );
        } else if (swimTypes.has(type)) {
            w.targetDuration = computeSwimDuration(w.totalDistance, w.targetPace);
        } else {
            w.targetDuration = computeDuration(w.totalDistance, w.targetPace);
        }
    }
}


// ---------------------------------------------------------------------------
// Plan-level phase blocks (task A2, step 2)
// ---------------------------------------------------------------------------

/** Structured plan-phase metadata persisted on `Goal.phaseBlocks` (Json). */
export interface PhaseBlock {
    phase: PlanPhase;
    /** 1-based plan-week range (inclusive). */
    startWeek: number;
    endWeek: number;
    /** ISO date (YYYY-MM-DD) of the first day of `startWeek` (Sunday-start). */
    startDate: string;
    /** ISO date (YYYY-MM-DD) of the last day of `endWeek`. */
    endDate: string;
    /** Average planned running volume per week in this block, in km. */
    weeklyRunKmTarget: number;
    /** Average planned cycling TSS per week in this block (null when no rides). */
    weeklyBikeTssTarget: number | null;
    /** Average planned swim volume per week in this block, in meters (null when no swims). */
    weeklySwimMetersTarget: number | null;
    /** Average planned total TSS per week in this block (null when unknowable). */
    targetTss: number | null;
    focus: string;
}

const PHASE_FOCUS: Record<string, string> = {
    BASE: 'Aerobic base & weekly volume',
    BUILD: 'Intensity & race-specific work',
    PEAK: 'Race-specific sharpness at peak volume',
    TAPER: 'Volume reduction & freshness',
    RACE_WEEK: 'Race execution & taper',
    ENDURANCE: 'Time-on-feet endurance',
    MENTAL_PREP: 'Mental preparation & race simulation',
    RECOVERY: 'Recovery & adaptation',
    TUNE_UP: 'Tune-up race sharpening',
    MAINTAIN: 'Fitness maintenance',
};

const RUN_WORKOUT_TYPES = new Set<WorkoutType>([
    WorkoutType.EASY, WorkoutType.LONG_RUN, WorkoutType.TEMPO, WorkoutType.INTERVALS,
    WorkoutType.FARTLEK, WorkoutType.RECOVERY, WorkoutType.RACE, WorkoutType.REPETITIONS,
]);
const BIKE_WORKOUT_TYPES = new Set<WorkoutType>([
    WorkoutType.RIDE, WorkoutType.LONG_RIDE, WorkoutType.RIDE_INTERVALS,
]);
const SWIM_WORKOUT_TYPES = new Set<WorkoutType>([
    WorkoutType.SWIM, WorkoutType.SWIM_DRILL, WorkoutType.OPEN_WATER_SWIM,
]);

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Build explicit structured phase metadata from the generated workout list
 * (task A2, step 2). Weeks are Sunday-start, matching the plan generators'
 * calendar normalization. Consecutive weeks sharing a phase are merged into a
 * single {@link PhaseBlock}; weekly volume/TSS targets are the averages over
 * the weeks in the block. `workout.plannedTss` should already be populated
 * (see `calculateWorkoutPlannedTss`) for TSS columns to be meaningful.
 */
export function buildPlanPhaseBlocks(config: PlanConfig, workouts: GeneratedWorkout[]): PhaseBlock[] {
    if (workouts.length === 0) return [];

    const requestedStart = config.startDate ?? new Date();
    const planStart = new Date(requestedStart);
    planStart.setDate(planStart.getDate() - planStart.getDay()); // Sunday-start, as the generators do
    planStart.setHours(0, 0, 0, 0);
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    interface WeekAcc {
        phase: PlanPhase | null;
        runMeters: number;
        bikeTss: number;
        bikeCount: number;
        swimMeters: number;
        swimCount: number;
        tss: number;
        tssCount: number;
    }
    const weeks = new Map<number, WeekAcc>();

    for (const w of workouts) {
        const weekIndex = Math.max(1, Math.floor((w.date.getTime() - planStart.getTime()) / WEEK_MS) + 1);
        let acc = weeks.get(weekIndex);
        if (!acc) {
            acc = { phase: null, runMeters: 0, bikeTss: 0, bikeCount: 0, swimMeters: 0, swimCount: 0, tss: 0, tssCount: 0 };
            weeks.set(weekIndex, acc);
        }
        if (w.type === WorkoutType.RACE || w.phase === 'RACE_WEEK') {
            acc.phase = 'RACE_WEEK' as PlanPhase;
        } else if (w.phase && acc.phase === null) {
            acc.phase = w.phase;
        }
        if (w.plannedTss != null && w.plannedTss > 0) {
            acc.tss += w.plannedTss;
            acc.tssCount += 1;
        }
        const wt = w.type as WorkoutType;
        if (RUN_WORKOUT_TYPES.has(wt)) acc.runMeters += w.totalDistance;
        if (BIKE_WORKOUT_TYPES.has(wt) && w.plannedTss != null && w.plannedTss > 0) {
            acc.bikeTss += w.plannedTss;
            acc.bikeCount += 1;
        }
        if (SWIM_WORKOUT_TYPES.has(wt)) acc.swimMeters += w.totalDistance;
    }

    const minWeek = Math.min(...weeks.keys());
    const maxWeek = Math.max(...weeks.keys());

    // Resolve a phase for every week in the range; gap weeks inherit the
    // previous week's phase (or the next one at the head of the plan).
    const phases: (PlanPhase | null)[] = [];
    for (let week = minWeek; week <= maxWeek; week++) {
        phases.push(weeks.get(week)?.phase ?? null);
    }
    let lastPhase: PlanPhase | null = null;
    for (let i = 0; i < phases.length; i++) {
        if (phases[i] !== null) lastPhase = phases[i];
        else phases[i] = lastPhase;
    }
    for (let i = phases.length - 1; i >= 0; i--) {
        if (phases[i] === null) phases[i] = lastPhase;
        else lastPhase = phases[i];
    }

    const round1 = (value: number): number => Math.round(value * 10) / 10;
    const weekStartDate = (week: number): Date => new Date(planStart.getTime() + (week - 1) * WEEK_MS);

    const blocks: PhaseBlock[] = [];
    let blockStart = minWeek;
    for (let week = minWeek + 1; week <= maxWeek + 1; week++) {
        const prevPhase = phases[week - 1 - minWeek];
        const boundary = week > maxWeek || prevPhase !== phases[week - minWeek];
        if (!boundary) continue;

        const endWeek = week - 1;
        let runMeters = 0;
        let bikeTss = 0;
        let bikeCount = 0;
        let swimMeters = 0;
        let swimCount = 0;
        let tss = 0;
        let tssCount = 0;
        for (let w = blockStart; w <= endWeek; w++) {
            const acc = weeks.get(w);
            if (!acc) continue;
            runMeters += acc.runMeters;
            bikeTss += acc.bikeTss;
            bikeCount += acc.bikeCount;
            swimMeters += acc.swimMeters;
            swimCount += acc.swimCount;
            tss += acc.tss;
            tssCount += acc.tssCount;
        }
        const weekCount = endWeek - blockStart + 1;
        const phase = (phases[blockStart - minWeek] ?? 'BASE') as PlanPhase;
        blocks.push({
            phase,
            startWeek: blockStart,
            endWeek,
            startDate: isoDay(weekStartDate(blockStart)),
            endDate: isoDay(new Date(weekStartDate(endWeek).getTime() + 6 * 24 * 60 * 60 * 1000)),
            weeklyRunKmTarget: round1(runMeters / weekCount / 1000),
            weeklyBikeTssTarget: bikeCount > 0 ? round1(bikeTss / weekCount) : null,
            weeklySwimMetersTarget: swimCount > 0 ? Math.round(swimMeters / weekCount) : null,
            targetTss: tssCount > 0 ? round1(tss / weekCount) : null,
            focus: PHASE_FOCUS[phase] ?? 'Continuous training',
        });
        blockStart = week;
    }

    return blocks;
}

export function updateDescription(type: WorkoutType, distance: number, pace: number): string {
    const distKm = (distance / 1000).toFixed(1);
    const paceStr = pace > 0 ? ` @ ${formatPace(pace)}` : '';

    switch (type) {
        case 'LONG_RUN': return `Long Run: ${distKm}km @ Easy`;
        case 'EASY': return `Easy Run: ${distKm}km`;
        case 'RECOVERY': return `Recovery Run: ${distKm}km`;
        case 'TEMPO': return `Tempo: ${distKm}km${paceStr}`;
        case 'INTERVALS': return `Intervals: Total ${distKm}km Session`;
        case 'FARTLEK': return `Fartlek: ${distKm}km${paceStr}`;
        case 'REPETITIONS': return `Reps: Total ${distKm}km Session`;
        case 'RACE': return `Race Day: ${distKm}km`;
        default: return `${type}: ${distKm}km`;
    }
}

export function assignWorkoutTargets(
    workout: GeneratedWorkout,
    paces: TrainingPaces,
    sport: PlanSport | string | null,
): void {
    const type = workout.type as WorkoutType;
    if (workout.targetHrZone === undefined || workout.targetHrZone === null) {
        if (type === WorkoutType.RIDE || type === WorkoutType.LONG_RIDE || type === WorkoutType.BRICK) {
            workout.targetHrZone = 2;
        } else if (type === WorkoutType.RIDE_INTERVALS) {
            workout.targetHrZone = 4;
        } else if (type === WorkoutType.SWIM || type === WorkoutType.SWIM_DRILL || type === WorkoutType.OPEN_WATER_SWIM) {
            workout.targetHrZone = 2;
        } else if (type === WorkoutType.TEMPO && workout.description?.includes('Threshold')) {
            workout.targetHrZone = 4;
        } else {
            workout.targetHrZone = workoutTypeToHrZone(type);
        }
    }
}

function enrichWorkoutsWithTargets(
    workouts: GeneratedWorkout[],
    paces: TrainingPaces,
    config: Pick<PlanConfig, 'vdot' | 'targetVdot' | 'ftpWatts' | 'weightKg' | 'thresholdHeartRate' | 'hrZoneMethod' | 'hrZone1Max' | 'hrZone2Max' | 'hrZone3Max' | 'hrZone4Max' | 'hrZone5Max' | 'hrZone6Max' | 'hrMax' | 'hrRest'> & { usePhaseVdot?: boolean },
): void {
    const hrZones = resolveHrZones({
        thresholdHeartRate: config.thresholdHeartRate ?? null,
        hrZone1Max: config.hrZone1Max ?? null,
        hrZone2Max: config.hrZone2Max ?? null,
        hrZone3Max: config.hrZone3Max ?? null,
        hrZone4Max: config.hrZone4Max ?? null,
        hrZone5Max: config.hrZone5Max ?? null,
        hrZone6Max: config.hrZone6Max ?? null,
        hrMax: config.hrMax ?? null,
        hrRest: config.hrRest ?? null,
    }).zones;

    const bikeFtp = config.ftpWatts && config.ftpWatts > 0
        ? Math.round(config.ftpWatts)
        : estimateBikeFtpFromVdot(config.vdot, config.weightKg ?? 70);
    const bikeZones = calculateBikeZones(bikeFtp);
    const usePhaseVdot = config.usePhaseVdot ?? false;
    const phasePacesByVdot = new Map<number, TrainingPaces>();

    const getPhasePaces = (phase: PlanPhase | undefined): TrainingPaces => {
        if (!usePhaseVdot || !phase || phase === 'RACE_WEEK') return paces;
        if (phase !== 'BASE' && phase !== 'BUILD' && phase !== 'PEAK' && phase !== 'TAPER') return paces;
        const phaseVdot = resolvePhaseVdot(config.vdot, config.targetVdot ?? null, phase);
        if (phaseVdot === config.vdot) return paces;
        const cached = phasePacesByVdot.get(phaseVdot);
        if (cached) return cached;
        const nextPaces = calculateTrainingPaces(phaseVdot);
        phasePacesByVdot.set(phaseVdot, nextPaces);
        return nextPaces;
    };

    for (const workout of workouts) {
        const paceTarget = getPaceTarget(workout, getPhasePaces(workout.phase));
        workout.targetPaceZoneLabel = paceTarget?.label ?? null;
        workout.targetPaceMinSecondsPerKm = paceTarget?.min ?? null;
        workout.targetPaceMaxSecondsPerKm = paceTarget?.max ?? null;

        const hrTarget = getZoneTarget(workout.targetHrZone, hrZones);
        workout.targetHrZoneLabel = hrTarget?.label ?? null;
        workout.targetHrMinBpm = hrTarget?.min ?? null;
        workout.targetHrMaxBpm = hrTarget?.max ?? null;

        if (workout.type === WorkoutType.RIDE || workout.type === WorkoutType.LONG_RIDE || workout.type === WorkoutType.RIDE_INTERVALS || workout.type === WorkoutType.BRICK) {
            if (workout.type === WorkoutType.RIDE_INTERVALS) {
                workout.targetPaceZoneLabel = `Power Z4: ${bikeZones.threshold.min}-${bikeZones.threshold.max}W`;
            } else if (workout.type === WorkoutType.LONG_RIDE) {
                workout.targetPaceZoneLabel = `Power Z2: ${bikeZones.endurance.min}-${bikeZones.endurance.max}W`;
            } else {
                workout.targetPaceZoneLabel = `Power Z2: ${bikeZones.endurance.min}-${bikeZones.endurance.max}W`;
            }
        }
    }
}
