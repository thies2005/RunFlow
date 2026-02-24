import type { RaceDistance } from './vdot';

export const SHAPE_IMPACTS: Record<RaceDistance, number> = {
    '5K': 0.05,
    '10K': 0.08,
    'HALF': 0.15,
    'MARATHON': 0.30
};

/**
 * Calculates the shape penalty multiplier to apply to race predictions.
 * @param shapePercent - Current shape (0-100)
 * @param shapeImpact - Impact factor for the specific race distance
 * @param calibrationFactor - User-specific calibration multiplier (default 1.0)
 * @returns The penalty multiplier (e.g., 0.05 for a 5% penalty)
 */
export function calculateShapePenalty(
    shapePercent: number,
    shapeImpact: number,
    calibrationFactor: number = 1.0
): number {
    return (1 - Math.min(Math.max(shapePercent, 0), 100) / 100) * shapeImpact * calibrationFactor;
}

/**
 * Applies shape penalty to an optimal race time in seconds
 * @param optimalSeconds - Predicted time based purely on VO2max
 * @param shapePercent - Current shape (0-100)
 * @param distance - Type of race
 * @param calibrationFactor - User-specific calibration multiplier (default 1.0)
 */
export function applyShapePenalty(
    optimalSeconds: number,
    shapePercent: number,
    distance: RaceDistance,
    calibrationFactor: number = 1.0
): number {
    const impact = SHAPE_IMPACTS[distance] || 0;
    const penalty = calculateShapePenalty(shapePercent, impact, calibrationFactor);
    return optimalSeconds * (1 + penalty);
}
