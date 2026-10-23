import { WorkoutType, RaceType, PlanPhase } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '@/lib/metrics/vdot';
import { estimateSwimPaceFromVdot } from '../swim-pace';
import { estimateBikeFtpFromVdot, calculateBikeZones } from '../bike-zones';
import { PlanConfig, GeneratedWorkout, PLAN_CONSTANTS, getMinStartVolume, resolvePhaseBudget } from '../index';
import { fixBackToBackSameType } from '../schedule-utils';
import { enrichWorkoutsWithDescriptions, getRacePace } from '../descriptions';
import { findClosestMyWhooshWorkout, mywhooshWorkoutToStructuredV2 } from '../mywhooshMatcher';

type TriPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

type SportDistribution = {
    bike: number;
    run: number;
    swim: number;
    strength: number;
};

const TRI_DISTRIBUTION: Partial<Record<RaceType, SportDistribution>> = {
    SPRINT_TRI: { bike: 0.45, run: 0.30, swim: 0.15, strength: 0.10 },
    OLYMPIC_TRI: { bike: 0.48, run: 0.28, swim: 0.14, strength: 0.10 },
    HALF_IRONMAN: { bike: 0.52, run: 0.28, swim: 0.10, strength: 0.10 },
    FULL_IRONMAN: { bike: 0.55, run: 0.25, swim: 0.08, strength: 0.12 },
};

const TRI_TAPER_FRACTIONS: Record<string, number[]> = {
    SPRINT_TRI: [0.75],
    OLYMPIC_TRI: [0.80, 0.60],
    HALF_IRONMAN: [0.80, 0.65, 0.50],
    FULL_IRONMAN: [0.80, 0.65, 0.50, 0.40],
};

const TRI_RACE_LABELS: Partial<Record<RaceType, string>> = {
    SPRINT_TRI: 'Sprint Triathlon (750m/20km/5km)',
    OLYMPIC_TRI: 'Olympic Triathlon (1.5km/40km/10km)',
    HALF_IRONMAN: 'Middle Distance Triathlon (1.9km/90km/21.1km)',
    FULL_IRONMAN: 'Long Distance Triathlon (3.8km/180km/42.2km)',
};

const TRI_RACE_RUN_DIST: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 5000,
    OLYMPIC_TRI: 10000,
    HALF_IRONMAN: 21097,
    FULL_IRONMAN: 42195,
};

const TRI_MIN_PEAK_VOLUME: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 30000,
    OLYMPIC_TRI: 40000,
    HALF_IRONMAN: 55000,
    FULL_IRONMAN: 70000,
};

const TRI_MAX_LONG_RUN: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 15000,
    OLYMPIC_TRI: 18000,
    HALF_IRONMAN: 22000,
    FULL_IRONMAN: 30000,
};

const TRI_RACE_SWIM_DIST: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 750,
    OLYMPIC_TRI: 1500,
    HALF_IRONMAN: 1900,
    FULL_IRONMAN: 3800,
};

const TRI_PEAK_BUDGET: Record<string, { bikeSecs: number; runMeters: number; swimMeters: number }> = {
    SPRINT_TRI: { bikeSecs: 7200, runMeters: 18000, swimMeters: 3000 },
    OLYMPIC_TRI: { bikeSecs: 12600, runMeters: 28000, swimMeters: 4500 },
    HALF_IRONMAN: { bikeSecs: 21600, runMeters: 38000, swimMeters: 6500 },
    FULL_IRONMAN: { bikeSecs: 36000, runMeters: 50000, swimMeters: 9000 },
};

const TRI_MAX_PEAK_VOLUME: Partial<Record<RaceType, number>> = {
    SPRINT_TRI: 50000,
    OLYMPIC_TRI: 65000,
    HALF_IRONMAN: 85000,
    FULL_IRONMAN: 105000,
};

function classifyCustomTri(swimDistM: number, bikeDistM: number, runDistM: number): RaceType {
    const swimMins = swimDistM / 50;
    const bikeMins = bikeDistM / 400;
    const runMins = runDistM / 200;
    const totalEstMins = swimMins + bikeMins + runMins;

    if (totalEstMins <= 110) return 'SPRINT_TRI';
    if (totalEstMins <= 240) return 'OLYMPIC_TRI';
    if (totalEstMins <= 500) return 'HALF_IRONMAN';
    return 'FULL_IRONMAN';
}

export function generateTriathlonPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceDate } = config;
    const raceType = config.raceType as RaceType;
    const requestedStartDate = config.startDate || new Date();

    let effectiveRaceType: RaceType = raceType;
    let customSwimDist: number | undefined;
    let customBikeDist: number | undefined;
    let customRunDist: number | undefined;

    if (raceType === 'CUSTOM_TRI') {
        customSwimDist = (config.customSwimDistM && config.customSwimDistM > 0)
            ? config.customSwimDistM : undefined;
        customBikeDist = (config.customBikeDistM && config.customBikeDistM > 0)
            ? config.customBikeDistM : undefined;
        customRunDist = (config.customRunDistM && config.customRunDistM > 0)
            ? config.customRunDistM : undefined;

        if (!customSwimDist && !customBikeDist && !customRunDist && config.customDistanceM && config.customDistanceM > 0) {
            const totalM = config.customDistanceM;
            customSwimDist = Math.max(400, Math.round((totalM * 0.017) / 50) * 50);
            customBikeDist = Math.max(5000, Math.round((totalM * 0.796) / 1000) * 1000);
            customRunDist = Math.max(1000, Math.round((totalM - customSwimDist - customBikeDist) / 100) * 100);
        }

        effectiveRaceType = classifyCustomTri(
            customSwimDist ?? 750,
            customBikeDist ?? 20000,
            customRunDist ?? 5000,
        );
    }

    const startDate = requestedStartDate > raceDate ? new Date(raceDate) : requestedStartDate;

    const runsPerWeek = Math.max(1, config.runsPerWeek ?? 3);
    const ridesPerWeek = Math.max(1, config.ridesPerWeek ?? 3);
    const swimsPerWeek = Math.max(1, config.swimsPerWeek ?? 2);
    const strengthPerWeek = Math.max(0, config.strengthPerWeek ?? 1);
    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;
    const swimDay = config.swimDay !== undefined ? config.swimDay : 1;
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3;

    const distribution = TRI_DISTRIBUTION[effectiveRaceType] || TRI_DISTRIBUTION.OLYMPIC_TRI!;

    let peakVolume = config.weeklyMileageGoal || TRI_MIN_PEAK_VOLUME[effectiveRaceType] || 40000;
    const minPeak = TRI_MIN_PEAK_VOLUME[effectiveRaceType] || 40000;
    const maxPeak = TRI_MAX_PEAK_VOLUME[effectiveRaceType] || 105000;
    if (peakVolume < minPeak) peakVolume = minPeak;
    if (peakVolume > maxPeak) peakVolume = maxPeak;

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
    const css = config.swimCssSecPer100m && config.swimCssSecPer100m > 0
        ? Math.round(config.swimCssSecPer100m)
        : estimateSwimPaceFromVdot(vdot);
    const bikeFtp = config.ftpWatts && config.ftpWatts > 0 ? config.ftpWatts : estimateBikeFtpFromVdot(vdot);
    const bikeZones = calculateBikeZones(bikeFtp);

    const taperFractions = TRI_TAPER_FRACTIONS[effectiveRaceType] || [0.80, 0.60];
    const defaultTaperWeeks = taperFractions.length;
    const phases = resolvePhaseBudget(totalWeeks, config, {
        isTriathlon: true,
        defaultTaper: defaultTaperWeeks,
    });
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
        const phase = getTriPhase(weeksUntilRace, { taperWeeks, peakWeeks, buildWeeks });

        let weekVolumeCap: number;
        let isRecoveryWeek = false;

        if (phase === 'RACE_WEEK') {
            const raceWeekWorkouts = generateTriRaceWeek({
                raceDate,
                raceType: effectiveRaceType,
                paces,
                css,
                bikeZones,
                runsPerWeek,
                ridesPerWeek,
                swimsPerWeek,
                strengthPerWeek,
                customSwimDist,
                customBikeDist,
                customRunDist,
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

        if (phase === 'TAPER') {
            const taperIdx = taperWeeks - weeksUntilRace;
            const fraction = taperFractions[Math.min(Math.max(0, taperIdx), taperFractions.length - 1)];
            weekVolumeCap = Math.round(effectivePeakVolume * fraction);
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

        const defaultPeakVolume = TRI_MIN_PEAK_VOLUME[effectiveRaceType] || 40000;
        const totalPeakMetersScale = Math.min(1.35, Math.max(0.65, effectivePeakVolume / defaultPeakVolume));

        const peakBikeSecs = TRI_PEAK_BUDGET[effectiveRaceType].bikeSecs * totalPeakMetersScale;
        const peakRunMeters = TRI_PEAK_BUDGET[effectiveRaceType].runMeters * totalPeakMetersScale;
        const peakSwimMeters = TRI_PEAK_BUDGET[effectiveRaceType].swimMeters * totalPeakMetersScale;

        const currentWeekScale = weekVolumeCap / effectivePeakVolume;

        const weeklyBikeDurationS = Math.round(peakBikeSecs * currentWeekScale);
        const weeklyRunDistanceM = Math.round(peakRunMeters * currentWeekScale);
        const weeklySwimDistanceM = Math.round(peakSwimMeters * currentWeekScale);

        const weekSchedule = generateTriWeek({
            phase,
            raceType: effectiveRaceType,
            paces,
            css,
            bikeZones,
            distribution,
            runsPerWeek,
            ridesPerWeek,
            swimsPerWeek,
            strengthPerWeek,
            weeklyVolume: weekVolumeCap,
            weeklyRunDistanceM,
            weeklyBikeDurationS,
            weeklySwimDistanceM,
            maxLongRunKm: config.maxLongRunKm,
            preferredLongRunDay: longRunDay,
            preferredWorkoutDay: workoutDay,
            preferredSwimDay: swimDay,
            restDays: config.restDays,
            isRecoveryWeek,
            taperWeeks,
            weeksUntilRace,
            customSwimDist,
            customRunDist,
            customBikeDist,
        });

        weekSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);
            if (specificDate < startDate) return;
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

    const result = fixBackToBackSameType(workouts, { raceDate, restDays: config.restDays });
    const racePace = getRacePace(effectiveRaceType, paces);
    enrichWorkoutsWithDescriptions(result, racePace);

    if (config.matchToMyWhoosh || config.mywhooshPlanId) {
        let rideCounter = 0;
        for (const w of result) {
            if (
                w.type === WorkoutType.RIDE ||
                w.type === WorkoutType.LONG_RIDE ||
                w.type === WorkoutType.RIDE_INTERVALS
            ) {
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: w.phase,
                    mywhooshPlanId: config.mywhooshPlanId,
                    rideIndexInWeek: rideCounter % Math.max(1, ridesPerWeek),
                });
                rideCounter++;
                if (match) {
                    w.displayDescription = `MyWhoosh: ${match.name}`;
                    w.description = `${w.description} | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})`;
                    w.targetDuration = match.durationSeconds;
                    w.plannedTss = match.tss;
                    w.targetFtpPercent = Math.round(match.intensityFactor * 100);
                    w.targetPowerWatts = Math.round(bikeFtp * match.intensityFactor);
                    w.structuredSteps = mywhooshWorkoutToStructuredV2(match, bikeFtp);
                }
            }
        }
    }

    return result;
}

function getTriPhase(
    weeksUntilRace: number,
    options: { taperWeeks: number; peakWeeks: number; buildWeeks: number },
): TriPhase {
    const { taperWeeks, peakWeeks, buildWeeks } = options;
    if (weeksUntilRace === 1) return 'RACE_WEEK';
    if (weeksUntilRace <= taperWeeks) return 'TAPER';
    if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks) return 'PEAK';
    if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return 'BUILD';
    return 'BASE';
}

function generateTriWeek(params: {
    phase: TriPhase;
    raceType: RaceType;
    paces: TrainingPaces;
    css: number;
    bikeZones: ReturnType<typeof calculateBikeZones>;
    distribution: SportDistribution;
    runsPerWeek: number;
    ridesPerWeek: number;
    swimsPerWeek: number;
    strengthPerWeek: number;
    weeklyVolume: number;
    weeklyRunDistanceM: number;
    weeklyBikeDurationS: number;
    weeklySwimDistanceM: number;
    maxLongRunKm?: number;
    preferredLongRunDay: number;
    preferredWorkoutDay: number;
    preferredSwimDay: number;
    restDays?: number[];
    isRecoveryWeek: boolean;
    taperWeeks: number;
    weeksUntilRace: number;
    customSwimDist?: number;
    customRunDist?: number;
    customBikeDist?: number;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, css, bikeZones, distribution,
        runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek,
        weeklyVolume, weeklyRunDistanceM, weeklyBikeDurationS, weeklySwimDistanceM, maxLongRunKm,
        preferredLongRunDay, preferredWorkoutDay, preferredSwimDay,
        restDays, isRecoveryWeek, taperWeeks, weeksUntilRace,
        customSwimDist, customRunDist, customBikeDist,
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const restDaySet = new Set<number>(restDays || []);
    const usedAnyDays = new Set<number>(restDaySet);
    const usedRunDays = new Set<number>(restDaySet);
    const usedBikeDays = new Set<number>(restDaySet);
    const usedSwimDays = new Set<number>(restDaySet);
    const usedStrengthDays = new Set<number>(restDaySet);
    const hardSessionDays: number[] = [];

    const isTaper = phase === 'TAPER';
    const taperIdx = isTaper ? taperWeeks - weeksUntilRace : -1;

    const runVolume = weeklyRunDistanceM;
    const swimVolume = weeklySwimDistanceM;
    const bikeVolumeSeconds = weeklyBikeDurationS;
    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);

    const maxLongRun = maxLongRunKm ? maxLongRunKm * 1000 : (TRI_MAX_LONG_RUN[raceType] || 22000);
    const rawLongRunDist = Math.min(
        Math.round(runVolume * (isRecoveryWeek ? PLAN_CONSTANTS.LONG_RUN_RATIO * 0.85 : PLAN_CONSTANTS.LONG_RUN_RATIO)),
        maxLongRun,
    );
    const minEasyReserve = Math.max(0, runsPerWeek - 1) * PLAN_CONSTANTS.EASY_RUN_MIN;
    const longRunDist = Math.max(
        PLAN_CONSTANTS.MIN_LONG_RUN,
        Math.min(rawLongRunDist, Math.max(PLAN_CONSTANTS.MIN_LONG_RUN, runVolume - minEasyReserve)),
    );

    const hasBrick = runsPerWeek >= 1 && ridesPerWeek >= 2 && !isRecoveryWeek && !isTaper && (phase === 'BUILD' || phase === 'PEAK');
    const hasOpenWater = swimsPerWeek >= 2 && (phase === 'PEAK' || (isTaper && taperIdx <= 1));

    // Sport-aware day picker: prefers completely unused days first, then days without the same sport (double day).
    const pickSportDay = (preferred: number, sportSet: Set<number>, gapFrom: number[]): number => {
        for (const disallowSameDay of [true, false]) {
            const candidates: number[] = [];
            for (let d = 0; d < 7; d++) {
                if (sportSet.has(d)) continue;
                if (disallowSameDay && usedAnyDays.has(d)) continue;
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
            for (let offset = 0; offset <= 6; offset++) {
                const after = (preferred + offset) % 7;
                if (!sportSet.has(after) && (!disallowSameDay || !usedAnyDays.has(after))) return after;
                const before = (preferred - offset + 7) % 7;
                if (!sportSet.has(before) && (!disallowSameDay || !usedAnyDays.has(before))) return before;
            }
        }
        for (let d = 0; d < 7; d++) {
            if (!restDaySet.has(d)) return d;
        }
        return preferred;
    };

    const markDay = (d: number, sportSet: Set<number>, isHard = false) => {
        sportSet.add(d);
        usedAnyDays.add(d);
        if (isHard) hardSessionDays.push(d);
    };

    // 1. Key Long Run
    const longRunDay = pickSportDay(preferredLongRunDay, usedRunDays, []);
    if (runsPerWeek >= 1) {
        markDay(longRunDay, usedRunDays, true);
        if (isTaper) {
            const taperFactor = taperIdx === 0 ? 0.5 : taperIdx === 1 ? 0.65 : 0.80;
            const taperedDist = Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.round(longRunDist * taperFactor / 100) * 100);
            workouts.push({
                dayOffset: longRunDay,
                type: WorkoutType.LONG_RUN,
                description: `Long Run: ${(taperedDist / 1000).toFixed(1)}km @ Easy`,
                totalDistance: taperedDist,
                targetPace: easyPace,
                targetDuration: 0,
            });
        } else {
            let longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`;
            if (phase === 'PEAK') {
                const raceRunDist = customRunDist ?? TRI_RACE_RUN_DIST[raceType] ?? 10000;
                const mpDist = Math.min(Math.round(longRunDist * 0.3 / 100) * 100, raceRunDist * 0.3);
                const easyPart = longRunDist - mpDist;
                longRunDesc = `Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ Race Pace`;
            }
            workouts.push({
                dayOffset: longRunDay,
                type: WorkoutType.LONG_RUN,
                description: longRunDesc,
                totalDistance: longRunDist,
                targetPace: easyPace,
                targetDuration: 0,
            });
        }
    }

    // 2. Key Long Ride (always scheduled first for cycling so bike is never starved)
    const longRideDuration = getLongRideDuration(raceType, phase, isTaper, taperIdx, bikeVolumeSeconds);
    const hasLongRide = ridesPerWeek >= 1;
    let longRideDay = (longRunDay + 6) % 7;
    if (hasLongRide) {
        longRideDay = pickSportDay((longRunDay + 6) % 7, usedBikeDays, [longRunDay]);
        markDay(longRideDay, usedBikeDays, true);
        workouts.push({
            dayOffset: longRideDay,
            type: WorkoutType.LONG_RIDE,
            description: `Long Ride: ${Math.round(longRideDuration / 60)}min (Zone 2)`,
            totalDistance: 0,
            targetPace: 0,
            targetDuration: longRideDuration,
        });
    }

    // 3. Brick Workout in BUILD & PEAK (counts as 1 ride slot)
    let bricksScheduled = 0;
    if (hasBrick && ridesPerWeek - (hasLongRide ? 1 : 0) > 0) {
        const brickDay = pickSportDay((longRideDay + 3) % 7, usedBikeDays, [longRunDay, longRideDay]);
        markDay(brickDay, usedBikeDays, true);
        const brickBikeMin = raceType === 'FULL_IRONMAN' ? 90 : raceType === 'HALF_IRONMAN' ? 60 : 40;
        workouts.push({
            dayOffset: brickDay,
            type: WorkoutType.BRICK,
            description: `Brick: ${brickBikeMin}min Bike -> 15min Run (T1/T2 practice)`,
            totalDistance: 0,
            targetPace: 0,
            targetDuration: (brickBikeMin + 17) * 60,
        });
        bricksScheduled = 1;
    }

    // 4. Run Quality Session
    let qualityRunDist = 0;
    if (runsPerWeek >= 2 && !isRecoveryWeek && !isTaper) {
        const qualityDay = pickSportDay(preferredWorkoutDay, usedRunDays, [longRunDay]);
        markDay(qualityDay, usedRunDays, true);
        const maxQualityDist = Math.max(5000, Math.min(13000, Math.round((runVolume - longRunDist) * 0.45 / 500) * 500));
        if (phase === 'PEAK' && raceType === 'FULL_IRONMAN') {
            qualityRunDist = Math.min(12000, maxQualityDist);
            const repKm = Math.max(2, Math.round((qualityRunDist - 2500) / 3000));
            workouts.push({
                dayOffset: qualityDay,
                type: WorkoutType.TEMPO,
                description: `Run Threshold: 3x${repKm}km @ ${formatPace(paces.threshold)}`,
                totalDistance: 2500 + 3 * repKm * 1000,
                targetPace: paces.threshold,
                targetDuration: 0,
            });
            qualityRunDist = 2500 + 3 * repKm * 1000;
        } else if (phase === 'PEAK') {
            const reps = maxQualityDist >= 8500 ? 5 : 4;
            qualityRunDist = 2500 + reps * 1000 + (reps - 1) * 200;
            workouts.push({
                dayOffset: qualityDay,
                type: WorkoutType.INTERVALS,
                description: `Intervals: ${reps}x1km @ ${formatPace(paces.interval)}`,
                totalDistance: qualityRunDist,
                targetPace: paces.interval,
                targetDuration: 0,
            });
        } else {
            const workKm = Math.max(3, Math.min(6, Math.round((maxQualityDist - 2500) / 1000)));
            qualityRunDist = (workKm + 2.5) * 1000;
            workouts.push({
                dayOffset: qualityDay,
                type: WorkoutType.TEMPO,
                description: `Threshold: ${workKm}km @ ${formatPace(paces.threshold)}`,
                totalDistance: qualityRunDist,
                targetPace: paces.threshold,
                targetDuration: 0,
            });
        }
    }

    // 5. Remaining Bike Sessions (Intervals + Easy Rides)
    let remainingRides = Math.max(0, ridesPerWeek - (hasLongRide ? 1 : 0) - bricksScheduled);
    const brickBikeSeconds = bricksScheduled * ((raceType === 'FULL_IRONMAN' ? 90 : raceType === 'HALF_IRONMAN' ? 60 : 40) * 60);
    const usedBikeSeconds = (hasLongRide ? longRideDuration : 0) + brickBikeSeconds;
    const remainingBikeBudget = Math.max(0, bikeVolumeSeconds - usedBikeSeconds);

    if (!isRecoveryWeek && !isTaper && remainingRides > 0) {
        const intervalDay = pickSportDay((preferredWorkoutDay + 2) % 7, usedBikeDays, [longRideDay]);
        markDay(intervalDay, usedBikeDays, true);
        const intervalDuration = remainingRides >= 2
            ? Math.max(2400, Math.min(5400, Math.round(remainingBikeBudget * 0.45)))
            : Math.max(2400, Math.min(5400, Math.round(remainingBikeBudget * 0.65)));
        workouts.push({
            dayOffset: intervalDay,
            type: WorkoutType.RIDE_INTERVALS,
            description: `Bike Intervals: 4x5min @ Threshold (${bikeZones.threshold.min}-${bikeZones.threshold.max}W)`,
            totalDistance: 0,
            targetPace: 0,
            targetDuration: intervalDuration,
        });
        remainingRides--;
    }

    const maxEasyRideSec = isTaper ? 3600 : (raceType === 'FULL_IRONMAN' ? 7200 : raceType === 'HALF_IRONMAN' ? 5400 : 3600);
    for (let i = 0; i < remainingRides; i++) {
        const day = pickSportDay((longRideDay + 2 + i * 2) % 7, usedBikeDays, []);
        markDay(day, usedBikeDays, false);
        const ridesLeft = remainingRides - i;
        const usedSoFar = workouts
            .filter(w => w.type === WorkoutType.LONG_RIDE || w.type === WorkoutType.RIDE_INTERVALS || w.type === WorkoutType.BRICK)
            .reduce((s, w) => s + (w.targetDuration || 0), 0);
        const rawEasyDuration = Math.round((bikeVolumeSeconds - usedSoFar) / ridesLeft);
        const easyDuration = Math.max(1800, Math.min(maxEasyRideSec, rawEasyDuration));
        workouts.push({
            dayOffset: day,
            type: WorkoutType.RIDE,
            description: `Easy Ride: ${Math.round(easyDuration / 60)}min (Zone 1-2)`,
            totalDistance: 0,
            targetPace: 0,
            targetDuration: easyDuration,
        });
    }

    // 6. Remaining Easy Runs
    const scheduledRunCount = workouts.filter(w => isTriRun(w.type)).length;
    const runSlotsLeft = Math.max(0, runsPerWeek - scheduledRunCount);
    const remainingRunVol = Math.max(0, runVolume - longRunDist - qualityRunDist);
    const easyRunDist = runSlotsLeft > 0 ? Math.round(remainingRunVol / runSlotsLeft / 100) * 100 : 0;
    const clampedEasyDist = Math.max(3000, Math.min(PLAN_CONSTANTS.EASY_RUN_MAX, easyRunDist));

    for (let i = 0; i < runSlotsLeft; i++) {
        const day = pickSportDay((longRunDay + 2 + i * 2) % 7, usedRunDays, []);
        markDay(day, usedRunDays, false);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: `Easy: ${(clampedEasyDist / 1000).toFixed(1)}km`,
            totalDistance: clampedEasyDist,
            targetPace: easyPace,
            targetDuration: 0,
        });
    }

    // 7. Swim Sessions (aligned with trainingZones.swim CSS windows)
    const raceSwimDist = customSwimDist ?? TRI_RACE_SWIM_DIST[raceType] ?? 1500;
    const maxSwimPerSession = Math.max(2000, Math.round(raceSwimDist * 1.4 / 100) * 100);
    const swimDistPerSession = Math.max(
        800,
        Math.min(
            swimsPerWeek > 0 ? Math.round(swimVolume / swimsPerWeek / 100) * 100 : 1500,
            maxSwimPerSession,
        ),
    );
    const swimEndurancePace = Math.round(css + 3); // Matches steady zone (css + 2..5)
    const swimThresholdPace = Math.round(css + 1); // Matches threshold zone (css..css + 2)
    const swimEasyPace = Math.round(css + 9);      // Matches easy zone (css + 8..10)

    if (hasOpenWater && swimsPerWeek >= 2) {
        const owDay = pickSportDay(preferredSwimDay, usedSwimDays, []);
        markDay(owDay, usedSwimDays, false);
        workouts.push({
            dayOffset: owDay,
            type: WorkoutType.OPEN_WATER_SWIM,
            description: `Open Water Swim: ${swimDistPerSession}m @ Endurance (sighting practice)`,
            totalDistance: swimDistPerSession,
            targetPace: swimEndurancePace,
            targetDuration: 0,
        });
    } else if (phase === 'BASE' && swimsPerWeek >= 1) {
        const drillDay = pickSportDay(preferredSwimDay, usedSwimDays, []);
        markDay(drillDay, usedSwimDays, false);
        const drillDist = Math.max(800, Math.round(swimDistPerSession * 0.85 / 100) * 100);
        workouts.push({
            dayOffset: drillDay,
            type: WorkoutType.SWIM_DRILL,
            description: `Swim Drill: ${drillDist}m (technique focus)`,
            totalDistance: drillDist,
            targetPace: swimEasyPace,
            targetDuration: 0,
        });
    }

    const scheduledSwims = workouts.filter(w => w.type === WorkoutType.OPEN_WATER_SWIM || w.type === WorkoutType.SWIM_DRILL).length;
    const remainingSwims = Math.max(0, swimsPerWeek - scheduledSwims);
    for (let i = 0; i < remainingSwims; i++) {
        const day = pickSportDay((preferredSwimDay + 2 + i * 2) % 7, usedSwimDays, []);
        markDay(day, usedSwimDays, false);
        const isThresholdSwim = i === 0 && (phase === 'BUILD' || phase === 'PEAK') && !isRecoveryWeek;
        workouts.push({
            dayOffset: day,
            type: WorkoutType.SWIM,
            description: isThresholdSwim
                ? `Swim: ${swimDistPerSession}m @ CSS Threshold`
                : `Swim: ${swimDistPerSession}m @ Endurance`,
            totalDistance: swimDistPerSession,
            targetPace: isThresholdSwim ? swimThresholdPace : swimEndurancePace,
            targetDuration: 0,
        });
    }

    // 8. Strength Sessions
    for (let i = 0; i < strengthPerWeek; i++) {
        const day = pickSportDay((1 + i * 3) % 7, usedStrengthDays, [longRunDay, longRideDay]);
        markDay(day, usedStrengthDays, false);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.STRENGTH,
            description: 'Strength: 45min (Triathlon Core & Stability)',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700,
        });
    }

    return scaleTriRunVolume(workouts, weeklyRunDistanceM);
}

function scaleTriRunVolume(workouts: ScheduledWorkout[], weeklyRunDistanceM: number): ScheduledWorkout[] {
    const runWorkouts = workouts.filter(w => isTriRun(w.type) && w.totalDistance > 0);
    const totalRunDistance = runWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);
    if (weeklyRunDistanceM <= 0 || totalRunDistance <= weeklyRunDistanceM) return workouts;

    const priorityTypes = new Set<WorkoutType>([
        WorkoutType.LONG_RUN,
        WorkoutType.TEMPO,
        WorkoutType.INTERVALS,
        WorkoutType.REPETITIONS,
        WorkoutType.FARTLEK,
    ]);

    const priorityDistance = runWorkouts
        .filter(w => priorityTypes.has(w.type))
        .reduce((sum, w) => sum + w.totalDistance, 0);
    const fillDistance = runWorkouts
        .filter(w => !priorityTypes.has(w.type))
        .reduce((sum, w) => sum + w.totalDistance, 0);
    const fillBudget = Math.max(0, weeklyRunDistanceM - priorityDistance);
    const fillScale = fillDistance > 0 ? Math.min(1, fillBudget / fillDistance) : 0;

    const MIN_TRI_FILL_M = 3000;
    const fillCount = runWorkouts.filter(w => !priorityTypes.has(w.type)).length;
    if (fillCount > 0 && priorityDistance + fillCount * MIN_TRI_FILL_M > weeklyRunDistanceM) {
        const totalScale = weeklyRunDistanceM / totalRunDistance;
        return workouts
            .map(w => {
                if (!isTriRun(w.type)) return w;
                const floor = priorityTypes.has(w.type) ? 3000 : Math.min(MIN_TRI_FILL_M, Math.round(weeklyRunDistanceM / Math.max(1, runWorkouts.length)));
                const newDistance = Math.max(floor, roundRunDistance(w.totalDistance * totalScale));
                return withTriRunDistance(w, newDistance);
            })
            .filter(w => !isTriRun(w.type) || w.totalDistance > 0);
    }

    if (priorityDistance <= weeklyRunDistanceM) {
        return workouts
            .map(w => {
                if (!isTriRun(w.type) || priorityTypes.has(w.type)) return w;
                const newDistance = Math.max(MIN_TRI_FILL_M, roundRunDistance(w.totalDistance * fillScale));
                return withTriRunDistance(w, newDistance);
            })
            .filter(w => !isTriRun(w.type) || w.totalDistance > 0);
    }

    const priorityScale = weeklyRunDistanceM / priorityDistance;
    return workouts
        .map(w => {
            if (!isTriRun(w.type)) return w;
            if (!priorityTypes.has(w.type)) return withTriRunDistance(w, MIN_TRI_FILL_M);
            const newDistance = roundRunDistance(w.totalDistance * priorityScale);
            return withTriRunDistance(w, newDistance);
        })
        .filter(w => !isTriRun(w.type) || w.totalDistance > 0);
}

function roundRunDistance(distance: number): number {
    if (distance <= 0) return 0;
    return Math.floor(distance / 100) * 100;
}

function withTriRunDistance(workout: ScheduledWorkout, distance: number): ScheduledWorkout {
    if (distance <= 0) {
        return { ...workout, totalDistance: 0, targetDuration: 0 };
    }

    const description = updateTriRunDescription(workout, distance);
    const targetDuration = workout.targetDuration && workout.targetDuration > 0 && workout.totalDistance > 0
        ? Math.round(workout.targetDuration * (distance / workout.totalDistance))
        : workout.targetDuration;

    return {
        ...workout,
        totalDistance: distance,
        targetDuration,
        description,
    };
}

function updateTriRunDescription(workout: ScheduledWorkout, distance: number): string {
    const distanceKm = (distance / 1000).toFixed(1);
    if (workout.type === WorkoutType.LONG_RUN) {
        const segmentMatch = workout.description.match(/Easy\s*\+\s*([\d.]+)km\s*@\s*Race Pace/);
        if (segmentMatch) {
            return `Long Run: ${distanceKm}km @ Easy with Race Pace finish`;
        }
        return `Long Run: ${distanceKm}km @ Easy`;
    }
    if (workout.type === WorkoutType.EASY || workout.type === WorkoutType.RECOVERY) {
        return `${workout.type === WorkoutType.RECOVERY ? 'Recovery' : 'Easy'}: ${distanceKm}km`;
    }
    return workout.description;
}

function isTriRun(type: WorkoutType): boolean {
    const triRunTypes: WorkoutType[] = [
        WorkoutType.EASY,
        WorkoutType.LONG_RUN,
        WorkoutType.TEMPO,
        WorkoutType.INTERVALS,
        WorkoutType.FARTLEK,
        WorkoutType.RECOVERY,
        WorkoutType.REPETITIONS,
    ];
    return triRunTypes.includes(type);
}

function getLongRideDuration(raceType: RaceType, phase: TriPhase, isTaper: boolean, taperIdx: number, bikeVolumeSeconds?: number): number {
    const baseDurations: Partial<Record<RaceType, number>> = {
        SPRINT_TRI: 3600,
        OLYMPIC_TRI: 5400,
        HALF_IRONMAN: 10800,
        FULL_IRONMAN: 18000,
    };
    const maxLongRideCaps: Partial<Record<RaceType, number>> = {
        SPRINT_TRI: 5400,    // max 90 min
        OLYMPIC_TRI: 9000,   // max 150 min
        HALF_IRONMAN: 14400, // max 4h
        FULL_IRONMAN: 21600, // max 6h
    };
    const base = baseDurations[raceType] || 5400;
    const maxCap = maxLongRideCaps[raceType] || 10800;

    if (bikeVolumeSeconds && bikeVolumeSeconds > 0) {
        const longRideShare = raceType === 'FULL_IRONMAN' ? 0.55
            : raceType === 'HALF_IRONMAN' ? 0.50
            : raceType === 'OLYMPIC_TRI' ? 0.45
            : 0.40;
        const scaled = Math.min(maxCap, Math.round(bikeVolumeSeconds * longRideShare));
        if (phase === 'BASE') return Math.min(maxCap, Math.max(1800, Math.round(scaled * 0.55)));
        if (phase === 'BUILD') return Math.min(maxCap, Math.max(2400, Math.round(scaled * 0.80)));
        if (phase === 'PEAK') return Math.min(maxCap, Math.max(3000, scaled));
        if (isTaper) {
            const factor = taperIdx <= 0 ? 0.40 : taperIdx === 1 ? 0.55 : 0.70;
            return Math.min(Math.round(maxCap * 0.60), Math.max(1800, Math.round(scaled * factor)));
        }
        return Math.min(maxCap, Math.max(2400, scaled));
    }

    if (phase === 'BASE') return Math.round(base * 0.5);
    if (phase === 'BUILD') return Math.round(base * 0.75);
    if (phase === 'PEAK') return base;
    if (isTaper) {
        const factor = taperIdx === 0 ? 0.4 : taperIdx === 1 ? 0.6 : 0.75;
        return Math.round(base * factor);
    }
    return base;
}

function generateTriRaceWeek(params: {
    raceDate: Date;
    raceType: RaceType;
    paces: TrainingPaces;
    css: number;
    bikeZones: ReturnType<typeof calculateBikeZones>;
    runsPerWeek: number;
    ridesPerWeek: number;
    swimsPerWeek: number;
    strengthPerWeek: number;
    customSwimDist?: number;
    customBikeDist?: number;
    customRunDist?: number;
}): ScheduledWorkout[] {
    const { raceType, paces, css, customSwimDist, customBikeDist, customRunDist } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    const raceSwimM = customSwimDist ?? TRI_RACE_SWIM_DIST[raceType] ?? 1500;
    const raceRunM = customRunDist ?? TRI_RACE_RUN_DIST[raceType] ?? 10000;
    const estSwimSec = Math.round((raceSwimM / 100) * (css + 3));
    const estRunSec = Math.round((raceRunM / 1000) * paces.marathon);
    const estBikeSec = raceType === 'FULL_IRONMAN' ? 20400 : raceType === 'HALF_IRONMAN' ? 10200 : raceType === 'OLYMPIC_TRI' ? 4500 : 2400;
    usedDays.add(0);
    workouts.push({
        dayOffset: 0,
        type: WorkoutType.RACE,
        description: `Race Day: ${(customSwimDist || customBikeDist || customRunDist)
            ? `Custom Tri (${(raceSwimM / 1000).toFixed(1)}km / ${((customBikeDist ?? 20000) / 1000).toFixed(0)}km / ${(raceRunM / 1000).toFixed(1)}km)`
            : (TRI_RACE_LABELS[raceType] || 'Triathlon')}`,
        totalDistance: raceRunM,
        targetPace: paces.marathon,
        targetDuration: estSwimSec + estBikeSec + estRunSec + 300,
        targetHrZone: 3,
    });

    usedDays.add(-2);
    workouts.push({
        dayOffset: -2,
        type: WorkoutType.SWIM,
        description: 'Swim: 1000m Easy (race site familiarization)',
        totalDistance: 1000,
        targetPace: Math.round(css + 9),
        targetDuration: 0,
    });

    usedDays.add(-3);
    workouts.push({
        dayOffset: -3,
        type: WorkoutType.RIDE,
        description: 'Easy Spin: 30min (Zone 1)',
        totalDistance: 0,
        targetPace: 0,
        targetDuration: 1800,
    });

    usedDays.add(-4);
    workouts.push({
        dayOffset: -4,
        type: WorkoutType.RECOVERY,
        description: 'Shakeout Run: 3km Easy',
        totalDistance: 3000,
        targetPace: paces.easy.max,
        targetDuration: 0,
    });

    return workouts.sort((a, b) => a.dayOffset - b.dayOffset);
}

function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
