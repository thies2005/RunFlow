import { WorkoutType, RaceType, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '@/lib/metrics/vdot';
import { PlanConfig, GeneratedWorkout, PLAN_CONSTANTS, getMinStartVolume, resolvePhaseBudget } from '../index';
import { fixBackToBackSameType } from '../schedule-utils';
import { enrichWorkoutsWithDescriptions } from '../descriptions';

type UltraPhase = 'BASE' | 'BUILD' | 'ENDURANCE' | 'MENTAL_PREP' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

const ULTRA_CONSTANTS = {
    MIN_PEAK_VOLUME: {
        FIFTY_K: 50000,
        FIFTY_MILE: 60000,
        HUNDRED_K: 70000,
        HUNDRED_MILE: 80000,
        TWELVE_HOUR: 60000,
        TWENTY_FOUR_HOUR: 70000,
        BACKYARD_ULTRA: 60000,
    } as Partial<Record<RaceType, number>>,
    MAX_LONG_RUN_DIST: {
        FIFTY_K: 35000,
        FIFTY_MILE: 40000,
        HUNDRED_K: 45000,
        HUNDRED_MILE: 50000,
        TWELVE_HOUR: 40000,
        TWENTY_FOUR_HOUR: 50000,
        BACKYARD_ULTRA: 35000,
    } as Partial<Record<RaceType, number>>,
    MAX_TIME_ON_FEET_SECONDS: 25200,
    BACK_TO_BACK_RATIO: 0.6,
    WALK_RUN_RATIO_EASY: 0.8,
    LONG_RUN_RATIO_ULTRA: 0.50,
};

const ULTRA_TAPER_FRACTIONS: Partial<Record<RaceType, number[]>> = {
    FIFTY_K: [0.75, 0.55],
    FIFTY_MILE: [0.75, 0.60, 0.45],
    HUNDRED_K: [0.80, 0.65, 0.50],
    HUNDRED_MILE: [0.80, 0.65, 0.50, 0.35],
    TWELVE_HOUR: [0.75, 0.60],
    TWENTY_FOUR_HOUR: [0.80, 0.65, 0.50],
    BACKYARD_ULTRA: [0.75, 0.60, 0.45],
};

const ULTRA_RACE_DISTANCE_KM: Partial<Record<RaceType, string>> = {
    FIFTY_K: '50',
    FIFTY_MILE: '80.5',
    HUNDRED_K: '100',
    HUNDRED_MILE: '161',
    TWELVE_HOUR: '12h',
    TWENTY_FOUR_HOUR: '24h',
    BACKYARD_ULTRA: 'Backyard Ultra',
};

const ULTRA_RACE_DISTANCE_M: Partial<Record<RaceType, number>> = {
    FIFTY_K: 50000,
    FIFTY_MILE: 80467,
    HUNDRED_K: 100000,
    HUNDRED_MILE: 160934,
};

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateUltraPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceDate } = config;
    const raceType = config.raceType as RaceType;
    const requestedStartDate = config.startDate || new Date();
    const startDate = requestedStartDate > raceDate ? new Date(raceDate) : requestedStartDate;
    const runsPerWeek = Math.max(3, config.runsPerWeek ?? 5);
    const strengthPerWeek = Math.max(0, config.strengthPerWeek ?? 1);
    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;

    const isBackyardUltra = raceType === 'BACKYARD_ULTRA';
    const isTimedEvent = raceType === 'TWELVE_HOUR' || raceType === 'TWENTY_FOUR_HOUR';

    let peakVolume = config.weeklyMileageGoal || 60000;
    const minPeak = ULTRA_CONSTANTS.MIN_PEAK_VOLUME[raceType] || 60000;
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
    const ultraEasyPace = Math.round(paces.easy.max * 1.1);

    const taperFractions = ULTRA_TAPER_FRACTIONS[raceType];
    const defaultTaperWeeks = taperFractions?.length || 3;
    const phases = resolvePhaseBudget(totalWeeks, config, {
        isUltra: true,
        isBackyardUltra,
        defaultTaper: defaultTaperWeeks,
    });
    const taperWeeks = phases.taperWeeks;
    const peakWeeks = phases.peakWeeks;
    const buildWeeks = phases.buildWeeks;
    const enduranceWeeks = phases.enduranceWeeks || 0;
    const mentalPrepWeeks = phases.mentalPrepWeeks || 0;

    const growthRatio = peakVolume / startVolume;
    const minRampWeeks = growthRatio > 1.001
        ? Math.ceil(Math.log(growthRatio) / Math.log(PLAN_CONSTANTS.WEEKLY_GROWTH_CAP))
        : 1;

    let calendarRampWeeks = minRampWeeks;
    while (calendarRampWeeks - Math.floor(calendarRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE) < minRampWeeks) {
        calendarRampWeeks++;
    }

    const availableRampWeeks = Math.max(1, totalWeeks - taperWeeks - mentalPrepWeeks);
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
        const phase = getUltraPhase(weeksUntilRace, {
            taperWeeks,
            mentalPrepWeeks,
            enduranceWeeks,
            peakWeeks,
            buildWeeks,
            isBackyardUltra,
        });

        if (phase === 'RACE_WEEK') {
            const raceWeekWorkouts = generateUltraRaceWeek({
                raceDate,
                raceType,
                paces,
                ultraEasyPace,
                runsPerWeek,
                strengthPerWeek,
                isTimedEvent,
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
                    phase: 'RACE_WEEK' as PlanPhase,
                });
            });
            currentDate.setDate(currentDate.getDate() + 7);
            continue;
        }

        let weekVolumeCap: number;
        let isRecoveryWeek = false;

        if (phase === 'TAPER') {
            weekVolumeCap = getUltraTaperVolume(weeksUntilRace, taperWeeks, effectivePeakVolume, raceType);
            weekVolumeCap = Math.max(PLAN_CONSTANTS.EASY_RUN_MIN * 2, weekVolumeCap);
        } else if (phase === 'MENTAL_PREP') {
            const mentalPrepWeekIndex = weeksUntilRace - taperWeeks;
            const mentalPrepTotal = taperWeeks + mentalPrepWeekIndex;
            if (mentalPrepWeekIndex === 1) {
                weekVolumeCap = Math.round(effectivePeakVolume * 0.70);
            } else {
                weekVolumeCap = Math.round(effectivePeakVolume * 0.80);
            }
        } else if (phase === 'PEAK') {
            weekVolumeCap = effectivePeakVolume;
        } else if (phase === 'ENDURANCE') {
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

        const weekSchedule = generateUltraWeek({
            phase,
            raceType,
            paces,
            ultraEasyPace,
            runsPerWeek,
            strengthPerWeek,
            weeklyVolume: weekVolumeCap,
            maxLongRunKm: config.maxLongRunKm,
            preferredLongRunDay: longRunDay,
            restDays: config.restDays,
            isBackyardUltra,
            isTimedEvent,
            isRecoveryWeek,
        });

        const runningWorkouts = weekSchedule.filter(w => isUltraRun(w.type));
        const totalRunDistance = runningWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

        const finalSchedule = totalRunDistance > weekVolumeCap
            ? scaleUltraToVolumeCap(weekSchedule, weekVolumeCap)
            : weekSchedule;

        finalSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);
            if (specificDate < startDate) return;
            if (isUltraRun(w.type) && w.totalDistance === 0) return;
            workouts.push({
                date: specificDate,
                type: w.type,
                description: w.description,
                totalDistance: w.totalDistance,
                targetPace: w.targetPace,
                targetDuration: w.targetDuration,
                phase: phase as PlanPhase,
            });
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    const result = fixBackToBackSameType(workouts, {
        raceDate,
        restDays: config.restDays,
        protectedTypes: [WorkoutType.RACE, WorkoutType.LONG_RUN],
    });
    enrichWorkoutsWithDescriptions(result, ultraEasyPace);
    return result;
}

function getUltraPhase(
    weeksUntilRace: number,
    options: {
        taperWeeks: number;
        mentalPrepWeeks: number;
        enduranceWeeks: number;
        peakWeeks: number;
        buildWeeks: number;
        isBackyardUltra: boolean;
    },
): UltraPhase {
    const { taperWeeks, mentalPrepWeeks, enduranceWeeks, peakWeeks, buildWeeks, isBackyardUltra } = options;

    if (weeksUntilRace === 1) return 'RACE_WEEK';
    if (weeksUntilRace <= taperWeeks) return 'TAPER';
    if (isBackyardUltra && mentalPrepWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks) return 'MENTAL_PREP';
    if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks + peakWeeks) return 'PEAK';
    if (enduranceWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks + peakWeeks + enduranceWeeks) return 'ENDURANCE';
    if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks + peakWeeks + enduranceWeeks + buildWeeks) return 'BUILD';
    return 'BASE';
}

function getUltraTaperVolume(
    weeksUntilRace: number,
    taperWeeks: number,
    peakVolume: number,
    raceType: RaceType,
): number {
    const fractions = ULTRA_TAPER_FRACTIONS[raceType];
    if (!fractions) return Math.round(peakVolume * 0.65);
    const taperWeekIndex = taperWeeks - weeksUntilRace;
    const clampedIndex = Math.min(Math.max(0, taperWeekIndex), fractions.length - 1);
    return Math.round(peakVolume * fractions[clampedIndex]);
}

function getUltraLongRunDistance(
    raceType: RaceType,
    weeklyVolume: number,
    paces: TrainingPaces,
    maxLongRunKm?: number,
): number {
    let ratio = ULTRA_CONSTANTS.LONG_RUN_RATIO_ULTRA;
    let dist = weeklyVolume * ratio;

    const ultraMax = ULTRA_CONSTANTS.MAX_LONG_RUN_DIST[raceType] || 50000;
    let dynamicCap = Math.min(weeklyVolume * PLAN_CONSTANTS.DYNAMIC_LONG_RUN_RATIO, ultraMax);
    if (maxLongRunKm) {
        const userCap = maxLongRunKm * 1000;
        if (userCap < dynamicCap) dynamicCap = userCap;
    }
    if (dist > dynamicCap) dist = dynamicCap;

    const safeEasyMax = Math.max(120, paces.easy.max * 1.1);
    const maxDistForTime = Math.round((ULTRA_CONSTANTS.MAX_TIME_ON_FEET_SECONDS / safeEasyMax) * 1000);
    if (dist > maxDistForTime) dist = maxDistForTime;

    if (dist < PLAN_CONSTANTS.MIN_LONG_RUN) dist = PLAN_CONSTANTS.MIN_LONG_RUN;

    return Math.round(dist / 1000) * 1000;
}

function generateUltraWeek(params: {
    phase: UltraPhase;
    raceType: RaceType;
    paces: TrainingPaces;
    ultraEasyPace: number;
    runsPerWeek: number;
    strengthPerWeek: number;
    weeklyVolume: number;
    maxLongRunKm?: number;
    preferredLongRunDay: number;
    restDays?: number[];
    isBackyardUltra: boolean;
    isTimedEvent: boolean;
    isRecoveryWeek: boolean;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, ultraEasyPace,
        runsPerWeek, strengthPerWeek, weeklyVolume,
        maxLongRunKm, preferredLongRunDay, restDays,
        isBackyardUltra, isTimedEvent, isRecoveryWeek,
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();
    const hardSessionDays: number[] = [];

    if (restDays && restDays.length > 0) {
        for (const rd of restDays) usedDays.add(rd);
    }

    const longRunDist = getUltraLongRunDistance(raceType, weeklyVolume, paces, maxLongRunKm);
    const backToBackDist = Math.round(longRunDist * ULTRA_CONSTANTS.BACK_TO_BACK_RATIO);

    const hasQuality = runsPerWeek >= 4 && phase !== 'TAPER' && phase !== 'MENTAL_PREP' && !isRecoveryWeek;
    const qualitySession = hasQuality ? getUltraQualitySession(phase, paces, ultraEasyPace) : null;
    const qualityDist = qualitySession ? qualitySession.totalDistance : 0;

    const hasBackToBack = phase === 'ENDURANCE' || phase === 'PEAK' || phase === 'MENTAL_PREP';
    const longRunCount = hasBackToBack ? 2 : 1;
    const qualityRunCount = hasQuality ? 1 : 0;
    const easyRunsCount = Math.max(0, runsPerWeek - longRunCount - qualityRunCount);

    const remainingVol = Math.max(0, weeklyVolume - longRunDist - backToBackDist - qualityDist);
    const calculatedEasyDist = easyRunsCount > 0 ? remainingVol / easyRunsCount : 6000;

    const easyDist = Math.max(
        PLAN_CONSTANTS.EASY_RUN_MIN,
        Math.min(Math.round(calculatedEasyDist / 100) * 100, PLAN_CONSTANTS.EASY_RUN_MAX),
    );

    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);
    const recoveryPace = paces.easy.max;

    const getAvailableDay = (preferred: number, gapFrom: number[]): number => {
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
        const day = getAvailableDay(preferredLongRunDay, []);
        usedDays.add(day);
        hardSessionDays.push(day);

        let longRunDesc: string;
        let longRunPace = easyPace;

        if (phase === 'PEAK' && !isBackyardUltra && !isTimedEvent) {
            const raceDist = ULTRA_RACE_DISTANCE_M[raceType] || 50000;
            const mpDist = Math.min(Math.round(longRunDist * 0.2 / 100) * 100, raceDist * 0.3);
            const easyPart = longRunDist - mpDist;
            longRunDesc = `Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ Ultra Pace (with fueling practice)`;
        } else if (phase === 'ENDURANCE') {
            longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Ultra Easy (fueling + walk/run strategy)`;
            longRunPace = ultraEasyPace;
        } else {
            longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`;
        }

        workouts.push({
            dayOffset: day,
            type: WorkoutType.LONG_RUN,
            description: longRunDesc,
            totalDistance: longRunDist,
            targetPace: longRunPace,
            targetDuration: 0,
        });

        if (hasBackToBack) {
            const adjacentCandidates = [
                day < 6 ? day + 1 : null,
                day > 0 ? day - 1 : null,
            ].filter((candidate): candidate is number => candidate !== null);
            const b2bDay = adjacentCandidates.find(candidate => !usedDays.has(candidate)) ?? -1;

            if (b2bDay !== -1) {
                usedDays.add(b2bDay);

                let b2bDesc: string;
                if (phase === 'MENTAL_PREP' && isBackyardUltra) {
                    b2bDesc = `Back-to-Back: ${(backToBackDist / 1000).toFixed(1)}km @ Loop Pace (consistency drill)`;
                } else {
                    b2bDesc = `Back-to-Back: ${(backToBackDist / 1000).toFixed(1)}km @ Easy (fatigue legs)`;
                }

                workouts.push({
                    dayOffset: b2bDay,
                    type: WorkoutType.LONG_RUN,
                    description: b2bDesc,
                    totalDistance: backToBackDist,
                    targetPace: ultraEasyPace,
                    targetDuration: 0,
                });
            }
        }
    }

    if (hasQuality && qualitySession) {
        const day = getAvailableDay(3, hardSessionDays);
        usedDays.add(day);
        hardSessionDays.push(day);
        workouts.push({ dayOffset: day, ...qualitySession, targetDuration: 0 });
    }

    const additionalRunsCount = Math.max(0, easyRunsCount);
    const easyRunDays = getDistributedDays(additionalRunsCount, usedDays);

    for (const d of easyRunDays) {
        usedDays.add(d);
        const dayAfterHard = hardSessionDays.some(hd => {
            const diff = (d - hd + 7) % 7;
            return diff === 1;
        });

        if (dayAfterHard) {
            workouts.push({
                dayOffset: d,
                type: WorkoutType.RECOVERY,
                description: `Recovery: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
                targetPace: recoveryPace,
                targetDuration: 0,
            });
        } else {
            workouts.push({
                dayOffset: d,
                type: WorkoutType.EASY,
                description: `Easy: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
                targetPace: easyPace,
                targetDuration: 0,
            });
        }
    }

    if (phase === 'MENTAL_PREP' && isBackyardUltra) {
        const nightRunDay = getAvailableDay(5, hardSessionDays);
        if (nightRunDay !== -1 && !usedDays.has(nightRunDay)) {
            usedDays.add(nightRunDay);
            workouts.push({
                dayOffset: nightRunDay,
                type: WorkoutType.EASY,
                description: `Night Run: ${(easyDist / 1000).toFixed(1)}km (sleep deprivation practice)`,
                totalDistance: easyDist,
                targetPace: ultraEasyPace,
                targetDuration: 0,
            });
        }
    }

    if (isTimedEvent && (phase === 'ENDURANCE' || phase === 'PEAK')) {
        const targetHours = raceType === 'TWELVE_HOUR' ? 3 : 4;
        const paceRunDay = getAvailableDay(2, hardSessionDays);
        if (paceRunDay !== -1 && !usedDays.has(paceRunDay)) {
            usedDays.add(paceRunDay);
            workouts.push({
                dayOffset: paceRunDay,
                type: WorkoutType.TEMPO,
                description: `Steady State: ${targetHours}h @ Target Race Pace`,
                totalDistance: Math.round(easyDist * 1.5),
                targetPace: ultraEasyPace,
                targetDuration: targetHours * 3600,
            });
        }
    }

    let remainingStrength = strengthPerWeek;
    const freeDays: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) freeDays.push(d);
    }

    for (const d of freeDays) {
        if (remainingStrength <= 0) break;
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.STRENGTH,
            description: 'Strength: 45min (Trail/Ultra Focus)',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700,
        });
        remainingStrength--;
    }

    return workouts;
}

function getUltraQualitySession(
    phase: UltraPhase,
    paces: TrainingPaces,
    ultraEasyPace: number,
): { type: WorkoutType; description: string; totalDistance: number; targetPace: number } | null {
    if (phase === 'BASE') {
        return {
            type: WorkoutType.FARTLEK,
            description: `Fartlek: 10km (4min hard / 3min easy)`,
            totalDistance: 10000,
            targetPace: Math.round((paces.threshold + paces.interval) / 2),
        };
    }
    if (phase === 'BUILD') {
        return {
            type: WorkoutType.TEMPO,
            description: `Threshold: 8km @ ${formatPace(paces.threshold)}`,
            totalDistance: 10000,
            targetPace: paces.threshold,
        };
    }
    if (phase === 'ENDURANCE') {
        return {
            type: WorkoutType.TEMPO,
            description: `Steady: 10km @ Ultra Threshold`,
            totalDistance: 12000,
            targetPace: Math.round(paces.threshold + 15),
        };
    }
    return {
        type: WorkoutType.TEMPO,
        description: `Steady: 12km @ Ultra Threshold`,
        totalDistance: 14000,
        targetPace: Math.round(paces.threshold + 15),
    };
}

function generateUltraRaceWeek(params: {
    raceDate: Date;
    raceType: RaceType;
    paces: TrainingPaces;
    ultraEasyPace: number;
    runsPerWeek: number;
    strengthPerWeek: number;
    isTimedEvent: boolean;
}): ScheduledWorkout[] {
    const { raceType, runsPerWeek } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    const raceLabel = ULTRA_RACE_DISTANCE_KM[raceType] || 'Ultra';
    usedDays.add(0);
    workouts.push({
        dayOffset: 0,
        type: WorkoutType.RACE,
        description: `Race Day: ${raceLabel}`,
        totalDistance: ULTRA_RACE_DISTANCE_M[raceType] || 50000,
        targetPace: 0,
        targetDuration: 0,
    });

    const shakeoutOffsets = [-2, -3, -4];
    let shakeoutCount = 0;
    for (const offset of shakeoutOffsets) {
        if (shakeoutCount >= 2) break;
        if (usedDays.has(offset)) continue;
        usedDays.add(offset);
        shakeoutCount++;
        workouts.push({
            dayOffset: offset,
            type: WorkoutType.RECOVERY,
            description: 'Shakeout: 3km Easy',
            totalDistance: 3000,
            targetPace: params.ultraEasyPace,
            targetDuration: 0,
        });
    }

    return workouts.sort((a, b) => a.dayOffset - b.dayOffset);
}

function scaleUltraToVolumeCap(weekSchedule: ScheduledWorkout[], weekVolumeCap: number): ScheduledWorkout[] {
    const runningWorkouts = weekSchedule.filter(w => isUltraRun(w.type));
    const totalDist = runningWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);
    if (totalDist === 0) return weekSchedule;

    const scaleFactor = Math.min(1, weekVolumeCap / totalDist);
    return weekSchedule.map(w => {
        if (!isUltraRun(w.type)) return w;
        const newDist = Math.floor(w.totalDistance * scaleFactor / 100) * 100;
        if (w.type === WorkoutType.LONG_RUN) {
            if (w.description.includes('Back-to-Back')) {
                const suffix = w.description.includes('@ Loop Pace')
                    ? '@ Loop Pace (consistency drill)'
                    : '@ Easy (fatigue legs)';
                return { ...w, totalDistance: newDist, description: `Back-to-Back: ${(newDist / 1000).toFixed(1)}km ${suffix}` };
            }
            if (w.description.includes('fueling') || w.description.includes('walk/run')) {
                return { ...w, totalDistance: newDist, description: `Long Run: ${(newDist / 1000).toFixed(1)}km @ Ultra Easy (fueling + walk/run strategy)` };
            }
            return { ...w, totalDistance: newDist, description: `Long Run: ${(newDist / 1000).toFixed(1)}km @ Easy` };
        }
        return { ...w, totalDistance: newDist };
    });
}

function getDistributedDays(count: number, usedDays: Set<number>): number[] {
    if (count <= 0) return [];
    const available: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) available.push(d);
    }

    const toTake = Math.min(count, available.length);
    const idealInterval = available.length / toTake;
    const selected: number[] = [];

    for (let i = 0; i < toTake; i++) {
        const idx = Math.min(Math.floor(i * idealInterval), available.length - 1);
        selected.push(available[idx]);
    }
    return selected;
}

function isUltraRun(type: WorkoutType): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
}

function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
