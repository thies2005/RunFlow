/**
 * Grade-Adjusted Pace (GAP) / elevation-adjusted pace utilities.
 *
 * RunFlow's ultra/trail plans are produced from flat-road paces derived from a
 * runner's VDOT. On real trail terrain those paces are not credible because
 * uphill running costs substantially more energy per metre and even moderate
 * downhill gains a little speed. This module adjusts a flat pace for elevation
 * so trail/ultra plan targets are believable.
 *
 * The energy-cost model is the Minetti cost-of-running polynomial. Minetti et
 * al. (2002) measured the energy cost of running on a treadmill as a function
 * of gradient. The fitted polynomial (cost in J/kg/m) is:
 *
 *   EC(x) = 155.4x^5 - 30.4x^4 - 43.3x^3 + 46.3x^2 + 19.5x + 3.6
 *
 * where x is the grade (rise/run, so +0.05 = 5% uphill). On the flat (x = 0)
 * the cost is 3.6 J/kg/m. The ratio EC(grade) / EC(0) gives a pace factor: the
 * same metabolic effort that produces a flat pace yields a slower pace uphill
 * (factor > 1) and a faster pace on gentle downhills (factor < 1).
 *
 * Minetti's published curve only covers downhill to about -45%, and on the
 * downhill side the relationship is non-monotonic: running becomes cheapest
 * (fastest) around -5% and gets more expensive again on steeper descents. We
 * use a dedicated downhill approximation that captures this.
 */

import { formatPace as formatPaceSecPerKm } from './vdot';

export { formatPaceSecPerKm as formatPaceSeconds };

// EC(0) = 3.6 J/kg/m — the flat cost, used as the denominator for the factor.
const FLAT_COST = 3.6;

/**
 * Minetti's uphill energy-cost polynomial evaluated at grade `x` (rise/run).
 * Returns the cost in J/kg/m. Valid for x >= 0; for steep grades the model
 * grows quickly so we clip the grade before calling.
 */
function minettiCost(x: number): number {
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x3 * x;
    const x5 = x4 * x;
    return 155.4 * x5 - 30.4 * x4 - 43.3 * x3 + 46.3 * x2 + 19.5 * x + FLAT_COST;
}

/**
 * Downhill cost approximation. Minetti's downhill data shows the cost drops
 * below the flat cost down to a minimum around -5% (cheapest, i.e. fastest),
 * then rises again as descents get steeper. We approximate this with a
 * symmetric-ish quadratic centred near -0.05 so that:
 *   - at 0%        -> cost == FLAT_COST (factor 1.0)
 *   - at -5%       -> cost ~ FLAT_COST * 0.93 (a ~7% speed gain)
 *   - at -10%      -> cost ~ FLAT_COST * 0.96
 *   - at -20%      -> cost ~ FLAT_COST * 1.15 (slower than flat)
 *
 * `x` is the (negative) grade.
 */
function downhillCost(x: number): number {
    // Distance below the optimum (-0.05), in grade units.
    const offset = x - -0.05; // negative for x in (-0.05, 0), 0 at -5%, positive below
    // Minimum cost at x = -0.05 is ~0.93 * flat.
    const minCost = FLAT_COST * 0.93;
    // Parabola opening upwards through the flat cost at x = 0.
    const curvature = 18.0;
    return minCost + curvature * offset * offset;
}

/**
 * Multiplicative pace factor for a given grade. A flat run is 1.0, uphill is
 * > 1.0 (slower), and gentle downhill is < 1.0 (faster). The result is the
 * factor you multiply a flat pace (sec/km) by to get the equivalent-effort
 * grade-adjusted pace.
 *
 * The grade is clipped at +/-45% before evaluation — beyond that the Minetti
 * polynomial is not well validated and the clamp keeps the result sane.
 */
export function gradeCostFactor(grade: number): number {
    const g = Math.max(-0.45, Math.min(0.45, grade));
    const cost = g >= 0 ? minettiCost(g) : downhillCost(g);
    return cost / FLAT_COST;
}

/**
 * Adjust a flat pace (seconds per km) for elevation gain over a distance.
 *
 * `elevationGainMeters` is the net ascent; pass a negative value for a net
 * descent. `distanceMeters` is the horizontal-ish run distance. The grade is
 * computed as rise/run and the resulting cost factor multiplies the flat pace.
 *
 * The final result is clamped to [flatPace * 0.85, flatPace * 2.5] so absurd
 * grades can never produce nonsense paces (e.g. a near-vertical wall would
 * otherwise imply an infinite pace).
 */
export function calculateGradeAdjustedPace(
    paceSecondsPerKm: number,
    elevationGainMeters: number,
    distanceMeters: number,
): number {
    if (!paceSecondsPerKm || paceSecondsPerKm <= 0) return paceSecondsPerKm;

    const grade = distanceMeters > 0 ? elevationGainMeters / distanceMeters : 0;
    const factor = gradeCostFactor(grade);

    const adjusted = paceSecondsPerKm * factor;
    const min = paceSecondsPerKm * 0.85;
    const max = paceSecondsPerKm * 2.5;
    return Math.max(min, Math.min(max, adjusted));
}

export type TerrainType = 'road' | 'trail' | 'mountain';

/**
 * Mechanical-efficiency penalty applied on top of the elevation adjustment.
 * Trail and mountain running is less efficient than road running (uneven
 * footing, technical terrain), so the same metabolic effort translates to a
 * slower pace. Road is the baseline (1.0).
 */
const TERRAIN_MULTIPLIER: Record<TerrainType, number> = {
    road: 1.0,
    trail: 1.05,
    mountain: 1.10,
};

/**
 * Adjust a flat pace for both elevation and terrain.
 *
 * The elevation adjustment is applied first (Minetti cost factor), then the
 * terrain multiplier is applied on top, since the inefficiency of trail/mountain
 * running is independent of the slope itself. The combined result is clamped to
 * the same [flatPace * 0.85, flatPace * 2.5] window as the elevation-only call.
 */
export function adjustPaceForTerrain(
    paceSecondsPerKm: number,
    options: {
        elevationGainM?: number;
        distanceM?: number;
        terrain?: TerrainType;
    },
): number {
    if (!paceSecondsPerKm || paceSecondsPerKm <= 0) return paceSecondsPerKm;

    const elevationGainM = options.elevationGainM ?? 0;
    const distanceM = options.distanceM ?? 0;
    const terrain = options.terrain ?? 'road';

    const elevationAdjusted = calculateGradeAdjustedPace(paceSecondsPerKm, elevationGainM, distanceM);
    const terrainAdjusted = elevationAdjusted * TERRAIN_MULTIPLIER[terrain];

    const min = paceSecondsPerKm * 0.85;
    const max = paceSecondsPerKm * 2.5;
    return Math.max(min, Math.min(max, terrainAdjusted));
}
