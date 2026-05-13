export type SwimZones = {
    easyMin: number;
    easyMax: number;
    threshold: number;
    intervalMin: number;
    intervalMax: number;
};

export function calculateSwimCSS(
    best400mTimeSeconds: number,
    best2000mTimeSeconds: number,
): { css: number; zones: SwimZones } {
    const css400 = best400mTimeSeconds / 4;
    const css2000 = best2000mTimeSeconds / 20;

    const totalDistance = 2.4;
    const totalTime = best400mTimeSeconds / 1000 + best2000mTimeSeconds / 2000;
    const css = totalTime / totalDistance;

    return {
        css: Math.round(css * 100) / 100,
        zones: {
            easyMin: Math.round(css + 8),
            easyMax: Math.round(css + 10),
            threshold: Math.round(css),
            intervalMin: Math.round(css - 6),
            intervalMax: Math.round(css - 4),
        },
    };
}

export function estimateSwimPaceFromVdot(vdot: number): number {
    if (vdot <= 0) return 120;

    const easyPaceSecPerKm = 360 + (60 - vdot) * 5.5;
    const css = Math.round(easyPaceSecPerKm / 10 * 1.4);
    return Math.max(60, Math.min(180, css));
}
