import mywhooshCatalog from '@/data/mywhoosh_workouts.json';

export interface MyWhooshStep {
    type: 'warmup' | 'steadystate' | 'interval' | 'cooldown' | 'freeride' | string;
    durationSeconds: number;
    powerLowPct: number;
    powerHighPct: number;
    cadenceRpm?: number;
}

export interface MyWhooshWorkout {
    id: string;
    name: string;
    category: string;
    durationSeconds: number;
    tss: number;
    intensityFactor: number;
    zoneSeconds: Record<string, number>;
    stepsSummary: string;
    steps: MyWhooshStep[];
    mywhooshWebLibraryUrl: string;
    externalDetailUrl: string;
}

const catalog: MyWhooshWorkout[] = mywhooshCatalog as MyWhooshWorkout[];

export function inferTargetCategory(workoutType: string, description: string = '', phase: string = ''): string[] {
    const desc = description.toLowerCase();
    if (phase === 'TAPER' || phase === 'RACE_WEEK' || desc.includes('taper')) {
        return ['Taper', 'Recovery', 'Endurance'];
    }
    if (workoutType === 'LONG_RIDE' || desc.includes('long ride') || desc.includes('zone 2') || desc.includes('endurance')) {
        return ['Endurance', 'Tempo'];
    }
    if (desc.includes('recovery') || desc.includes('easy')) {
        return ['Recovery', 'Endurance'];
    }
    if (desc.includes('vo2') || desc.includes('interval') || desc.includes('105%') || desc.includes('110%')) {
        return ['VO2max', 'Threshold', 'Anaerobic'];
    }
    if (desc.includes('sweet spot') || desc.includes('88%') || desc.includes('90%')) {
        return ['Sweet Spot', 'Threshold', 'Tempo'];
    }
    if (desc.includes('threshold') || desc.includes('ftp') || desc.includes('95%') || desc.includes('100%')) {
        return ['Threshold', 'Sweet Spot', 'VO2max'];
    }
    if (desc.includes('tempo')) {
        return ['Tempo', 'Sweet Spot', 'Endurance'];
    }
    return ['Endurance', 'Sweet Spot', 'Tempo'];
}

export function findClosestMyWhooshWorkout(params: {
    workoutType: string;
    targetDurationSeconds: number;
    description?: string;
    phase?: string;
}): MyWhooshWorkout | null {
    if (!catalog.length) return null;
    const preferredCategories = inferTargetCategory(
        params.workoutType,
        params.description || '',
        params.phase || ''
    );
    const targetDur = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : 3600;

    let bestMatch: MyWhooshWorkout = catalog[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of catalog) {
        const catRank = preferredCategories.indexOf(candidate.category);
        const categoryPenalty = catRank === 0 ? 0 : catRank === 1 ? 600 : catRank === 2 ? 1200 : 2400;
        const durationDelta = Math.abs(candidate.durationSeconds - targetDur);
        const totalScore = durationDelta + categoryPenalty;

        if (totalScore < bestScore) {
            bestScore = totalScore;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}
