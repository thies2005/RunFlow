import { WorkoutType, RaceType } from '@prisma/client';
import { calculateTrainingPaces } from '../metrics/vdot';

export type PlanConfig = {
    vdot: number;
    raceType: RaceType;
    raceDate: Date;
    startDate?: Date; // Defaults to now
    daysPerWeek?: number; // Defaults to 5
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

    // Calculate weeks available
    const timeDiff = raceDate.getTime() - startDate.getTime();
    const weeksAvailable = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));

    // Get authorized paces
    const paces = calculateTrainingPaces(vdot);

    const workouts: GeneratedWorkout[] = [];

    // Plan structure (simplified for MVP)
    // 12-week standard block. If more time, add base. If less, truncate from start (assume user has base).
    const planStructure = getPlanStructure(raceType, Math.min(weeksAvailable, 16));

    let currentDate = new Date(startDate);
    // Align start date to next Monday if requested (optional, but good for structured weeks)
    // For now, just start tomorrow
    currentDate.setDate(currentDate.getDate() + 1);

    // Iterating by weeks backwards from race date might be easier to align phases
    // But forward is easier for "starting now". Let's do forward for the calculated number of weeks.

    for (let week = 1; week <= weeksAvailable; week++) {
        // Determine phase based on weeks remaining
        const weeksUntilRace = weeksAvailable - week + 1;
        const phase = getPhase(weeksUntilRace);

        // Generate week's workouts
        const weekWorkouts = generateWeek(phase, raceType, paces);

        // Assign dates
        weekWorkouts.forEach((w, i) => {
            const wDate = new Date(currentDate);
            wDate.setDate(wDate.getDate() + (i * 2)); // Spread out: Mon, Wed, Fri, Sun... rough heuristic
            // Better: use specific day slots

            // Just simple spacing for MVP: 4 runs a week = Day 0, 2, 4, 6
            const dayOffset = [0, 2, 4, 6][i] || i;
            const specificDate = new Date(currentDate);
            specificDate.setDate(specificDate.getDate() + dayOffset);

            workouts.push({
                ...w,
                date: specificDate,
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

function getPlanStructure(raceType: RaceType, weeks: number) {
    // Placeholder for more complex structure logic
    return {
        weeks,
        phases: []
    };
}

function generateWeek(phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER', raceType: RaceType, paces: any): Omit<GeneratedWorkout, 'date'>[] {
    const workouts: Omit<GeneratedWorkout, 'date'>[] = [];

    // 1. Long Run (Weekend)
    let longRunDist = 0;
    let longRunDesc = '';

    switch (raceType) {
        case 'FIVE_K': longRunDist = 10000; break;
        case 'TEN_K': longRunDist = 14000; break;
        case 'HALF_MARATHON': longRunDist = 18000; break;
        case 'MARATHON': longRunDist = 28000; break;
        default: longRunDist = 10000;
    }

    // Scale by phase
    if (phase === 'BASE') longRunDist *= 0.8;
    if (phase === 'TAPER') longRunDist *= 0.5;

    workouts.push({
        type: WorkoutType.LONG_RUN,
        description: `Long Run: ${longRunDist / 1000}km @ Easy Pace (${formatPace(paces.easy.min)}-${formatPace(paces.easy.max)})`,
        totalDistance: longRunDist,
        targetPace: paces.easy.avg
    });

    // 2. Quality Session (Intervals/Tempo)
    if (phase !== 'BASE' && phase !== 'TAPER') {
        let qualityType: WorkoutType = WorkoutType.INTERVALS;
        let qualityDesc = '';
        let qualityDist = 8000;

        if (raceType === 'FIVE_K' || raceType === 'TEN_K') {
            qualityDesc = `Intervals: 5x1km @ Threshold (${formatPace(paces.threshold)}) w/ 2min rest`;
            qualityType = WorkoutType.INTERVALS;
        } else {
            qualityDesc = `Tempo: 6km @ Threshold (${formatPace(paces.threshold)})`;
            qualityType = WorkoutType.TEMPO;
        }

        workouts.push({
            type: qualityType,
            description: qualityDesc,
            totalDistance: qualityDist,
            targetPace: paces.threshold
        });
    } else {
        // Base/Taper = Easy run instead of quality
        workouts.push({
            type: WorkoutType.EASY,
            description: `Easy Run: 6km`,
            totalDistance: 6000,
            targetPace: paces.easy.avg
        });
    }

    // 3. Easy Runs (Fillers)
    workouts.push({
        type: WorkoutType.EASY,
        description: `Easy Run: 5km recovery`,
        totalDistance: 5000,
        targetPace: paces.easy.avg
    });

    workouts.push({
        type: WorkoutType.EASY,
        description: `Easy Run: 8km aerobic`,
        totalDistance: 8000,
        targetPace: paces.easy.avg
    });

    return workouts;
}

function formatPace(secondsPerKm: number): string {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}
