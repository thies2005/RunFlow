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

// ---------------------------------------------------------------------------
// Pace windows from a CSS anchor (master workflow task A2)
// ---------------------------------------------------------------------------

export type SwimPaceWindow = { min: number; max: number; label: string };

export interface SwimPaces {
    /** Easy / recovery band — slower than CSS. */
    easy: SwimPaceWindow;
    /** Steady endurance band, just above easy. */
    steady: SwimPaceWindow;
    /** Critical Swim Speed / threshold band. */
    threshold: SwimPaceWindow;
    /** Interval band — faster than CSS. */
    interval: SwimPaceWindow;
}

const FALLBACK_CSS_SEC_PER_100M = 120;

/**
 * Training pace windows (seconds per 100m) derived from a Critical Swim Speed
 * anchor. Mirrors the zone offsets `calculateSwimCSS` has always produced
 * (easy = CSS + 8..10, interval = CSS − 6..4) so every consumer shares one
 * convention. Paces are `sec/100m`, so a HIGHER number is SLOWER: `min` is the
 * fast end of each window and `max` the slow end.
 *
 * Falls back to a neutral 2:00/100m CSS when the input is not a positive
 * finite number (never throws).
 */
export function calculateSwimPaces(swimCssSecPer100m: number | null | undefined): SwimPaces {
    const raw = typeof swimCssSecPer100m === 'number' && Number.isFinite(swimCssSecPer100m) && swimCssSecPer100m > 0
        ? swimCssSecPer100m
        : FALLBACK_CSS_SEC_PER_100M;
    const css = Math.round(raw);

    const window = (min: number, max: number, label: string): SwimPaceWindow => ({
        min: Math.max(20, Math.round(min)),
        max: Math.max(Math.max(20, Math.round(min)), Math.round(max)),
        label,
    });

    return {
        easy: window(css + 8, css + 10, 'Swim Easy'),
        steady: window(css + 2, css + 5, 'Swim Endurance'),
        threshold: window(css, css + 2, 'CSS'),
        interval: window(Math.max(20, css - 6), Math.max(20, css - 4), 'Swim Interval'),
    };
}
