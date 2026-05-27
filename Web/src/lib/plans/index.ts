import { WorkoutType, RaceType, PlanSport, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
import { getZoneTarget, resolveHrZones } from '../metrics/hr-zones';
import { generateUltraPlan } from './generators/run-ultra';
import { generateTriathlonPlan } from './generators/triathlon';
import { generateNoRacePlan } from './generators/no-race';
import { fixBackToBackSameType } from './schedule-utils';
import { enrichWorkoutsWithDescriptions, getRacePace } from './descriptions';
import { estimateBikeFtpFromVdot, calculateBikeZones } from './bike-zones';

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
};

const TAPER_FRACTIONS: Partial<Record<RaceType, number[]>> = {
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

export interface PhaseBudget {
    taperWeeks: number;
    peakWeeks: number;
    buildWeeks: number;
    baseWeeks: number;
    enduranceWeeks?: number;
    mentalPrepWeeks?: number;
}

export function resolvePhaseBudget(
    totalWeeks: number,
    config: PlanConfig,
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
    structuredSteps?: StructuredWorkoutPlan | null;
    targetHrZoneLabel?: string | null;
    targetHrMinBpm?: number | null;
    targetHrMaxBpm?: number | null;
    targetPaceZoneLabel?: string | null;
    targetPaceMinSecondsPerKm?: number | null;
    targetPaceMaxSecondsPerKm?: number | null;
};

export type StructuredWorkoutPlan = {
    version: 1;
    source: 'generated-plan';
    steps: StructuredWorkoutStep[];
};

export type StructuredWorkoutStep = {
    type: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'steady';
    name: string;
    distanceMeters?: number;
    durationSeconds?: number;
    paceSecondsPerKm?: number;
    hrZone?: number;
};

type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    const paces = calculateTrainingPaces(config.vdot);

    const enrichTargets = (workouts: GeneratedWorkout[]) => {
        for (const w of workouts) {
            assignWorkoutTargets(w, paces, config.sport || null);
        }
        fillDurations(workouts, paces);
        enrichWorkoutsWithTargets(workouts, paces, config);
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

    return enrichTargets(generateStandardPlan(config));
}

function generateStandardPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceDate, customDistanceM } = config;
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
    const totalWeeks = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24 * 7)));

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

    const workouts: GeneratedWorkout[] = [];


    for (let week = 1; week <= totalWeeks; week++) {
        const weeksUntilRace = totalWeeks - week + 1;
        const phase = getPhase(weeksUntilRace, { taperWeeks, peakWeeks, buildWeeks });

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
            });
            raceWeekWorkouts.forEach(w => {
                const specificDate = new Date(raceDate);
                if (w.type !== WorkoutType.RACE) {
                    specificDate.setDate(specificDate.getDate() + w.dayOffset);
                }
                if (specificDate < startDate) return;
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

        let weekSchedule = generateWeek({
            phase,
            raceType: effectiveRaceType,
            paces,
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

function getPhase(
    weeksUntilRace: number,
    options?: { taperWeeks?: number; peakWeeks?: number; buildWeeks?: number }
): Phase {
    const taperWeeks = options?.taperWeeks ?? 0;
    const peakWeeks = options?.peakWeeks ?? 0;
    const buildWeeks = options?.buildWeeks ?? 0;

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
}): ScheduledWorkout[] {
    const { raceType, paces, runsPerWeek, raceWeekRunVolumeCap, customDistanceM } = params;
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
        targetPace: 0,
        targetDuration: 0,
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
                    description: 'Swim: 1500m @ Easy',
                    totalDistance: 1500,
                    targetPace: 120,
                    targetDuration: 2700,
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
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek, weeklyVolume,
        maxLongRunKm,
        preferredLongRunDay, preferredWorkoutDay, preferredSwimDay, restDays
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
        ? getQualitySession(raceType, paces, phase, weeklyVolume)
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

    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);
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

        if (phase === 'PEAK' && (raceType === 'HALF_MARATHON' || raceType === 'MARATHON')) {
            const mpDist = Math.round(longRunDist * 0.3 / 100) * 100;
            const easyPart = longRunDist - mpDist;
            longRunDesc = `Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ MP`;
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
        workouts.push({
            dayOffset: preferredSwimDay,
            type: WorkoutType.SWIM,
            description: 'Swim: 1500m @ Easy',
            totalDistance: 1500,
            targetPace: 120,
            targetDuration: 2700,
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
            workouts.push({
                dayOffset: d,
                type: WorkoutType.SWIM,
                description: 'Swim: 1500m @ Easy',
                totalDistance: 1500,
                targetPace: 120,
                targetDuration: 2700,
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
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.SWIM,
                    description: 'Swim: 1500m @ Easy',
                    totalDistance: 1500,
                    targetPace: 120,
                    targetDuration: 2700,
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

    return Math.round(dist / 1000) * 1000;
}

function getQualitySession(
    raceType: RaceType,
    paces: TrainingPaces,
    phase: Phase,
    weeklyVolume: number,
): { type: WorkoutType; description: string; totalDistance: number; targetPace: number } {
    const scale = (session: { type: WorkoutType; description: string; totalDistance: number; targetPace: number }) => ({
        ...session,
        totalDistance: scaleQualitySessionDistance(session.type, session.totalDistance, weeklyVolume, raceType),
    });

    if (raceType === 'FIVE_K') {
        return scale(get5KQualitySession(paces, phase));
    }
    if (raceType === 'TEN_K') {
        return scale(get10KQualitySession(paces, phase));
    }
    if (raceType === 'HALF_MARATHON') {
        return scale(getHalfMarathonQualitySession(paces, phase));
    }
    return scale(getMarathonQualitySession(paces, phase));
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
    return Math.round((paces.threshold + paces.interval) / 2);
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

function get5KQualitySession(paces: TrainingPaces, phase: Phase) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(8, 2, 2, hardPace, easyPace),
            totalDistance: 8000,
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

function get10KQualitySession(paces: TrainingPaces, phase: Phase) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(10, 3, 2, hardPace, easyPace),
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

function getHalfMarathonQualitySession(paces: TrainingPaces, phase: Phase) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
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
            description: `MP Segments: 3x3km @ ${formatPace(paces.marathon)}`,
            totalDistance: 13000,
            targetPace: paces.marathon,
        };
    }
    return {
        type: WorkoutType.TEMPO,
        description: `Threshold: 8km @ ${formatPace(paces.threshold)}`,
        totalDistance: 12000,
        targetPace: paces.threshold,
    };
}

function getMarathonQualitySession(paces: TrainingPaces, phase: Phase) {
    if (phase === 'BASE') {
        const hardPace = getFartlekHardPace(paces);
        const easyPace = paces.easy.max;
        return {
            type: WorkoutType.FARTLEK,
            description: getFartlekDescription(12, 5, 3, hardPace, easyPace),
            totalDistance: 12000,
            targetPace: hardPace,
        };
    }
    if (phase === 'PEAK') {
        return {
            type: WorkoutType.TEMPO,
            description: `MP Segments: 3x5km @ ${formatPace(paces.marathon)}`,
            totalDistance: 18000,
            targetPace: paces.marathon,
        };
    }
    return {
        type: WorkoutType.TEMPO,
        description: `Threshold: 10km @ ${formatPace(paces.threshold)}`,
        totalDistance: 14000,
        targetPace: paces.threshold,
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
        w.description.includes('MP Segment');

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
                return { ...w, totalDistance: 0, description: 'Rest (Volume Cap)' };
            }
            const newDist = roundDownTo100(w.totalDistance * scalingFactor);
            const finalDist = Math.max(newDist, 0);
            return {
                ...w,
                totalDistance: finalDist,
                description: preserveSpecialDescription(w, finalDist),
            };
        });
    }

    const fillScalingFactor = fillDist > 0 ? remainingCap / fillDist : 0;
    return weekSchedule.map(w => {
        if (!isRun(w.type) || isPriority(w)) return w;
        const newDist = roundDownTo100(w.totalDistance * fillScalingFactor);
        if (newDist > 0 && newDist < PLAN_CONSTANTS.EASY_RUN_MIN) {
            return { ...w, totalDistance: 0, description: 'Rest (Volume Cap)' };
        }
        return {
            ...w,
            totalDistance: newDist,
            description: preserveSpecialDescription(w, newDist),
        };
    });
}

function preserveSpecialDescription(w: ScheduledWorkout, distance: number): string {
    const distanceKm = (distance / 1000).toFixed(1);

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

    if (w.type === WorkoutType.TEMPO && (w.description.includes('Threshold:') || w.description.includes('MP Segments'))) {
        return w.description;
    }

    if (w.description.includes('MP')) {
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
    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);
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

export function buildStructuredStepsForWorkout(workout: Pick<GeneratedWorkout, 'type' | 'description' | 'totalDistance' | 'targetPace' | 'targetDuration' | 'targetHrZone'>): StructuredWorkoutPlan | null {
    if (workout.totalDistance <= 0 && (!workout.targetDuration || workout.targetDuration <= 0)) return null;

    const type = workout.type as WorkoutType;
    const targetPace = workout.targetPace && workout.targetPace > 0 ? workout.targetPace : undefined;
    const hrZone = workout.targetHrZone;

    // 1. STRENGTH & TRANSITION
    if (type === WorkoutType.STRENGTH || type === WorkoutType.TRANSITION_PRACTICE) {
        return {
            version: 1,
            source: 'generated-plan',
            steps: [{
                type: 'steady',
                name: type === WorkoutType.STRENGTH ? 'Strength Session' : 'Transition Practice',
                durationSeconds: workout.targetDuration || 2700,
            }],
        };
    }

    // 2. BRICK (Grouped Bike + Transition + Run)
    if (type === WorkoutType.BRICK) {
        const match = workout.description.match(/(\d+)\s*min\s*Bike\s*(?:\u2192|->)\s*(\d+)\s*min\s*Run/i);
        const bikeMinutes = match ? parseInt(match[1]) : 45;
        const runMinutes = match ? parseInt(match[2]) : 15;
        const bikeSeconds = bikeMinutes * 60;
        const runSeconds = runMinutes * 60;
        const plannedSeconds = workout.targetDuration && workout.targetDuration > 0
            ? workout.targetDuration
            : bikeSeconds + runSeconds + 300;
        const transitionSeconds = Math.max(0, plannedSeconds - bikeSeconds - runSeconds);

        return {
            version: 1,
            source: 'generated-plan',
            steps: [
                {
                    type: 'work',
                    name: 'Bike Leg',
                    durationSeconds: bikeSeconds,
                    hrZone: 2,
                },
                ...(transitionSeconds > 0 ? [{
                    type: 'recovery',
                    name: 'Transition Practice (T2)',
                    durationSeconds: transitionSeconds,
                } as StructuredWorkoutStep] : []),
                {
                    type: 'work',
                    name: 'Run Leg',
                    durationSeconds: runSeconds,
                    hrZone: 2,
                }
            ],
        };
    }

    // 3. BIKE RIDES (Steady & Intervals)
    if (type === WorkoutType.RIDE || type === WorkoutType.LONG_RIDE) {
        return {
            version: 1,
            source: 'generated-plan',
            steps: [{
                type: 'steady',
                name: type === WorkoutType.LONG_RIDE ? 'Long Ride' : 'Easy Ride',
                durationSeconds: workout.targetDuration || undefined,
                hrZone: hrZone || 2,
            }],
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

        const steps: StructuredWorkoutStep[] = [
            { type: 'warmup', name: 'Warm up spin', durationSeconds: warmupSeconds, hrZone: 1 }
        ];

        for (let i = 0; i < reps; i++) {
            steps.push({
                type: 'work',
                name: `Interval Rep ${i + 1}`,
                durationSeconds: repSeconds,
                hrZone: 4,
            });
            if (i < reps - 1) {
                steps.push({
                    type: 'recovery',
                    name: 'Recovery spin',
                    durationSeconds: recoverySeconds,
                    hrZone: 1,
                });
            }
        }

        steps.push({ type: 'cooldown', name: 'Cool down spin', durationSeconds: cooldownSeconds, hrZone: 1 });

        return { version: 1, source: 'generated-plan', steps };
    }

    // 4. SWIM SETS
    if (type === WorkoutType.SWIM || type === WorkoutType.SWIM_DRILL || type === WorkoutType.OPEN_WATER_SWIM) {
        const totalDist = workout.totalDistance;
        const warmup = Math.min(200, Math.max(50, Math.round(totalDist * 0.15 / 50) * 50));
        const cooldown = Math.min(200, Math.max(50, Math.round(totalDist * 0.15 / 50) * 50));
        const mainSetDist = totalDist - warmup - cooldown;

        return {
            version: 1,
            source: 'generated-plan',
            steps: [
                { type: 'warmup', name: 'Warm up swim', distanceMeters: warmup, paceSecondsPerKm: targetPace },
                { type: 'work', name: 'Main Set', distanceMeters: mainSetDist, paceSecondsPerKm: targetPace },
                { type: 'cooldown', name: 'Cool down swim', distanceMeters: cooldown, paceSecondsPerKm: targetPace },
            ],
        };
    }

    // 5. RUN EASY / RECOVERY / LONG RUN
    if (type === WorkoutType.EASY || type === WorkoutType.RECOVERY || type === WorkoutType.LONG_RUN) {
        return {
            version: 1,
            source: 'generated-plan',
            steps: [{
                type: 'steady',
                name: type === WorkoutType.RECOVERY ? 'Recovery run' : type === WorkoutType.LONG_RUN ? 'Long run' : 'Easy run',
                distanceMeters: workout.totalDistance || undefined,
                durationSeconds: workout.targetDuration || undefined,
                paceSecondsPerKm: targetPace,
                hrZone,
            }],
        };
    }

    // 6. RUN QUALITY / INTERVALS
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

        const steps: StructuredWorkoutStep[] = [];
        if (warmupDistance > 0) {
            steps.push({ type: 'warmup', name: 'Warm up', distanceMeters: warmupDistance, hrZone: 1 });
        }

        let recoveryName = 'Recovery jog';

        if (type === WorkoutType.REPETITIONS) {
            recoveryName = 'Rest';
        } else if (workout.description.includes('Threshold') || workout.description.includes('MP')) {
            recoveryName = 'Tempo rest';
        }

        for (let i = 0; i < reps; i++) {
            steps.push({
                type: 'work',
                name: `Rep ${i + 1}`,
                distanceMeters: repDistMeters,
                paceSecondsPerKm: targetPace,
                hrZone,
            });
            if (i < reps - 1) {
                steps.push({
                    type: 'recovery',
                    name: recoveryName,
                    distanceMeters: recoveryDistance || undefined,
                    durationSeconds: recoveryDistance ? undefined : 120,
                    hrZone: 1,
                });
            }
        }

        if (cooldownDistance > 0) {
            steps.push({ type: 'cooldown', name: 'Cool down', distanceMeters: cooldownDistance, hrZone: 1 });
        }

        return { version: 1, source: 'generated-plan', steps };
    }

    // 7. RUN FARTLEK
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

        const steps: StructuredWorkoutStep[] = [
            { type: 'warmup', name: 'Warm up', durationSeconds: warmupSeconds, hrZone: 1 }
        ];

        for (let i = 0; i < reps; i++) {
            steps.push({
                type: 'work',
                name: `Fartlek Hard ${i + 1}`,
                durationSeconds: hardMin * 60,
                paceSecondsPerKm: targetPace,
                hrZone,
            });
            steps.push({
                type: 'recovery',
                name: `Fartlek Easy ${i + 1}`,
                durationSeconds: easyMin * 60,
                paceSecondsPerKm: targetPace ? Math.round(targetPace * 1.15) : undefined,
                hrZone: 2,
            });
        }

        steps.push({ type: 'cooldown', name: 'Cool down', durationSeconds: cooldownSeconds, hrZone: 1 });

        return { version: 1, source: 'generated-plan', steps };
    }

    const warmupDistance = workout.totalDistance >= 5000 ? 1500 : 0;
    const cooldownDistance = workout.totalDistance >= 5000 ? 1000 : 0;
    const remainingDistance = Math.max(0, workout.totalDistance - warmupDistance - cooldownDistance);

    const steps: StructuredWorkoutStep[] = [];
    if (warmupDistance > 0) {
        steps.push({ type: 'warmup', name: 'Warm up', distanceMeters: warmupDistance, hrZone: 1 });
    }
    steps.push({
        type: 'work',
        name: workout.description.split(':')[0] || 'Main set',
        distanceMeters: remainingDistance || workout.totalDistance || undefined,
        paceSecondsPerKm: targetPace,
        hrZone,
    });
    if (cooldownDistance > 0) {
        steps.push({ type: 'cooldown', name: 'Cool down', distanceMeters: cooldownDistance, hrZone: 1 });
    }

    return { version: 1, source: 'generated-plan', steps };
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
    config: Pick<PlanConfig, 'vdot' | 'thresholdHeartRate' | 'hrZoneMethod' | 'hrZone1Max' | 'hrZone2Max' | 'hrZone3Max' | 'hrZone4Max' | 'hrZone5Max' | 'hrZone6Max' | 'hrMax' | 'hrRest'>,
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

    for (const workout of workouts) {
        const paceTarget = getPaceTarget(workout, paces);
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
            if (workout.description.includes('MP Segments') || workout.description.includes('MP')) {
                return paceWindow('Marathon Pace', paces.marathon, 0.03);
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
