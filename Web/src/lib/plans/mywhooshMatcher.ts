import mywhooshCatalog from '@/data/mywhoosh_workouts.json';
import mywhooshPlansCatalog from '@/data/mywhoosh_plans.json';
import type { StructuredWorkoutV2, StepNode, StructuredStep, RepeatGroup } from './structured';

export interface MyWhooshStep {
    type: 'warmup' | 'steadystate' | 'interval' | 'cooldown' | 'freeride' | string;
    durationSeconds: number;
    powerLowPct: number;
    powerHighPct: number;
    cadenceRpm?: number;
    repeatCount?: number;
    offDurationSeconds?: number;
    offPowerPct?: number;
}

export interface MyWhooshWorkout {
    id: string;
    name: string;
    category: string;
    description?: string;
    durationSeconds: number;
    tss: number;
    intensityFactor: number;
    zoneSeconds: Record<string, number>;
    stepsSummary: string;
    steps: MyWhooshStep[];
    planIds?: string[];
    mywhooshWebLibraryUrl: string;
    externalDetailUrl?: string;
}

export interface MyWhooshTrainingPlan {
    id: string;
    name: string;
    category: string;
    level: string;
    weeksCount: number;
    ridesPerWeek: number;
    description: string;
    externalUrl: string;
    workoutIdsByPhase: Record<string, string[]>;
}

export const MYWHOOSH_WORKOUTS: MyWhooshWorkout[] = mywhooshCatalog as MyWhooshWorkout[];
export const MYWHOOSH_PLANS: MyWhooshTrainingPlan[] = mywhooshPlansCatalog as MyWhooshTrainingPlan[];

export function getMyWhooshWorkoutById(id: string): MyWhooshWorkout | null {
    return MYWHOOSH_WORKOUTS.find((w) => w.id === id) ?? null;
}

export function getMyWhooshPlanById(planId: string): MyWhooshTrainingPlan | null {
    return MYWHOOSH_PLANS.find((p) => p.id === planId) ?? null;
}

/**
 * Converts a catalog MyWhooshWorkout into RunFlow's canonical StructuredWorkoutV2
 * so the Plan Builder, StructuredWorkoutEditor, and WorkoutScheduleCard display
 * the exact same intervals, durations, %FTP power targets, and cadence RPM.
 */
export function mywhooshWorkoutToStructuredV2(
    mw: MyWhooshWorkout,
    ftpWatts: number = 220,
): StructuredWorkoutV2 {
    const safeFtp = ftpWatts > 0 ? ftpWatts : 220;
    const steps: StepNode[] = [];

    for (const s of mw.steps) {
        const durSec = Math.max(1, Math.min(86400, Math.round(s.durationSeconds)));
        const lowPct = Math.round(s.powerLowPct * 100);
        const highPct = Math.round((s.powerHighPct ?? s.powerLowPct) * 100);
        const avgPct = Math.round((lowPct + highPct) / 2);
        const minWatts = Math.round((safeFtp * Math.min(lowPct, highPct)) / 100);
        const maxWatts = Math.round((safeFtp * Math.max(lowPct, highPct)) / 100);

        if (s.type === 'interval' && (s.repeatCount ?? 1) > 1) {
            const reps = Math.max(1, Math.min(100, Math.round(s.repeatCount ?? 1)));
            const offSec = Math.max(1, Math.min(86400, Math.round(s.offDurationSeconds ?? 60)));
            const offPct = Math.round((s.offPowerPct ?? 0.50) * 100);
            const offWatts = Math.round((safeFtp * offPct) / 100);

            const workStep: StructuredStep = {
                kind: 'work',
                label: `${avgPct}% FTP`,
                duration: { type: 'time', seconds: durSec },
                target: {
                    type: 'power',
                    ftpPercent: avgPct,
                    minWatts,
                    maxWatts,
                    zoneLabel: avgPct >= 106 ? 'Z5' : avgPct >= 91 ? 'Z4' : 'Z3',
                },
                ...(s.cadenceRpm ? { cadenceRpm: s.cadenceRpm } : {}),
            };

            const recStep: StructuredStep = {
                kind: 'recovery',
                label: `Recovery (${offPct}% FTP)`,
                duration: { type: 'time', seconds: offSec },
                target: {
                    type: 'power',
                    ftpPercent: offPct,
                    minWatts: offWatts,
                    maxWatts: offWatts,
                    zoneLabel: 'Z1',
                },
            };

            const group: RepeatGroup = {
                kind: 'repeat',
                times: reps,
                label: `${reps}x ${Math.round(durSec / 60) > 0 ? `${Math.round(durSec / 60)}m` : `${durSec}s`} @ ${avgPct}% FTP`,
                steps: [workStep, recStep],
            };
            steps.push(group);
        } else {
            const kind: StructuredStep['kind'] =
                s.type === 'warmup'
                    ? 'warmup'
                    : s.type === 'cooldown'
                    ? 'cooldown'
                    : avgPct >= 85
                    ? 'work'
                    : 'steady';

            const node: StructuredStep = {
                kind,
                label: `${kind === 'warmup' ? 'Warmup' : kind === 'cooldown' ? 'Cooldown' : mw.name} (${avgPct}% FTP)`,
                duration: { type: 'time', seconds: durSec },
                target: {
                    type: 'power',
                    ftpPercent: avgPct,
                    minWatts,
                    maxWatts,
                    zoneLabel:
                        avgPct < 56
                            ? 'Z1'
                            : avgPct < 76
                            ? 'Z2'
                            : avgPct < 91
                            ? 'Z3'
                            : avgPct < 106
                            ? 'Z4'
                            : 'Z5',
                },
                ...(s.cadenceRpm ? { cadenceRpm: s.cadenceRpm } : {}),
            };
            steps.push(node);
        }
    }

    return {
        version: 2,
        source: 'template',
        steps,
    };
}

export function inferTargetCategory(workoutType: string, description: string = '', phase: string = ''): string[] {
    const desc = description.toLowerCase();
    if (phase === 'TAPER' || phase === 'RACE_WEEK' || desc.includes('taper')) {
        return ['Taper', 'Recovery', 'Endurance'];
    }
    if (workoutType === 'LONG_RIDE' || desc.includes('long ride') || desc.includes('zone 2') || desc.includes('endurance')) {
        return ['Endurance', 'Tempo'];
    }
    if (workoutType === 'RIDE_INTERVALS' || desc.includes('vo2') || desc.includes('interval') || desc.includes('105%') || desc.includes('110%')) {
        return ['Threshold', 'Sweet Spot', 'VO2max', 'UAE Team Emirates'];
    }
    if (desc.includes('recovery') || desc.includes('easy')) {
        return ['Recovery', 'Endurance'];
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
    mywhooshPlanId?: string | null;
    rideIndexInWeek?: number;
}): MyWhooshWorkout | null {
    if (!MYWHOOSH_WORKOUTS.length) return null;

    // 1. If a specific MyWhoosh Training Plan is selected, pick from its phase rotation first
    if (params.mywhooshPlanId) {
        const plan = getMyWhooshPlanById(params.mywhooshPlanId);
        if (plan) {
            const phaseKey = params.phase && plan.workoutIdsByPhase[params.phase] ? params.phase : 'BASE';
            const phaseWorkoutIds = plan.workoutIdsByPhase[phaseKey] || plan.workoutIdsByPhase.BASE || [];
            if (phaseWorkoutIds.length > 0) {
                if (params.workoutType === 'LONG_RIDE') {
                    const lastId = phaseWorkoutIds[phaseWorkoutIds.length - 1];
                    const found = getMyWhooshWorkoutById(lastId);
                    if (found) return found;
                }
                const idx = (params.rideIndexInWeek ?? 0) % phaseWorkoutIds.length;
                const chosen = getMyWhooshWorkoutById(phaseWorkoutIds[idx]);
                if (chosen) return chosen;
            }
        }
    }

    // 2. Otherwise match by category + closest duration
    const preferredCategories = inferTargetCategory(
        params.workoutType,
        params.description || '',
        params.phase || ''
    );
    const targetDur = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : 3600;

    let bestMatch: MyWhooshWorkout = MYWHOOSH_WORKOUTS[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of MYWHOOSH_WORKOUTS) {
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
