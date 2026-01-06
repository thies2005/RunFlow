/**
 * Runalyze-style metrics: Effective VO2max and Marathon Shape
 * Based on the Runalyze methodology for predicting race performance
 */

import { calculateVdot, predictRaceTime, type RaceDistance } from './vdot';

/**
 * Activity data needed for calculations
 */
export type ActivityForShape = {
    startDate: string | Date;
    distance: number;      // meters
    movingTime: number;    // seconds
    averageHr?: number | null;
    hasHeartrate: boolean;
};

/**
 * Calculate Effective VO2max from a single run
 * Uses pace and heart rate to estimate VO2max accounting for running economy
 * 
 * @param distanceMeters - Distance in meters
 * @param timeSeconds - Time in seconds
 * @param avgHR - Average heart rate during run
 * @param maxHR - Athlete's maximum heart rate
 * @returns Effective VO2max estimate
 */
export function calculateEffectiveVO2max(
    distanceMeters: number,
    timeSeconds: number,
    avgHR: number,
    maxHR: number
): number {
    if (timeSeconds <= 0 || distanceMeters <= 0 || avgHR <= 0 || maxHR <= 0) {
        return 0;
    }

    const timeMinutes = timeSeconds / 60;
    const velocity = distanceMeters / timeMinutes; // m/min

    // Oxygen cost at this velocity (Daniels/Gilbert formula)
    // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
    const vo2Cost = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);

    // %HRmax = avgHR / maxHR
    const percentHRmax = avgHR / maxHR;

    // %VO2max is approximately linear with %HRmax
    // %VO2max ≈ 1.5 * (%HRmax - 0.5) (simplified approximation)
    // More accurate: %VO2max = 0.64 + 0.36 * %HRmax (for trained athletes)
    const percentVO2max = 0.64 + 0.36 * percentHRmax;

    // Effective VO2max = VO2 cost / %VO2max
    const effectiveVO2max = vo2Cost / percentVO2max;

    return Math.max(0, Math.round(effectiveVO2max * 10) / 10);
}

/**
 * Calculate Marathon Shape percentage
 * Combines weekly mileage (66.7%) and long run points (33.3%)
 * 
 * @param activities - Array of activities from last 6 months
 * @param effectiveVO2max - Current effective VO2max
 * @returns Shape percentage (0-100+, can exceed 100% if overtrained)
 */
export function calculateMarathonShape(
    activities: ActivityForShape[],
    effectiveVO2max: number
): { shape: number; mileageScore: number; longRunScore: number; details: ShapeDetails } {
    if (!activities.length || effectiveVO2max <= 0) {
        return {
            shape: 0,
            mileageScore: 0,
            longRunScore: 0,
            details: { avgWeeklyKm: 0, targetWeeklyKm: 0, longRunPoints: 0, targetPoints: 10 }
        };
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
    const tenWeeksAgo = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);

    // Filter activities
    const last6Months = activities.filter(a => new Date(a.startDate) >= sixMonthsAgo);
    const last10Weeks = activities.filter(a => new Date(a.startDate) >= tenWeeksAgo);

    // === MILEAGE COMPONENT (66.7%) ===
    // Target: VO2max value in km per week (e.g., VO2max 50 → 50 km/week)
    const targetWeeklyKm = effectiveVO2max;

    // Calculate average weekly distance over 6 months (26 weeks)
    const totalDistanceKm = last6Months.reduce((sum, a) => sum + a.distance / 1000, 0);
    const weeksInPeriod = 26;
    const avgWeeklyKm = totalDistanceKm / weeksInPeriod;

    // Mileage score as percentage of target (capped at 120%)
    const mileageScore = Math.min(120, (avgWeeklyKm / targetWeeklyKm) * 100);

    // === LONG RUN COMPONENT (33.3%) ===
    // Score runs over 13km, need 10 points total
    // Points awarded exponentially for distance, decay over time
    const longRuns = last10Weeks.filter(a => a.distance >= 13000);

    let longRunPoints = 0;
    longRuns.forEach(run => {
        const distKm = run.distance / 1000;
        const daysAgo = (now.getTime() - new Date(run.startDate).getTime()) / (24 * 60 * 60 * 1000);

        // Points formula: exponential for distance, decay for recency
        // Base: 0.5 points at 13km, ~1.1 at 30km, ~1.8 at 35km
        const basePoints = Math.pow((distKm - 13) / 10, 1.5) * 0.5 + 0.5;

        // Time decay: lose 2% per day
        const decayFactor = Math.pow(0.98, daysAgo);

        longRunPoints += basePoints * decayFactor;
    });

    const targetPoints = 10;
    const longRunScore = Math.min(120, (longRunPoints / targetPoints) * 100);

    // === COMBINED SHAPE ===
    // 66.7% mileage + 33.3% long runs
    const shape = Math.round((mileageScore * 2 / 3) + (longRunScore * 1 / 3));

    return {
        shape,
        mileageScore: Math.round(mileageScore),
        longRunScore: Math.round(longRunScore),
        details: {
            avgWeeklyKm: Math.round(avgWeeklyKm * 10) / 10,
            targetWeeklyKm: Math.round(targetWeeklyKm),
            longRunPoints: Math.round(longRunPoints * 10) / 10,
            targetPoints
        }
    };
}

export type ShapeDetails = {
    avgWeeklyKm: number;
    targetWeeklyKm: number;
    longRunPoints: number;
    targetPoints: number;
};

/**
 * Calculate predicted marathon time adjusted by shape and calibration
 * Predicted is ALWAYS >= Optimal (low shape = slower prediction)
 * 
 * @param effectiveVO2max - Current VO2max
 * @param shapePercent - Marathon shape percentage (0-100+)
 * @param calibrationFactor - Adjusts shape effect (1.0 = normal, >1 = more conservative)
 */
export function calculatePredictedTimes(
    effectiveVO2max: number,
    shapePercent: number,
    calibrationFactor: number = 1.0
): { optimal: number; predicted: number } {
    if (effectiveVO2max <= 0) {
        return { optimal: 0, predicted: 0 };
    }

    // Optimal time is based purely on VO2max (your ceiling)
    const optimalSeconds = predictRaceTime(effectiveVO2max, 'MARATHON');

    // Shape penalty: how much slower than optimal
    // At shape 100%: penalty = 0 (you can hit optimal)
    // At shape 50%: penalty = 0.15 (15% slower)
    // At shape 0%: penalty = 0.30 (30% slower)
    const baseShapePenalty = (1 - Math.min(shapePercent, 100) / 100) * 0.30;

    // Calibration adjusts the penalty (>1 = more conservative, slower predictions)
    const adjustedPenalty = baseShapePenalty * calibrationFactor;

    // Predicted = Optimal + Penalty (always slower or equal)
    const predictedSeconds = optimalSeconds * (1 + adjustedPenalty);

    return {
        optimal: Math.round(optimalSeconds),
        predicted: Math.round(predictedSeconds)
    };
}

/**
 * Calculate race predictions for all common distances
 */
export function calculateAllRacePredictions(
    effectiveVO2max: number,
    shapePercent: number,
    calibrationFactor: number = 1.0
): { distance: string; optimal: number; predicted: number }[] {
    if (effectiveVO2max <= 0) return [];

    const distances: { name: string; key: RaceDistance; shapeImpact: number }[] = [
        { name: '5K', key: '5K', shapeImpact: 0.05 },
        { name: '10K', key: '10K', shapeImpact: 0.08 },
        { name: 'Half', key: 'HALF', shapeImpact: 0.15 },
        { name: 'Marathon', key: 'MARATHON', shapeImpact: 0.30 },
    ];

    return distances.map(d => {
        const optimal = predictRaceTime(effectiveVO2max, d.key);
        const penalty = (1 - Math.min(shapePercent, 100) / 100) * d.shapeImpact * calibrationFactor;
        const predicted = optimal * (1 + penalty);

        return {
            distance: d.name,
            optimal: Math.round(optimal),
            predicted: Math.round(predicted),
        };
    });
}

/**
 * Solve for calibration factor given a Race Result
 * Returns factor > 1 if you ran slower than predicted (more conservative)
 * Returns factor < 1 if you ran faster than predicted (more aggressive)
 */
export function solveCalibrationFactor(
    effectiveVO2max: number,
    shapePercent: number,
    actualRaceTimeSeconds: number,
    raceDistance: 'MARATHON' | 'HALF' = 'MARATHON'
): number {
    if (effectiveVO2max <= 0 || actualRaceTimeSeconds <= 0) return 1.0;

    const optimalSeconds = predictRaceTime(effectiveVO2max, raceDistance);
    const shapeImpact = raceDistance === 'MARATHON' ? 0.30 : 0.15;

    // Base predicted (without calibration)
    const baseShapePenalty = (1 - Math.min(shapePercent, 100) / 100) * shapeImpact;
    const basePredictedSeconds = optimalSeconds * (1 + baseShapePenalty);

    // If actual == basePredicted, factor = 1.0
    // If actual > basePredicted (slower), factor > 1.0
    // If actual < basePredicted (faster), factor < 1.0

    // We need: optimalSeconds * (1 + baseShapePenalty * factor) = actualRaceTimeSeconds
    // Solve for factor:
    if (baseShapePenalty === 0) return 1.0; // Can't calibrate if shape is 100%

    const requiredPenalty = (actualRaceTimeSeconds / optimalSeconds) - 1;
    const factor = requiredPenalty / baseShapePenalty;

    // Clamp to reasonable range
    return Math.max(0.5, Math.min(2.0, Math.round(factor * 100) / 100));
}

/**
 * Calculate weighted average effective VO2max from multiple activities
 * Recent activities weighted more heavily
 */
export function calculateWeightedEffectiveVO2max(
    activities: ActivityForShape[],
    maxHR: number
): number {
    const validActivities = activities.filter(a =>
        a.hasHeartrate &&
        a.averageHr &&
        a.averageHr > 0 &&
        a.distance >= 3000 && // At least 3km
        a.movingTime >= 600   // At least 10 minutes
    );

    if (!validActivities.length || maxHR <= 0) return 0;

    const now = new Date();
    let weightedSum = 0;
    let totalWeight = 0;

    validActivities.forEach(a => {
        const vo2 = calculateEffectiveVO2max(
            a.distance,
            a.movingTime,
            a.averageHr!,
            maxHR
        );

        if (vo2 > 0) {
            // Weight by recency: more recent = higher weight
            const daysAgo = (now.getTime() - new Date(a.startDate).getTime()) / (24 * 60 * 60 * 1000);
            const weight = Math.pow(0.95, daysAgo); // 5% decay per day

            weightedSum += vo2 * weight;
            totalWeight += weight;
        }
    });

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
}
