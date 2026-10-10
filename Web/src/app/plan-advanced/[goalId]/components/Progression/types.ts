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
    PRIMARY: { label: 'Primary', color: 'text-accent-orange bg-accent-orange/10 border-accent-orange/30', dotColor: 'bg-accent-orange' },
    SECONDARY: { label: 'Secondary', color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30', dotColor: 'bg-accent-blue' },
    TUNE_UP: { label: 'Tune-up', color: 'text-foreground-muted bg-foreground/20 border-foreground/30', dotColor: 'bg-foreground/30' },
    MILESTONE: { label: 'Milestone', color: 'text-positive bg-positive/10 border-positive/30', dotColor: 'bg-positive' },
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
