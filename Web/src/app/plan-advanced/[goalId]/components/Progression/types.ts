export type ProgressionWorkoutType = 'INTERVALS' | 'REPETITIONS' | 'FARTLEK' | 'TEMPO';

export interface ProgressionWeekData {
    weekOffset: number;
    warmup: { distance: number; pace: string };
    main: Array<{ reps: number; distance: number; pace: string; restSeconds: number }>;
    cooldown: { distance: number; pace: string };
}

export interface IntervalProgression {
    id?: string;
    goalId: string;
    name: string;
    workoutType: ProgressionWorkoutType;
    startWeek: number;
    endWeek: number;
    weeks: ProgressionWeekData[];
    createdAt?: string;
    updatedAt?: string;
}

export type GoalPriority = 'PRIMARY' | 'SECONDARY' | 'TUNE_UP' | 'MILESTONE';

export interface Goal {
    id: string;
    userId: string;
    name: string;
    sport: string;
    raceType: string;
    raceDate: string | null;
    targetTime: number | null;
    priority: GoalPriority;
    parentId: string | null;
    parentGoalId?: string | null;
    vdot: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaceProfilePhase {
    phaseName: string;
    phaseOrder: number;
    startWeek: number;
    endWeek: number;
    vdotAdjustment: number;
    easyPace: { min: number; max: number } | null;
    tempoPace: { min: number; max: number } | null;
    intervalPace: { min: number; max: number } | null;
    repetitionPace: { min: number; max: number } | null;
    longRunPace: { min: number; max: number } | null;
    hrZones: number[] | null;
}

export interface PlanPaceProfile {
    id?: string;
    goalId: string;
    baseVdot: number;
    profiles: PaceProfilePhase[];
}

export interface PlanPhase {
    name: string;
    startWeek: number;
    endWeek: number;
    type: string;
}

export const PRIORITY_CONFIG: Record<GoalPriority, { label: string; color: string; dotColor: string }> = {
    PRIMARY: { label: 'Primary', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', dotColor: 'bg-yellow-400' },
    SECONDARY: { label: 'Secondary', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', dotColor: 'bg-blue-400' },
    TUNE_UP: { label: 'Tune-up', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30', dotColor: 'bg-gray-400' },
    MILESTONE: { label: 'Milestone', color: 'text-green-400 bg-green-500/20 border-green-500/30', dotColor: 'bg-green-400' },
};

export function weekTotalDistance(w: ProgressionWeekData): number {
    let total = w.warmup.distance + w.cooldown.distance;
    for (const s of w.main) {
        total += s.reps * s.distance;
    }
    return total;
}

export function mainSetSummary(w: ProgressionWeekData): string {
    return w.main
        .map((s) => `${s.reps}×${s.distance}m @ ${s.pace}`)
        .join(', ');
}
