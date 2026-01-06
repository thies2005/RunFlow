import { WorkoutType, RaceType } from '@prisma/client';
import { calculateTrainingPaces } from '../metrics/vdot';

export type PlanConfig = {
    vdot: number;
    raceType: RaceType;
    raceDate: Date;
    startDate?: Date; // Defaults to now
    runsPerWeek?: number; // Default 4
    ridesPerWeek?: number; // Default 0
    weeklyMileageGoal?: number | null; // Max km per week (in meters!)
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

    // Determine Peak Volume (meters)
    let peakVolume = config.weeklyMileageGoal || 40000;
    // Ensure logical minimum peak based on race type
    const minPeak = getMinPeakVolume(raceType);
    if (peakVolume < minPeak) peakVolume = minPeak;

    // Calculate weeks available
    const timeDiff = raceDate.getTime() - startDate.getTime();
    const totalWeeks = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

    // Calculate Starting Volume using reverse 15% rule
    // allowed_vol_week_i = start_vol * (1.15 ^ i)
    // We want allowed_vol_last_week >= peakVolume (roughly)
    // So start_vol = peakVolume / (1.15 ^ totalWeeks)
    // However, we clamp start_vol to a minimum (e.g. 20km) 
    // to avoid starting at 2km for a 20 week plan.
    let startVolume = peakVolume / Math.pow(1.15, Math.max(0, totalWeeks - 2)); // Reach peak 2 weeks before race?
    if (startVolume < 15000) startVolume = 15000;
    if (startVolume > peakVolume) startVolume = peakVolume;

    // Get authorized paces
    const paces = calculateTrainingPaces(vdot);

    const workouts: GeneratedWorkout[] = [];

    let currentDate = new Date(startDate);

    for (let week = 1; week <= totalWeeks; week++) {
        const weeksUntilRace = totalWeeks - week + 1; // 1-based countdown
        const phase = getPhase(weeksUntilRace);

        // Calculate Volume Cap for this week
        // 15% increase from previous week
        // vol = start * 1.15^(week-1)
        let weekVolumeCap = startVolume * Math.pow(1.15, week - 1);

        // Taper Logic: Reduce volume in last 2 weeks
        if (weeksUntilRace <= 2) {
            weekVolumeCap = peakVolume * (weeksUntilRace === 2 ? 0.7 : 0.4);
        } else {
            // Cap at Peak Volume
            if (weekVolumeCap > peakVolume) weekVolumeCap = peakVolume;
        }

        // Generate base workouts
        let weekSchedule = generateWeek(phase, raceType, paces, runsPerWeek, ridesPerWeek);

        // Scale runs to fit Volume Cap
        const runningWorkouts = weekSchedule.filter(w => isRun(w.type));
        const totalRunDistance = runningWorkouts.reduce((sum, w) => sum + w.totalDistance, 0);

        if (totalRunDistance > weekVolumeCap) {
            const scalingFactor = weekVolumeCap / totalRunDistance;

            weekSchedule = weekSchedule.map(w => {
                if (isRun(w.type)) {
                    const newDist = Math.round((w.totalDistance * scalingFactor) / 100) * 100; // Round to 100m
                    // Minimum effective dose for a run ~3km
                    const finalDist = Math.max(newDist, 3000);

                    // Update Description
                    const desc = updateDescription(w.type, finalDist, w.targetPace || 0);

                    return {
                        ...w,
                        totalDistance: finalDist,
                        description: desc
                    };
                }
                return w;
            });
        }

        // Add to main list
        weekSchedule.forEach(w => {
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + w.dayOffset);

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

function getPhase(weeksUntilRace: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
    if (weeksUntilRace <= 2) return 'TAPER';
    if (weeksUntilRace <= 6) return 'PEAK';
    if (weeksUntilRace <= 10) return 'BUILD';
    return 'BASE';
}

function getMinPeakVolume(raceType: RaceType): number {
    switch (raceType) {
        case 'FIVE_K': return 20000;
        case 'TEN_K': return 30000;
        case 'HALF_MARATHON': return 40000;
        case 'MARATHON': return 50000;
    }
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
    if (runsPerWeek <= 2) runDays = [1, 6]; // Tue, Sun
    else if (runsPerWeek === 3) runDays = [1, 3, 6]; // Tue, Thu, Sun
    else if (runsPerWeek === 4) runDays = [1, 3, 5, 6]; // Tue, Thu, Sat, Sun
    else if (runsPerWeek === 5) runDays = [1, 2, 3, 5, 6]; // Tue, Wed, Thu, Sat, Sun
    else if (runsPerWeek === 6) runDays = [0, 1, 2, 3, 5, 6]; // all but Fri
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
        targetPace: paces.easy.avg,
        targetDuration: 0
    });

    // Quality Session(s)
    let assigned = 1;
    if (runDays.length >= 2 && phase !== 'BASE' && phase !== 'TAPER') {
        const qualityDay = runDays[1]; // Usually Thu (index 1 of [Tue, Thu...])
        const q = getQualitySession(raceType, paces);
        workouts.push({
            dayOffset: qualityDay,
            ...q,
            targetDuration: 0
        });
        assigned++;
    }

    // Fill remaining run days with Easy
    const currentAssignedDays = workouts.map(w => w.dayOffset);
    let availableRunDays = runDays.filter(d => !currentAssignedDays.includes(d));

    // Distribute remaining volume roughly? We just assume 6-8km easy runs initially, then scaling fixes it.
    availableRunDays.forEach(day => {
        workouts.push({
            dayOffset: day,
            type: WorkoutType.EASY,
            description: `Easy Run: 6km`,
            totalDistance: 6000,
            targetPace: paces.easy.avg,
            targetDuration: 0
        });
    });

    // 2. Assign Rides (Fill free slots)
    // logic: bike rides only time and training zone, should mostly be used for z1 or z2
    if (ridesPerWeek > 0) {
        let ridesAssigned = 0;
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const freeDays = allDays.filter(d => !runDays.includes(d));

        for (const day of freeDays) {
            if (ridesAssigned >= ridesPerWeek) break;
            workouts.push({
                dayOffset: day,
                type: WorkoutType.RIDE,
                description: 'Cross Train: 60min Bike (Zone 1-2)',
                totalDistance: 0, // No distance
                targetPace: 0,
                targetDuration: 3600 // 60 mins
            });
            ridesAssigned++;
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
    if (phase === 'PEAK') dist *= 1.1;
    return Math.round(dist / 1000) * 1000;
}

function getQualitySession(raceType: RaceType, paces: any) {
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
