/** Schedules before the current UTC day are history. This same boundary is used
 * by the review and the regeneration endpoint. */
export function replacementStart(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function isReplaceableWorkout(workout: {
    scheduledDate: string | Date;
    isCompleted: boolean;
    linkedActivityId?: string | null;
    linkedActivity?: unknown;
}, start: Date, lastProtected?: Date | null): boolean {
    const date = new Date(workout.scheduledDate);
    return !workout.isCompleted && !workout.linkedActivityId && !workout.linkedActivity && date >= start && (!lastProtected || date > lastProtected);
}

export function lastProtectedDate(workouts: Array<{
    scheduledDate: string | Date;
    isCompleted: boolean;
    linkedActivityId?: string | null;
    linkedActivity?: unknown;
}>): Date | null {
    const dates = workouts.filter(w => w.isCompleted || w.linkedActivityId || w.linkedActivity)
        .map(w => new Date(w.scheduledDate).getTime()).filter(Number.isFinite);
    return dates.length ? new Date(Math.max(...dates)) : null;
}
