/**
 * Runalyze-style metrics: Effective VO2max and Marathon Shape
 * Based on the Runalyze methodology for predicting race performance
 */

import { calculateVdot, predictRaceTime, type RaceDistance } from './vdot';

// ============================================
// Constants (extracted magic numbers)
// ============================================

/** Minimum activity distance in meters for inclusion in VO2max calculations */
const MIN_DISTANCE_FOR_CALCULATION = 3000; // 3km

/** Minimum activity duration in seconds for inclusion in calculations */
const MIN_DURATION_FOR_CALCULATION = 720; // 12 minutes

/** Minimum Heart Rate percentage (of maxHR) for inclusion in VO2max calculation */
const MIN_HR_PERCENT_FOR_CALCULATION = 0.60;

/** Daily decay factor for time-weighted averages (5% per day) */
const DAILY_DECAY_FACTOR = 0.95;

/** Minimum long run distance in meters for marathon shape scoring */
const MIN_LONG_RUN_DISTANCE = 13000; // 13km

/** Maximum shape penalty for marathon predictions (30% slower at 0% shape) */
const MAX_MARATHON_SHAPE_PENALTY = 0.30;

/** Maximum shape penalty for half marathon predictions (15% slower at 0% shape) */
const MAX_HALF_SHAPE_PENALTY = 0.15;

/** Target long run points for 100% shape score */
const TARGET_LONG_RUN_POINTS = 10;

/** Target weekly cross-training minutes for 100% score */
const TARGET_CROSS_TRAINING_WEEKLY_MINUTES = 300;

/**
 * Activity data needed for calculations
 */
export type ActivityForShape = {
    startDate: string | Date;
    distance: number;      // meters
    movingTime: number;    // seconds
    averageHr?: number | null;
    hasHeartrate: boolean;
    type?: string;           // Activity type (RUN, RIDE, SWIM, etc.)
    hrZone2Time?: number;    // seconds in Zone 2
    hrZone3Time?: number;    // seconds in Zone 3  
    hrZone4Time?: number;    // seconds in Zone 4
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
    // Sanitize inputs: discard very short runs or low intensity efforts
    if (
        timeSeconds < MIN_DURATION_FOR_CALCULATION ||
        distanceMeters < MIN_DISTANCE_FOR_CALCULATION ||
        avgHR <= 0 ||
        maxHR <= 0
    ) {
        return 0;
    }

    const hrPercent = avgHR / maxHR;
    if (hrPercent < MIN_HR_PERCENT_FOR_CALCULATION) {
        return 0;
    }

    const timeMinutes = timeSeconds / 60;
    const velocity = distanceMeters / timeMinutes; // m/min

    // Oxygen cost at this velocity (Daniels/Gilbert formula)
    // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
    const vo2Cost = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);

    // %VO2max is approximately linear with %HRmax
    // %VO2max ≈ 1.5 * (%HRmax - 0.5) (simplified approximation)
    // More accurate: %VO2max = 0.64 + 0.36 * %HRmax (for trained athletes)
    const percentVO2max = 0.64 + 0.36 * hrPercent;

    // Guard: prevent division by zero or near-zero
    if (percentVO2max <= 0.1) {
        return 0;
    }

    // Effective VO2max = VO2 cost / %VO2max
    const effectiveVO2max = vo2Cost / percentVO2max;

    return Math.max(0, Math.round(effectiveVO2max * 10) / 10);
}

/**
 * Calculate General Aerobic Score from cross-training activities
 * Sums time in Z2-Z4 from non-running activities (cycling, swimming, etc.)
 * 
 * @param activities - Array of cross-training activities with zone data
 * @param lookbackDays - Days to look back (default 90)
 * @returns Score normalized to 0-100 (target: ~300 min/week aerobic work)
 */
export function calculateGeneralAerobicScore(
    activities: ActivityForShape[],
    lookbackDays: number = 90
): { score: number; totalMinutes: number; activityTypes: string[] } {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    // Filter to non-running activities within the lookback period
    const runningTypes = ['RUN', 'VIRTUAL_RUN', 'TRAIL_RUN'];
    const relevantActivities = activities.filter(a => {
        const activityDate = new Date(a.startDate);
        const type = a.type?.toUpperCase() || '';
        return activityDate >= cutoffDate && !runningTypes.includes(type);
    });

    // Sum Z2, Z3, Z4 time (in seconds)
    let totalZoneSeconds = 0;
    const activityTypesSet = new Set<string>();

    relevantActivities.forEach(a => {
        const z2 = a.hrZone2Time || 0;
        const z3 = a.hrZone3Time || 0;
        const z4 = a.hrZone4Time || 0;
        totalZoneSeconds += (z2 + z3 + z4);
        if (a.type) activityTypesSet.add(a.type);
    });

    const totalMinutes = totalZoneSeconds / 60;
    const weeksInPeriod = lookbackDays / 7;
    const avgWeeklyMinutes = totalMinutes / weeksInPeriod;

    // Target: 300 min/week of aerobic cross-training = 100%
    // This represents ~5 hours/week which is a substantial cross-training load
    const targetWeeklyMinutes = 300;
    const score = Math.min(100, (avgWeeklyMinutes / targetWeeklyMinutes) * 100);

    return {
        score: Math.round(score),
        totalMinutes: Math.round(totalMinutes),
        activityTypes: Array.from(activityTypesSet)
    };
}

/**
 * Calculate Marathon Shape percentage
 * Combines weekly mileage (50%), long run points (25%), and cross-training (25%)
 * When no cross-training is provided, falls back to original 66.7% / 33.3% split
 * 
 * @param runActivities - Array of running activities from last 6 months
 * @param effectiveVO2max - Current effective VO2max
 * @param crossTrainingActivities - Optional array of cross-training activities with zone data
 * @param crossTrainingCoefficient - Coefficient for cross-training contribution (default 0.5)
 * @returns Shape percentage (capped at 100%)
 */
export function calculateMarathonShape(
    runActivities: ActivityForShape[],
    effectiveVO2max: number,
    crossTrainingActivities?: ActivityForShape[],
    crossTrainingCoefficient: number = 0.5
): { shape: number; mileageScore: number; longRunScore: number; crossTrainingScore: number; details: ShapeDetails } {
    if (!runActivities.length || effectiveVO2max <= 0) {
        return {
            shape: 0,
            mileageScore: 0,
            longRunScore: 0,
            crossTrainingScore: 0,
            details: { avgWeeklyKm: 0, targetWeeklyKm: 0, longRunPoints: 0, targetPoints: 10, crossTrainingMinutes: 0 }
        };
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
    const tenWeeksAgo = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);

    // Filter activities
    const last6Months = runActivities.filter(a => new Date(a.startDate) >= sixMonthsAgo);
    const last10Weeks = runActivities.filter(a => new Date(a.startDate) >= tenWeeksAgo);

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

    // === CROSS-TRAINING COMPONENT ===
    // Calculate aerobic contribution from non-running activities
    let crossTrainingScore = 0;
    let crossTrainingMinutes = 0;
    if (crossTrainingActivities && crossTrainingActivities.length > 0) {
        const aerobicResult = calculateGeneralAerobicScore(crossTrainingActivities, 90);
        crossTrainingScore = aerobicResult.score;
        crossTrainingMinutes = aerobicResult.totalMinutes;
    }

    // === COMBINED SHAPE ===
    // With cross-training: 50% mileage + 25% long runs + 25% cross-training (with coefficient)
    // Without cross-training: 66.7% mileage + 33.3% long runs (original behavior)
    let shape: number;
    if (crossTrainingActivities && crossTrainingActivities.length > 0) {
        // Apply coefficient to cross-training contribution
        const effectiveCrossTraining = crossTrainingScore * crossTrainingCoefficient;
        // New weighted formula: Run volume (50%) + Long runs (25%) + Cross-training (25%)
        shape = (mileageScore * 0.50) + (longRunScore * 0.25) + (effectiveCrossTraining * 0.25);
    } else {
        // Original formula when no cross-training data available
        shape = (mileageScore * 2 / 3) + (longRunScore * 1 / 3);
    }

    // Cap at 100%
    shape = Math.min(100, Math.round(shape));

    return {
        shape,
        mileageScore: Math.round(mileageScore),
        longRunScore: Math.round(longRunScore),
        crossTrainingScore: Math.round(crossTrainingScore),
        details: {
            avgWeeklyKm: Math.round(avgWeeklyKm * 10) / 10,
            targetWeeklyKm: Math.round(targetWeeklyKm),
            longRunPoints: Math.round(longRunPoints * 10) / 10,
            targetPoints,
            crossTrainingMinutes: Math.round(crossTrainingMinutes)
        }
    };
}

export type ShapeDetails = {
    avgWeeklyKm: number;
    targetWeeklyKm: number;
    longRunPoints: number;
    targetPoints: number;
    crossTrainingMinutes?: number;
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

    // Clamp to reasonable range (allow negative for faster-than-optimal performance)
    return Math.max(-2.0, Math.min(2.0, Math.round(factor * 100) / 100));
}

/**
 * Calculate weighted average effective VO2max from multiple activities
 * Recent activities weighted more heavily
 */
export function calculateWeightedEffectiveVO2max(
    activities: ActivityForShape[],
    maxHR: number,
    calibrationFactor: number = 1.0
): number {
    const validActivities = activities.filter(a => {
        if (!a.hasHeartrate || !a.averageHr || a.averageHr <= 0) return false;

        const hrPercent = a.averageHr / maxHR;

        return (
            a.distance >= MIN_DISTANCE_FOR_CALCULATION &&
            a.movingTime >= MIN_DURATION_FOR_CALCULATION &&
            hrPercent >= MIN_HR_PERCENT_FOR_CALCULATION
        );
    });

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

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * calibrationFactor * 10) / 10 : 0;
}
