import { WorkoutType, RaceType } from '@/generated/prisma/browser';
import { calculateTrainingPaces, TrainingPaces } from '@/lib/metrics/vdot';
import { estimateSwimPaceFromVdot } from '../swim-pace';
import { estimateBikeFtpFromVdot, calculateBikeZones } from '../bike-zones';
import { PlanConfig, GeneratedWorkout, PLAN_CONSTANTS } from '../index';

type TriPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK';

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

type SportDistribution = {
    bike: number;
    run: number;
    swim: number;
    strength: number;
};

const TRI_DISTRIBUTION: Partial<Record<RaceType, SportDistribution>> = {
    SPRINT_TRI: { bike: 0.40, run: 0.30, swim: 0.20, strength: 0.10 },
    OLYMPIC_TRI: { bike: 0.40, run: 0.30, swim: 0.20, strength: 0.10 },
    HALF_IRONMAN: { bike: 0.40, run: 0.30, swim: 0.20, strength: 0.10 },
    FULL_IRONMAN: { bike: 0.45, run: 0.30, swim: 0.15, strength: 0.10 },
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
    HALF_IRONMAN: 'Half Ironman (1.9km/90km/21.1km)',
    FULL_IRONMAN: 'Full Ironman (3.8km/180km/42.2km)',
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
    FULL_IRONMAN: 32000,
};

export function generateTriathlonPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceDate } = config;
    const raceType = config.raceType as RaceType;
    const requestedStartDate = config.startDate || new Date();
    const startDate = requestedStartDate > raceDate ? new Date(raceDate) : requestedStartDate;

    const runsPerWeek = Math.max(2, config.runsPerWeek ?? 3);
    const ridesPerWeek = Math.max(2, config.ridesPerWeek ?? 3);
    const swimsPerWeek = Math.max(2, config.swimsPerWeek ?? 3);
    const strengthPerWeek = Math.max(0, config.strengthPerWeek ?? 1);
    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0;
    const swimDay = config.swimDay !== undefined ? config.swimDay : 1;
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3;

    const distribution = TRI_DISTRIBUTION[raceType] || TRI_DISTRIBUTION.OLYMPIC_TRI!;

    let peakVolume = config.weeklyMileageGoal || TRI_MIN_PEAK_VOLUME[raceType] || 40000;
    const minPeak = TRI_MIN_PEAK_VOLUME[raceType] || 40000;
    if (peakVolume < minPeak) peakVolume = minPeak;

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    const timeDiff = raceDate.getTime() - currentDate.getTime();
    const totalWeeks = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24 * 7)));

    let startVolume = peakVolume * PLAN_CONSTANTS.START_VOLUME_RATIO;
    if (startVolume < PLAN_CONSTANTS.MIN_VOLUME_START) {
        startVolume = Math.min(PLAN_CONSTANTS.MIN_VOLUME_START, peakVolume);
    }

    const paces = calculateTrainingPaces(vdot);
    const css = estimateSwimPaceFromVdot(vdot);
    const bikeFtp = estimateBikeFtpFromVdot(vdot);
    const bikeZones = calculateBikeZones(bikeFtp);

    const taperFractions = TRI_TAPER_FRACTIONS[raceType] || [0.80, 0.60];
    const taperWeeks = config.taperWeeks ?? taperFractions.length;
    const peakWeeks = Math.min(config.peakWeeks ?? 2, Math.floor((totalWeeks - taperWeeks - 1) * 0.3));
    const buildWeeks = Math.min(config.buildWeeks ?? 4, totalWeeks - taperWeeks - peakWeeks - 1);

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

        if (phase === 'RACE_WEEK') {
            const raceWeekWorkouts = generateTriRaceWeek({
                raceDate,
                raceType,
                paces,
                css,
                bikeZones,
                runsPerWeek,
                ridesPerWeek,
                swimsPerWeek,
                strengthPerWeek,
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
                });
            });
            currentDate.setDate(currentDate.getDate() + 7);
            continue;
        }

        let weekVolumeCap: number;
        let isRecoveryWeek = false;

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

        const weekSchedule = generateTriWeek({
            phase,
            raceType,
            paces,
            css,
            bikeZones,
            bikeFtp,
            distribution,
            runsPerWeek,
            ridesPerWeek,
            swimsPerWeek,
            strengthPerWeek,
            weeklyVolume: weekVolumeCap,
            maxLongRunKm: config.maxLongRunKm,
            preferredLongRunDay: longRunDay,
            preferredWorkoutDay: workoutDay,
            preferredSwimDay: swimDay,
            restDays: config.restDays,
            isRecoveryWeek,
            taperWeeks,
            weeksUntilRace,
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
            });
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    return workouts;
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
    bikeFtp: number;
    distribution: SportDistribution;
    runsPerWeek: number;
    ridesPerWeek: number;
    swimsPerWeek: number;
    strengthPerWeek: number;
    weeklyVolume: number;
    maxLongRunKm?: number;
    preferredLongRunDay: number;
    preferredWorkoutDay: number;
    preferredSwimDay: number;
    restDays?: number[];
    isRecoveryWeek: boolean;
    taperWeeks: number;
    weeksUntilRace: number;
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, css, bikeZones, bikeFtp, distribution,
        runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek,
        weeklyVolume, maxLongRunKm,
        preferredLongRunDay, preferredWorkoutDay, preferredSwimDay,
        restDays, isRecoveryWeek, taperWeeks, weeksUntilRace,
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();
    const hardSessionDays: number[] = [];

    if (restDays && restDays.length > 0) {
        for (const rd of restDays) usedDays.add(rd);
    }

    const isTaper = phase === 'TAPER';
    const taperIdx = isTaper ? taperWeeks - weeksUntilRace : -1;

    const runVolume = Math.round(weeklyVolume * distribution.run);
    const bikeVolume = Math.round(weeklyVolume * distribution.bike);
    const swimVolume = Math.round(weeklyVolume * distribution.swim);
    const strengthVolume = Math.round(weeklyVolume * distribution.strength);

    const easyPace = Math.round((paces.easy.min + paces.easy.max) / 2);

    const maxLongRun = TRI_MAX_LONG_RUN[raceType] || 22000;
    const longRunDist = Math.min(
        Math.round(runVolume * PLAN_CONSTANTS.LONG_RUN_RATIO),
        maxLongRun,
    );
    const remainingRunVol = Math.max(0, runVolume - longRunDist);

    const hasBrick = phase === 'BUILD' || phase === 'PEAK' || (isTaper && taperIdx === 0);
    const hasOpenWater = phase === 'PEAK' || (isTaper && taperIdx <= 1);
    const hasTransition = phase === 'PEAK' || (isTaper && taperIdx === 0);

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

    if (isTaper) {
        const taperFactor = taperIdx === 0 ? 0.5 : taperIdx === 1 ? 0.65 : 0.80;
        const taperedDist = Math.round(longRunDist * taperFactor);
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
            const raceRunDist = TRI_RACE_RUN_DIST[raceType] || 10000;
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

    if (!isRecoveryWeek && phase !== 'TAPER') {
        const qualityDay = getAvailableDay(preferredWorkoutDay, hardSessionDays);
        usedDays.add(qualityDay);
        hardSessionDays.push(qualityDay);

        if (phase === 'PEAK' && raceType === 'FULL_IRONMAN') {
            workouts.push({
                dayOffset: qualityDay,
                type: WorkoutType.TEMPO,
                description: `Run Threshold: 3x3km @ ${formatPace(paces.threshold)}`,
                totalDistance: 13000,
                targetPace: paces.threshold,
                targetDuration: 0,
            });
        } else if (phase === 'PEAK') {
            workouts.push({
                dayOffset: qualityDay,
                type: WorkoutType.INTERVALS,
                description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
                totalDistance: 10000,
                targetPace: paces.interval,
                targetDuration: 0,
            });
        } else {
            workouts.push({
                dayOffset: qualityDay,
                type: WorkoutType.TEMPO,
                description: `Threshold: 6km @ ${formatPace(paces.threshold)}`,
                totalDistance: 8000,
                targetPace: paces.threshold,
                targetDuration: 0,
            });
        }
    }

    const runSlotsLeft = Math.max(0, runsPerWeek - 2);
    const easyRunDist = runSlotsLeft > 0 ? Math.round(remainingRunVol / runSlotsLeft / 100) * 100 : 0;
    const clampedEasyDist = Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.min(PLAN_CONSTANTS.EASY_RUN_MAX, easyRunDist));

    for (let i = 0; i < runSlotsLeft; i++) {
        const day = getAvailableDay((longRunDay + 2 + i) % 7, hardSessionDays);
        if (usedDays.has(day)) break;
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: `Easy: ${(clampedEasyDist / 1000).toFixed(1)}km`,
            totalDistance: clampedEasyDist,
            targetPace: easyPace,
            targetDuration: 0,
        });
    }

    const swimDistPerSession = swimsPerWeek > 0 ? Math.round(swimVolume / swimsPerWeek / 100) * 100 : 1500;

    if (hasOpenWater && swimsPerWeek >= 2) {
        const owDay = getAvailableDay(preferredSwimDay, hardSessionDays);
        if (!usedDays.has(owDay)) {
            usedDays.add(owDay);
            workouts.push({
                dayOffset: owDay,
                type: WorkoutType.OPEN_WATER_SWIM,
                description: `Open Water Swim: ${(swimDistPerSession / 100).toFixed(0)}00m (sighting practice)`,
                totalDistance: swimDistPerSession,
                targetPace: Math.round(css + 10),
                targetDuration: 0,
            });
        }
    } else if (phase === 'BASE') {
        const drillDay = getAvailableDay(preferredSwimDay, hardSessionDays);
        if (!usedDays.has(drillDay)) {
            usedDays.add(drillDay);
            workouts.push({
                dayOffset: drillDay,
                type: WorkoutType.SWIM_DRILL,
                description: `Swim Drill: ${(Math.round(swimDistPerSession * 0.8) / 100).toFixed(0)}00m (technique focus)`,
                totalDistance: Math.round(swimDistPerSession * 0.8),
                targetPace: css,
                targetDuration: 0,
            });
        }
    }

    let remainingSwims = swimsPerWeek - workouts.filter(w => w.type === WorkoutType.OPEN_WATER_SWIM || w.type === WorkoutType.SWIM_DRILL).length;
    for (let i = 0; i < remainingSwims; i++) {
        const day = getAvailableDay((preferredSwimDay + 2 + i * 2) % 7, hardSessionDays);
        if (usedDays.has(day)) break;
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.SWIM,
            description: `Swim: ${(swimDistPerSession / 100).toFixed(0)}00m @ Endurance`,
            totalDistance: swimDistPerSession,
            targetPace: Math.round(css + 8),
            targetDuration: 0,
        });
    }

    const longRideDuration = getLongRideDuration(raceType, phase, isTaper, taperIdx);
    const hasLongRide = ridesPerWeek >= 2 && !isRecoveryWeek;
    let longRideDay: number | undefined;

    if (hasLongRide) {
        longRideDay = getAvailableDay((longRunDay + 5) % 7, hardSessionDays);
        if (!usedDays.has(longRideDay)) {
            usedDays.add(longRideDay);
            hardSessionDays.push(longRideDay);
            workouts.push({
                dayOffset: longRideDay,
                type: WorkoutType.LONG_RIDE,
                description: `Long Ride: ${Math.round(longRideDuration / 60)}h (Zone 2)`,
                totalDistance: 0,
                targetPace: 0,
                targetDuration: longRideDuration,
            });
        }
    }

    if (hasBrick && !isRecoveryWeek && !isTaper) {
        const brickDay = getAvailableDay(preferredWorkoutDay, [...hardSessionDays, longRunDay]);
        if (!usedDays.has(brickDay)) {
            usedDays.add(brickDay);
            hardSessionDays.push(brickDay);
            const brickBikeMin = raceType === 'FULL_IRONMAN' ? 90 : raceType === 'HALF_IRONMAN' ? 60 : 40;
            workouts.push({
                dayOffset: brickDay,
                type: WorkoutType.BRICK,
                description: `Brick: ${brickBikeMin}min Bike → 15min Run (T1/T2 practice)`,
                totalDistance: 0,
                targetPace: 0,
                targetDuration: (brickBikeMin + 15) * 60,
            });
        }
    }

    if (hasTransition && !usedDays.has(preferredWorkoutDay)) {
        usedDays.add(preferredWorkoutDay);
        workouts.push({
            dayOffset: preferredWorkoutDay,
            type: WorkoutType.TRANSITION_PRACTICE,
            description: 'Transition Practice: T1 + T2 rehearsal',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 1800,
        });
    }

    let remainingRides = ridesPerWeek
        - (hasLongRide ? 1 : 0)
        - workouts.filter(w => w.type === WorkoutType.BRICK).length;

    if (!isRecoveryWeek && phase !== 'TAPER' && remainingRides > 0) {
        const intervalDay = getAvailableDay((preferredWorkoutDay + 2) % 7, hardSessionDays);
        if (!usedDays.has(intervalDay)) {
            usedDays.add(intervalDay);
            hardSessionDays.push(intervalDay);
            workouts.push({
                dayOffset: intervalDay,
                type: WorkoutType.RIDE_INTERVALS,
                description: `Bike Intervals: 4x5min @ Threshold (${bikeZones.threshold.min}-${bikeZones.threshold.max}W)`,
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 3600,
            });
            remainingRides--;
        }
    }

    for (let i = 0; i < remainingRides; i++) {
        const day = getAvailableDay((longRideDay || 5 + i) % 7, hardSessionDays);
        if (usedDays.has(day)) break;
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.RIDE,
            description: 'Easy Ride: 60min (Zone 1-2)',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 3600,
        });
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
            description: 'Strength: 45min (Triathlon Core & Stability)',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700,
        });
        remainingStrength--;
    }

    return workouts;
}

function getLongRideDuration(raceType: RaceType, phase: TriPhase, isTaper: boolean, taperIdx: number): number {
    const baseDurations: Partial<Record<RaceType, number>> = {
        SPRINT_TRI: 3600,
        OLYMPIC_TRI: 5400,
        HALF_IRONMAN: 10800,
        FULL_IRONMAN: 18000,
    };
    const base = baseDurations[raceType] || 5400;

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
}): ScheduledWorkout[] {
    const { raceType, paces, css } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    usedDays.add(0);
    workouts.push({
        dayOffset: 0,
        type: WorkoutType.RACE,
        description: `Race Day: ${TRI_RACE_LABELS[raceType] || 'Triathlon'}`,
        totalDistance: TRI_RACE_RUN_DIST[raceType] || 10000,
        targetPace: 0,
        targetDuration: 0,
    });

    usedDays.add(-2);
    workouts.push({
        dayOffset: -2,
        type: WorkoutType.SWIM,
        description: 'Swim: 1000m Easy (race site familiarization)',
        totalDistance: 1000,
        targetPace: Math.round(css + 10),
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
