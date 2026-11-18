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
