import { WorkoutType, RaceType } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';

export const PLAN_CONSTANTS = {
    MIN_PEAK_VOLUME: {
        FIVE_K: 20000,
        TEN_K: 30000,
        HALF_MARATHON: 40000,
        MARATHON: 50000
    },
    MAX_LONG_RUN_DIST: {
        FIVE_K: 16000,
        TEN_K: 17000,
        HALF_MARATHON: 21000,
        MARATHON: 32000
    },
    MIN_LONG_RUN: 6000,
    MIN_VOLUME_START: 15000,
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

const TAPER_FRACTIONS: Record<RaceType, number[]> = {
    FIVE_K: [0.75],
    TEN_K: [0.80, 0.60],
    HALF_MARATHON: [0.75, 0.55],
    MARATHON: [0.80, 0.65, 0.45],
};

export type PlanConfig = {
    vdot: number;
    raceType: RaceType;
    raceDate: Date;
    startDate?: Date;
    runsPerWeek?: number;
    ridesPerWeek?: number;
    strengthPerWeek?: number;
    swimsPerWeek?: number;
    weeklyMileageGoal?: number | null;
    taperWeeks?: number;
    peakWeeks?: number;
    buildWeeks?: number;
    longRunDay?: number;
    workoutDay?: number;
};

export type GeneratedWorkout = {
    date: Date;
    type: WorkoutType;
    description: string;
    totalDistance: number;
    targetPace?: number;
    targetDuration?: number;
};

type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER';

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceType, raceDate } = config;
    const startDate = config.startDate || new Date();
    const runsPerWeek = config.runsPerWeek || 4;
    const ridesPerWeek = config.ridesPerWeek || 0;
    const strengthPerWeek = config.strengthPerWeek || 0;
    const swimsPerWeek = config.swimsPerWeek || 0;

    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3;

    let peakVolume = config.weeklyMileageGoal || 40000;
    const minPeak = PLAN_CONSTANTS.MIN_PEAK_VOLUME[raceType];
    if (peakVolume < minPeak) peakVolume = minPeak;

    const timeDiff = raceDate.getTime() - startDate.getTime();
    const totalWeeks = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7)));

    let startVolume = peakVolume * PLAN_CONSTANTS.START_VOLUME_RATIO;
    if (startVolume < PLAN_CONSTANTS.MIN_VOLUME_START) {
        startVolume = Math.min(PLAN_CONSTANTS.MIN_VOLUME_START, peakVolume);
    }

    const paces = calculateTrainingPaces(vdot);

    const defaultTaperWeeks = TAPER_FRACTIONS[raceType].length;
    const taperWeeks = config.taperWeeks ?? defaultTaperWeeks;
    const peakWeeks = config.peakWeeks ?? 4;
    const buildWeeks = config.buildWeeks ?? 4;

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

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    for (let week = 1; week <= totalWeeks; week++) {
        const weeksUntilRace = totalWeeks - week + 1;
        const phase = getPhase(weeksUntilRace, { taperWeeks, peakWeeks, buildWeeks });

        if (weeksUntilRace === 1) {
            const raceWeekWorkouts = generateRaceWeek({
                raceDate,
                raceType,
                paces,
                longRunDay,
            });
            raceWeekWorkouts.forEach(w => {
                const specificDate = w.type === WorkoutType.RACE
                    ? new Date(raceDate)
                    : new Date(currentDate);
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
                });
            });
            currentDate.setDate(currentDate.getDate() + 7);
            continue;
        }

        let weekVolumeCap: number;
        let isRecoveryWeek = false;

        if (phase === 'TAPER') {
            weekVolumeCap = getTaperVolume(weeksUntilRace, taperWeeks, effectivePeakVolume, raceType);
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
            preferredLongRunDay: longRunDay,
            preferredWorkoutDay: workoutDay,
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
            });
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    return workouts;
}

function getPhase(
    weeksUntilRace: number,
    options?: { taperWeeks?: number; peakWeeks?: number; buildWeeks?: number }
): Phase {
    const taperWeeks = options?.taperWeeks ?? 0;
    const peakWeeks = options?.peakWeeks ?? 0;
    const buildWeeks = options?.buildWeeks ?? 0;

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
    const taperWeekIndex = taperWeeks - weeksUntilRace;
    const clampedIndex = Math.min(Math.max(0, taperWeekIndex), fractions.length - 1);
    const fraction = fractions[clampedIndex];
    return Math.round(peakVolume * fraction);
}

function generateRaceWeek(params: {
    raceDate: Date;
    raceType: RaceType;
    paces: TrainingPaces;
    longRunDay: number;
}): ScheduledWorkout[] {
    const { raceDate, raceType, paces } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    const raceDayOfWeek = raceDate.getDay();
    const raceDistKm = getRaceDistanceKm(raceType);

    usedDays.add(raceDayOfWeek);
    workouts.push({
        dayOffset: raceDayOfWeek,
        type: WorkoutType.RACE,
        description: `Race Day: ${raceDistKm}km`,
        totalDistance: getRaceDistanceMeters(raceType),
        targetPace: 0,
        targetDuration: 0,
    });

    const preRaceStrideDay = (raceDayOfWeek - 2 + 7) % 7;
    if (!usedDays.has(preRaceStrideDay)) {
        usedDays.add(preRaceStrideDay);
        workouts.push({
            dayOffset: preRaceStrideDay,
            type: WorkoutType.EASY,
            description: `Easy Run: 3km + 4x100m Strides`,
            totalDistance: 3400,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
            targetDuration: 0,
        });
    }

    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const shakeoutCandidates = allDays.filter(d => {
        if (usedDays.has(d)) return false;
        const diff = (d - raceDayOfWeek + 7) % 7;
        return diff > 0 && diff < 7;
    });
    const shakeoutDays = shakeoutCandidates.slice(0, Math.min(2, shakeoutCandidates.length));
    for (const d of shakeoutDays) {
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.RECOVERY,
            description: 'Shakeout Run: 3km @ Easy',
            totalDistance: 3000,
            targetPace: paces.easy.max,
            targetDuration: 0,
        });
    }

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
    preferredLongRunDay: number;
    preferredWorkoutDay: number;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek, weeklyVolume,
        preferredLongRunDay, preferredWorkoutDay
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();
    const hardSessionDays: number[] = [];

    const longRunDist = getLongRunDistance(raceType, weeklyVolume, paces);

    const hasQuality = runsPerWeek >= 2 && phase !== 'TAPER';
    const qualitySession = hasQuality
        ? getQualitySession(raceType, paces, phase)
        : null;
    const qualityDist = qualitySession ? qualitySession.totalDistance : 0;

    const longRunCount = runsPerWeek >= 1 ? 1 : 0;
    const qualityRunCount = hasQuality ? 1 : 0;
    const totalKeyRuns = longRunCount + qualityRunCount;
    const easyRunsCount = Math.max(0, runsPerWeek - totalKeyRuns);

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
            targetDuration: 0,
        });
    }

    if (hasQuality && qualitySession) {
        const day = getAvailableDayWithGap(preferredWorkoutDay, hardSessionDays);
        usedDays.add(day);
        hardSessionDays.push(day);
        workouts.push({
            dayOffset: day,
            ...qualitySession,
            targetDuration: 0,
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
            targetDuration: 0,
        });
    }

    const additionalRunsCount = Math.max(0, runsPerWeek - totalKeyRuns);
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
                targetDuration: 0,
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
                targetDuration: 0,
            });
        }
    }

    const longRunDay = workouts.find(w => w.type === WorkoutType.LONG_RUN)?.dayOffset;
    const qualityDay = workouts.find(w =>
        w.type === WorkoutType.INTERVALS || w.type === WorkoutType.TEMPO ||
        w.type === WorkoutType.REPETITIONS || w.type === WorkoutType.EASY && w.description.includes('Fartlek')
    )?.dayOffset;

    const protectedDays = new Set<number>();
    if (longRunDay !== undefined) protectedDays.add(longRunDay);
    if (qualityDay !== undefined) protectedDays.add(qualityDay);

    const totalCardio = ridesPerWeek + swimsPerWeek;
    const cardioFreeDays = getAvailableCrossTrainingDays(totalCardio, usedDays, protectedDays);
    let remainingRides = ridesPerWeek;
    let remainingSwims = swimsPerWeek;

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
                });
            }
        }
    }

    const cardioDays = new Set<number>();
    workouts.forEach(w => {
        if (w.type === WorkoutType.RIDE || w.type === WorkoutType.SWIM) {
            cardioDays.add(w.dayOffset);
        }
    });

    const strengthOnCardio = Math.min(strengthPerWeek, cardioDays.size);
    const strengthOnFree = strengthPerWeek - strengthOnCardio;

    const cardioDaysArray = Array.from(cardioDays);
    for (let i = 0; i < strengthOnCardio; i++) {
        const d = cardioDaysArray[i % cardioDaysArray.length];
        workouts.push({
            dayOffset: d,
            type: WorkoutType.STRENGTH,
            description: 'Strength: 45min Session',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700,
        });
    }

    if (strengthOnFree > 0) {
        const strengthFreeDays = getDistributedDays(strengthOnFree, usedDays, true, workouts);
        for (const d of strengthFreeDays) {
            usedDays.add(d);
            workouts.push({
                dayOffset: d,
                type: WorkoutType.STRENGTH,
                description: 'Strength: 45min Session',
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 2700,
            });
        }
    }

    return workouts;
}

function getLongRunDistance(
    raceType: RaceType,
    weeklyVolume: number,
    paces: TrainingPaces
): number {
    let ratio = PLAN_CONSTANTS.LONG_RUN_RATIO;

    if ((raceType === 'HALF_MARATHON' || raceType === 'MARATHON') &&
        weeklyVolume < PLAN_CONSTANTS.LOW_VOLUME_THRESHOLD) {
        ratio = PLAN_CONSTANTS.LONG_RUN_RATIO_LOW_VOLUME;
    }

    let dist = weeklyVolume * ratio;

    let maxDist = PLAN_CONSTANTS.MAX_LONG_RUN_DIST[raceType];
    if (dist > maxDist) dist = maxDist;

    const safeEasyMax = Math.max(120, paces.easy.max);
    const maxDistForTime = Math.round((PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS / safeEasyMax) * 1000);
    if (dist > maxDistForTime) dist = maxDistForTime;

    if (dist < PLAN_CONSTANTS.MIN_LONG_RUN) dist = PLAN_CONSTANTS.MIN_LONG_RUN;

    return Math.round(dist / 1000) * 1000;
}

function getQualitySession(
    raceType: RaceType,
    paces: TrainingPaces,
    phase: Phase
): { type: WorkoutType; description: string; totalDistance: number; targetPace: number } {
    if (raceType === 'FIVE_K') {
        return get5KQualitySession(paces, phase);
    }
    if (raceType === 'TEN_K') {
        return get10KQualitySession(paces, phase);
    }
    if (raceType === 'HALF_MARATHON') {
        return getHalfMarathonQualitySession(paces, phase);
    }
    return getMarathonQualitySession(paces, phase);
}

function get5KQualitySession(paces: TrainingPaces, phase: Phase) {
    if (phase === 'BASE') {
        return {
            type: WorkoutType.EASY,
            description: `Fartlek: 8km (2min hard / 2min easy)`,
            totalDistance: 8000,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
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
        return {
            type: WorkoutType.EASY,
            description: `Fartlek: 10km (3min hard / 2min easy)`,
            totalDistance: 10000,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
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
        return {
            type: WorkoutType.EASY,
            description: `Fartlek: 10km (4min hard / 3min easy)`,
            totalDistance: 10000,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
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
        return {
            type: WorkoutType.EASY,
            description: `Fartlek: 12km (5min hard / 3min easy)`,
            totalDistance: 12000,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
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
    const isPriority = (w: ScheduledWorkout) =>
        w.type === WorkoutType.LONG_RUN ||
        w.type === WorkoutType.INTERVALS ||
        w.type === WorkoutType.TEMPO ||
        w.type === WorkoutType.RACE ||
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
            const newDist = Math.round((w.totalDistance * scalingFactor) / 100) * 100;
            const finalDist = Math.max(newDist, 3000);
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
        let newDist = Math.round((w.totalDistance * fillScalingFactor) / 100) * 100;
        if (newDist < 3000) newDist = 3000;
        return {
            ...w,
            totalDistance: newDist,
            description: preserveSpecialDescription(w, newDist),
        };
    });
}

function preserveSpecialDescription(w: ScheduledWorkout, distance: number): string {
    if (w.description.includes('Fartlek')) {
        return `Fartlek: ${(distance / 1000).toFixed(1)}km (5min hard / 3min easy)`;
    }
    if (w.description.includes('Strides')) {
        return `Easy Run: ${(distance / 1000).toFixed(1)}km + 6x100m Strides`;
    }
    if (w.description.includes('MP')) {
        return w.description;
    }
    return updateDescription(w.type, distance, w.targetPace || 0);
}

function getRaceDistanceKm(raceType: RaceType): string {
    switch (raceType) {
        case 'FIVE_K': return '5';
        case 'TEN_K': return '10';
        case 'HALF_MARATHON': return '21.1';
        case 'MARATHON': return '42.2';
    }
}

function getRaceDistanceMeters(raceType: RaceType): number {
    switch (raceType) {
        case 'FIVE_K': return 5000;
        case 'TEN_K': return 10000;
        case 'HALF_MARATHON': return 21097;
        case 'MARATHON': return 42195;
    }
}

function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isRun(type: WorkoutType): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
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
        case 'REPETITIONS': return `Reps: Total ${distKm}km Session`;
        case 'RACE': return `Race Day: ${distKm}km`;
        default: return `${type}: ${distKm}km`;
    }
}
