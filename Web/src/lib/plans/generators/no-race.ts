import { WorkoutType, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { PlanConfig, GeneratedWorkout, PLAN_CONSTANTS, getMinStartVolume } from '../index';
import { fixBackToBackSameType } from '../schedule-utils';
import { enrichWorkoutsWithDescriptions } from '../descriptions';

type NoRacePhase = 'BASE' | 'BUILD' | 'MAINTAIN';

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

export function generateNoRacePlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot } = config;
    const requestedStartDate = config.startDate || new Date();
    const startDate = requestedStartDate;
    const runsPerWeek = Math.max(1, config.runsPerWeek ?? 4);
    const ridesPerWeek = Math.max(0, config.ridesPerWeek || 0);
    const strengthPerWeek = Math.max(0, config.strengthPerWeek || 0);
    const swimsPerWeek = Math.max(0, config.swimsPerWeek || 0);
    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3;

    const peakVolume = config.weeklyMileageGoal || 40000;
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
    const maintainVolume = peakVolume;

    const totalWeeks = config.weeksTotal ?? Math.max(8, Math.ceil(
        Math.log(peakVolume / startVolume) / Math.log(PLAN_CONSTANTS.WEEKLY_GROWTH_CAP)
    ) + 4);

    const paces = calculateTrainingPaces(vdot);
    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);
    const recoveryPace = paces.easy.max;

    const rampWeeks = Math.max(4, Math.ceil(totalWeeks * 0.4));
    const buildWeeks = Math.max(2, Math.ceil(totalWeeks * 0.3));
    const maintainWeeks = Math.max(2, totalWeeks - rampWeeks - buildWeeks);

    const growthRate = Math.pow(peakVolume / startVolume, 1 / rampWeeks);

    let lastNonRecoveryVolume = startVolume;
    let rampIndex = 0;

    const workouts: GeneratedWorkout[] = [];
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    for (let week = 0; week < totalWeeks; week++) {
        const phase = getNoRacePhase(week, { rampWeeks, buildWeeks, maintainWeeks });
        let weekVolumeCap: number;
        let isRecoveryWeek = false;

        if (phase === 'MAINTAIN') {
            weekVolumeCap = maintainVolume;
            isRecoveryWeek = (week - rampWeeks - buildWeeks) % PLAN_CONSTANTS.STEP_LOADING_CYCLE === PLAN_CONSTANTS.STEP_LOADING_CYCLE - 1;
            if (isRecoveryWeek) {
                weekVolumeCap = Math.round(maintainVolume * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR);
            }
        } else {
            const weekInPhase = phase === 'BASE' ? week : week - rampWeeks;
            isRecoveryWeek = (weekInPhase + 1) % PLAN_CONSTANTS.STEP_LOADING_CYCLE === 0;
            if (isRecoveryWeek) {
                weekVolumeCap = Math.round(lastNonRecoveryVolume * growthRate * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR);
            } else {
                rampIndex++;
                weekVolumeCap = Math.round(startVolume * Math.pow(growthRate, rampIndex));
                weekVolumeCap = Math.min(weekVolumeCap, peakVolume);
                lastNonRecoveryVolume = weekVolumeCap;
            }
        }

        weekVolumeCap = Math.max(minStart, weekVolumeCap);

        const weekSchedule = generateNoRaceWeek({
            phase,
            paces,
            runsPerWeek,
            ridesPerWeek,
            strengthPerWeek,
            swimsPerWeek,
            weeklyVolume: weekVolumeCap,
            preferredLongRunDay: longRunDay,
            preferredWorkoutDay: workoutDay,
            preferredSwimDay: config.swimDay,
            restDays: config.restDays,
            isRecoveryWeek,
            weekIndex: week,
        });

        weekSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);
            if (specificDate < startDate) return;
            if (isRunType(w.type) && w.totalDistance === 0) return;
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

    const result = fixBackToBackSameType(workouts, { restDays: config.restDays });
    enrichWorkoutsWithDescriptions(result);
    return result;
}

function getNoRacePhase(
    weekIndex: number,
    options: { rampWeeks: number; buildWeeks: number; maintainWeeks: number },
): NoRacePhase {
    if (weekIndex < options.rampWeeks) return 'BASE';
    if (weekIndex < options.rampWeeks + options.buildWeeks) return 'BUILD';
    return 'MAINTAIN';
}

function generateNoRaceWeek(params: {
    phase: NoRacePhase;
    paces: ReturnType<typeof calculateTrainingPaces>;
    runsPerWeek: number;
    ridesPerWeek: number;
    strengthPerWeek: number;
    swimsPerWeek: number;
    weeklyVolume: number;
    preferredLongRunDay: number;
    preferredWorkoutDay: number;
    preferredSwimDay?: number;
    restDays?: number[];
    isRecoveryWeek: boolean;
    weekIndex: number;
}): ScheduledWorkout[] {
    const {
        phase, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
        weeklyVolume, preferredLongRunDay, preferredWorkoutDay,
        preferredSwimDay, restDays, isRecoveryWeek, weekIndex,
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();
    const hardSessionDays: number[] = [];

    if (restDays && restDays.length > 0) {
        for (const rd of restDays) usedDays.add(rd);
    }

    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);
    const recoveryPace = paces.easy.max;

    const longRunDist = Math.min(
        Math.round(weeklyVolume * PLAN_CONSTANTS.LONG_RUN_RATIO),
        22000,
    );

    const hasQuality = runsPerWeek >= 3 && !isRecoveryWeek && (phase !== 'MAINTAIN' || weekIndex % 2 === 0);

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

    const longRunDay = getAvailableDay(preferredLongRunDay, []);
    usedDays.add(longRunDay);
    hardSessionDays.push(longRunDay);

    workouts.push({
        dayOffset: longRunDay,
        type: WorkoutType.LONG_RUN,
        description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
        totalDistance: longRunDist,
        targetPace: easyPace,
        targetDuration: 0,
    });

    if (hasQuality) {
        const qualityDay = getAvailableDay(preferredWorkoutDay, hardSessionDays);
        usedDays.add(qualityDay);
        hardSessionDays.push(qualityDay);

        const cycle = weekIndex % 4;

        if (phase === 'MAINTAIN') {
            if (cycle === 0 || cycle === 1) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.EASY,
                    description: `Steady Run: 8km with 6x100m Strides`,
                    totalDistance: 8000,
                    targetPace: easyPace,
                    targetDuration: 0,
                });
            } else {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.TEMPO,
                    description: `Tempo: 5km @ Marathon Pace`,
                    totalDistance: 8000,
                    targetPace: paces.marathon,
                    targetDuration: 0,
                });
            }
        } else if (phase === 'BASE') {
            if (cycle === 0) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.FARTLEK,
                    description: `Fartlek: 8km (3min hard / 2min easy)`,
                    totalDistance: 8000,
                    targetPace: Math.round((paces.threshold + paces.interval) / 2),
                    targetDuration: 0,
                });
            } else if (cycle === 1) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.EASY,
                    description: `Hill Repeats: 6x200m hills (easy jog down)`,
                    totalDistance: 8000,
                    targetPace: easyPace,
                    targetDuration: 0,
                });
            } else if (cycle === 2) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.INTERVALS,
                    description: `Cruise Intervals: 3x1.5km @ Threshold`,
                    totalDistance: 8500,
                    targetPace: paces.threshold,
                    targetDuration: 0,
                });
            } else {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.TEMPO,
                    description: `Progression: 8km (start Easy, end at Tempo)`,
                    totalDistance: 8000,
                    targetPace: paces.threshold,
                    targetDuration: 0,
                });
            }
        } else {
            if (cycle === 0) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.FARTLEK,
                    description: `Fartlek: 10km (4min hard / 2min easy)`,
                    totalDistance: 10000,
                    targetPace: Math.round((paces.threshold + paces.interval) / 2),
                    targetDuration: 0,
                });
            } else if (cycle === 1) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.EASY,
                    description: `Hill Repeats: 8x200m hills (easy jog down)`,
                    totalDistance: 9000,
                    targetPace: easyPace,
                    targetDuration: 0,
                });
            } else if (cycle === 2) {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.INTERVALS,
                    description: `Cruise Intervals: 4x1.5km @ Threshold`,
                    totalDistance: 10000,
                    targetPace: paces.threshold,
                    targetDuration: 0,
                });
            } else {
                workouts.push({
                    dayOffset: qualityDay,
                    type: WorkoutType.TEMPO,
                    description: `Progression: 10km (start Easy, end at Tempo)`,
                    totalDistance: 10000,
                    targetPace: paces.threshold,
                    targetDuration: 0,
                });
            }
        }
    }

    const qualityDistance = workouts
        .filter(w => w.type !== WorkoutType.LONG_RUN && isRunType(w.type))
        .reduce((sum, w) => sum + w.totalDistance, 0);
    const keyRunCount = hasQuality ? 2 : 1;
    const easyRunsCount = Math.max(0, runsPerWeek - keyRunCount);
    const remainingVol = Math.max(0, weeklyVolume - longRunDist - qualityDistance);
    const easyDist = easyRunsCount > 0
        ? Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.min(PLAN_CONSTANTS.EASY_RUN_MAX, Math.round(remainingVol / easyRunsCount / 100) * 100))
        : 0;

    for (let i = 0; i < easyRunsCount; i++) {
        const day = getAvailableDay((preferredLongRunDay + 2 + i * 2) % 7, hardSessionDays);
        if (usedDays.has(day)) break;
        usedDays.add(day);

        const dayAfterHard = hardSessionDays.some(hd => {
            const diff = (day - hd + 7) % 7;
            return diff === 1;
        });

        if (dayAfterHard) {
            workouts.push({
                dayOffset: day,
                type: WorkoutType.RECOVERY,
                description: `Recovery: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
                targetPace: recoveryPace,
                targetDuration: 0,
            });
        } else {
            workouts.push({
                dayOffset: day,
                type: WorkoutType.EASY,
                description: `Easy: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
                targetPace: easyPace,
                targetDuration: 0,
            });
        }
    }

    let remainingRides = ridesPerWeek;
    let remainingSwims = swimsPerWeek;

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
        });
    }

    const totalCardio = remainingRides + remainingSwims;
    const freeDaysForCT: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) freeDaysForCT.push(d);
    }

    for (const d of freeDaysForCT) {
        if (remainingRides <= 0 && remainingSwims <= 0) break;
        usedDays.add(d);
        if (remainingRides > 0) {
            remainingRides--;
            workouts.push({
                dayOffset: d,
                type: WorkoutType.RIDE,
                description: 'Bike: 60min (Zone 1-2)',
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

    let remainingStrength = strengthPerWeek;
    const strengthFreeDays: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) strengthFreeDays.push(d);
    }
    for (const d of strengthFreeDays) {
        if (remainingStrength <= 0) break;
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.STRENGTH,
            description: 'Strength: 45min',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700,
        });
        remainingStrength--;
    }

    return workouts;
}

function isRunType(type: WorkoutType): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
}

function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
