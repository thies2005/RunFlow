import { WorkoutType, RaceType } from '@prisma/client';
import { calculateTrainingPaces } from '../metrics/vdot';

export type PlanConfig = {
    vdot: number;
    raceType: RaceType;
    raceDate: Date;
    startDate?: Date; // Defaults to now
    runsPerWeek?: number; // Default 4
    ridesPerWeek?: number; // Default 0
};

export type GeneratedWorkout = {
    date: Date;
    type: WorkoutType;
    description: string;
    totalDistance: number; // Estimated meters
    targetPace?: number; // seconds per km
};

/**
 * Generates a training plan based on VDOT and race goal
 */
export function generateTrainingPlan(config: PlanConfig): GeneratedWorkout[] {
    const { vdot, raceType, raceDate } = config;
    const startDate = config.startDate || new Date();
    const runsPerWeek = config.runsPerWeek || 4;
    const ridesPerWeek = config.ridesPerWeek || 0;

    // Calculate weeks available
    const timeDiff = raceDate.getTime() - startDate.getTime();
    const weeksAvailable = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

    // Get authorized paces
    const paces = calculateTrainingPaces(vdot);

    const workouts: GeneratedWorkout[] = [];

    let currentDate = new Date(startDate);

    // We treat "Week" as 7-day blocks starting from startDate.

    for (let week = 1; week <= weeksAvailable; week++) {
        const weeksUntilRace = weeksAvailable - week + 1;
        const phase = getPhase(weeksUntilRace);

        const weekSchedule = generateWeek(phase, raceType, paces, runsPerWeek, ridesPerWeek);

        weekSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);

            workouts.push({
                date: specificDate,
                type: w.type,
                description: w.description,
                totalDistance: w.totalDistance,
                targetPace: w.targetPace
            });
        });

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return workouts;
}

function getPhase(weeksUntilRace: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
    if (weeksUntilRace <= 2) return 'TAPER';
    if (weeksUntilRace <= 6) return 'PEAK';
    if (weeksUntilRace <= 10) return 'BUILD';
    return 'BASE';
}

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

function generateWeek(
    phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
    raceType: RaceType,
    paces: any,
    runsPerWeek: number,
    ridesPerWeek: number
): ScheduledWorkout[] {
    const workouts: ScheduledWorkout[] = [];

    // Run Patterns (Day offsets 0-6, Mon-Sun)
    let runDays: number[] = [];
    if (runsPerWeek <= 3) runDays = [1, 3, 6]; // Tue, Thu, Sun
    else if (runsPerWeek === 4) runDays = [1, 3, 5, 6]; // Tue, Thu, Sat, Sun
    else if (runsPerWeek === 5) runDays = [1, 2, 3, 5, 6]; // Tue, Wed, Thu, Sat, Sun
    else if (runsPerWeek === 6) runDays = [0, 1, 2, 3, 5, 6]; // all but Fri? Or Mon-Sat? Let's say all but Fri.
    else runDays = [0, 1, 2, 3, 4, 5, 6]; // Everyday

    // 1. Assign Runs
    // Long Run -> Last day
    const longRunDay = runDays[runDays.length - 1];
    let longRunDist = getLongRunDistance(raceType, phase);
    workouts.push({
        dayOffset: longRunDay,
        type: WorkoutType.LONG_RUN,
        description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
        totalDistance: longRunDist,
        targetPace: paces.easy.avg
    });

    // Quality Session
    if (runDays.length >= 2 && phase !== 'BASE' && phase !== 'TAPER') {
        const qualityDay = runDays[1]; // Usually Thu or Wed
        const q = getQualitySession(raceType, paces);
        workouts.push({
            dayOffset: qualityDay,
            ...q
        });
    } else if (runDays.length >= 2) {
        // Base/Taper replace quality with easy
        const qualityDay = runDays[1];
        workouts.push({
            dayOffset: qualityDay,
            type: WorkoutType.EASY,
            description: 'Easy Run: 8km',
            totalDistance: 8000,
            targetPace: paces.easy.avg
        });
    }

    // Easy Runs (Rest of runDays)
    const assignedRunDays = workouts.map(w => w.dayOffset);
    const availableRunDays = runDays.filter(d => !assignedRunDays.includes(d));

    availableRunDays.forEach(day => {
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: 'Easy Run: 6km',
            totalDistance: 6000,
            targetPace: paces.easy.avg
        });
    });

    // 2. Assign Rides (Fill free slots)
    if (ridesPerWeek > 0) {
        let ridesAssigned = 0;
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const freeDays = allDays.filter(d => !runDays.includes(d));

        // Prioritize weekends/midweek?
        // Let's just fill sequentially from freeDays.
        for (const day of freeDays) {
            if (ridesAssigned >= ridesPerWeek) break;
            workouts.push({
                dayOffset: day,
                type: WorkoutType.RIDE,
                description: 'Cross Train: 60min Bike Ride',
                totalDistance: 25000, // Estimate 25km? Or 0.
                targetPace: 0
            });
            ridesAssigned++;
        }

        // If still need rides (runs+rides > 7), we skip (cannot double up easily in this model without conflict).
        // User should limit via UI.
    }

    return workouts;
}

function getLongRunDistance(raceType: RaceType, phase: string): number {
    let dist = 10000;
    switch (raceType) {
        case 'FIVE_K': dist = 12000; break;
        case 'TEN_K': dist = 15000; break;
        case 'HALF_MARATHON': dist = 18000; break;
        case 'MARATHON': dist = 26000; break;
    }
    if (phase === 'BASE') dist *= 0.8;
    if (phase === 'TAPER') dist *= 0.6;
    if (phase === 'PEAK') dist *= 1.1; // Peak long run
    return Math.round(dist / 1000) * 1000;
}

function getQualitySession(raceType: RaceType, paces: any) {
    if (raceType === 'FIVE_K' || raceType === 'TEN_K') {
        return {
            type: WorkoutType.INTERVALS,
            description: `Intervals: 5x1km @ ${formatPace(paces.threshold)}`,
            totalDistance: 10000, // inc warmup/cool
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
