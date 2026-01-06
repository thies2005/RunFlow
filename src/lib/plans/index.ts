import { WorkoutType, RaceType } from '@prisma/client';
import { calculateTrainingPaces } from '../metrics/vdot';

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
        let weekSchedule = generateWeek(phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek);

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
    ridesPerWeek: number,
    strengthPerWeek: number,
    swimsPerWeek: number
): ScheduledWorkout[] {
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    // Helper to get next available day, preferring the suggested day
    const getAvailableDay = (preferred: number): number => {
        if (!usedDays.has(preferred)) return preferred;
        // Try nearby days
        for (let offset = 1; offset <= 6; offset++) {
            const before = (preferred - offset + 7) % 7;
            const after = (preferred + offset) % 7;
            if (!usedDays.has(after)) return after;
            if (!usedDays.has(before)) return before;
        }
        return preferred; // Fallback: stack if no free day
    };

    // === 1. RUNNING WORKOUTS ===
    // Long Run -> Sunday (day 6) - most important
    if (runsPerWeek >= 1) {
        const longRunDay = getAvailableDay(6); // Sunday
        usedDays.add(longRunDay);
        const longRunDist = getLongRunDistance(raceType, phase);
        workouts.push({
            dayOffset: longRunDay,
            type: WorkoutType.LONG_RUN,
            description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
            totalDistance: longRunDist,
            targetPace: paces.easy.avg,
            targetDuration: 0
        });
    }

    // Quality Session -> Wednesday (day 2) for max spacing from Sunday
    if (runsPerWeek >= 2 && phase !== 'BASE' && phase !== 'TAPER') {
        const qualityDay = getAvailableDay(2); // Wednesday
        usedDays.add(qualityDay);
        const q = getQualitySession(raceType, paces);
        workouts.push({
            dayOffset: qualityDay,
            ...q,
            targetDuration: 0
        });
    } else if (runsPerWeek >= 2) {
        // BASE/TAPER: Easy run instead of quality
        const easyDay = getAvailableDay(2);
        usedDays.add(easyDay);
        workouts.push({
            dayOffset: easyDay,
            type: WorkoutType.EASY,
            description: 'Easy Run: 5km',
            totalDistance: 5000,
            targetPace: paces.easy.avg,
            targetDuration: 0
        });
    }

    // Additional easy runs if requested (prefer Tuesday, Thursday, Saturday)
    const easyRunPreferences = [1, 3, 5, 0, 4]; // Tue, Thu, Sat, Mon, Fri
    let additionalRuns = Math.max(0, runsPerWeek - 2);
    for (const preferred of easyRunPreferences) {
        if (additionalRuns <= 0) break;
        const day = getAvailableDay(preferred);
        if (!usedDays.has(day)) {
            usedDays.add(day);
            workouts.push({
                dayOffset: day,
                type: WorkoutType.EASY,
                description: 'Easy Run: 6km',
                totalDistance: 6000,
                targetPace: paces.easy.avg,
                targetDuration: 0
            });
            additionalRuns--;
        }
    }

    // === 2. STRENGTH TRAINING ===
    // Prefer Tuesday and Friday (not after long run)
    const strengthPreferences = [1, 4, 3, 0]; // Tue, Fri, Thu, Mon
    let strengthRemaining = strengthPerWeek;
    for (const preferred of strengthPreferences) {
        if (strengthRemaining <= 0) break;
        const day = getAvailableDay(preferred);
        if (!usedDays.has(day)) {
            usedDays.add(day);
            workouts.push({
                dayOffset: day,
                type: WorkoutType.STRENGTH,
                description: 'Strength: 45min Session',
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 2700
            });
            strengthRemaining--;
        }
    }

    // === 3. CYCLING (Cross-training) ===
    // Fill remaining days with cycling
    const cyclePreferences = [0, 4, 5, 3, 1, 2]; // Mon, Fri, Sat, Thu, Tue, Wed
    let ridesRemaining = ridesPerWeek;
    for (const preferred of cyclePreferences) {
        if (ridesRemaining <= 0) break;
        const day = getAvailableDay(preferred);
        if (!usedDays.has(day)) {
            usedDays.add(day);
            workouts.push({
                dayOffset: day,
                type: WorkoutType.RIDE,
                description: 'Cross Train: 60min Bike (Zone 1-2)',
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 3600
            });
            ridesRemaining--;
        }
    }

    // === 4. SWIMMING ===
    const swimPreferences = [4, 0, 3]; // Fri, Mon, Thu
    let swimsRemaining = swimsPerWeek;
    for (const preferred of swimPreferences) {
        if (swimsRemaining <= 0) break;
        const day = getAvailableDay(preferred);
        if (!usedDays.has(day)) {
            usedDays.add(day);
            workouts.push({
                dayOffset: day,
                type: WorkoutType.SWIM,
                description: 'Swim: 30min Session',
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 1800
            });
            swimsRemaining--;
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
