import { WorkoutType, RaceType, PlanSport, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
import { getZoneTarget, resolveHrZones, type HrZoneDefinition } from '../metrics/hr-zones';
import { generateUltraPlan } from './generators/run-ultra';
import { generateTriathlonPlan } from './generators/triathlon';
import { generateNoRacePlan } from './generators/no-race';
import { fixBackToBackSameType } from './schedule-utils';
import { enrichWorkoutsWithDescriptions, getRacePace } from './descriptions';
import { estimateBikeFtpFromVdot, calculateBikeZones, type BikeZones } from './bike-zones';
import { estimateSwimPaceFromVdot, calculateSwimPaces } from './swim-pace';
import type {
    StructuredWorkoutV2,
    StepNode,
    StructuredStep,
    RepeatGroup,
    Duration,
    Target,
} from './structured';
import { MAX_REPEAT_TIMES } from './structured';

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
    return 'MARATHON';
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

    let taper = config.taperWeeks !== undefined && config.taperWeeks !== null
        ? config.taperWeeks
        : (defaultTaper ?? 2);
    taper = Math.max(0, Math.min(taper, availableWeeks));

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
        const reserveBaseWeeks = config.peakWeeks === undefined && config.buildWeeks === undefined
            ? (resolvedTotal >= 10 ? 4 : resolvedTotal >= 8 ? 3 : resolvedTotal >= 6 ? 2 : 0)
            : 0;
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
    /** Athlete bike FTP in watts (falls back to `estimateBikeFtpFromVdot(vdot)`). */
    ftpWatts?: number | null;
    /** Athlete swim CSS in seconds per 100m (falls back to `estimateSwimPaceFromVdot(vdot)`). */
    swimCssSecPer100m?: number | null;
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

type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

function resolvePhaseVdot(currentVdot: number, targetVdot: number | undefined | null, phase: Phase): number {
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

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    const paces = calculateTrainingPaces(config.vdot);

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
                });
            }
        }
        return workouts;
    };

    if (config.sport === 'TRIATHLON' || (config.raceType && TRIATHLON_RACE_TYPES.includes(config.raceType))) {
        return enrichTargets(generateTriathlonPlan({ ...config, raceType: config.raceType as RaceType }));
    }

    if (config.raceType === null) {
        return enrichTargets(generateNoRacePlan(config));
    }

    if (config.raceType && ULTRA_RACE_TYPES.includes(config.raceType)) {
        return enrichTargets(generateUltraPlan(config));
    }

    return enrichTargets(generateStandardPlan(config), { usePhaseVdot: true });
}

function generateStandardPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceDate, customDistanceM, targetTime } = config;
    const raceType = config.raceType as RaceType;
    const effectiveRaceType = raceType === 'CUSTOM_DISTANCE' && customDistanceM && customDistanceM > 0
        ? classifyCustomRunDistance(customDistanceM)
        : raceType;

    const requestedStartDate = config.startDate || new Date();
    const startDate = requestedStartDate > raceDate ? new Date(raceDate) : requestedStartDate;
    const runsPerWeek = Math.max(0, config.runsPerWeek ?? 4);
    const ridesPerWeek = Math.max(0, config.ridesPerWeek || 0);
    const strengthPerWeek = Math.max(0, config.strengthPerWeek || 0);
    const swimsPerWeek = Math.max(0, config.swimsPerWeek || 0);

    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3;

    let peakVolume = config.weeklyMileageGoal || 40000;
    const minPeak = PLAN_CONSTANTS.MIN_PEAK_VOLUME[effectiveRaceType] || 20000;
    if (peakVolume < minPeak) peakVolume = minPeak;

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    const timeDiff = raceDate.getTime() - currentDate.getTime();
    const totalWeeks = Math.min(PLAN_CONSTANTS.MAX_TOTAL_WEEKS, Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24 * 7))));

    const minStart = getMinStartVolume(config.raceType ?? null);
    let startVolume: number;
    if (config.startWeeklyMileage && config.startWeeklyMileage > 0) {
        startVolume = Math.max(config.startWeeklyMileage, minStart);
        startVolume = Math.min(startVolume, peakVolume);
    } else {
        startVolume = peakVolume * PLAN_CONSTANTS.START_VOLUME_RATIO;
        if (startVolume < minStart) {
            startVolume = Math.min(minStart, peakVolume);
        }
    }

    const paces = calculateTrainingPaces(vdot);
    const targetRacePace = getTargetRacePaceSeconds(effectiveRaceType, targetTime, customDistanceM);

    const defaultTaperWeeks = TAPER_FRACTIONS[effectiveRaceType]?.length || 2;
    const phases = resolvePhaseBudget(totalWeeks, config, { defaultTaper: defaultTaperWeeks });
    const taperWeeks = phases.taperWeeks;
    const peakWeeks = phases.peakWeeks;
    const buildWeeks = phases.buildWeeks;

    const growthRatio = peakVolume / startVolume;
    const minRampWeeks = growthRatio > 1.001
        ? Math.ceil(Math.log(growthRatio) / Math.log(PLAN_CONSTANTS.WEEKLY_GROWTH_CAP))
        : 1;

    let calendarRampWeeks = minRampWeeks;
    while (calendarRampWeeks - Math.floor(calendarRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE) < minRampWeeks) {
        calendarRampWeeks++;
    }

    const availableRampWeeks = Math.max(1, totalWeeks - taperWeeks);
    let effectivePeakVolume = peakVolume;
    if (availableRampWeeks < calendarRampWeeks) {
        const effWeeks = availableRampWeeks - Math.floor(availableRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE);
        effectivePeakVolume = Math.round(startVolume * Math.pow(PLAN_CONSTANTS.WEEKLY_GROWTH_CAP, Math.max(1, effWeeks)));
        calendarRampWeeks = availableRampWeeks;
    }

    const effectiveWeeksInRamp = Math.max(1, calendarRampWeeks - Math.floor(calendarRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE));
    const weeklyGrowthRate = Math.pow(effectivePeakVolume / startVolume, 1 / effectiveWeeksInRamp);

    let lastNonRecoveryVolume = startVolume;
    let effectiveWeekIndex = 0;
    let baseBuildCounter = 0;
    let lastPhase: Phase | null = null;
    let weekInPhase = 0;

    const workouts: GeneratedWorkout[] = [];


    for (let week = 1; week <= totalWeeks; week++) {
        const weeksUntilRace = totalWeeks - week + 1;
        const phase = getPhase(weeksUntilRace, { taperWeeks, peakWeeks, buildWeeks });

        if (phase !== 'RACE_WEEK') {
            if (phase !== lastPhase) {
                weekInPhase = 1;
                lastPhase = phase;
            } else {
                weekInPhase++;
            }
        }

        if (phase === 'RACE_WEEK') {
            const raceWeekWorkouts = generateRaceWeek({
                raceDate,
                raceType,
                paces,
                runsPerWeek,
                raceWeekRunVolumeCap: getRaceWeekRunVolumeCap(effectiveRaceType, effectivePeakVolume, customDistanceM),
                ridesPerWeek,
                swimsPerWeek,
                strengthPerWeek,
                customDistanceM,
                targetRacePace,
                targetRaceDuration: targetTime ?? null,
            });
            raceWeekWorkouts.forEach(w => {
                const specificDate = new Date(raceDate);
                if (w.type !== WorkoutType.RACE) {
                    specificDate.setDate(specificDate.getDate() + w.dayOffset);
                }
                // B6: a very short plan can start inside race week, which used
                // to drop every pre-race shakeout/stride (specificDate < startDate).
                // Clamp to the plan start instead so the athlete still gets a
                // shakeout. The RACE itself is always on or after startDate
                // (it is the plan terminus), so it is unaffected.
                if (specificDate < startDate) {
                    specificDate.setTime(startDate.getTime());
                }
                workouts.push({
                    date: specificDate,
                    type: w.type,
                    description: w.description,
                    totalDistance: w.totalDistance,
                    targetPace: w.targetPace,
                    targetDuration: w.targetDuration,
                    phase: w.phase,
                    targetHrZone: w.targetHrZone,
                });
            });
            currentDate.setDate(currentDate.getDate() + 7);
            continue;
        }

        let weekVolumeCap: number;
        let isRecoveryWeek = false;

        if (phase === 'TAPER') {
            weekVolumeCap = getTaperVolume(weeksUntilRace, taperWeeks, effectivePeakVolume, effectiveRaceType);
            weekVolumeCap = Math.max(PLAN_CONSTANTS.EASY_RUN_MIN * 2, weekVolumeCap);
        } else if (phase === 'PEAK') {
            weekVolumeCap = effectivePeakVolume;
        } else {
            baseBuildCounter++;
            isRecoveryWeek = baseBuildCounter % PLAN_CONSTANTS.STEP_LOADING_CYCLE === 0;

            if (isRecoveryWeek) {
                weekVolumeCap = Math.round(lastNonRecoveryVolume * weeklyGrowthRate * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR);
            } else {
                effectiveWeekIndex++;
                weekVolumeCap = Math.round(startVolume * Math.pow(weeklyGrowthRate, effectiveWeekIndex));
                weekVolumeCap = Math.min(weekVolumeCap, effectivePeakVolume);
                lastNonRecoveryVolume = weekVolumeCap;
            }
        }

        const effectiveFloor = isRecoveryWeek
            ? Math.round(PLAN_CONSTANTS.MIN_VOLUME_START * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
            : PLAN_CONSTANTS.MIN_VOLUME_START;
        weekVolumeCap = Math.max(effectiveFloor, weekVolumeCap);

        const phaseVdot = resolvePhaseVdot(vdot, config.targetVdot ?? null, phase);
        const phasePaces = phaseVdot !== vdot ? calculateTrainingPaces(phaseVdot) : paces;

        let weekSchedule = generateWeek({
            phase,
            raceType: effectiveRaceType,
            paces: phasePaces,
            runsPerWeek,
            ridesPerWeek,
            strengthPerWeek,
            swimsPerWeek,
            weeklyVolume: weekVolumeCap,
            maxLongRunKm: config.maxLongRunKm,
            preferredLongRunDay: longRunDay,
            preferredWorkoutDay: workoutDay,
            preferredSwimDay: config.swimDay,
            restDays: config.restDays,
            weekInPhase,
            targetRacePace,
        });

        const runningWorkouts = weekSchedule.filter(w => isRun(w.type));
        const totalRunDistance = runningWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

        if (totalRunDistance > weekVolumeCap) {
            weekSchedule = scaleToVolumeCap(weekSchedule, weekVolumeCap);
        }

        weekSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);
            if (specificDate < startDate) return;

            if (isRun(w.type) && w.totalDistance === 0) return;

            workouts.push({
                date: specificDate,
                type: w.type,
                description: w.description,
                totalDistance: w.totalDistance,
                targetPace: w.targetPace,
                targetDuration: w.targetDuration,
                phase: w.phase,
                targetHrZone: w.targetHrZone,
            });
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    const result = fixBackToBackSameType(workouts, {
        raceDate,
        restDays: config.restDays,
    });
    const racePace = getRacePace(effectiveRaceType, paces);
    enrichWorkoutsWithDescriptions(result, racePace);
    return result;
}

/**
 * Canonical per-week phase resolver. Maps a week's `weeksUntilRace` to a
 * {@link Phase} using the budget produced by {@link resolvePhaseBudget}.
 *
 * Exported so the regenerate route can re-tag existing workouts' phases
 * without re-running the full plan generator (which would also recompute
 * distances/volumes). Keeping this as the single source of truth guarantees
 * the regenerate route's phase boundaries match the generator exactly.
 */
export function getPhase(
    weeksUntilRace: number,
    options?: { taperWeeks?: number; peakWeeks?: number; buildWeeks?: number }
): Phase {
    const taperWeeks = options?.taperWeeks ?? 0;
    const peakWeeks = options?.peakWeeks ?? 0;
    const buildWeeks = options?.buildWeeks ?? 0;

    if (weeksUntilRace <= 0) return 'BASE';
    if (weeksUntilRace === 1) return 'RACE_WEEK';
    if (taperWeeks > 0 && weeksUntilRace <= taperWeeks) return 'TAPER';
    if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks) return 'PEAK';
    if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return 'BUILD';
    return 'BASE';
}

function getTaperVolume(
    weeksUntilRace: number,
    taperWeeks: number,
    peakVolume: number,
    raceType: RaceType
): number {
    const fractions = TAPER_FRACTIONS[raceType];
    if (!fractions) return Math.round(peakVolume * 0.65);
    const taperWeekIndex = taperWeeks - weeksUntilRace;
    const clampedIndex = Math.min(Math.max(0, taperWeekIndex), fractions.length - 1);
    const fraction = fractions[clampedIndex];
    return Math.round(peakVolume * fraction);
}

export function getRaceWeekRunVolumeCap(raceType: RaceType, effectivePeakVolume: number, customDistanceM?: number | null): number {
    const fractions = TAPER_FRACTIONS[raceType];
    const finalTaperFraction = fractions ? fractions[fractions.length - 1] : 0.45;
    const raceDist = getRaceDistanceMeters(raceType, customDistanceM) || 10000;
    return Math.max(
        Math.round(effectivePeakVolume * finalTaperFraction * 0.5),
        raceDist + 10000,
    );
}

function generateRaceWeek(params: {
    raceDate: Date;
    raceType: RaceType;
    paces: TrainingPaces;
    runsPerWeek: number;
    raceWeekRunVolumeCap: number;
    ridesPerWeek?: number;
    swimsPerWeek?: number;
    strengthPerWeek?: number;
    customDistanceM?: number | null;
    targetRacePace?: number | null;
    targetRaceDuration?: number | null;
}): ScheduledWorkout[] {
    const { raceType, paces, runsPerWeek, raceWeekRunVolumeCap, customDistanceM, targetRacePace, targetRaceDuration } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    const raceDistKm = getRaceDistanceKm(raceType, customDistanceM);
    const raceDistMeters = getRaceDistanceMeters(raceType, customDistanceM);
    const maxRunVolume = Math.max(raceDistMeters, raceWeekRunVolumeCap);

    let remainingExtraRunSlots = Math.max(0, runsPerWeek - 1);
    let remainingSupplementalRunVolume = Math.max(0, maxRunVolume - raceDistMeters);

    usedDays.add(0);
    workouts.push({
        dayOffset: 0,
        type: WorkoutType.RACE,
        description: `Race Day: ${raceDistKm}km`,
        totalDistance: raceDistMeters,
        targetPace: targetRacePace ?? 0,
        targetDuration: targetRaceDuration ?? (targetRacePace ? computeDuration(raceDistMeters, targetRacePace) : 0),
        phase: 'RACE_WEEK' as PlanPhase,
        targetHrZone: workoutTypeToHrZone(WorkoutType.RACE),
    });

    const addSupplementalRun = (relativeOffset: number, workout: Omit<ScheduledWorkout, 'dayOffset'>): boolean => {
        if (remainingExtraRunSlots <= 0) return false;
        if (workout.totalDistance > remainingSupplementalRunVolume) return false;

        const dayOffset = relativeOffset;
        if (usedDays.has(dayOffset)) return false;

        usedDays.add(dayOffset);
        workouts.push({ dayOffset, ...workout });
        remainingExtraRunSlots--;
        remainingSupplementalRunVolume -= workout.totalDistance;
        return true;
    };

    const preRaceStrideRelativeOffset = -2;
    addSupplementalRun(preRaceStrideRelativeOffset, {
        type: WorkoutType.EASY,
        description: 'Easy Run: 3km + 4x100m Strides',
        totalDistance: 3400,
        targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
        targetDuration: computeDuration(3400, Math.round((paces.easy.min + paces.easy.max) / 2)),
        phase: 'RACE_WEEK' as PlanPhase,
        targetHrZone: workoutTypeToHrZone(WorkoutType.EASY),
    });

    const shakeoutRelativeOffsets = [-1, -3, -4, -5, -6];
    let shakeoutCount = 0;
    for (const relativeOffset of shakeoutRelativeOffsets) {
        if (shakeoutCount >= 2) break;
        const wasAdded = addSupplementalRun(relativeOffset, {
            type: WorkoutType.RECOVERY,
            description: 'Shakeout Run: 3km @ Easy',
            totalDistance: 3000,
            targetPace: paces.easy.max,
            targetDuration: computeDuration(3000, paces.easy.max),
            phase: 'RACE_WEEK' as PlanPhase,
            targetHrZone: workoutTypeToHrZone(WorkoutType.RECOVERY),
        });
        if (wasAdded) shakeoutCount++;
    }

    const rwRidesPerWeek = params.ridesPerWeek ?? 0;
    const rwSwimsPerWeek = params.swimsPerWeek ?? 0;
    const rwStrengthPerWeek = params.strengthPerWeek ?? 0;

    if (rwRidesPerWeek > 0 || rwSwimsPerWeek > 0 || rwStrengthPerWeek > 0) {
        const freeDaysForCT = [-4, -3, -5, -1, -6].filter(d => !usedDays.has(d));

        let ctRidePlaced = false;
        let ctSwimPlaced = false;
        let ctStrengthPlaced = false;
        let ctSwimDay: number | null = null;

        for (const d of freeDaysForCT) {
            if (ctRidePlaced && ctSwimPlaced && ctStrengthPlaced) break;

            if (!ctRidePlaced && rwRidesPerWeek > 0) {
                ctRidePlaced = true;
                usedDays.add(d);
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.RIDE,
                    description: 'Easy Spin: 30min (Zone 1)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 1800,
                    phase: 'RACE_WEEK' as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE),
                });
                continue;
            }

            if (!ctSwimPlaced && rwSwimsPerWeek > 0) {
                ctSwimPlaced = true;
                ctSwimDay = d;
                usedDays.add(d);
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.SWIM,
                    description: 'Swim: 1200m @ Easy',
                    totalDistance: 1200,
                    targetPace: 120,
                    targetDuration: 2100,
                    phase: 'RACE_WEEK' as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.SWIM),
                });
                continue;
            }

            if (!ctStrengthPlaced && rwStrengthPerWeek > 0 && d !== ctSwimDay) {
                ctStrengthPlaced = true;
                usedDays.add(d);
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.STRENGTH,
                    description: 'Strength: 30min (Light)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 1800,
                    phase: 'RACE_WEEK' as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.STRENGTH),
                });
                continue;
            }
        }
    }

    workouts.sort((a, b) => a.dayOffset - b.dayOffset);
    return workouts;
}

function getSwimWorkout(phase: Phase, weekInPhase: number): { description: string; totalDistance: number; targetPace: number; targetDuration: number } {
    if (phase === 'BASE') {
        return { description: 'Swim: 1500m @ Easy', totalDistance: 1500, targetPace: 120, targetDuration: 2700 };
    }
    if (phase === 'BUILD') {
        return { description: 'Swim: 1800m (4x100m drills + 1400m steady)', totalDistance: 1800, targetPace: 115, targetDuration: 3000 };
    }
    if (phase === 'PEAK') {
        return { description: 'Swim: 1500m (200m warmup + 4x200m @ moderate + 500m cooldown)', totalDistance: 1500, targetPace: 110, targetDuration: 2700 };
    }
    return { description: 'Swim: 1200m @ Easy', totalDistance: 1200, targetPace: 120, targetDuration: 2100 };
}

function generateWeek(params: {
    phase: Phase;
    raceType: RaceType;
    paces: TrainingPaces;
    runsPerWeek: number;
    ridesPerWeek: number;
    strengthPerWeek: number;
    swimsPerWeek: number;
    weeklyVolume: number;
    maxLongRunKm?: number;
    preferredLongRunDay: number;
    preferredWorkoutDay: number;
    preferredSwimDay?: number;
    restDays?: number[];
    weekInPhase?: number;
    targetRacePace?: number | null;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek, weeklyVolume,
        maxLongRunKm,
        preferredLongRunDay, preferredWorkoutDay, preferredSwimDay, restDays, weekInPhase
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();
    const hardSessionDays: number[] = [];

    // Pre-mark user-designated rest days so no workouts are scheduled on them
    if (restDays && restDays.length > 0) {
        for (const rd of restDays) {
            usedDays.add(rd);
        }
    }

    const longRunDist = getLongRunDistance(raceType, weeklyVolume, paces, maxLongRunKm);

    const hasQuality = runsPerWeek >= 2 && phase !== 'TAPER';
    const qualitySession = hasQuality
        ? getQualitySession(raceType, paces, phase, weeklyVolume, params.weekInPhase ?? 1, params.targetRacePace)
        : null;
    const qualityDist = qualitySession ? qualitySession.totalDistance : 0;

    const longRunCount = runsPerWeek >= 1 ? 1 : 0;
    const qualityRunCount = hasQuality ? 1 : 0;
    const totalKeyRuns = longRunCount + qualityRunCount;
    const easyRunsCount = hasQuality
        ? Math.max(0, runsPerWeek - totalKeyRuns)
        : Math.max(0, runsPerWeek - longRunCount);

    const remainingVol = Math.max(0, weeklyVolume - longRunDist - qualityDist);
    const calculatedEasyDist = easyRunsCount > 0 ? remainingVol / easyRunsCount : 5000;

    const easyDist = Math.max(
        PLAN_CONSTANTS.EASY_RUN_MIN,
        Math.min(Math.round(calculatedEasyDist / 100) * 100, PLAN_CONSTANTS.EASY_RUN_MAX)
    );

    const easyPace = paces.easy.max;
    const recoveryPace = paces.easy.max;

    const getAvailableDayWithGap = (preferred: number, gapFrom: number[]): number => {
        const candidates: number[] = [];
        for (let d = 0; d < 7; d++) {
            if (usedDays.has(d)) continue;
            const tooClose = gapFrom.some(hd => {
                const diff = Math.abs(d - hd);
                return Math.min(diff, 7 - diff) < PLAN_CONSTANTS.MIN_GAP_DAYS;
            });
            if (!tooClose) candidates.push(d);
        }

        if (candidates.includes(preferred)) return preferred;
        if (candidates.length > 0) {
            candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
            return candidates[0];
        }

        if (!usedDays.has(preferred)) return preferred;
        for (let offset = 1; offset <= 6; offset++) {
            const after = (preferred + offset) % 7;
            if (!usedDays.has(after)) return after;
            const before = (preferred - offset + 7) % 7;
            if (!usedDays.has(before)) return before;
        }
        return preferred;
    };

    if (runsPerWeek >= 1) {
        const day = getAvailableDayWithGap(preferredLongRunDay, []);
        usedDays.add(day);
        hardSessionDays.push(day);

        let longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`;
        let longRunPace = easyPace;

        if (phase === 'BUILD' && (raceType === 'HALF_MARATHON' || raceType === 'MARATHON')) {
            longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km (last 3km progressive)`;
            longRunPace = easyPace;
        }

        if (phase === 'PEAK' && (raceType === 'HALF_MARATHON' || raceType === 'MARATHON')) {
            const mpDist = Math.round(longRunDist * 0.3 / 100) * 100;
            const easyPart = longRunDist - mpDist;
            longRunDesc = `Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ Goal Pace`;
            longRunPace = easyPace;
        }

        workouts.push({
            dayOffset: day,
            type: WorkoutType.LONG_RUN,
            description: longRunDesc,
            totalDistance: longRunDist,
            targetPace: longRunPace,
            targetDuration: computeDuration(longRunDist, longRunPace),
            phase: phase as PlanPhase,
            targetHrZone: workoutTypeToHrZone(WorkoutType.LONG_RUN),
        });
    }

    if (hasQuality && qualitySession) {
        const day = getAvailableDayWithGap(preferredWorkoutDay, hardSessionDays);
        usedDays.add(day);
        hardSessionDays.push(day);
        workouts.push({
            dayOffset: day,
            ...qualitySession,
            targetDuration: computeQualityDuration(qualitySession.totalDistance, qualitySession.targetPace, easyPace, getQualityFraction(qualitySession.type)),
            phase: phase as PlanPhase,
            targetHrZone: getRunQualityHrZone(qualitySession),
        });
    } else if (runsPerWeek >= 2) {
        const day = getAvailableDayWithGap(preferredWorkoutDay, hardSessionDays);
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: `Easy Run: ${(easyDist / 1000).toFixed(1)}km`,
            totalDistance: easyDist,
            targetPace: easyPace,
            targetDuration: computeDuration(easyDist, easyPace),
            phase: phase as PlanPhase,
            targetHrZone: workoutTypeToHrZone(WorkoutType.EASY),
        });
    }

    const alreadyScheduledEasyRuns = hasQuality ? 0 : (runsPerWeek >= 2 ? 1 : 0);
    const additionalRunsCount = Math.max(0, easyRunsCount - alreadyScheduledEasyRuns);
    const easyRunDays = getDistributedDays(additionalRunsCount, usedDays);

    let stridesInjected = 0;
    const stridesPerWeek = phase === 'BASE' ? 2 : 0;

    for (const d of easyRunDays) {
        usedDays.add(d);

        const dayAfterHard = hardSessionDays.some(hd => {
            const diff = (d - hd + 7) % 7;
            return diff === 1;
        });

        if (dayAfterHard) {
            const includeStrides = phase === 'BASE' && stridesInjected < stridesPerWeek;
            const suffix = includeStrides ? ' + 6x100m Strides' : '';
            if (includeStrides) stridesInjected++;

            workouts.push({
                dayOffset: d,
                type: WorkoutType.RECOVERY,
                description: `Recovery Run: ${(easyDist / 1000).toFixed(1)}km${suffix}`,
                totalDistance: easyDist,
                targetPace: recoveryPace,
                targetDuration: computeDuration(easyDist, recoveryPace),
                phase: phase as PlanPhase,
                targetHrZone: workoutTypeToHrZone(WorkoutType.RECOVERY),
            });
        } else {
            const includeStrides = phase === 'BASE' && stridesInjected < stridesPerWeek;
            const desc = includeStrides
                ? `Easy Run: ${(easyDist / 1000).toFixed(1)}km + 6x100m Strides`
                : `Easy Run: ${(easyDist / 1000).toFixed(1)}km`;

            if (includeStrides) stridesInjected++;

            workouts.push({
                dayOffset: d,
                type: WorkoutType.EASY,
                description: desc,
                totalDistance: easyDist,
                targetPace: easyPace,
                targetDuration: computeDuration(easyDist, easyPace),
                phase: phase as PlanPhase,
                targetHrZone: workoutTypeToHrZone(WorkoutType.EASY),
            });
        }
    }

    const longRunDay = workouts.find(w => w.type === WorkoutType.LONG_RUN)?.dayOffset;
    const qualityDay = workouts.find(w =>
        w.type === WorkoutType.INTERVALS || w.type === WorkoutType.TEMPO ||
        w.type === WorkoutType.REPETITIONS || w.type === WorkoutType.FARTLEK ||
        (w.type === WorkoutType.EASY && w.description.includes('Fartlek'))
    )?.dayOffset;

    const protectedDays = new Set<number>();
    if (longRunDay !== undefined) protectedDays.add(longRunDay);
    if (qualityDay !== undefined) protectedDays.add(qualityDay);

    let remainingRides = ridesPerWeek;
    let remainingSwims = swimsPerWeek;

    // If the user has a preferred swim day, try to place the first swim there
    if (preferredSwimDay !== undefined && remainingSwims > 0 && !usedDays.has(preferredSwimDay)) {
        usedDays.add(preferredSwimDay);
        remainingSwims--;
        const swimDetails = getSwimWorkout(phase, weekInPhase ?? 1);
        workouts.push({
            dayOffset: preferredSwimDay,
            type: WorkoutType.SWIM,
            description: swimDetails.description,
            totalDistance: swimDetails.totalDistance,
            targetPace: swimDetails.targetPace,
            targetDuration: swimDetails.targetDuration,
            phase: phase as PlanPhase,
            targetHrZone: workoutTypeToHrZone(WorkoutType.SWIM),
        });
    }

    const totalCardio = remainingRides + remainingSwims;
    const cardioFreeDays = getAvailableCrossTrainingDays(totalCardio, usedDays, protectedDays);

    for (const d of cardioFreeDays) {
        usedDays.add(d);
        if (remainingRides > 0) {
            remainingRides--;
            workouts.push({
                dayOffset: d,
                type: WorkoutType.RIDE,
                description: 'Bike Ride: 60min (Zone 1-2)',
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 3600,
                phase: phase as PlanPhase,
                targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE),
            });
        } else if (remainingSwims > 0) {
            remainingSwims--;
            const swimDetails = getSwimWorkout(phase, weekInPhase ?? 1);
            workouts.push({
                dayOffset: d,
                type: WorkoutType.SWIM,
                description: swimDetails.description,
                totalDistance: swimDetails.totalDistance,
                targetPace: swimDetails.targetPace,
                targetDuration: swimDetails.targetDuration,
                phase: phase as PlanPhase,
                targetHrZone: workoutTypeToHrZone(WorkoutType.SWIM),
            });
        }
    }

    if (remainingRides > 0 || remainingSwims > 0) {
        const overloadDays = getDistributedDays(remainingRides + remainingSwims, usedDays, true, workouts);
        for (const d of overloadDays) {
            usedDays.add(d);
            if (remainingRides > 0) {
                remainingRides--;
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.RIDE,
                    description: 'Bike Ride: 60min (Zone 1-2)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 3600,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE),
                });
            } else if (remainingSwims > 0) {
                remainingSwims--;
                const swimDetails = getSwimWorkout(phase, weekInPhase ?? 1);
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.SWIM,
                    description: swimDetails.description,
                    totalDistance: swimDetails.totalDistance,
                    targetPace: swimDetails.targetPace,
                    targetDuration: swimDetails.targetDuration,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.SWIM),
                });
            }
        }
    }

    const rideDays: number[] = [];
    const swimDays: number[] = [];
    workouts.forEach(w => {
        if (w.type === WorkoutType.RIDE) rideDays.push(w.dayOffset);
        if (w.type === WorkoutType.SWIM) swimDays.push(w.dayOffset);
    });

    let remainingStrength = strengthPerWeek;
    const strengthDays = new Set<number>();

    const pickBestCandidate = (candidates: number[]): number | null => {
        if (candidates.length === 0) return null;
        if (strengthDays.size === 0) return candidates[0];

        let bestCandidate = candidates[0];
        let bestMinDist = -1;
        for (const candidate of candidates) {
            let minDist = 7;
            for (const sd of strengthDays) {
                const diff = Math.abs(candidate - sd);
                const dist = Math.min(diff, 7 - diff);
                if (dist < minDist) minDist = dist;
            }
            if (minDist > bestMinDist) {
                bestMinDist = minDist;
                bestCandidate = candidate;
            }
        }
        return bestCandidate;
    };

    const addStrengthOnDay = (day: number): boolean => {
        if (remainingStrength <= 0 || strengthDays.has(day)) return false;
        strengthDays.add(day);
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.STRENGTH,
            description: 'Strength: 45min Session',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700,
            phase: phase as PlanPhase,
            targetHrZone: workoutTypeToHrZone(WorkoutType.STRENGTH),
        });
        remainingStrength--;
        return true;
    };

    const pairableRunDays = Array.from(new Set(workouts
        .filter(w =>
            (w.type === WorkoutType.EASY || w.type === WorkoutType.RECOVERY) &&
            !protectedDays.has(w.dayOffset) &&
            !rideDays.includes(w.dayOffset) &&
            !swimDays.includes(w.dayOffset)
        )
        .map(w => w.dayOffset)));

    while (remainingStrength > 0 && pairableRunDays.length > 0) {
        const chosen = pickBestCandidate(pairableRunDays);
        if (chosen === null) break;
        const idx = pairableRunDays.indexOf(chosen);
        if (idx >= 0) pairableRunDays.splice(idx, 1);
        addStrengthOnDay(chosen);
    }

    const freeDays: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) freeDays.push(d);
    }

    while (remainingStrength > 0 && freeDays.length > 0) {
        const chosen = pickBestCandidate(freeDays);
        if (chosen === null) break;
        const idx = freeDays.indexOf(chosen);
        if (idx >= 0) freeDays.splice(idx, 1);
        addStrengthOnDay(chosen);
    }

    const fallbackRideDays = rideDays.filter(day => !strengthDays.has(day));
    while (remainingStrength > 0 && fallbackRideDays.length > 0) {
        const chosen = pickBestCandidate(fallbackRideDays);
        if (chosen === null) break;
        const idx = fallbackRideDays.indexOf(chosen);
        if (idx >= 0) fallbackRideDays.splice(idx, 1);
        addStrengthOnDay(chosen);
    }

    return workouts;
}

function getLongRunDistance(
    raceType: RaceType,
    weeklyVolume: number,
    paces: TrainingPaces,
    maxLongRunKm?: number
): number {
    let ratio = PLAN_CONSTANTS.LONG_RUN_RATIO;

    if ((raceType === 'HALF_MARATHON' || raceType === 'MARATHON') &&
        weeklyVolume < PLAN_CONSTANTS.LOW_VOLUME_THRESHOLD) {
        ratio = PLAN_CONSTANTS.LONG_RUN_RATIO_LOW_VOLUME;
    }

    let dist = weeklyVolume * ratio;

    let dynamicCap = Math.min(
        weeklyVolume * PLAN_CONSTANTS.DYNAMIC_LONG_RUN_RATIO,
        PLAN_CONSTANTS.MAX_LONG_RUN_DIST[raceType] || 34000
    );
    if (maxLongRunKm) {
        const userCap = maxLongRunKm * 1000;
        if (userCap < dynamicCap) dynamicCap = userCap;
    }
    if (dist > dynamicCap) dist = dynamicCap;

    const safeEasyMax = Math.max(120, paces.easy.max);
    const maxDistForTime = Math.round((PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS / safeEasyMax) * 1000);
    if (dist > maxDistForTime) dist = maxDistForTime;

    if (dist < PLAN_CONSTANTS.MIN_LONG_RUN) dist = PLAN_CONSTANTS.MIN_LONG_RUN;

    return Math.round(dist / 100) * 100;
}

function getQualitySession(
    raceType: RaceType,
    paces: TrainingPaces,
    phase: Phase,
    weeklyVolume: number,
    weekInPhase: number,
    targetRacePace?: number | null,
): { type: WorkoutType; description: string; totalDistance: number; targetPace: number } {
    const scale = (session: { type: WorkoutType; description: string; totalDistance: number; targetPace: number }) => ({
        ...session,
        totalDistance: scaleQualitySessionDistance(session.type, session.totalDistance, weeklyVolume, raceType),
    });

    if (raceType === 'FIVE_K') {
        return scale(get5KQualitySession(paces, phase, weekInPhase));
    }
    if (raceType === 'TEN_K') {
        return scale(get10KQualitySession(paces, phase, weekInPhase));
    }
    if (raceType === 'HALF_MARATHON') {
        return scale(getHalfMarathonQualitySession(paces, phase, weekInPhase, targetRacePace));
    }
    return scale(getMarathonQualitySession(paces, phase, weekInPhase, targetRacePace));
}

export function scaleQualitySessionDistance(
    type: WorkoutType,
    baseDistance: number,
    weeklyVolume: number,
    raceType: RaceType,
): number {
    const qualityFraction = (() => {
        switch (type) {
            case WorkoutType.REPETITIONS: return 0.18;
            case WorkoutType.INTERVALS: return 0.22;
            case WorkoutType.FARTLEK: return 0.22;
            case WorkoutType.TEMPO:
                return raceType === 'MARATHON' || raceType === 'HALF_MARATHON' ? 0.28 : 0.25;
            default: return 0.22;
        }
    })();
    const raceFloor = raceType === 'FIVE_K' ? 6000 : raceType === 'TEN_K' ? 7000 : 8000;
    const raceCeiling = raceType === 'MARATHON' ? 18000 : raceType === 'HALF_MARATHON' ? 15000 : raceType === 'TEN_K' ? 12000 : 10000;
    const scaled = Math.round((weeklyVolume * qualityFraction) / 500) * 500;
    return Math.max(raceFloor, Math.min(scaled, Math.min(baseDistance, raceCeiling)));
}

function getFartlekHardPace(paces: TrainingPaces): number {
    return paces.threshold + 5;
}

function getFartlekDescription(
    distanceKm: number,
    hardMinutes: number,
    easyMinutes: number,
    hardPace: number,
    easyPace: number
): string {
    return `Fartlek: ${distanceKm}km (${hardMinutes}min @ F (T-I) ${formatPace(hardPace)} / ${easyMinutes}min @ E ${formatPace(easyPace)})`;
}

function get5KQualitySession(paces: TrainingPaces, phase: Phase, weekInPhase: number) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        if (weekInPhase <= 3) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(8, 2, 2, hardPace, easyPace),
                totalDistance: 8000,
                targetPace: hardPace,
            };
        }
        if (weekInPhase <= 6) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(8, 3, 2, hardPace, easyPace),
                totalDistance: 8000,
                targetPace: hardPace,
            };
        }
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(10, 4, 3, hardPace, easyPace),
            totalDistance: 10000,
            targetPace: hardPace,
        };
    }
    if (phase === 'PEAK') {
        return {
            type: WorkoutType.REPETITIONS,
            description: `Reps: 6x400m @ ${formatPace(paces.repetition)}`,
            totalDistance: 7000,
            targetPace: paces.repetition,
        };
    }
    return {
        type: WorkoutType.INTERVALS,
        description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
        totalDistance: 10000,
        targetPace: paces.interval,
    };
}

function get10KQualitySession(paces: TrainingPaces, phase: Phase, weekInPhase: number) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        if (weekInPhase <= 3) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(8, 2, 2, hardPace, easyPace),
                totalDistance: 8000,
                targetPace: hardPace,
            };
        }
        if (weekInPhase <= 6) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(10, 3, 2, hardPace, easyPace),
                totalDistance: 10000,
                targetPace: hardPace,
            };
        }
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(10, 4, 3, hardPace, easyPace),
            totalDistance: 10000,
            targetPace: hardPace,
        };
    }
    if (phase === 'PEAK') {
        return {
            type: WorkoutType.TEMPO,
            description: `Threshold: 4x2km @ ${formatPace(paces.threshold)}`,
            totalDistance: 12000,
            targetPace: paces.threshold,
        };
    }
    return {
        type: WorkoutType.INTERVALS,
        description: `Intervals: 6x1km @ ${formatPace(paces.interval)}`,
        totalDistance: 11000,
        targetPace: paces.interval,
    };
}

function getHalfMarathonQualitySession(paces: TrainingPaces, phase: Phase, weekInPhase: number, targetRacePace?: number | null) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        if (weekInPhase <= 3) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(8, 3, 2, hardPace, easyPace),
                totalDistance: 8000,
                targetPace: hardPace,
            };
        }
        if (weekInPhase <= 6) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(10, 4, 3, hardPace, easyPace),
                totalDistance: 10000,
                targetPace: hardPace,
            };
        }
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(12, 5, 3, hardPace, easyPace),
            totalDistance: 12000,
            targetPace: hardPace,
        };
    }
    if (phase === 'PEAK') {
        const hmRacePace = targetRacePace ?? Math.round((paces.marathon + paces.threshold) / 2);
        return {
            type: WorkoutType.TEMPO,
            description: `HM Pace Segments: 3x3km @ ${formatPace(hmRacePace)}`,
            totalDistance: 13000,
            targetPace: hmRacePace,
        };
    }
    if (weekInPhase <= 3) {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 5x800m @ ${formatPace(paces.interval)}`,
            totalDistance: 10000,
            targetPace: paces.interval,
        };
    }
    if (weekInPhase <= 6) {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 6x800m @ ${formatPace(paces.interval)}`,
            totalDistance: 11000,
            targetPace: paces.interval,
        };
    }
    return {
        type: WorkoutType.INTERVALS,
        description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
        totalDistance: 12000,
        targetPace: paces.interval,
    };
}

function getMarathonQualitySession(paces: TrainingPaces, phase: Phase, weekInPhase: number, targetRacePace?: number | null) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        if (weekInPhase <= 3) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(10, 3, 2, hardPace, easyPace),
                totalDistance: 10000,
                targetPace: hardPace,
            };
        }
        if (weekInPhase <= 6) {
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(12, 4, 3, hardPace, easyPace),
                totalDistance: 12000,
                targetPace: hardPace,
            };
        }
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(12, 5, 3, hardPace, easyPace),
            totalDistance: 12000,
            targetPace: hardPace,
        };
    }
    if (phase === 'PEAK') {
        const marathonPace = targetRacePace ?? paces.marathon;
        return {
            type: WorkoutType.TEMPO,
            description: `MP Segments: 3x5km @ ${formatPace(marathonPace)}`,
            totalDistance: 18000,
            targetPace: marathonPace,
        };
    }
    return {
        type: WorkoutType.INTERVALS,
        description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
        totalDistance: 13000,
        targetPace: paces.interval,
    };
}

function getAvailableCrossTrainingDays(count: number, usedDays: Set<number>, protectedDays: Set<number>): number[] {
    if (count <= 0) return [];

    const available: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d) && !protectedDays.has(d)) available.push(d);
    }

    const toTake = Math.min(count, available.length);
    const idealInterval = available.length / toTake;
    const selected: number[] = [];
    const pickedIndices: number[] = [];

    for (let i = 0; i < toTake; i++) {
        const targetIndex = Math.floor(i * idealInterval);
        const idx = Math.min(targetIndex, available.length - 1);
        if (!pickedIndices.includes(idx)) {
            pickedIndices.push(idx);
            selected.push(available[idx]);
        }
    }

    return selected;
}

function getDistributedDays(count: number, usedDays: Set<number>, allowDoubleDays = false, existingWorkouts: ScheduledWorkout[] = []): number[] {
    if (count <= 0) return [];

    let availableDays: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) availableDays.push(d);
    }

    const selectedDays: number[] = [];
    let remaining = count;

    while (remaining > 0) {
        if (availableDays.length === 0) {
            if (!allowDoubleDays) break;
            
            // Fallback: Pick days with the least number of scheduled workouts
            const dayCounts = new Array(7).fill(0);
            for (const w of existingWorkouts) {
                if (w.dayOffset >= 0 && w.dayOffset < 7) {
                    dayCounts[w.dayOffset]++;
                }
            }
            
            const minCount = Math.min(...dayCounts);
            availableDays = [];
            for (let d = 0; d < 7; d++) {
                if (dayCounts[d] === minCount) availableDays.push(d);
            }
            
            // If still empty (shouldn't happen), just use all days
            if (availableDays.length === 0) availableDays = [0, 1, 2, 3, 4, 5, 6];
        }

        const toTake = Math.min(remaining, availableDays.length);
        const idealInterval = availableDays.length / toTake;

        // Collect indices to pick, then remove them in reverse order to not shift indices
        const indicesToPick: number[] = [];
        for (let i = 0; i < toTake; i++) {
            const targetIndex = Math.floor(i * idealInterval);
            indicesToPick.push(Math.min(targetIndex, availableDays.length - 1));
        }

        for (const idx of indicesToPick) {
            selectedDays.push(availableDays[idx]);
        }
        
        availableDays = availableDays.filter((_, idx) => !indicesToPick.includes(idx));
        
        remaining -= toTake;
    }

    return selectedDays;
}

function scaleToVolumeCap(weekSchedule: ScheduledWorkout[], weekVolumeCap: number): ScheduledWorkout[] {
    const roundDownTo100 = (meters: number): number => {
        if (meters <= 0) return 0;
        return Math.floor(meters / 100) * 100;
    };

    const isPriority = (w: ScheduledWorkout) =>
        w.type === WorkoutType.LONG_RUN ||
        w.type === WorkoutType.INTERVALS ||
        w.type === WorkoutType.TEMPO ||
        w.type === WorkoutType.RACE ||
        w.type === WorkoutType.FARTLEK ||
        w.type === WorkoutType.REPETITIONS ||
        w.description.includes('Fartlek') ||
        w.description.includes('MP Segment') ||
        w.description.includes('HM Pace Segment');

    const runningWorkouts = weekSchedule.filter(w => isRun(w.type));
    const priorityWorkouts = runningWorkouts.filter(isPriority);
    const fillWorkouts = runningWorkouts.filter(w => !isPriority(w));

    const priorityDist = priorityWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);
    const fillDist = fillWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

    let remainingCap = weekVolumeCap - priorityDist;

    if (remainingCap < 0) {
        const scalingFactor = weekVolumeCap / priorityDist;
        return weekSchedule.map(w => {
            if (!isRun(w.type)) return w;
            if (!isPriority(w)) {
                return { ...w, totalDistance: 0, targetDuration: 0, description: 'Rest (Volume Cap)' };
            }
            const newDist = roundDownTo100(w.totalDistance * scalingFactor);
            const finalDist = Math.max(newDist, 0);
            return withScaledDistance(w, finalDist, preserveSpecialDescription(w, finalDist));
        });
    }

    const fillScalingFactor = fillDist > 0 ? remainingCap / fillDist : 0;
    return weekSchedule.map(w => {
        if (!isRun(w.type) || isPriority(w)) return w;
        const newDist = roundDownTo100(w.totalDistance * fillScalingFactor);
        if (newDist > 0 && newDist < PLAN_CONSTANTS.EASY_RUN_MIN) {
            return { ...w, totalDistance: 0, targetDuration: 0, description: 'Rest (Volume Cap)' };
        }
        return withScaledDistance(w, newDist, preserveSpecialDescription(w, newDist));
    });
}

function withScaledDistance(w: ScheduledWorkout, distance: number, description: string): ScheduledWorkout {
    const previousDistance = w.totalDistance;
    let targetDuration = w.targetDuration ?? 0;
    if (distance <= 0) {
        targetDuration = 0;
    } else if (targetDuration > 0 && previousDistance > 0) {
        targetDuration = Math.round(targetDuration * (distance / previousDistance));
    } else if (w.targetPace && w.targetPace > 0) {
        targetDuration = computeDuration(distance, w.targetPace);
    }

    return {
        ...w,
        totalDistance: distance,
        targetDuration,
        description,
    };
}

function preserveSpecialDescription(w: ScheduledWorkout, distance: number): string {
    const distanceKm = (distance / 1000).toFixed(1);

    if (w.description.includes('progressive')) {
        const match = w.description.match(/^(Long Run):\s*[\d.]+km(\s*\(last \d+km progressive\))/);
        if (match) {
            return `${match[1]}: ${(distance / 1000).toFixed(1)}km${match[2]}`;
        }
    }

    if (w.description.includes('Fartlek')) {
        const match = w.description.match(/^Fartlek:\s*[0-9.]+km(.*)$/);
        const suffix = match ? match[1] : '';
        return `Fartlek: ${distanceKm}km${suffix}`;
    }

    if (w.description.includes('Strides')) {
        const match = w.description.match(/^(Easy Run|Recovery Run):\s*[0-9.]+km(.*Strides.*)$/);
        if (match) {
            return `${match[1]}: ${distanceKm}km${match[2]}`;
        }
        return updateDescription(w.type, distance, w.targetPace || 0);
    }

    if (w.type === WorkoutType.INTERVALS || w.type === WorkoutType.REPETITIONS) {
        return w.description;
    }

    if (w.type === WorkoutType.TEMPO && (w.description.includes('Threshold:') || w.description.includes('MP Segments') || w.description.includes('HM Pace Segments'))) {
        return w.description;
    }

    if (w.description.includes('MP')) {
        return w.description;
    }
    if (w.description.includes('Goal Pace')) {
        return w.description;
    }
    return updateDescription(w.type, distance, w.targetPace || 0);
}

function getRaceDistanceKm(raceType: RaceType, customDistanceM?: number | null): string {
    switch (raceType) {
        case 'FIVE_K': return '5';
        case 'TEN_K': return '10';
        case 'HALF_MARATHON': return '21.1';
        case 'MARATHON': return '42.2';
        case 'FIFTY_K': return '50';
        case 'FIFTY_MILE': return '80.5';
        case 'HUNDRED_K': return '100';
        case 'HUNDRED_MILE': return '161';
        case 'CUSTOM_DISTANCE': return customDistanceM && customDistanceM > 0 ? (customDistanceM / 1000).toFixed(1) : '0';
        default: return '0';
    }
}

function getRaceDistanceMeters(raceType: RaceType, customDistanceM?: number | null): number {
    switch (raceType) {
        case 'FIVE_K': return 5000;
        case 'TEN_K': return 10000;
        case 'HALF_MARATHON': return 21097;
        case 'MARATHON': return 42195;
        case 'FIFTY_K': return 50000;
        case 'FIFTY_MILE': return 80467;
        case 'HUNDRED_K': return 100000;
        case 'HUNDRED_MILE': return 160934;
        case 'CUSTOM_DISTANCE': return customDistanceM && customDistanceM > 0 ? customDistanceM : 0;
        default: return 0;
    }
}

function getTargetRacePaceSeconds(raceType: RaceType, targetTime?: number | null, customDistanceM?: number | null): number | null {
    if (!targetTime || targetTime <= 0) return null;
    const distanceMeters = getRaceDistanceMeters(raceType, customDistanceM);
    if (!distanceMeters || distanceMeters <= 0) return null;
    return Math.round((targetTime / distanceMeters) * 1000);
}

function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isRun(type: WorkoutType): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
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

function getRunQualityHrZone(workout: { type: WorkoutType; description?: string }): number | undefined {
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

/**
 * Context used to resolve pace / power / HR / swim targets when building the
 * canonical v2 structured step tree. Everything is optional: sensible defaults
 * are derived from `vdot` (bike FTP from VDOT, swim CSS from VDOT, VDOT 45)
 * so the builder never throws on partial input.
 */
export interface StructuredStepsContext {
    vdot?: number;
    ftpWatts?: number;
    swimCssSecPer100m?: number;
    /** Pre-resolved HR zone bpm bounds (from `resolveHrZones`). */
    hrZones?: HrZoneDefinition[] | null;
}

/** Minimal workout surface the structured-steps builder reads AND mutates. */
export type StructuredStepsWorkout = Partial<Pick<
    GeneratedWorkout,
    | 'type' | 'description' | 'totalDistance' | 'targetPace' | 'targetDuration' | 'targetHrZone'
    | 'targetPaceMinSecondsPerKm' | 'targetPaceMaxSecondsPerKm' | 'targetPaceZoneLabel'
    | 'targetHrZoneLabel' | 'targetHrMinBpm' | 'targetHrMaxBpm'
    | 'targetPowerWatts' | 'targetPowerMinWatts' | 'targetPowerMaxWatts' | 'targetPowerZone'
    | 'targetFtpPercent' | 'targetCadenceRpm' | 'targetRpe'
>> & {
    type?: WorkoutType | string;
    workoutType?: WorkoutType | string;
    description?: string;
    totalDistance?: number;
    distanceMeters?: number;
    sport?: string;
    vdot?: number;
    ftpWatts?: number;
};

const clampInt = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, Math.round(value)));

const clampStepSeconds = (seconds: number): number => clampInt(seconds, 1, 86400);
const clampStepMeters = (meters: number): number => clampInt(meters, 1, 100000);

function timeStep(
    kind: StructuredStep['kind'],
    label: string,
    seconds: number,
    extra?: Partial<StructuredStep>,
): StructuredStep {
    return { kind, label, duration: { type: 'time', seconds: clampStepSeconds(seconds) }, ...extra };
}

function distanceStep(
    kind: StructuredStep['kind'],
    label: string,
    meters: number,
    extra?: Partial<StructuredStep>,
): StructuredStep {
    return { kind, label, duration: { type: 'distance', meters: clampStepMeters(meters) }, ...extra };
}

/** Power target for a bike zone range, with a midpoint %FTP and zone label. */
function powerTarget(zone: { min: number; max: number }, label: string, ftpWatts: number): Target {
    const midWatts = (zone.min + zone.max) / 2;
    return {
        type: 'power',
        minWatts: Math.round(zone.min),
        maxWatts: Math.round(zone.max),
        ftpPercent: ftpWatts > 0 ? Math.round((midWatts / ftpWatts) * 100) : undefined,
        zoneLabel: label,
    };
}

/** Pace target fixed at one sec/km value (the generator's exact step pace). */
function exactPaceTarget(paceSecPerKm: number): Target {
    const pace = Math.round(paceSecPerKm);
    return { type: 'pace', unit: 'sec_per_km', min: pace, max: pace };
}

/** Pace window around a sec/km value (±3%), used for brick run legs. */
function paceWindowTarget(paceSecPerKm: number, label?: string): Target {
    return {
        type: 'pace',
        unit: 'sec_per_km',
        min: Math.round(paceSecPerKm * 0.97),
        max: Math.round(paceSecPerKm * 1.03),
        zoneLabel: label,
    };
}

function repeatGroup(
    times: number,
    setRest: Duration | undefined,
    steps: StepNode[],
    label?: string,
): RepeatGroup {
    const group: RepeatGroup = { kind: 'repeat', times: clampInt(times, 1, MAX_REPEAT_TIMES), steps };
    if (setRest) group.setRest = setRest;
    if (label) group.label = label;
    return group;
}

/**
 * Fill the workout-level numeric target fields the builder can derive, WITHOUT
 * overwriting values the enrichment pipeline already set (every write is
 * guarded by `== null`).
 */
function populateStructuredTargets(
    workout: StructuredStepsWorkout,
    paces: TrainingPaces,
    hrZones: HrZoneDefinition[] | null,
    bikeZones: BikeZones,
    bikeFtp: number,
    bikeZoneNumber: number | null,
    bikeCadenceRpm: number | null,
): void {
    const paceTarget = getPaceTarget(
        { type: workout.type as WorkoutType, description: workout.description || '', targetPace: workout.targetPace },
        paces,
    );
    if (paceTarget) {
        if (workout.targetPaceMinSecondsPerKm == null) workout.targetPaceMinSecondsPerKm = paceTarget.min;
        if (workout.targetPaceMaxSecondsPerKm == null) workout.targetPaceMaxSecondsPerKm = paceTarget.max;
        if (workout.targetPaceZoneLabel == null) workout.targetPaceZoneLabel = paceTarget.label;
    }

    const hrTarget = getZoneTarget(workout.targetHrZone, hrZones);
    if (hrTarget) {
        if (workout.targetHrZoneLabel == null) workout.targetHrZoneLabel = hrTarget.label;
        if (workout.targetHrMinBpm == null) workout.targetHrMinBpm = hrTarget.min;
        if (workout.targetHrMaxBpm == null) workout.targetHrMaxBpm = hrTarget.max;
    }

    if (bikeZoneNumber != null) {
        const zone = bikeZoneNumber === 4 ? bikeZones.threshold : bikeZones.endurance;
        const midWatts = Math.round((zone.min + zone.max) / 2);
        if (workout.targetPowerWatts == null) workout.targetPowerWatts = midWatts;
        if (workout.targetPowerMinWatts == null) workout.targetPowerMinWatts = zone.min;
        if (workout.targetPowerMaxWatts == null) workout.targetPowerMaxWatts = zone.max;
        if (workout.targetPowerZone == null) workout.targetPowerZone = bikeZoneNumber;
        if (workout.targetFtpPercent == null && bikeFtp > 0) {
            workout.targetFtpPercent = Math.round((midWatts / bikeFtp) * 100);
        }
        if (bikeCadenceRpm != null && workout.targetCadenceRpm == null) {
            workout.targetCadenceRpm = bikeCadenceRpm;
        }
    }
}

/**
 * Build the canonical v2 structured step tree for a generated workout and
 * populate its first-class numeric target fields (task A2, step 1).
 *
 * Sport coverage:
 *   - RUN (EASY / LONG_RUN / RECOVERY / TEMPO / INTERVALS / REPETITIONS /
 *     FARTLEK / RACE): the exact v1 step paces, distances, durations and
 *     `hrZone` numbers, wrapped in v2 — intervals/repeats/fartlek mains become
 *     `RepeatGroup`s whose flatten yields the identical work/recovery sequence.
 *   - BIKE (RIDE / LONG_RIDE / RIDE_INTERVALS): power targets from
 *     `calculateBikeZones(ftp)` plus cadence (85–95 RPM endurance,
 *     90–100 RPM intervals), and the workout-level `targetPower*` columns.
 *   - SWIM (SWIM / SWIM_DRILL / OPEN_WATER_SWIM): warmup + main-set
 *     `RepeatGroup` in meters with a 20s `setRest` + cooldown, with
 *     `sec_per_100m` pace windows from `calculateSwimPaces(swimCss)`.
 *   - BRICK: bike steady (power) → 120s `T2 Bike-to-Run Transition` → run leg
 *     (pace).
 *   - STRENGTH: warmup + main circuit `RepeatGroup` + mobility cooldown with
 *     RPE targets (work rounds at RPE 7).
 *
 * Returns null when the workout carries neither distance nor duration.
 */
export function buildStructuredStepsForWorkout(
    workout: StructuredStepsWorkout,
    context: StructuredStepsContext = {},
): StructuredWorkoutV2 | null {
    const rawType = workout.type || workout.workoutType;
    if (!rawType) return null;
    const type = rawType as WorkoutType;
    const totalDist = workout.totalDistance ?? workout.distanceMeters ?? 0;
    const targetDur = workout.targetDuration ?? null;
    if (totalDist <= 0 && (!targetDur || targetDur <= 0)) return null;

    workout.type = type;
    workout.totalDistance = totalDist;
    if (!workout.description) {
        workout.description = typeof rawType === 'string' ? rawType : 'Workout';
    }

    const vdot = context.vdot && context.vdot > 0
        ? context.vdot
        : (workout.vdot && workout.vdot > 0 ? workout.vdot : 45);
    const bikeFtp = context.ftpWatts && context.ftpWatts > 0
        ? Math.round(context.ftpWatts)
        : (workout.ftpWatts && workout.ftpWatts > 0 ? Math.round(workout.ftpWatts) : estimateBikeFtpFromVdot(vdot));
    const swimCss = context.swimCssSecPer100m && context.swimCssSecPer100m > 0
        ? context.swimCssSecPer100m
        : estimateSwimPaceFromVdot(vdot);
    const bikeZones = calculateBikeZones(bikeFtp);
    const swimPaces = calculateSwimPaces(swimCss);
    const paces = calculateTrainingPaces(vdot);
    const easyPaceWindowTarget: Target = {
        type: 'pace',
        unit: 'sec_per_km',
        min: Math.round(paces.easy.min),
        max: Math.round(paces.easy.max),
        zoneLabel: 'E',
    };
    const targetPace = workout.targetPace && workout.targetPace > 0 ? workout.targetPace : undefined;
    const hrZone = workout.targetHrZone;

    // 1. STRENGTH & TRANSITION PRACTICE — RPE-targeted circuits.
    if (type === WorkoutType.STRENGTH || type === WorkoutType.TRANSITION_PRACTICE) {
        if (type === WorkoutType.TRANSITION_PRACTICE) {
            populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
            if (workout.targetRpe == null) workout.targetRpe = 5;
            return {
                version: 2,
                source: 'engine',
                steps: [timeStep('steady', 'Transition Practice', workout.targetDuration || 1800, {
                    target: { type: 'rpe', value: 5 },
                })],
            };
        }

        const totalSec = workout.targetDuration && workout.targetDuration > 0 ? workout.targetDuration : 2700;
        const warmupSec = Math.max(240, Math.round(totalSec * 0.12));
        const cooldownSec = Math.max(240, Math.round(totalSec * 0.12));
        const roundRestSec = 60;
        const rounds = 3;
        const roundSec = Math.max(
            240,
            Math.round((totalSec - warmupSec - cooldownSec - roundRestSec * (rounds - 1)) / rounds),
        );

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        if (workout.targetRpe == null) workout.targetRpe = 7;

        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('warmup', 'Warmup & Mobility', warmupSec, { target: { type: 'rpe', value: 4 } }),
                repeatGroup(rounds, { type: 'time', seconds: roundRestSec }, [
                    timeStep('work', 'Strength Circuit', roundSec, { target: { type: 'rpe', value: 7 } }),
                ], 'Main Circuit'),
                timeStep('cooldown', 'Mobility & Stretching', cooldownSec, { target: { type: 'rpe', value: 3 } }),
            ],
        };
    }

    // 2. BRICK — bike steady (power) → T2 transition → run leg (pace).
    if (type === WorkoutType.BRICK) {
        const match = workout.description.match(/(\d+)\s*min\s*Bike\s*(?:\u2192|->)\s*(\d+)\s*min\s*Run/i);
        const bikeSeconds = (match ? parseInt(match[1]) : 45) * 60;
        const runSeconds = (match ? parseInt(match[2]) : 15) * 60;
        const runBrickPace = targetPace ?? Math.round((paces.easy.min + paces.easy.max) / 2);

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, 2, 90);

        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('steady', 'Bike Leg', bikeSeconds, {
                    target: powerTarget(bikeZones.endurance, 'Z2 Endurance', bikeFtp),
                    cadenceRpm: 90,
                    hrZone: 2,
                }),
                timeStep('transition', 'T2 Bike-to-Run Transition', 120, { target: { type: 'free' } }),
                timeStep('work', 'Run Leg', runSeconds, {
                    target: paceWindowTarget(runBrickPace, 'Brick Run'),
                    hrZone: hrZone ?? 2,
                }),
            ],
        };
    }

    // 3. BIKE RIDES (Steady & Intervals) — power targets + cadence.
    if (type === WorkoutType.RIDE || type === WorkoutType.LONG_RIDE) {
        const durationSec = workout.targetDuration && workout.targetDuration > 0 ? workout.targetDuration : 3600;
        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, 2, 90);
        return {
            version: 2,
            source: 'engine',
            steps: [timeStep('steady', type === WorkoutType.LONG_RIDE ? 'Long Ride' : 'Easy Ride', durationSec, {
                target: powerTarget(bikeZones.endurance, 'Z2 Endurance', bikeFtp),
                cadenceRpm: 90,
                hrZone: hrZone ?? 2,
            })],
        };
    }

    if (type === WorkoutType.RIDE_INTERVALS) {
        const match = workout.description.match(/(\d+)x(\d+)\s*min/i);
        const reps = match ? parseInt(match[1]) : 4;
        const repMinutes = match ? parseInt(match[2]) : 5;

        const warmupSeconds = 600;
        const repSeconds = repMinutes * 60;
        const recoverySeconds = 180;
        const fixedSeconds = warmupSeconds + (reps * repSeconds) + ((reps - 1) * recoverySeconds);
        const cooldownSeconds = Math.max(300, (workout.targetDuration || 0) - fixedSeconds);

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, 4, 95);

        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('warmup', 'Warm up spin', warmupSeconds, {
                    target: powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp),
                    cadenceRpm: 85,
                    hrZone: 1,
                }),
                repeatGroup(reps, { type: 'time', seconds: recoverySeconds }, [
                    timeStep('work', 'Interval', repSeconds, {
                        target: powerTarget(bikeZones.threshold, 'Z4 Threshold', bikeFtp),
                        cadenceRpm: 95,
                        hrZone: hrZone ?? 4,
                    }),
                ], `${reps}×${repMinutes}min`),
                timeStep('cooldown', 'Cool down spin', cooldownSeconds, {
                    target: powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp),
                    cadenceRpm: 85,
                    hrZone: 1,
                }),
            ],
        };
    }

    // 4. SWIM SETS — warmup + main-set repeat group (meters, 20s setRest) + cooldown.
    if (type === WorkoutType.SWIM || type === WorkoutType.SWIM_DRILL || type === WorkoutType.OPEN_WATER_SWIM) {
        const totalDist = workout.totalDistance;
        const warmup = Math.min(200, Math.max(50, Math.round(totalDist * 0.15 / 50) * 50));
        const cooldown = Math.min(200, Math.max(50, Math.round(totalDist * 0.15 / 50) * 50));
        const mainSetDist = Math.max(0, totalDist - warmup - cooldown);

        // Pace windows: ground in calculateSwimPaces(css); when the generator
        // supplied an explicit sec/100m targetPace, center the main-set window
        // on it (±3%) so step targets agree with the workout-level pace.
        const easyWindow = swimPaces.easy;
        const warmupPaceTarget: Target = targetPace
            ? {
                type: 'pace', unit: 'sec_per_100m',
                min: Math.round(targetPace * 1.02), max: Math.round(targetPace * 1.08),
                zoneLabel: easyWindow.label,
            }
            : { type: 'pace', unit: 'sec_per_100m', min: easyWindow.min, max: easyWindow.max, zoneLabel: easyWindow.label };
        const mainWindow = swimPaces.steady;
        const mainPaceTarget: Target = targetPace
            ? {
                type: 'pace', unit: 'sec_per_100m',
                min: Math.round(targetPace * 0.97), max: Math.round(targetPace * 1.03),
                zoneLabel: type === WorkoutType.SWIM_DRILL ? 'Swim Drill' : mainWindow.label,
            }
            : { type: 'pace', unit: 'sec_per_100m', min: mainWindow.min, max: mainWindow.max, zoneLabel: mainWindow.label };

        const repDistance = type === WorkoutType.SWIM_DRILL ? 50 : 100;
        const steps: StepNode[] = [
            distanceStep('warmup', 'Warm up swim', warmup, { target: warmupPaceTarget, hrZone: 1 }),
        ];
        if (mainSetDist > 0) {
            const times = clampInt(Math.floor(mainSetDist / repDistance), 1, MAX_REPEAT_TIMES);
            const remainder = mainSetDist - times * repDistance;
            steps.push(repeatGroup(
                times,
                { type: 'time', seconds: 20 },
                [distanceStep('work', type === WorkoutType.SWIM_DRILL ? 'Drill' : 'Swim', repDistance, {
                    target: mainPaceTarget,
                    hrZone: hrZone ?? 2,
                })],
                `Main Set ${times}×${repDistance}m`,
            ));
            if (remainder >= repDistance / 2) {
                steps.push(distanceStep('steady', 'Steady swim', remainder, { target: mainPaceTarget, hrZone: hrZone ?? 2 }));
            }
        }
        steps.push(distanceStep('cooldown', 'Cool down swim', cooldown, { target: warmupPaceTarget, hrZone: 1 }));

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        return { version: 2, source: 'engine', steps };
    }

    // 5. RUN EASY / RECOVERY — flat steady step, or steady + strides repeat group.
    if (type === WorkoutType.EASY || type === WorkoutType.RECOVERY) {
        const stridesMatch = workout.description.match(/(\d+)x(\d+)m\s*Strides/i);
        if (stridesMatch) {
            const reps = parseInt(stridesMatch[1], 10);
            const repMeters = parseInt(stridesMatch[2], 10);
            const stridesTotalDist = reps * repMeters;
            const mainDist = workout.totalDistance > stridesTotalDist
                ? workout.totalDistance - stridesTotalDist
                : (workout.totalDistance > 0 ? workout.totalDistance : 0);

            const mainStep: StructuredStep = mainDist > 0
                ? distanceStep('steady', type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run', mainDist, {
                    target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget,
                    hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2),
                })
                : timeStep('steady', type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run', workout.targetDuration || 3600, {
                    target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget,
                    hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2),
                });

            const repPace = Math.round(paces.repetition);
            const strideStep = distanceStep('work', 'Strides', repMeters, {
                target: { type: 'pace', unit: 'sec_per_km', min: repPace, max: repPace, zoneLabel: 'R' },
                hrZone: 5,
            });

            const stridesGroup = repeatGroup(
                reps,
                { type: 'time', seconds: 60 },
                [strideStep],
                `${reps}×${repMeters}m Strides`,
            );

            populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
            return {
                version: 2,
                source: 'engine',
                steps: [mainStep, stridesGroup],
            };
        }

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        const step: StructuredStep = workout.totalDistance > 0
            ? distanceStep('steady',
                type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run',
                workout.totalDistance, { hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2), target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget })
            : timeStep('steady',
                type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run',
                workout.targetDuration || 3600, { hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2), target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget });
        return { version: 2, source: 'engine', steps: [step] };
    }

    // 5b. RUN LONG RUN — flat steady step, or steady easy + goal pace / progressive finish.
    if (type === WorkoutType.LONG_RUN) {
        const goalPaceMatch = workout.description.match(/([\d.]+)km\s*Easy\s*\+\s*([\d.]+)km\s*@\s*Goal\s*Pace/i);
        const progMatch = workout.description.match(/last\s*(\d+(?:\.\d+)?)\s*km\s*progressive/i);

        if (goalPaceMatch || progMatch) {
            let easyDist: number;
            let finishDist: number;
            let finishLabel: string;

            if (goalPaceMatch) {
                easyDist = Math.round(parseFloat(goalPaceMatch[1]) * 1000);
                finishDist = Math.round(parseFloat(goalPaceMatch[2]) * 1000);
                finishLabel = 'Goal Pace finish';
            } else {
                const progKm = parseFloat(progMatch![1]);
                finishDist = Math.round(progKm * 1000);
                easyDist = Math.max(0, workout.totalDistance - finishDist);
                finishLabel = 'Progressive finish';
            }

            populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
            return {
                version: 2,
                source: 'engine',
                steps: [
                    distanceStep('steady', 'Easy segment', easyDist > 0 ? easyDist : 1000, {
                        target: easyPaceWindowTarget,
                        hrZone: 2,
                    }),
                    distanceStep('work', finishLabel, finishDist, {
                        target: paceWindowTarget(paces.marathon, 'M'),
                        hrZone: 3,
                    }),
                ],
            };
        }

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        const step: StructuredStep = workout.totalDistance > 0
            ? distanceStep('steady', 'Long run', workout.totalDistance, { hrZone: hrZone ?? 2, target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget })
            : timeStep('steady', 'Long run', workout.targetDuration || 3600, { hrZone: hrZone ?? 2, target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget });
        return { version: 2, source: 'engine', steps: [step] };
    }

    // 6. RUN QUALITY / INTERVALS — RepeatGroup so the flattened work/recovery
    // sequence is identical to the v1 flat list.
    const repMatch = workout.description.match(/(\d+)x(\d+(?:\.\d+)?)\s*(km|m)/i);
    if (repMatch) {
        const reps = parseInt(repMatch[1]);
        const value = parseFloat(repMatch[2]);
        const unit = repMatch[3].toLowerCase();
        const repDistMeters = unit === 'km' ? value * 1000 : value;

        let warmupDistance = workout.totalDistance >= 5000 ? 1500 : 0;
        let cooldownDistance = workout.totalDistance >= 5000 ? 1000 : 0;
        const workDistance = reps * repDistMeters;
        const supportDistance = Math.max(0, workout.totalDistance - workDistance);
        if (warmupDistance + cooldownDistance > supportDistance) {
            warmupDistance = Math.round(supportDistance * 0.6);
            cooldownDistance = supportDistance - warmupDistance;
        }
        const recoveryDistance = reps > 1
            ? Math.max(0, (supportDistance - warmupDistance - cooldownDistance) / (reps - 1))
            : 0;

        const steps: StepNode[] = [];
        if (warmupDistance >= 1) {
            steps.push(distanceStep('warmup', 'Warm up', warmupDistance, { hrZone: 1, target: easyPaceWindowTarget }));
        }

        const setRest: Duration = recoveryDistance >= 1
            ? { type: 'distance', meters: clampStepMeters(recoveryDistance) }
            : { type: 'time', seconds: 120 };

        const workStep = distanceStep('work', 'Rep', repDistMeters, { hrZone });
        if (targetPace) workStep.target = exactPaceTarget(targetPace);
        const repLabel = repDistMeters >= 1000
            ? `${Number.isInteger(repDistMeters / 1000) ? repDistMeters / 1000 : (repDistMeters / 1000).toFixed(1)}km`
            : `${Math.round(repDistMeters)}m`;
        steps.push(repeatGroup(reps, setRest, [workStep], `${reps}×${repLabel}`));

        if (cooldownDistance >= 1) {
            steps.push(distanceStep('cooldown', 'Cool down', cooldownDistance, { hrZone: 1, target: easyPaceWindowTarget }));
        }

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        return { version: 2, source: 'engine', steps };
    }

    // 7. RUN FARTLEK — hard/easy cycles as a RepeatGroup (recovery inside).
    const fartlekMatch = workout.description.match(/(\d+)\s*min\s*(?:hard|@\s*F).*?(\d+)\s*min\s*(?:easy|@\s*E)/i);
    if (fartlekMatch) {
        const hardMin = parseInt(fartlekMatch[1]);
        const easyMin = parseInt(fartlekMatch[2]);
        const cycleSeconds = (hardMin + easyMin) * 60;

        const warmupSeconds = 600;
        const cooldownSeconds = 600;
        const totalSecs = workout.targetDuration || Math.round((workout.totalDistance / 1000) * (targetPace || 300));
        const mainSecs = Math.max(cycleSeconds, totalSecs - warmupSeconds - cooldownSeconds);
        const reps = Math.max(1, Math.floor(mainSecs / cycleSeconds));

        const workStep = timeStep('work', 'Fartlek Hard', hardMin * 60, { hrZone });
        if (targetPace) workStep.target = exactPaceTarget(targetPace);
        const easyStep = timeStep('recovery', 'Fartlek Easy', easyMin * 60, {
            hrZone: 2,
        });
        if (targetPace) easyStep.target = exactPaceTarget(Math.round(targetPace * 1.15));

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('warmup', 'Warm up', warmupSeconds, { hrZone: 1, target: easyPaceWindowTarget }),
                repeatGroup(reps, undefined, [workStep, easyStep], 'Fartlek Cycles'),
                timeStep('cooldown', 'Cool down', cooldownSeconds, { hrZone: 1, target: easyPaceWindowTarget }),
            ],
        };
    }

    // 8. Generic fallback — warmup + work + cooldown around the main body.
    const warmupDistance = workout.totalDistance >= 5000 ? 1500 : 0;
    const cooldownDistance = workout.totalDistance >= 5000 ? 1000 : 0;
    const remainingDistance = Math.max(0, workout.totalDistance - warmupDistance - cooldownDistance);

    const steps: StepNode[] = [];
    if (warmupDistance >= 1) {
        steps.push(distanceStep('warmup', 'Warm up', warmupDistance, { hrZone: 1, target: easyPaceWindowTarget }));
    }
    const workStep = distanceStep(
        'work',
        workout.description.split(':')[0] || 'Main set',
        remainingDistance > 0 ? remainingDistance : workout.totalDistance,
        { hrZone },
    );
    if (targetPace) workStep.target = exactPaceTarget(targetPace);
    steps.push(workStep);
    if (cooldownDistance >= 1) {
        steps.push(distanceStep('cooldown', 'Cool down', cooldownDistance, { hrZone: 1, target: easyPaceWindowTarget }));
    }

    populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
    return { version: 2, source: 'engine', steps };
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
        if (w.phase && acc.phase === null) acc.phase = w.phase;
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

function updateDescription(type: WorkoutType, distance: number, pace: number): string {
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
    config: Pick<PlanConfig, 'vdot' | 'targetVdot' | 'thresholdHeartRate' | 'hrZoneMethod' | 'hrZone1Max' | 'hrZone2Max' | 'hrZone3Max' | 'hrZone4Max' | 'hrZone5Max' | 'hrZone6Max' | 'hrMax' | 'hrRest'> & { usePhaseVdot?: boolean },
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

    const bikeFtp = estimateBikeFtpFromVdot(config.vdot);
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

function getPaceTarget(
    workout: Pick<GeneratedWorkout, 'type' | 'description' | 'targetPace'>,
    paces: TrainingPaces,
): { label: string; min: number; max: number } | null {
    if (!workout.targetPace || workout.targetPace <= 0) return null;

    switch (workout.type) {
        case WorkoutType.SWIM:
        case WorkoutType.SWIM_DRILL:
        case WorkoutType.OPEN_WATER_SWIM:
            return {
                label: workout.type === WorkoutType.SWIM_DRILL ? 'Swim Drill' : workout.type === WorkoutType.OPEN_WATER_SWIM ? 'OW Swim' : 'Swim Pace',
                min: Math.round(workout.targetPace * 0.95),
                max: Math.round(workout.targetPace * 1.05),
            };
        case WorkoutType.EASY:
        case WorkoutType.LONG_RUN:
        case WorkoutType.RECOVERY:
            return { label: 'Easy', min: paces.easy.min, max: paces.easy.max };
        case WorkoutType.TEMPO:
            if (workout.description.includes('HM Pace Segments')) {
                return paceWindow('HM Race Pace', workout.targetPace, 0.03);
            }
            if (workout.description.includes('MP Segments') || workout.description.includes('MP')) {
                return paceWindow('Marathon Pace', workout.targetPace, 0.03);
            }
            return paceWindow('Threshold', paces.threshold, 0.03);
        case WorkoutType.INTERVALS:
            return paceWindow('Interval', paces.interval, 0.02);
        case WorkoutType.REPETITIONS:
            return paceWindow('Repetition', paces.repetition, 0.02);
        case WorkoutType.FARTLEK:
            return {
                label: 'Fartlek',
                min: Math.min(paces.interval, paces.threshold),
                max: Math.max(paces.interval, paces.threshold),
            };
        case WorkoutType.RACE:
            return paceWindow('Race Pace', workout.targetPace, 0.03);
        default:
            return paceWindow('Target Pace', workout.targetPace, 0.03);
    }
}

function paceWindow(label: string, paceSecondsPerKm: number, fraction: number): { label: string; min: number; max: number } {
    return {
        label,
        min: Math.round(paceSecondsPerKm * (1 - fraction)),
        max: Math.round(paceSecondsPerKm * (1 + fraction)),
    };
}
