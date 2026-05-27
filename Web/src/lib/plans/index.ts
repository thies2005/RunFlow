import { WorkoutType, RaceType, PlanSport, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
import { generateUltraPlan } from './generators/run-ultra';
import { generateTriathlonPlan } from './generators/triathlon';
import { generateNoRacePlan } from './generators/no-race';
import { fixBackToBackSameType } from './schedule-utils';
import { enrichWorkoutsWithDescriptions, getRacePace } from './descriptions';
import { estimateSwimPaceFromVdot } from './swim-pace';

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

// TAPER_FRACTIONS removed

export function getMinStartVolume(raceType: RaceType | null): number {
    if (raceType && PLAN_CONSTANTS.MIN_START_VOLUME[raceType]) {
        return PLAN_CONSTANTS.MIN_START_VOLUME[raceType]!;
    }
    return PLAN_CONSTANTS.MIN_VOLUME_START;
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
    thresholdHeartRate?: number;
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
    thresholdHeartRate?: number;
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
    hrTargetMinBpm?: number;
    hrTargetMaxBpm?: number;
    hrZoneLabel?: string;
    paceTargetMinSecondsPerKm?: number;
    paceTargetMaxSecondsPerKm?: number;
};

type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    let workouts: GeneratedWorkout[] = [];
    if (config.sport === 'TRIATHLON' || (config.raceType && TRIATHLON_RACE_TYPES.includes(config.raceType))) {
        workouts = generateTriathlonPlan({ ...config, raceType: config.raceType as RaceType });
    } else if (config.raceType === null) {
        workouts = generateNoRacePlan(config);
    } else if (config.raceType && ULTRA_RACE_TYPES.includes(config.raceType)) {
        workouts = generateUltraPlan(config);
    } else {
        workouts = generateStandardPlan(config);
    }

    if (config.thresholdHeartRate) {
        for (const w of workouts) {
            w.thresholdHeartRate = config.thresholdHeartRate;
        }
    }
    return workouts;
}

function generateStandardPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceDate } = config;
    const raceType = config.raceType as RaceType;
    const requestedStartDate = config.startDate || new Date();
    const startDate = requestedStartDate > raceDate ? new Date(raceDate) : requestedStartDate;
    const runsPerWeek = Math.max(1, config.runsPerWeek ?? 4);
    const ridesPerWeek = Math.max(0, config.ridesPerWeek || 0);
    const strengthPerWeek = Math.max(0, config.strengthPerWeek || 0);
    const swimsPerWeek = Math.max(0, config.swimsPerWeek || 0);

    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3;

    // Validate and adjust rest days if they leave fewer slots than runsPerWeek requires
    let restDays = config.restDays ? [...config.restDays] : [];
    if (restDays.length > 7 - runsPerWeek) {
        restDays = restDays.slice(0, 7 - runsPerWeek);
    }

    let peakVolume = config.weeklyMileageGoal || 40000;
    const minPeak = PLAN_CONSTANTS.MIN_PEAK_VOLUME[raceType] || 20000;
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

    const defaultTaperWeeks = raceType === 'MARATHON' ? 3 : raceType === 'FIVE_K' ? 1 : 2;
    const taperWeeks = (config.taperWeeks != null && config.taperWeeks > 0)
        ? config.taperWeeks
        : defaultTaperWeeks;
    const availableStructured = Math.max(1, totalWeeks - taperWeeks - 1);
    const peakWeeks = Math.min(config.peakWeeks ?? 2, Math.floor(availableStructured / 2));
    const buildWeeks = Math.min(config.buildWeeks ?? 4, availableStructured - peakWeeks);

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
                raceWeekRunVolumeCap: getRaceWeekRunVolumeCap(raceType, effectivePeakVolume, taperWeeks, config.customRunDistM),
                ridesPerWeek,
                swimsPerWeek,
                strengthPerWeek,
                customRunDistM: config.customRunDistM,
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
            weekVolumeCap = getTaperVolume(weeksUntilRace, taperWeeks, effectivePeakVolume, raceType);
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
            raceType,
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
            restDays: restDays,
            weekNumber: week,
            vdot: vdot,
            customRunDistM: config.customRunDistM,
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
        restDays: restDays,
    });
    const racePace = getRacePace(raceType, paces);
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
    const decayRate = (() => {
        switch (raceType) {
            case 'FIVE_K': return 0.45;
            case 'TEN_K': return 0.40;
            case 'HALF_MARATHON': return 0.35;
            case 'MARATHON': return 0.30;
            default: return 0.35;
        }
    })();
    const t = taperWeeks - weeksUntilRace + 1;
    const fraction = Math.exp(-decayRate * t);
    const minFraction = raceType === 'MARATHON' ? 0.35 : 0.40;
    return Math.round(peakVolume * Math.max(fraction, minFraction));
}

export function getRaceWeekRunVolumeCap(raceType: RaceType, effectivePeakVolume: number, taperWeeks?: number, customRunDistM?: number): number {
    const decayRate = (() => {
        switch (raceType) {
            case 'FIVE_K': return 0.45;
            case 'TEN_K': return 0.40;
            case 'HALF_MARATHON': return 0.35;
            case 'MARATHON': return 0.30;
            default: return 0.35;
        }
    })();
    const actualTaperWeeks = taperWeeks ?? (raceType === 'MARATHON' ? 3 : 2);
    const finalTaperFraction = Math.max(
        raceType === 'MARATHON' ? 0.35 : 0.40,
        Math.exp(-decayRate * actualTaperWeeks)
    );
    const raceDist = getRaceDistanceMeters(raceType, customRunDistM) || 10000;
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
    customRunDistM?: number;
}): ScheduledWorkout[] {
    const { raceType, paces, runsPerWeek, raceWeekRunVolumeCap, customRunDistM } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    const raceDistKm = getRaceDistanceKm(raceType, customRunDistM);
    const raceDistMeters = getRaceDistanceMeters(raceType, customRunDistM);
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
    weekNumber?: number;
    vdot: number;
    customRunDistM?: number;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek, weeklyVolume,
        maxLongRunKm,
        preferredLongRunDay, preferredWorkoutDay, preferredSwimDay, restDays,
        weekNumber = 1,
        vdot,
        customRunDistM
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
    const swimPace = estimateSwimPaceFromVdot(vdot);

    const hasQuality = runsPerWeek >= 2 && phase !== 'TAPER';
    const qualitySession = hasQuality
        ? getQualitySession(raceType, paces, phase, weeklyVolume, weekNumber, customRunDistM)
        : null;
    const qualityDist = qualitySession ? qualitySession.totalDistance : 0;

    const hasSecondaryQuality = runsPerWeek >= 5 && phase !== 'TAPER';
    const secondaryQualitySession = hasSecondaryQuality && qualitySession
        ? getSecondaryQualitySession(raceType, paces, phase, weeklyVolume, qualitySession.type, weekNumber)
        : null;
    const secondaryQualityDist = secondaryQualitySession ? secondaryQualitySession.totalDistance : 0;

    const hasMlr = raceType === 'MARATHON' && runsPerWeek >= 5 && phase !== 'TAPER';
    const mlrDist = hasMlr
        ? Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.min(Math.round((longRunDist * 0.75) / 500) * 500, weeklyVolume * 0.30))
        : 0;

    const longRunCount = runsPerWeek >= 1 ? 1 : 0;
    const qualityRunCount = hasQuality ? (hasSecondaryQuality ? 2 : 1) : 0;
    const totalKeyRuns = longRunCount + qualityRunCount;
    const easyRunsCount = Math.max(0, runsPerWeek - totalKeyRuns);

    const remainingVol = Math.max(0, weeklyVolume - longRunDist - qualityDist - secondaryQualityDist - mlrDist);
    const normalEasyRunsCount = hasMlr ? Math.max(0, easyRunsCount - 1) : easyRunsCount;
    const calculatedEasyDist = normalEasyRunsCount > 0 ? remainingVol / normalEasyRunsCount : 5000;

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

        const rotation = (weekNumber - 1) % 3;
        let longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`;
        let longRunPace = easyPace;

        if (phase === 'TAPER') {
            longRunDesc = `Easy Long Run: ${(longRunDist / 1000).toFixed(1)}km`;
        } else if (phase === 'PEAK' && (raceType === 'HALF_MARATHON' || raceType === 'MARATHON')) {
            const mpDist = Math.round(longRunDist * 0.3 / 100) * 100;
            const easyPart = longRunDist - mpDist;
            longRunDesc = `Progressive Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ MP ${formatPace(paces.marathon)}`;
        } else if (phase === 'BUILD' || phase === 'PEAK') {
            if (rotation === 1) {
                const steadyDist = Math.round(longRunDist * 0.4 / 100) * 100;
                const easyPart = longRunDist - steadyDist;
                longRunDesc = `Steady Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(steadyDist / 1000).toFixed(1)}km @ Steady ${formatPace(paces.easy.min)}`;
            } else if (rotation === 2) {
                if (raceType === 'MARATHON' || raceType === 'HALF_MARATHON') {
                    const fastDist = Math.min(5000, Math.round(longRunDist * 0.2 / 100) * 100);
                    const easyPart = longRunDist - fastDist;
                    longRunDesc = `Progressive Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(fastDist / 1000).toFixed(1)}km @ MP ${formatPace(paces.marathon)}`;
                } else {
                    const fastDist = Math.min(3000, Math.round(longRunDist * 0.2 / 100) * 100);
                    const easyPart = longRunDist - fastDist;
                    longRunDesc = `Fast-Finish Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(fastDist / 1000).toFixed(1)}km @ T ${formatPace(paces.threshold)}`;
                }
            }
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
            targetHrZone: workoutTypeToHrZone(qualitySession.type),
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

    if (hasSecondaryQuality && secondaryQualitySession) {
        const preferredSecondaryDay = (preferredWorkoutDay - 2 + 7) % 7;
        const day = getAvailableDayWithGap(preferredSecondaryDay, hardSessionDays);
        usedDays.add(day);
        hardSessionDays.push(day);
        workouts.push({
            dayOffset: day,
            ...secondaryQualitySession,
            targetDuration: computeQualityDuration(secondaryQualitySession.totalDistance, secondaryQualitySession.targetPace, easyPace, getQualityFraction(secondaryQualitySession.type)),
            phase: phase as PlanPhase,
            targetHrZone: workoutTypeToHrZone(secondaryQualitySession.type),
        });
    }

    const alreadyScheduledEasyRuns = hasQuality ? 0 : (runsPerWeek >= 2 ? 1 : 0);
    const additionalRunsCount = Math.max(0, easyRunsCount - alreadyScheduledEasyRuns);
    const easyRunDays = getDistributedDays(additionalRunsCount, usedDays);

    let stridesInjected = 0;
    const stridesPerWeek = phase === 'BASE' ? 2 : 0;
    let mlrScheduled = false;

    for (const d of easyRunDays) {
        usedDays.add(d);

        const dayAfterHard = hardSessionDays.some(hd => {
            const diff = (d - hd + 7) % 7;
            return diff === 1;
        });

        if (hasMlr && !mlrScheduled && (!dayAfterHard || d === easyRunDays[easyRunDays.length - 1])) {
            mlrScheduled = true;
            workouts.push({
                dayOffset: d,
                type: WorkoutType.EASY,
                description: `Medium-Long Run: ${(mlrDist / 1000).toFixed(1)}km`,
                totalDistance: mlrDist,
                targetPace: easyPace,
                targetDuration: computeDuration(mlrDist, easyPace),
                phase: phase as PlanPhase,
                targetHrZone: workoutTypeToHrZone(WorkoutType.EASY),
            });
        } else if (dayAfterHard) {
            const includeStrides = phase === 'BASE' && stridesInjected < stridesPerWeek;
            const suffix = includeStrides ? ' + 6x100m Strides' : '';
            if (includeStrides) stridesInjected++;

            const recoveryDist = Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.round((easyDist * 0.65) / 100) * 100);

            workouts.push({
                dayOffset: d,
                type: WorkoutType.RECOVERY,
                description: `Recovery Run: ${(recoveryDist / 1000).toFixed(1)}km${suffix}`,
                totalDistance: recoveryDist,
                targetPace: recoveryPace,
                targetDuration: computeDuration(recoveryDist, recoveryPace),
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
            targetPace: swimPace,
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
                targetPace: swimPace,
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
                    targetPace: swimPace,
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
    weekNumber: number,
    customRunDistM?: number,
): { type: WorkoutType; description: string; totalDistance: number; targetPace: number } {
    const scale = (session: { type: WorkoutType; description: string; totalDistance: number; targetPace: number }) => ({
        ...session,
        totalDistance: scaleQualitySessionDistance(session.type, session.totalDistance, weeklyVolume, raceType),
    });

    if (raceType === 'FIVE_K') {
        return scale(get5KQualitySession(paces, phase, weekNumber));
    }
    if (raceType === 'TEN_K') {
        return scale(get10KQualitySession(paces, phase, weekNumber));
    }
    if (raceType === 'HALF_MARATHON') {
        return scale(getHalfMarathonQualitySession(paces, phase, weekNumber));
    }
    if (raceType === 'CUSTOM_DISTANCE' && customRunDistM) {
        if (customRunDistM < 10000) {
            return scale(get5KQualitySession(paces, phase, weekNumber));
        } else if (customRunDistM < 20000) {
            return scale(get10KQualitySession(paces, phase, weekNumber));
        } else if (customRunDistM < 30000) {
            return scale(getHalfMarathonQualitySession(paces, phase, weekNumber));
        } else {
            return scale(getMarathonQualitySession(paces, phase, weekNumber));
        }
    }
    return scale(getMarathonQualitySession(paces, phase, weekNumber));
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

function get5KQualitySession(paces: TrainingPaces, phase: Phase, weekNumber: number) {
    const rotation = (weekNumber - 1) % 3;
    if (phase === 'BASE') {
        if (rotation === 0) {
            const hardPace = getFartlekHardPace(paces);
            const easyPace = paces.easy.max;
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(8, 2, 2, hardPace, easyPace),
                totalDistance: 8000,
                targetPace: hardPace,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Hill Repeats: 6x200m hill reps @ hard effort`,
                totalDistance: 6000,
                targetPace: paces.repetition,
            };
        } else {
            return {
                type: WorkoutType.EASY,
                description: `Progression Run: 6km (Start @ E ${formatPace(paces.easy.max)}, finish final 1.5km @ T ${formatPace(paces.threshold)})`,
                totalDistance: 6000,
                targetPace: paces.threshold,
            };
        }
    }
    if (phase === 'PEAK') {
        if (rotation === 0) {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Reps: 6x400m @ ${formatPace(paces.repetition)}`,
                totalDistance: 7000,
                targetPace: paces.repetition,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Reps: 8x300m @ ${formatPace(paces.repetition)}`,
                totalDistance: 6500,
                targetPace: paces.repetition,
            };
        } else {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Reps: 10x200m @ ${formatPace(paces.repetition)}`,
                totalDistance: 6000,
                targetPace: paces.repetition,
            };
        }
    }
    if (rotation === 0) {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
            totalDistance: 10000,
            targetPace: paces.interval,
        };
    } else if (rotation === 1) {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 3x1600m @ ${formatPace(paces.interval)}`,
            totalDistance: 9800,
            targetPace: paces.interval,
        };
    } else {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 8x600m @ ${formatPace(paces.interval)}`,
            totalDistance: 9000,
            targetPace: paces.interval,
        };
    }
}

function get10KQualitySession(paces: TrainingPaces, phase: Phase, weekNumber: number) {
    const rotation = (weekNumber - 1) % 3;
    if (phase === 'BASE') {
        if (rotation === 0) {
            const hardPace = getFartlekHardPace(paces);
            const easyPace = paces.easy.max;
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(10, 3, 2, hardPace, easyPace),
                totalDistance: 10000,
                targetPace: hardPace,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Hill Repeats: 8x200m hill reps @ hard effort`,
                totalDistance: 7000,
                targetPace: paces.repetition,
            };
        } else {
            return {
                type: WorkoutType.EASY,
                description: `Progression Run: 8km (Start @ E ${formatPace(paces.easy.max)}, finish final 2km @ T ${formatPace(paces.threshold)})`,
                totalDistance: 8000,
                targetPace: paces.threshold,
            };
        }
    }
    if (phase === 'PEAK') {
        if (rotation === 0) {
            return {
                type: WorkoutType.TEMPO,
                description: `Threshold: 4x2km @ ${formatPace(paces.threshold)}`,
                totalDistance: 12000,
                targetPace: paces.threshold,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.TEMPO,
                description: `Threshold: 3x3km @ ${formatPace(paces.threshold)}`,
                totalDistance: 13000,
                targetPace: paces.threshold,
            };
        } else {
            return {
                type: WorkoutType.TEMPO,
                description: `Threshold: 8km @ ${formatPace(paces.threshold)}`,
                totalDistance: 12000,
                targetPace: paces.threshold,
            };
        }
    }
    if (rotation === 0) {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 6x1km @ ${formatPace(paces.interval)}`,
            totalDistance: 11000,
            targetPace: paces.interval,
        };
    } else if (rotation === 1) {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 4x1200m @ ${formatPace(paces.interval)}`,
            totalDistance: 9800,
            targetPace: paces.interval,
        };
    } else {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
            totalDistance: 10000,
            targetPace: paces.interval,
        };
    }
}

function getHalfMarathonQualitySession(paces: TrainingPaces, phase: Phase, weekNumber: number) {
    const rotation = (weekNumber - 1) % 3;
    if (phase === 'BASE') {
        if (rotation === 0) {
            const hardPace = getFartlekHardPace(paces);
            const easyPace = paces.easy.max;
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(10, 4, 3, hardPace, easyPace),
                totalDistance: 10000,
                targetPace: hardPace,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Hill Repeats: 8x200m hill reps @ hard effort`,
                totalDistance: 8000,
                targetPace: paces.repetition,
            };
        } else {
            return {
                type: WorkoutType.EASY,
                description: `Progression Run: 10km (Start @ E ${formatPace(paces.easy.max)}, finish final 3km @ T ${formatPace(paces.threshold)})`,
                totalDistance: 10000,
                targetPace: paces.threshold,
            };
        }
    }
    if (phase === 'PEAK') {
        if (rotation === 0) {
            return {
                type: WorkoutType.TEMPO,
                description: `MP Segments: 3x3km @ ${formatPace(paces.marathon)}`,
                totalDistance: 13000,
                targetPace: paces.marathon,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.TEMPO,
                description: `Tempo + MP: 4km T ${formatPace(paces.threshold)} + 4km MP ${formatPace(paces.marathon)}`,
                totalDistance: 12000,
                targetPace: paces.marathon,
            };
        } else {
            return {
                type: WorkoutType.TEMPO,
                description: `MP Segments: 10km @ MP ${formatPace(paces.marathon)}`,
                totalDistance: 14000,
                targetPace: paces.marathon,
            };
        }
    }
    if (rotation === 0) {
        return {
            type: WorkoutType.TEMPO,
            description: `Threshold: 8km @ ${formatPace(paces.threshold)}`,
            totalDistance: 12000,
            targetPace: paces.threshold,
        };
    } else if (rotation === 1) {
        return {
            type: WorkoutType.TEMPO,
            description: `Cruise Intervals: 5x1.5km @ T ${formatPace(paces.threshold)} w/ 2min recovery`,
            totalDistance: 11500,
            targetPace: paces.threshold,
        };
    } else {
        return {
            type: WorkoutType.TEMPO,
            description: `Threshold: 6km @ T ${formatPace(paces.threshold)}`,
            totalDistance: 10000,
            targetPace: paces.threshold,
        };
    }
}

function getMarathonQualitySession(paces: TrainingPaces, phase: Phase, weekNumber: number) {
    const rotation = (weekNumber - 1) % 3;
    if (phase === 'BASE') {
        if (rotation === 0) {
            const hardPace = getFartlekHardPace(paces);
            const easyPace = paces.easy.max;
            return {
                type: WorkoutType.FARTLEK,
                description: getFartlekDescription(12, 5, 3, hardPace, easyPace),
                totalDistance: 12000,
                targetPace: hardPace,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.REPETITIONS,
                description: `Hill Repeats: 10x200m hill reps @ hard effort`,
                totalDistance: 9000,
                targetPace: paces.repetition,
            };
        } else {
            return {
                type: WorkoutType.EASY,
                description: `Progression Run: 12km (Start @ E ${formatPace(paces.easy.max)}, finish final 4km @ T ${formatPace(paces.threshold)})`,
                totalDistance: 12000,
                targetPace: paces.threshold,
            };
        }
    }
    if (phase === 'PEAK') {
        if (rotation === 0) {
            return {
                type: WorkoutType.TEMPO,
                description: `MP Segments: 3x5km @ ${formatPace(paces.marathon)}`,
                totalDistance: 18000,
                targetPace: paces.marathon,
            };
        } else if (rotation === 1) {
            return {
                type: WorkoutType.TEMPO,
                description: `Tempo + MP: 6km T ${formatPace(paces.threshold)} + 6km MP ${formatPace(paces.marathon)}`,
                totalDistance: 16000,
                targetPace: paces.marathon,
            };
        } else {
            return {
                type: WorkoutType.TEMPO,
                description: `MP Segments: 12km @ MP ${formatPace(paces.marathon)}`,
                totalDistance: 16000,
                targetPace: paces.marathon,
            };
        }
    }
    if (rotation === 0) {
        return {
            type: WorkoutType.TEMPO,
            description: `Threshold: 10km @ ${formatPace(paces.threshold)}`,
            totalDistance: 14000,
            targetPace: paces.threshold,
        };
    } else if (rotation === 1) {
        return {
            type: WorkoutType.TEMPO,
            description: `Cruise Intervals: 3x2mile @ T ${formatPace(paces.threshold)} w/ 3min recovery`,
            totalDistance: 13000,
            targetPace: paces.threshold,
        };
    } else {
        return {
            type: WorkoutType.TEMPO,
            description: `Threshold: 6km T ${formatPace(paces.threshold)} + 4km MP ${formatPace(paces.marathon)}`,
            totalDistance: 14000,
            targetPace: paces.threshold,
        };
    }
}

function getSecondaryQualitySession(
    raceType: RaceType,
    paces: TrainingPaces,
    phase: Phase,
    weeklyVolume: number,
    primaryType: WorkoutType,
    weekNumber: number
): { type: WorkoutType; description: string; totalDistance: number; targetPace: number } {
    const rotation = (weekNumber - 1) % 3;
    let type = WorkoutType.TEMPO;
    let description = '';
    let targetPace = paces.threshold;
    let totalDistance = 8000;

    if (primaryType === WorkoutType.INTERVALS || primaryType === WorkoutType.REPETITIONS) {
        type = WorkoutType.TEMPO;
        targetPace = paces.threshold;
        if (raceType === 'FIVE_K' || raceType === 'TEN_K') {
            totalDistance = 6000;
            if (rotation === 0) {
                description = `Secondary Threshold: 4km Tempo @ T ${formatPace(paces.threshold)}`;
            } else if (rotation === 1) {
                description = `Secondary Threshold: 3x1km @ T ${formatPace(paces.threshold)} w/ 1min recovery`;
            } else {
                description = `Secondary Threshold: 2x2km @ T ${formatPace(paces.threshold)} w/ 2min recovery`;
            }
        } else {
            totalDistance = 8000;
            if (rotation === 0) {
                description = `Secondary Threshold: 6km Tempo @ T ${formatPace(paces.threshold)}`;
            } else if (rotation === 1) {
                description = `Secondary Threshold: 4x1.5km @ T ${formatPace(paces.threshold)} w/ 90s recovery`;
            } else {
                description = `Secondary Threshold: 3x2km @ T ${formatPace(paces.threshold)} w/ 2min recovery`;
            }
        }
    } else {
        type = WorkoutType.REPETITIONS;
        targetPace = paces.repetition;
        if (raceType === 'FIVE_K' || raceType === 'TEN_K') {
            totalDistance = 5000;
            if (rotation === 0) {
                description = `Secondary Reps: 6x200m @ R ${formatPace(paces.repetition)} w/ 200m jog`;
            } else if (rotation === 1) {
                description = `Secondary Reps: 4x400m @ R ${formatPace(paces.repetition)} w/ 400m jog`;
            } else {
                description = `Secondary Reps: 300m-200m-100m x2 @ R ${formatPace(paces.repetition)} w/ jog recovery`;
            }
        } else {
            totalDistance = 7000;
            if (rotation === 0) {
                description = `Secondary Reps: 8x200m @ R ${formatPace(paces.repetition)} w/ 200m jog`;
            } else if (rotation === 1) {
                description = `Secondary Reps: 6x400m @ R ${formatPace(paces.repetition)} w/ 400m jog`;
            } else {
                description = `Secondary Reps: 400m-300m-200m x2 @ R ${formatPace(paces.repetition)} w/ jog recovery`;
            }
        }
    }

    const scaledDist = scaleQualitySessionDistance(type, totalDistance, weeklyVolume, raceType);
    return {
        type,
        description,
        totalDistance: scaledDist,
        targetPace,
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
        return {
            ...w,
            totalDistance: newDist,
            description: preserveSpecialDescription(w, newDist),
        };
    });
}

function preserveSpecialDescription(w: ScheduledWorkout, distance: number): string {
    const distanceKm = (distance / 1000).toFixed(1);

    if (w.description.includes('Medium-Long Run')) {
        return `Medium-Long Run: ${distanceKm}km`;
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

    if (w.type === WorkoutType.TEMPO && (w.description.includes('Threshold:') || w.description.includes('MP Segments'))) {
        return w.description;
    }

    if (w.description.includes('MP')) {
        return w.description;
    }
    return updateDescription(w.type, distance, w.targetPace || 0);
}

function getRaceDistanceKm(raceType: RaceType, customRunDistM?: number): string {
    switch (raceType) {
        case 'FIVE_K': return '5';
        case 'TEN_K': return '10';
        case 'HALF_MARATHON': return '21.1';
        case 'MARATHON': return '42.2';
        case 'FIFTY_K': return '50';
        case 'FIFTY_MILE': return '80.5';
        case 'HUNDRED_K': return '100';
        case 'HUNDRED_MILE': return '161';
        default: return customRunDistM && customRunDistM > 0 ? (customRunDistM / 1000).toFixed(1) : '0';
    }
}

function getRaceDistanceMeters(raceType: RaceType, customRunDistM?: number): number {
    switch (raceType) {
        case 'FIVE_K': return 5000;
        case 'TEN_K': return 10000;
        case 'HALF_MARATHON': return 21097;
        case 'MARATHON': return 42195;
        case 'FIFTY_K': return 50000;
        case 'FIFTY_MILE': return 80467;
        case 'HUNDRED_K': return 100000;
        case 'HUNDRED_MILE': return 160934;
        default: return customRunDistM && customRunDistM > 0 ? customRunDistM : 0;
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

export function getQualityFraction(type: WorkoutType): number {
    switch (type) {
        case WorkoutType.INTERVALS: return 0.5;
        case WorkoutType.REPETITIONS: return 0.35;
        case WorkoutType.TEMPO: return 0.65;
        case WorkoutType.FARTLEK: return 0.45;
        default: return 0.5;
    }
}

export function calculateHRZones(lthr: number) {
    return {
        z1: { min: Math.round(lthr * 0.50), max: Math.round(lthr * 0.75), label: 'Recovery' },
        z2: { min: Math.round(lthr * 0.75) + 1, max: Math.round(lthr * 0.87), label: 'Aerobic' },
        z3: { min: Math.round(lthr * 0.87) + 1, max: Math.round(lthr * 0.94), label: 'Tempo' },
        z4: { min: Math.round(lthr * 0.94) + 1, max: lthr, label: 'Threshold' },
        z5: { min: lthr + 1, max: Math.round(lthr * 1.05), label: 'VO2max' },
        z6: { min: Math.round(lthr * 1.05) + 1, max: Math.round(lthr * 1.10), label: 'Anaerobic' },
        z7: { min: Math.round(lthr * 1.10) + 1, max: 999, label: 'Neuromuscular' },
    };
}

export function buildStructuredStepsForWorkout(workout: Pick<GeneratedWorkout, 'type' | 'description' | 'totalDistance' | 'targetPace' | 'targetDuration' | 'targetHrZone' | 'thresholdHeartRate'>): StructuredWorkoutPlan | null {
    if (workout.totalDistance <= 0 && (!workout.targetDuration || workout.targetDuration <= 0)) return null;

    const targetPace = workout.targetPace && workout.targetPace > 0 ? workout.targetPace : undefined;
    const hrZone = workout.targetHrZone;
    const warmupDistance = workout.totalDistance >= 5000 ? 1500 : 0;
    const cooldownDistance = workout.totalDistance >= 5000 ? 1000 : 0;
    const remainingDistance = Math.max(0, workout.totalDistance - warmupDistance - cooldownDistance);

    const lthr = workout.thresholdHeartRate;
    const hrZones = lthr ? calculateHRZones(lthr) : null;

    let hrTargetMinBpm: number | undefined;
    let hrTargetMaxBpm: number | undefined;
    let hrZoneLabel: string | undefined;

    if (hrZones && hrZone) {
        const zoneKey = `z${hrZone}` as keyof typeof hrZones;
        const zone = hrZones[zoneKey];
        if (zone) {
            hrTargetMinBpm = zone.min;
            hrTargetMaxBpm = zone.max;
            hrZoneLabel = zone.label;
        }
    }

    const paceTargetMinSecondsPerKm = targetPace ? targetPace - 10 : undefined;
    const paceTargetMaxSecondsPerKm = targetPace ? targetPace + 10 : undefined;

    if (workout.type === WorkoutType.EASY || workout.type === WorkoutType.RECOVERY || workout.type === WorkoutType.LONG_RUN) {
        return {
            version: 1,
            source: 'generated-plan',
            steps: [{
                type: 'steady',
                name: workout.type === WorkoutType.RECOVERY ? 'Recovery run' : workout.type === WorkoutType.LONG_RUN ? 'Long run' : 'Easy run',
                distanceMeters: workout.totalDistance || undefined,
                durationSeconds: workout.targetDuration || undefined,
                paceSecondsPerKm: targetPace,
                hrZone,
                hrTargetMinBpm,
                hrTargetMaxBpm,
                hrZoneLabel,
                paceTargetMinSecondsPerKm,
                paceTargetMaxSecondsPerKm,
            }],
        };
    }

    const steps: StructuredWorkoutStep[] = [];
    if (warmupDistance > 0) {
        let wuMin: number | undefined;
        let wuMax: number | undefined;
        let wuLabel: string | undefined;
        if (hrZones) {
            wuMin = hrZones.z1.min;
            wuMax = hrZones.z1.max;
            wuLabel = hrZones.z1.label;
        }
        steps.push({
            type: 'warmup',
            name: 'Warm up',
            distanceMeters: warmupDistance,
            hrZone: 1,
            hrTargetMinBpm: wuMin,
            hrTargetMaxBpm: wuMax,
            hrZoneLabel: wuLabel
        });
    }

    steps.push({
        type: 'work',
        name: workout.description.split(':')[0] || 'Main set',
        distanceMeters: remainingDistance || workout.totalDistance || undefined,
        paceSecondsPerKm: targetPace,
        hrZone,
        hrTargetMinBpm,
        hrTargetMaxBpm,
        hrZoneLabel,
        paceTargetMinSecondsPerKm,
        paceTargetMaxSecondsPerKm,
    });

    if (cooldownDistance > 0) {
        let cdMin: number | undefined;
        let cdMax: number | undefined;
        let cdLabel: string | undefined;
        if (hrZones) {
            cdMin = hrZones.z1.min;
            cdMax = hrZones.z1.max;
            cdLabel = hrZones.z1.label;
        }
        steps.push({
            type: 'cooldown',
            name: 'Cool down',
            distanceMeters: cooldownDistance,
            hrZone: 1,
            hrTargetMinBpm: cdMin,
            hrTargetMaxBpm: cdMax,
            hrZoneLabel: cdLabel
        });
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
