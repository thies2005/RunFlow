import { WorkoutType, RaceType } from '@prisma/client';
import { calculateTrainingPaces } from '../metrics/vdot';

export type PlanConfig = {
    vdot: number;
    raceType: RaceType;
    raceDate: Date;
    startDate?: Date; // Defaults to now
    daysPerWeek?: number; // Default 4
    includeCrossTraining?: boolean; // Default false
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
    const daysPerWeek = config.daysPerWeek || 4;
    const includeCrossTraining = config.includeCrossTraining || false;

    // Calculate weeks available
    const timeDiff = raceDate.getTime() - startDate.getTime();
    const weeksAvailable = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

    // Get authorized paces
    const paces = calculateTrainingPaces(vdot);

    const workouts: GeneratedWorkout[] = [];

    let currentDate = new Date(startDate);
    // Align to Monday? Or purely relative?
    // Relative for simplicity, but we assign specific "Day offsets" within a week.
    // If startDate is Wednesday, Date+0 is Wed.
    // We treat "Week" as 7-day blocks starting from startDate.

    // We want to align "Long Run" to Sunday usually.
    // But for MVP, let's keep it relative.

    for (let week = 1; week <= weeksAvailable; week++) {
        const weeksUntilRace = weeksAvailable - week + 1;
        const phase = getPhase(weeksUntilRace);

        const weekSchedule = generateWeek(phase, raceType, paces, daysPerWeek, includeCrossTraining);

        // Sort schedule to put Long Run at end? Or spaced?
        // Let's rely on dayOffsets.

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
    daysPerWeek: number,
    includeCrossTraining: boolean
): ScheduledWorkout[] {
    const workouts: ScheduledWorkout[] = [];

    // Define patterns based on days running (excludes XT)
    // 3: Tue, Thu, Sun(Long)
    // 4: Tue, Thu, Sat, Sun(Long)
    // 5: Tue, Wed, Thu, Sat, Sun(Long)
    // or similar distribution.
    // We use offsets 0-6 relative to start of week.

    // Let's assume start of week = Monday.
    // offsets: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun.

    let pattern: number[] = [];
    if (daysPerWeek <= 3) pattern = [1, 3, 6]; // Tue, Thu, Sun
    else if (daysPerWeek === 4) pattern = [1, 3, 5, 6]; // Tue, Thu, Sat, Sun
    else if (daysPerWeek === 5) pattern = [1, 2, 3, 5, 6]; // Tue, Wed, Thu, Sat, Sun
    else if (daysPerWeek >= 6) pattern = [0, 1, 2, 3, 5, 6]; // Mon, Tue, Wed, Thu, Sat, Sun

    // Slot assignments
    // Long Run -> Last day (6)
    // Quality -> Midweek (3 or 2)
    // Others -> Easy

    // 1. Long Run
    const longRunDay = pattern[pattern.length - 1];
    let longRunDist = getLongRunDistance(raceType, phase);
    workouts.push({
        dayOffset: longRunDay,
        type: WorkoutType.LONG_RUN,
        description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
        totalDistance: longRunDist,
        targetPace: paces.easy.avg
    });

    // 2. Quality Session
    if (pattern.length >= 2 && phase !== 'BASE' && phase !== 'TAPER') {
        const qualityDay = pattern[1]; // Usually Thu or Wed
        const q = getQualitySession(raceType, paces);
        workouts.push({
            dayOffset: qualityDay,
            ...q
        });
    } else if (pattern.length >= 2) {
        // Base/Taper replace quality with easy
        const qualityDay = pattern[1];
        workouts.push({
            dayOffset: qualityDay,
            type: WorkoutType.EASY,
            description: 'Easy Run: 8km',
            totalDistance: 8000,
            targetPace: paces.easy.avg
        });
    }

    // 3. Easy Runs (Fill remaining slots)
    // Filter out used days (Long Run and Quality/Replacement)
    const usedDays = workouts.map(w => w.dayOffset);
    const availableDays = pattern.filter(d => !usedDays.includes(d));

    availableDays.forEach(day => {
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: 'Easy Run: 6km',
            totalDistance: 6000,
            targetPace: paces.easy.avg
        });
    });

    // 4. Cross Training
    if (includeCrossTraining) {
        // Find a free slot.
        const rDays = pattern; // Running days
        // Possible days: 0..6
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const freeDays = allDays.filter(d => !rDays.includes(d));

        if (freeDays.length > 0) {
            // Pick midpoint? or first?
            // If running Tue,Thu,Sun (1,3,6). Free: 0,2,4,5.
            // 2(Wed) or 5(Sat) are good.
            // Let's pick '2' (Wed) if free, else '5' (Sat), else first available.
            let xtDay = freeDays.includes(2) ? 2 : (freeDays.includes(4) ? 4 : freeDays[0]);

            workouts.push({
                dayOffset: xtDay,
                type: WorkoutType.RIDE,
                description: 'Cross Train: 45-60min Bike Ride',
                totalDistance: 0, // Distance not strict
                targetPace: 0
            });
        }
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
