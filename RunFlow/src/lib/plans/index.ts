import { WorkoutType, RaceType } from '@prisma/client';
import { calculateTrainingPaces } from '../metrics/vdot';

// L-02: Configurable Constants
export const PLAN_CONSTANTS = {
    MIN_PEAK_VOLUME: {
        FIVE_K: 20000,
        TEN_K: 30000,
        HALF_MARATHON: 40000,
        MARATHON: 50000
    },
    MAX_LONG_RUN_DIST: {
        FIVE_K: 16000,
        TEN_K: 22000,
        HALF_MARATHON: 26000,
        MARATHON: 32000
    },
    MIN_LONG_RUN: 6000,
    MIN_VOLUME_START: 15000,
    EASY_RUN_MIN: 4000,
    EASY_RUN_MAX: 12000,
    LONG_RUN_RATIO: 0.50, // Cap at 50% of weekly volume
    START_VOLUME_RATIO: 0.60, // Start at 60% of peak
};

export type PlanConfig = {
    vdot: number;
    raceType: RaceType;
    raceDate: Date;
    startDate?: Date; // Defaults to now
    runsPerWeek?: number; // Default 4
    ridesPerWeek?: number; // Default 0
    strengthPerWeek?: number; // Default 0
    swimsPerWeek?: number; // Default 0
    weeklyMileageGoal?: number | null; // Max km per week (in meters!)
    // Phase length overrides (weeks)
    taperWeeks?: number; // Default 2
    peakWeeks?: number; // Default 4
    buildWeeks?: number; // Default 4
    // L-03: Flexible Days (0-6)
    longRunDay?: number; // Default 0 (Sun)
    workoutDay?: number; // Default 3 (Wed)
};

export type GeneratedWorkout = {
    date: Date;
    type: WorkoutType;
    description: string;
    totalDistance: number; // Estimated meters
    targetPace?: number; // seconds per km
    targetDuration?: number; // seconds
};

/**
 * Generates a training plan based on VDOT and race goal
 */
export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceType, raceDate } = config;
    const startDate = config.startDate || new Date();
    const runsPerWeek = config.runsPerWeek || 4;
    const ridesPerWeek = config.ridesPerWeek || 0;
    const strengthPerWeek = config.strengthPerWeek || 0;
    const swimsPerWeek = config.swimsPerWeek || 0;

    // Day Preferences
    const longRunDay = config.longRunDay !== undefined ? config.longRunDay : 0; // Default Sunday
    const workoutDay = config.workoutDay !== undefined ? config.workoutDay : 3; // Default Wednesday

    // Determine Peak Volume (meters)
    let peakVolume = config.weeklyMileageGoal || 40000;
    // Ensure logical minimum peak based on race type
    const minPeak = PLAN_CONSTANTS.MIN_PEAK_VOLUME[raceType];
    if (peakVolume < minPeak) peakVolume = minPeak;

    // Calculate weeks available
    const timeDiff = raceDate.getTime() - startDate.getTime();
    const totalWeeks = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

    // Linear Progression Logic
    // Start at ~60% of peak volume
    let startVolume = peakVolume * PLAN_CONSTANTS.START_VOLUME_RATIO;

    // Ensure logical minimum floor (e.g. 15km) but don't exceed peak
    if (startVolume < PLAN_CONSTANTS.MIN_VOLUME_START) startVolume = Math.min(PLAN_CONSTANTS.MIN_VOLUME_START, peakVolume);

    // Get authorized paces
    const paces = calculateTrainingPaces(vdot);

    const workouts: GeneratedWorkout[] = [];

    // Align plan start to the beginning of the week (Sunday)
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    for (let week = 1; week <= totalWeeks; week++) {
        const weeksUntilRace = totalWeeks - week + 1; // 1-based countdown
        const phase = getPhase(weeksUntilRace, {
            taperWeeks: config.taperWeeks,
            peakWeeks: config.peakWeeks,
            buildWeeks: config.buildWeeks,
        });

        // Calculate Volume Cap for this week (Linear)
        const rampWeeks = Math.max(1, totalWeeks - (config.taperWeeks || 2));
        const weeklyIncrement = (peakVolume - startVolume) / rampWeeks;
        let weekVolumeCap = startVolume + (weeklyIncrement * (week - 1));

        // Taper Logic: Reduce volume in last 2 weeks
        if (weeksUntilRace <= 2) {
            weekVolumeCap = peakVolume * (weeksUntilRace === 2 ? 0.7 : 0.4);
        } else {
            // Cap at Peak Volume
            if (weekVolumeCap > peakVolume) weekVolumeCap = peakVolume;
        }

        // Generate base workouts
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
            preferredWorkoutDay: workoutDay
        });

        // Scale runs to fit Volume Cap - PRIORITIZING Long Run & Quality
        const runningWorkouts = weekSchedule.filter(w => isRun(w.type));
        const totalRunDistance = runningWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

        if (totalRunDistance > weekVolumeCap) {
            // Identify Priority vs Fill workouts
            const isPriority = (w: ScheduledWorkout) =>
                w.type === WorkoutType.LONG_RUN ||
                w.type === WorkoutType.INTERVALS ||
                w.type === WorkoutType.TEMPO ||
                w.type === WorkoutType.RACE;

            const priorityWorkouts = runningWorkouts.filter(isPriority);
            const fillWorkouts = runningWorkouts.filter(w => !isPriority(w));

            const priorityDist = priorityWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);
            const fillDist = fillWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

            let remainingCap = weekVolumeCap - priorityDist;

            // Check if we need to cut into priority workouts
            if (remainingCap < 0) {
                // Extreme case: Priority runs alone exceed cap. 
                const scalingFactor = weekVolumeCap / priorityDist;

                weekSchedule = weekSchedule.map(w => {
                    if (isRun(w.type)) {
                        if (!isPriority(w)) {
                            // Remove fill run
                            return { ...w, totalDistance: 0, description: 'Rest (Volume Cap)' };
                        } else {
                            // Scale priority
                            const newDist = Math.round((w.totalDistance * scalingFactor) / 100) * 100;
                            const finalDist = Math.max(newDist, 3000);
                            return {
                                ...w,
                                totalDistance: finalDist,
                                description: updateDescription(w.type, finalDist, w.targetPace || 0)
                            };
                        }
                    }
                    return w;
                });
            } else {
                // We have enough for priority, scale down fill runs
                const fillScalingFactor = fillDist > 0 ? remainingCap / fillDist : 0;

                weekSchedule = weekSchedule.map(w => {
                    if (isRun(w.type) && !isPriority(w)) {
                        let newDist = Math.round((w.totalDistance * fillScalingFactor) / 100) * 100;
                        if (newDist < 3000) newDist = 3000; // Soft floor

                        return {
                            ...w,
                            totalDistance: newDist,
                            description: updateDescription(w.type, newDist, w.targetPace || 0)
                        };
                    }
                    return w;
                });
            }
        }

        // Add to main list
        weekSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);

            // Skip zero-distance runs (removed due to cap)
            if (isRun(w.type) && w.totalDistance === 0) return;

            workouts.push({
                date: specificDate,
                type: w.type,
                description: w.description,
                totalDistance: w.totalDistance,
                targetPace: w.targetPace,
                targetDuration: w.targetDuration
            });
        });

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return workouts;
}

function getPhase(
    weeksUntilRace: number,
    options?: { taperWeeks?: number; peakWeeks?: number; buildWeeks?: number }
): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
    const taperWeeks = options?.taperWeeks ?? 2;
    const peakWeeks = options?.peakWeeks ?? 4;
    const buildWeeks = options?.buildWeeks ?? 4;

    if (weeksUntilRace <= taperWeeks) return 'TAPER';
    if (weeksUntilRace <= taperWeeks + peakWeeks) return 'PEAK';
    if (weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return 'BUILD';
    return 'BASE';
}

/**
 * Distributes workouts evenly across available days to maximize spacing.
 * Uses interval-based approach for optimal recovery between same-type workouts.
 * 
 * @param count - Number of workouts to schedule
 * @param usedDays - Set of days already occupied by other workouts
 * @returns Array of day offsets (0=Sun, 1=Mon, ..., 6=Sat) for the workouts
 */
function getDistributedDays(count: number, usedDays: Set<number>): number[] {
    if (count <= 0) return [];

    // Get available days (0-6, excluding used days)
    const availableDays: number[] = [];
    for (let d = 0; d < 7; d++) {
        if (!usedDays.has(d)) availableDays.push(d);
    }

    if (availableDays.length === 0) return [];
    if (count >= availableDays.length) return availableDays;

    // Calculate ideal interval between workouts
    // For n workouts in m available days, ideal spacing = m / n
    const idealInterval = availableDays.length / count;

    const selectedDays: number[] = [];
    for (let i = 0; i < count; i++) {
        // Pick day at ideal interval positions
        const targetIndex = Math.floor(i * idealInterval);
        const clampedIndex = Math.min(targetIndex, availableDays.length - 1);
        selectedDays.push(availableDays[clampedIndex]);
    }

    return selectedDays;
}

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

import { TrainingPaces } from '../metrics/vdot';

function generateWeek(params: {
    phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
    raceType: RaceType,
    paces: TrainingPaces,
    runsPerWeek: number,
    ridesPerWeek: number,
    strengthPerWeek: number,
    swimsPerWeek: number,
    weeklyVolume: number,
    preferredLongRunDay: number,
    preferredWorkoutDay: number
}): ScheduledWorkout[] {
    const {
        phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek, weeklyVolume,
        preferredLongRunDay, preferredWorkoutDay
    } = params;

    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    // Calculate Dynamic Easy Run Distance
    // 1. Long Run
    const longRunDist = getLongRunDistance(raceType, weeklyVolume);

    // 2. Quality Session
    const hasQuality = runsPerWeek >= 2 && phase !== 'BASE' && phase !== 'TAPER';
    const qualitySession = getQualitySession(raceType, paces);
    const qualityDist = hasQuality ? qualitySession.totalDistance : 0;

    // 3. Remaining volume
    const longRunCount = (runsPerWeek >= 1 ? 1 : 0);
    const qualityRunCount = (hasQuality ? 1 : 0);
    const totalKeyRuns = longRunCount + qualityRunCount;
    const easyRunsCount = Math.max(0, runsPerWeek - totalKeyRuns);

    const remainingVol = Math.max(0, weeklyVolume - longRunDist - qualityDist);
    const calculatedEasyDist = easyRunsCount > 0 ? remainingVol / easyRunsCount : 5000;

    // Clamp Easy Run Distance
    const easyDist = Math.max(
        PLAN_CONSTANTS.EASY_RUN_MIN,
        Math.min(Math.round(calculatedEasyDist / 100) * 100, PLAN_CONSTANTS.EASY_RUN_MAX)
    );

    // Helper to get next available day
    const getAvailableDay = (preferred: number): number => {
        if (!usedDays.has(preferred)) return preferred;
        for (let offset = 1; offset <= 6; offset++) {
            const before = (preferred - offset + 7) % 7;
            const after = (preferred + offset) % 7;
            if (!usedDays.has(after)) return after;
            if (!usedDays.has(before)) return before;
        }
        return preferred;
    };

    // === 1. RUNNING WORKOUTS ===
    // Priority 1: Long Run
    if (runsPerWeek >= 1) {
        const day = getAvailableDay(preferredLongRunDay);
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.LONG_RUN,
            description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
            totalDistance: longRunDist,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
            targetDuration: 0
        });
    }

    // Priority 2: Quality Session
    if (runsPerWeek >= 2 && phase !== 'BASE' && phase !== 'TAPER') {
        const day = getAvailableDay(preferredWorkoutDay);
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            ...qualitySession,
            targetDuration: 0
        });
    } else if (runsPerWeek >= 2) {
        // BASE/TAPER replacement for quality
        const day = getAvailableDay(preferredWorkoutDay);
        usedDays.add(day);
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: `Easy Run: ${(easyDist / 1000).toFixed(1)}km`,
            totalDistance: easyDist,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
            targetDuration: 0
        });
    }

    // Additional runs - distribute evenly for optimal recovery
    const additionalRunsCount = Math.max(0, runsPerWeek - 2);
    const easyRunDays = getDistributedDays(additionalRunsCount, usedDays);
    for (const d of easyRunDays) {
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.EASY,
            description: `Easy Run: ${(easyDist / 1000).toFixed(1)}km`,
            totalDistance: easyDist,
            targetPace: Math.round((paces.easy.min + paces.easy.max) / 2),
            targetDuration: 0
        });
    }

    // === 2. STRENGTH TRAINING ===
    // Distribute strength sessions evenly throughout the week
    const strengthDays = getDistributedDays(strengthPerWeek, usedDays);
    for (const d of strengthDays) {
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.STRENGTH,
            description: 'Strength: 45min Session',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 2700
        });
    }

    // === 3. CROSS TRAINING ===
    // Distribute ride sessions
    const rideDays = getDistributedDays(ridesPerWeek, usedDays);
    for (const d of rideDays) {
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.RIDE,
            description: 'Bike Ride: 60min (Zone 1-2)',
            totalDistance: 0,
            targetPace: 0,
            targetDuration: 3600
        });
    }

    // === 4. SWIMMING ===
    // Distribute swim sessions separately from rides
    const swimDays = getDistributedDays(swimsPerWeek, usedDays);
    for (const d of swimDays) {
        usedDays.add(d);
        workouts.push({
            dayOffset: d,
            type: WorkoutType.SWIM,
            description: 'Swim: 1500m @ Easy',
            totalDistance: 1500, // meters
            targetPace: 120, // 2:00/100m (120 seconds per 100m)
            targetDuration: 2700 // 45min including rest
        });
    }

    return workouts;
}

function getLongRunDistance(raceType: RaceType, weeklyVolume: number): number {
    let dist = weeklyVolume * PLAN_CONSTANTS.LONG_RUN_RATIO;

    let maxDist = PLAN_CONSTANTS.MAX_LONG_RUN_DIST[raceType];
    if (dist > maxDist) dist = maxDist;

    if (dist < PLAN_CONSTANTS.MIN_LONG_RUN) dist = PLAN_CONSTANTS.MIN_LONG_RUN;

    return Math.round(dist / 1000) * 1000;
}

function getQualitySession(raceType: RaceType, paces: TrainingPaces) {
    if (raceType === 'FIVE_K' || raceType === 'TEN_K') {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 5x1km @ ${formatPace(paces.threshold)}`,
            totalDistance: 10000,
            targetPace: paces.threshold
        };
    } else {
        return {
            type: WorkoutType.TEMPO,
            description: `Tempo: 8km @ ${formatPace(paces.marathon) || formatPace(paces.threshold)}`,
            totalDistance: 12000,
            targetPace: paces.threshold
        };
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
        case 'TEMPO': return `Tempo: ${distKm}km${paceStr}`;
        case 'INTERVALS': return `Intervals: Total ${distKm}km Session`;
        case 'RACE': return `Race Day: ${distKm}km`;
        default: return `${type}: ${distKm}km`;
    }
}
