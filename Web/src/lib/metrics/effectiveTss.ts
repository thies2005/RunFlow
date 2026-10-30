/**
 * Effective / Unified TSS calculation.
 *
 * Pure calculation functions with zero DB / Node dependencies, safe for
 * import by both Server Components / API routes and Client Components (ActivityList, etc.).
 */

export function resolveActivityEffectiveTss(
    activity: { type?: string | null; movingTime?: number | null; trainingType?: string | null },
    runningTss: number = 0,
    bikeTss: number = 0,
    trimp: number = 0
): number {
    const type = (activity.type || '').toUpperCase();
    const trainingType = (activity.trainingType || '').toUpperCase();
    const movingTime = activity.movingTime || 0;

    if (type === 'RIDE' || type === 'VIRTUAL_RIDE') {
        return bikeTss > 0 ? Math.round(bikeTss) : Math.round(trimp * 0.85);
    }
    if (type === 'RUN') {
        return runningTss > 0 ? Math.round(runningTss) : Math.round(trimp * 0.85);
    }
    if (type === 'WORKOUT' || type === 'STRENGTH' || trainingType === 'STRENGTH') {
        return Math.max(Math.round(trimp), Math.round((movingTime / 3600) * 36));
    }
    // Other cardio (SWIM, HIKE, WALK, OTHER, etc.)
    return trimp > 0 ? Math.round(trimp * 0.85) : Math.round((movingTime / 3600) * 40);
}
