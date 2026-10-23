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
    FIFTY_MILE: [0.75, 0.55],
    HUNDRED_K: [0.75, 0.55],
    HUNDRED_MILE: [0.80, 0.65, 0.50],
    TWELVE_HOUR: [0.75, 0.55],
    TWENTY_FOUR_HOUR: [0.80, 0.65, 0.50],
    BACKYARD_ULTRA: [0.75, 0.55],
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

function computeUltraEventPace(raceType: RaceType, paces: TrainingPaces): number {
    if (raceType === 'TWENTY_FOUR_HOUR') {
        // 24h fatigue decay + physiological floor (310s/km => max ~278km in 24h at VDOT 80)
        return Math.max(310, Math.round(paces.easy.max * 1.32));
    }
    if (raceType === 'TWELVE_HOUR') {
        return Math.max(255, Math.round(paces.easy.max * 1.18));
    }
    if (raceType === 'BACKYARD_ULTRA') {
        return Math.max(300, Math.round(paces.easy.max * 1.25));
    }
    return Math.round(paces.easy.max * 1.1);
}

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
    const totalWeeks = Math.min(PLAN_CONSTANTS.MAX_TOTAL_WEEKS, Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7)) + 1));

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
    const ultraEasyPace = computeUltraEventPace(raceType, paces);

    const taperFractions = ULTRA_TAPER_FRACTIONS[raceType];
    const defaultTaperWeeks = taperFractions?.length || 2;
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
    let b2bWeeksCompleted = 0;

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
                customDistanceM: config.customDistanceM,
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
                    targetHrZone: w.targetHrZone,
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
            if (mentalPrepWeekIndex === 1) {
                weekVolumeCap = Math.round(effectivePeakVolume * 0.70);
            } else {
                weekVolumeCap = Math.round(effectivePeakVolume * 0.80);
            }
        } else if (phase === 'PEAK') {
            weekVolumeCap = effectivePeakVolume;
        } else {
            baseBuildCounter++;
            isRecoveryWeek = baseBuildCounter % PLAN_CONSTANTS.STEP_LOADING_CYCLE === 0;
            if (isRecoveryWeek) {
                weekVolumeCap = Math.round(lastNonRecoveryVolume * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR);
            } else {
                effectiveWeekIndex++;
                const targetVol = Math.round(startVolume * Math.pow(weeklyGrowthRate, effectiveWeekIndex));
                const maxAllowed = Math.round(lastNonRecoveryVolume * PLAN_CONSTANTS.WEEKLY_GROWTH_CAP);
                weekVolumeCap = Math.min(targetVol, maxAllowed, effectivePeakVolume);
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
            b2bWeekIndex: b2bWeeksCompleted,
            customDistanceM: config.customDistanceM,
        });
        if ((phase === 'ENDURANCE' || phase === 'PEAK' || phase === 'MENTAL_PREP') && !isRecoveryWeek) {
            b2bWeeksCompleted++;
        }

        const runningWorkouts = weekSchedule.filter(w => isUltraRun(w.type));
        const totalRunDistance = runningWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

        const finalSchedule = totalRunDistance > weekVolumeCap
            ? scaleUltraToVolumeCap(weekSchedule, weekVolumeCap)
            : weekSchedule;

        const scheduledRunMeters = finalSchedule
            .filter(w => isUltraRun(w.type))
            .reduce((sum, w) => sum + w.totalDistance, 0);
        if (!isRecoveryWeek && phase !== 'TAPER' && phase !== 'MENTAL_PREP' && scheduledRunMeters > 0) {
            lastNonRecoveryVolume = scheduledRunMeters;
        }

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
                targetHrZone: w.targetHrZone,
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

    return Math.round(dist / 100) * 100;
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
    b2bWeekIndex?: number;
    customDistanceM?: number | null;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, ultraEasyPace,
        runsPerWeek, strengthPerWeek, weeklyVolume,
        maxLongRunKm, preferredLongRunDay, restDays,
        isBackyardUltra, isTimedEvent, isRecoveryWeek,
        b2bWeekIndex = 0, customDistanceM,
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();
    const hardSessionDays: number[] = [];

    if (restDays && restDays.length > 0) {
        for (const rd of restDays) usedDays.add(rd);
    }

    const rawLongRunDist = getUltraLongRunDistance(raceType, weeklyVolume, paces, maxLongRunKm);
    const longRunDist = isRecoveryWeek
        ? Math.max(PLAN_CONSTANTS.MIN_LONG_RUN, Math.round(rawLongRunDist * 0.80 / 100) * 100)
        : rawLongRunDist;

    // Only schedule Back-to-Back on non-recovery ENDURANCE/PEAK/MENTAL_PREP weeks, ramping ratio 0.40 -> 0.50 -> 0.60
    const hasBackToBack = !isRecoveryWeek && (phase === 'ENDURANCE' || phase === 'PEAK' || phase === 'MENTAL_PREP');
    const b2bRatio = b2bWeekIndex === 0 ? 0.40 : b2bWeekIndex === 1 ? 0.50 : ULTRA_CONSTANTS.BACK_TO_BACK_RATIO;
    const backToBackDist = hasBackToBack ? Math.round(longRunDist * b2bRatio / 100) * 100 : 0;

    const hasTimedSteady = isTimedEvent && !isRecoveryWeek && (phase === 'ENDURANCE' || phase === 'PEAK');
    const hasQuality = runsPerWeek >= 4 && phase !== 'TAPER' && phase !== 'MENTAL_PREP' && !isRecoveryWeek && !hasTimedSteady;
    const qualitySession = hasQuality ? getUltraQualitySession(phase, paces, ultraEasyPace) : null;

    // For timed events in ENDURANCE/PEAK, the race-pace steady session replaces the generic threshold quality session
    let timedSteadyDist = 0;
    let timedSteadyDuration = 0;
    if (hasTimedSteady) {
        const maxSteadyDist = Math.max(10000, Math.min(24000, Math.round(weeklyVolume * 0.24 / 100) * 100));
        timedSteadyDist = maxSteadyDist;
        timedSteadyDuration = Math.round((timedSteadyDist / 1000) * ultraEasyPace);
    }

    const qualityDist = hasTimedSteady ? timedSteadyDist : (qualitySession ? qualitySession.totalDistance : 0);

    const longRunCount = hasBackToBack ? 2 : 1;
    const qualityRunCount = (hasQuality || hasTimedSteady) ? 1 : 0;
    const easyRunsCount = Math.max(0, runsPerWeek - longRunCount - qualityRunCount);

    // Only subtract backToBackDist when hasBackToBack is true (prevents +35% jump at BUILD->ENDURANCE boundary)
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
            const raceDist = customDistanceM && customDistanceM > 0
                ? customDistanceM
                : (ULTRA_RACE_DISTANCE_M[raceType] || 50000);
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
            targetDuration: Math.round((longRunDist / 1000) * longRunPace),
        });

        if (hasBackToBack && backToBackDist > 0) {
            const adjacentCandidates = [
                day < 6 ? day + 1 : null,
                day > 0 ? day - 1 : null,
            ].filter((candidate): candidate is number => candidate !== null);
            const b2bDay = adjacentCandidates.find(candidate => !usedDays.has(candidate)) ?? -1;

            if (b2bDay !== -1) {
                usedDays.add(b2bDay);

                let b2bDesc: string;
                if (phase === 'MENTAL_PREP' && isBackyardUltra) {
                    const laps = Math.max(2, Math.round(backToBackDist / 6706));
                    b2bDesc = `Back-to-Back: ${(backToBackDist / 1000).toFixed(1)}km @ Loop Pace (${laps}x6.7km hourly lap simulation)`;
                } else {
                    b2bDesc = `Back-to-Back: ${(backToBackDist / 1000).toFixed(1)}km @ Easy (fatigue legs)`;
                }

                workouts.push({
                    dayOffset: b2bDay,
                    type: WorkoutType.LONG_RUN,
                    description: b2bDesc,
                    totalDistance: backToBackDist,
                    targetPace: ultraEasyPace,
                    targetDuration: Math.round((backToBackDist / 1000) * ultraEasyPace),
                });
            }
        }
    }

    if (hasTimedSteady && timedSteadyDist > 0) {
        const paceRunDay = getAvailableDay(3, hardSessionDays);
        usedDays.add(paceRunDay);
        hardSessionDays.push(paceRunDay);
        workouts.push({
            dayOffset: paceRunDay,
            type: WorkoutType.TEMPO,
            description: `Steady State: ${(timedSteadyDist / 1000).toFixed(1)}km @ Target Race Pace (${formatPace(ultraEasyPace)}/km)`,
            totalDistance: timedSteadyDist,
            targetPace: ultraEasyPace,
            targetDuration: timedSteadyDuration,
            targetHrZone: 2,
        });
    } else if (hasQuality && qualitySession) {
        const day = getAvailableDay(3, hardSessionDays);
        usedDays.add(day);
        hardSessionDays.push(day);
        workouts.push({ dayOffset: day, ...qualitySession, targetDuration: 0 });
    }

    const additionalRunsCount = Math.max(0, easyRunsCount);
    const easyRunDays = getDistributedDays(additionalRunsCount, usedDays);

    for (let idx = 0; idx < easyRunDays.length; idx++) {
        const d = easyRunDays[idx];
        usedDays.add(d);
        const dayAfterHard = hardSessionDays.some(hd => {
            const diff = (d - hd + 7) % 7;
            return diff === 1;
        });

        if (phase === 'MENTAL_PREP' && isBackyardUltra && idx === easyRunDays.length - 1) {
            workouts.push({
                dayOffset: d,
                type: WorkoutType.EASY,
                description: `Night Run: ${(easyDist / 1000).toFixed(1)}km (sleep deprivation & headlamp practice)`,
                totalDistance: easyDist,
                targetPace: ultraEasyPace,
                targetDuration: Math.round((easyDist / 1000) * ultraEasyPace),
            });
        } else if (dayAfterHard) {
            workouts.push({
                dayOffset: d,
                type: WorkoutType.RECOVERY,
                description: `Recovery: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
                targetPace: recoveryPace,
                targetDuration: Math.round((easyDist / 1000) * recoveryPace),
            });
        } else {
            workouts.push({
                dayOffset: d,
                type: WorkoutType.EASY,
                description: `Easy: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
                targetPace: easyPace,
                targetDuration: Math.round((easyDist / 1000) * easyPace),
            });
        }
    }

    let remainingStrength = strengthPerWeek;
    const freeDays: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) freeDays.push(d);
    }
    // If all days have runs, pair strength with an easy/recovery run day (never the day before long run)
    if (freeDays.length < remainingStrength) {
        for (const w of workouts) {
            if ((w.type === WorkoutType.EASY || w.type === WorkoutType.RECOVERY) && w.dayOffset !== (preferredLongRunDay + 6) % 7) {
                if (!freeDays.includes(w.dayOffset)) freeDays.push(w.dayOffset);
            }
        }
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
            totalDistance: 10500, // 1500m WU + 8000m work + 1000m CD = 10.5km exact
            targetPace: paces.threshold,
        };
    }
    if (phase === 'ENDURANCE') {
        return {
            type: WorkoutType.TEMPO,
            description: `Steady: 10km @ Ultra Threshold`,
            totalDistance: 12500, // 1500m WU + 10000m work + 1000m CD = 12.5km exact
            targetPace: Math.round(paces.threshold + 15),
        };
    }
    return {
        type: WorkoutType.TEMPO,
        description: `Steady: 12km @ Ultra Threshold`,
        totalDistance: 14500, // 1500m WU + 12000m work + 1000m CD = 14.5km exact
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
    customDistanceM?: number | null;
}): ScheduledWorkout[] {
    const { raceType, ultraEasyPace, customDistanceM } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    const raceLabel = raceType === 'CUSTOM_DISTANCE' && customDistanceM
        ? `${(customDistanceM / 1000).toFixed(1)}km`
        : (ULTRA_RACE_DISTANCE_KM[raceType] || 'Ultra');

    let raceDistanceM: number;
    let raceDurationS: number;
    if (raceType === 'TWELVE_HOUR') {
        raceDurationS = 12 * 3600;
        raceDistanceM = Math.round((raceDurationS / ultraEasyPace) * 1000 / 100) * 100;
    } else if (raceType === 'TWENTY_FOUR_HOUR') {
        raceDurationS = 24 * 3600;
        raceDistanceM = Math.round((raceDurationS / ultraEasyPace) * 1000 / 100) * 100;
    } else if (raceType === 'BACKYARD_ULTRA') {
        const targetLaps = 8; // 8 hourly loops (53.6km) default simulation target
        raceDistanceM = targetLaps * 6706;
        raceDurationS = targetLaps * 3600;
    } else {
        raceDistanceM = (customDistanceM && customDistanceM > 0)
            ? customDistanceM
            : (ULTRA_RACE_DISTANCE_M[raceType] || 50000);
        raceDurationS = Math.round((raceDistanceM / 1000) * ultraEasyPace);
    }

    usedDays.add(0);
    workouts.push({
        dayOffset: 0,
        type: WorkoutType.RACE,
        description: `Race Day: ${raceLabel}`,
        totalDistance: raceDistanceM,
        targetPace: ultraEasyPace,
        targetDuration: raceDurationS,
        targetHrZone: 2,
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
            targetDuration: Math.round(3 * params.ultraEasyPace),
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
        const newDur = w.targetDuration && w.targetDuration > 0 && w.totalDistance > 0
            ? Math.round(w.targetDuration * (newDist / w.totalDistance))
            : (w.targetPace && w.targetPace > 0 ? Math.round((newDist / 1000) * w.targetPace) : 0);
        const distKm = (newDist / 1000).toFixed(1);
        if (w.type === WorkoutType.LONG_RUN) {
            if (w.description.includes('Back-to-Back')) {
                const suffix = w.description.includes('@ Loop Pace')
                    ? '@ Loop Pace (consistency drill)'
                    : '@ Easy (fatigue legs)';
                return { ...w, totalDistance: newDist, targetDuration: newDur, description: `Back-to-Back: ${distKm}km ${suffix}` };
            }
            if (w.description.includes('fueling') || w.description.includes('walk/run')) {
                return { ...w, totalDistance: newDist, targetDuration: newDur, description: `Long Run: ${distKm}km @ Ultra Easy (fueling + walk/run strategy)` };
            }
            return { ...w, totalDistance: newDist, targetDuration: newDur, description: `Long Run: ${distKm}km @ Easy` };
        }
        if (w.type === WorkoutType.EASY) {
            const isNight = w.description.includes('Night Run');
            return {
                ...w,
                totalDistance: newDist,
                targetDuration: newDur,
                description: isNight ? `Night Run: ${distKm}km (sleep deprivation & headlamp practice)` : `Easy: ${distKm}km`,
            };
        }
        if (w.type === WorkoutType.RECOVERY) {
            return { ...w, totalDistance: newDist, targetDuration: newDur, description: `Recovery: ${distKm}km` };
        }
        if (w.type === WorkoutType.TEMPO && w.description.startsWith('Steady State:')) {
            return {
                ...w,
                totalDistance: newDist,
                targetDuration: newDur,
                description: `Steady State: ${distKm}km @ Target Race Pace`,
            };
        }
        return { ...w, totalDistance: newDist, targetDuration: newDur };
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
