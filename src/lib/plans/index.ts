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
    // Phase length overrides (weeks)
    taperWeeks?: number; // Default 2
    peakWeeks?: number; // Default 4
    buildWeeks?: number; // Default 4
    // Remaining weeks are BASE
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

    // Linear Progression Logic
    // Start at ~60% of peak volume
    let startVolume = peakVolume * 0.60;

    // Ensure logical minimum floor (e.g. 15km) but don't exceed peak
    if (startVolume < 15000) startVolume = Math.min(15000, peakVolume);

    // Get authorized paces
    const paces = calculateTrainingPaces(vdot);

    const workouts: GeneratedWorkout[] = [];

    let currentDate = new Date(startDate);

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
            weeklyVolume: weekVolumeCap
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
                // 1. Remove all fill runs
                // 2. Scale priority runs
                const scalingFactor = weekVolumeCap / priorityDist;

                weekSchedule = weekSchedule.map(w => {
                    if (isRun(w.type)) {
                        if (!isPriority(w)) {
                            // Remove fill run (or set to min, but for now 0 distance effectively removes it from volume calc, 
                            // though we might want to keep the entry as a rest day or super short run?
                            // Let's set to minimum effective dose if possible, but here we are strictly capped.
                            // Let's zero it out or effectively skip. 
                            // Actually, let's just make it a rest day or very short recovery.
                            return { ...w, totalDistance: 0, description: 'Rest (Volume Cap)' };
                        } else {
                            // Scale priority
                            const newDist = Math.round((w.totalDistance * scalingFactor) / 100) * 100;
                            // Apply floor
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
                const fillScalingFactor = fillDist > 0 ? remainingCap / fillDist : 0; // Should be < 1

                weekSchedule = weekSchedule.map(w => {
                    if (isRun(w.type) && !isPriority(w)) {
                        let newDist = Math.round((w.totalDistance * fillScalingFactor) / 100) * 100;
                        // If new distance is too short (<3km), might optionally remove it or keep as Recovery
                        if (newDist < 3000) newDist = 3000; // Soft floor

                        // Re-check cap? If soft floor pushes us over, we might exceed cap slightly. 
                        // The prompt says "Reduce volume from Easy runs first". 
                        // Strictly adhering to cap might mean removing the run.
                        // Let's stick to the scaling.

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

function getMinPeakVolume(raceType: RaceType): number {
    switch (raceType) {
        case 'FIVE_K': return 20000;
        case 'TEN_K': return 30000;
        case 'HALF_MARATHON': return 40000;
        case 'MARATHON': return 50000;
    }
}

type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };

function generateWeek(params: {
    phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
    raceType: RaceType,
    paces: any,
    runsPerWeek: number,
    ridesPerWeek: number,
    strengthPerWeek: number,
    swimsPerWeek: number,
    weeklyVolume: number
}): ScheduledWorkout[] {
    const { phase, raceType, paces, runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek, weeklyVolume } = params;
    const workouts: ScheduledWorkout[] = [];
    const usedDays = new Set<number>();

    // Calculate Dynamic Easy Run Distance
    // 1. Long Run
    const longRunDist = getLongRunDistance(raceType, weeklyVolume);

    // 2. Quality Session (if applicable)
    const hasQuality = runsPerWeek >= 2 && phase !== 'BASE' && phase !== 'TAPER';
    const qualitySession = getQualitySession(raceType, paces);
    const qualityDist = hasQuality ? qualitySession.totalDistance : 0;

    // 3. Remaining volume for Easy Runs
    // Total Runs = runsPerWeek. 
    // Key Runs = 1 (Long) + (hasQuality ? 1 : 0).
    // Easy Runs Count = runsPerWeek - Key Runs. 
    // Note: If !hasQuality (e.g. Base), the "Quality Slot" becomes an Easy Run, so it counts as an Easy Run.
    const keyRunsCount = 1 + (hasQuality ? 1 : 0);
    const easyRunsCount = Math.max(0, runsPerWeek - keyRunsCount) + (!hasQuality && runsPerWeek >= 2 ? 1 : 0);

    const remainingVol = Math.max(0, weeklyVolume - longRunDist - qualityDist);
    const calculatedEasyDist = easyRunsCount > 0 ? remainingVol / easyRunsCount : 5000;

    // Clamp Easy Run Distance (e.g. 4km - 12km)
    const easyDist = Math.max(4000, Math.min(Math.round(calculatedEasyDist / 100) * 100, 12000));

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
        const longRunDist = getLongRunDistance(raceType, weeklyVolume);
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
            description: `Easy Run: ${(easyDist / 1000).toFixed(1)}km`,
            totalDistance: easyDist,
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
                description: `Easy Run: ${(easyDist / 1000).toFixed(1)}km`,
                totalDistance: easyDist,
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

function getLongRunDistance(raceType: RaceType, weeklyVolume: number): number {
    // Dynamic Long Run: ~40-50% of weekly volume for lower mileage, tapering off?
    // Let's use 50% cap as a general rule for simple planning, capped by maxDist.
    let dist = weeklyVolume * 0.50;

    // Apply strict ceilings based on Race Type
    let maxDist = 32000;
    switch (raceType) {
        case 'FIVE_K': maxDist = 16000; break;
        case 'TEN_K': maxDist = 22000; break;
        case 'HALF_MARATHON': maxDist = 26000; break;
        case 'MARATHON': maxDist = 32000; break;
    }

    if (dist > maxDist) dist = maxDist;

    // Ensure reasonable minimum (e.g., 6km)
    if (dist < 6000) dist = 6000;

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
