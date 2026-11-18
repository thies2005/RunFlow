import { WorkoutType, RaceType, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '../../metrics/vdot';
import { fixBackToBackSameType } from '../schedule-utils';
import { enrichWorkoutsWithDescriptions, getRacePace } from '../descriptions';
import { estimateBikeFtpFromVdot } from '../bike-zones';
import {
    PLAN_CONSTANTS,
    TAPER_FRACTIONS,
    getMinStartVolume,
    classifyCustomRunDistance,
    resolvePhaseBudget,
    resolvePhaseVdot,
    computeDuration,
    computeSwimDuration,
    computeQualityDuration,
    getQualityFraction,
    workoutTypeToHrZone,
    getRunQualityHrZone,
    updateDescription,
    type PlanConfig,
    type GeneratedWorkout,
    type Phase,
    type ScheduledWorkout,
} from '../index';

const MAX_STANDARD_PEAK_VOLUME: Partial<Record<RaceType, number>> = {
    FIVE_K: 65000,
    TEN_K: 75000,
    HALF_MARATHON: 85000,
    MARATHON: 95000,
};

export function generateStandardPlan(config: PlanConfig): GeneratedWorkout[] {
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
    const isVeryShortCustom = raceType === 'CUSTOM_DISTANCE' && customDistanceM && customDistanceM > 0 && customDistanceM < 3000;
    const minPeak = isVeryShortCustom ? 15000 : (PLAN_CONSTANTS.MIN_PEAK_VOLUME[effectiveRaceType] || 20000);
    const maxPeak = isVeryShortCustom ? 35000 : (MAX_STANDARD_PEAK_VOLUME[effectiveRaceType] || 95000);
    if (peakVolume < minPeak) peakVolume = minPeak;
    if (peakVolume > maxPeak) peakVolume = maxPeak;

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    const calendarDays = Math.round((raceDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.min(PLAN_CONSTANTS.MAX_TOTAL_WEEKS, Math.max(1, Math.ceil(calendarDays / 7)));

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
            let clampedToStartDateCount = 0;
            raceWeekWorkouts.forEach(w => {
                const specificDate = new Date(raceDate);
                if (w.type !== WorkoutType.RACE) {
                    specificDate.setDate(specificDate.getDate() + w.dayOffset);
                }
                if (specificDate < startDate) {
                    if (w.type !== WorkoutType.RACE && (clampedToStartDateCount >= 1 || startDate.getTime() >= raceDate.getTime())) {
                        return;
                    }
                    specificDate.setTime(startDate.getTime());
                    clampedToStartDateCount++;
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
                weekVolumeCap = Math.round(lastNonRecoveryVolume * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR);
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
    if (config.matchToMyWhoosh || config.mywhooshPlanId) {
        const { findClosestMyWhooshWorkout, mywhooshWorkoutToStructuredV2 } = require('../mywhooshMatcher');
        const bikeFtp = config.ftpWatts && config.ftpWatts > 0 ? config.ftpWatts : estimateBikeFtpFromVdot(vdot, config.weightKg ?? 70);
        let rideIdx = 0;
        for (const w of result) {
            if (w.type === WorkoutType.RIDE || w.type === WorkoutType.LONG_RIDE || w.type === WorkoutType.RIDE_INTERVALS) {
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: w.phase,
                    mywhooshPlanId: config.mywhooshPlanId,
                    rideIndexInWeek: rideIdx++,
                });
                if (match) {
                    w.displayDescription = `MyWhoosh: ${match.name}`;
                    w.description = `${w.description} | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})`;
                    w.targetDuration = match.durationSeconds;
                    w.plannedTss = match.tss;
                    w.structuredSteps = mywhooshWorkoutToStructuredV2(match, bikeFtp);
                }
            }
        }
    }
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

export function generateRaceWeek(params: {
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

export function generateWeek(params: {
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
    let ridesPlacedInRunWeek = 0;

    for (const d of cardioFreeDays) {
        usedDays.add(d);
        if (remainingRides > 0) {
            remainingRides--;
            ridesPlacedInRunWeek++;
            if (ridesPlacedInRunWeek === 2 && ridesPerWeek >= 2 && phase !== 'TAPER') {
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.RIDE_INTERVALS,
                    description: 'Bike Intervals: 60min (Tempo / Sweet Spot Z3-Z4)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 3600,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE_INTERVALS),
                });
            } else if (ridesPlacedInRunWeek === 3 && ridesPerWeek >= 3 && phase !== 'TAPER') {
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.LONG_RIDE,
                    description: 'Long Endurance Ride: 90min (Zone 2)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 5400,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.LONG_RIDE),
                });
            } else {
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.RIDE,
                    description: 'Bike Endurance: 60min (Zone 1-2)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 3600,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE),
                });
            }
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
    const MAX_TIME_ON_FEET_BY_RACE: Partial<Record<RaceType, number>> = {
        FIVE_K: 5400,         // 90 min max long run for 5K
        TEN_K: 6900,          // 115 min max long run for 10K
        HALF_MARATHON: 9600,  // 160 min max long run for Half Marathon
        MARATHON: PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS, // 210 min (3.5h)
    };
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
    const maxTimeSec = MAX_TIME_ON_FEET_BY_RACE[raceType] ?? PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS;
    const maxDistForTime = Math.round((maxTimeSec / safeEasyMax) * 1000);
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
    const scale = (session: { type: WorkoutType; description: string; totalDistance: number; targetPace: number }) => {
        const totalDistance = scaleQualitySessionDistance(session.type, session.totalDistance, weeklyVolume, raceType);
        const description = session.description.includes('Fartlek:')
            ? session.description.replace(/^Fartlek:\s*[\d.]+km/, `Fartlek: ${(totalDistance / 1000).toFixed(1).replace(/\.0$/, '')}km`)
            : session.description;
        return {
            ...session,
            totalDistance,
            description,
        };
    };

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

    // If remainingCap cannot fit all fill runs at EASY_RUN_MIN (4km), keep as many 4km fill runs as fit
    // (trimming priority runs by up to 15% if needed) rather than zeroing ALL fill runs at once.
    if (fillWorkouts.length > 0 && remainingCap < fillWorkouts.length * PLAN_CONSTANTS.EASY_RUN_MIN) {
        const maxPriorityTrim = Math.round(priorityDist * 0.15 / 100) * 100;
        const neededExtra = fillWorkouts.length * PLAN_CONSTANTS.EASY_RUN_MIN - remainingCap;
        const actualTrim = Math.min(maxPriorityTrim, Math.max(0, neededExtra));
        const boostedRemaining = remainingCap + actualTrim;
        const affordableFillCount = Math.min(fillWorkouts.length, Math.floor(boostedRemaining / PLAN_CONSTANTS.EASY_RUN_MIN));
        const priorityScale = priorityDist > 0 ? (priorityDist - actualTrim) / priorityDist : 1;
        const perFillDist = affordableFillCount > 0
            ? Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, roundDownTo100(boostedRemaining / affordableFillCount))
            : 0;
        let keptFill = 0;
        return weekSchedule.map(w => {
            if (!isRun(w.type)) return w;
            if (isPriority(w)) {
                const newPrioDist = Math.max(PLAN_CONSTANTS.MIN_LONG_RUN, roundDownTo100(w.totalDistance * priorityScale));
                return withScaledDistance(w, newPrioDist, preserveSpecialDescription(w, newPrioDist));
            }
            if (keptFill < affordableFillCount && perFillDist >= PLAN_CONSTANTS.EASY_RUN_MIN) {
                keptFill++;
                return withScaledDistance(w, perFillDist, preserveSpecialDescription(w, perFillDist));
            }
            return { ...w, totalDistance: 0, targetDuration: 0, description: 'Rest (Volume Cap)' };
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

export function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isRun(type: WorkoutType): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
}

