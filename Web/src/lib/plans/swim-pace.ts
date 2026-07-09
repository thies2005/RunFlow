export type SwimZones = {
    easyMin: number;
    easyMax: number;
    threshold: number;
    intervalMin: number;
    intervalMax: number;
};

/**
 * Critical Swim Speed (CSS) from two maximal time-trial efforts.
 *
 * CSS = (distance2 - distance1) / (time2 - time1)  =>  metres per second.
 * Expressed as seconds per 100m: 100 / css.
 *
 * @deprecated This is currently dead code — the plan generator uses
 * {@link estimateSwimPaceFromVdot} instead. It is retained (with corrected,
 * dimensionally-valid math) for the case where real time-trial inputs become
 * available. The two parameters MUST be genuine maximal-effort times: a 400m
 * best and a 2000m best. Passing arbitrary paces/durations will yield nonsense.
 *
 * @param best400mTimeSeconds  Maximal-effort time for 400m, in seconds.
 * @param best2000mTimeSeconds Maximal-effort time for 2000m, in seconds.
 * @returns `{ css, zones }` where `css` is seconds per 100m.
 */
export function calculateSwimCSS(
    best400mTimeSeconds: number,
    best2000mTimeSeconds: number,
): { css: number; zones: SwimZones } {
    // Guard: CSS is undefined when the longer trial was not actually slower,
    // or when either input is non-positive. The zone offsets below assume a
    // "pace" expressed as seconds per 100m, so bail out to a safe neutral
    // value rather than emitting negative/Infinity paces.
    if (
        best400mTimeSeconds <= 0 ||
        best2000mTimeSeconds <= 0 ||
        best2000mTimeSeconds <= best400mTimeSeconds
    ) {
        const fallback = estimateSwimPaceFromVdot(40);
        return {
            css: fallback,
            zones: {
                easyMin: fallback + 8,
                easyMax: fallback + 10,
                threshold: fallback,
                intervalMin: Math.max(0, fallback - 6),
                intervalMax: Math.max(0, fallback - 4),
            },
        };
    }

    const distance1 = 400; // metres
    const distance2 = 2000; // metres
    const t1 = best400mTimeSeconds; // seconds
    const t2 = best2000mTimeSeconds; // seconds

    const cssMetersPerSecond = (distance2 - distance1) / (t2 - t1);
    const css = 100 / cssMetersPerSecond; // seconds per 100m

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

    const css = Math.round(180 - vdot * 1.5);
    return Math.max(80, Math.min(180, css));
}
