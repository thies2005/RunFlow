/**
 * Goal Projection Calculator
 * 
 * Dynamically calculates projected goal times based on:
 * - Current effective VO2max
 * - Training plan settings (duration, frequency, volume)
 * - Current marathon shape percentage
 * - Race distance
 * 
 * Uses training science principles to estimate VDOT improvement
 * over the plan duration.
 */

import { predictRaceTime, type RaceDistance } from './vdot';

// ============================================
// Types and Interfaces
// ============================================

export interface PlanSettings {
    durationWeeks: number;      // Total plan duration in weeks
    runsPerWeek: number;        // Number of running sessions per week
    weeklyMileageGoal: number;  // Target peak weekly volume in km
    raceDistance: RaceDistance; // Target race distance
    taperWeeks?: number;        // Taper phase length
    peakWeeks?: number;         // Peak phase length
    buildWeeks?: number;        // Build phase length
}

export interface ProjectedGoalResult {
    optimalTime: number;        // Fastest possible (100% shape, full improvement)
    projectedTime: number;      // Realistic based on plan + current shape
    conservativeTime: number;   // Slower estimate (safety margin)
    projectedVdot: number;      // Expected VDOT at race time
    improvementPercent: number; // % improvement from current
}

// ============================================
// Constants
// ============================================

/** Maximum VDOT improvement cap (15%) to prevent unrealistic predictions */
const MAX_IMPROVEMENT_FACTOR = 1.15;

/** Base weekly improvement rate from training duration */
const DURATION_IMPROVEMENT_RATE = 0.008; // 0.8% per 4 weeks

/** Improvement bonus from higher running frequency */
const FREQUENCY_IMPROVEMENT_RATE = 0.02; // 2% per 4 runs/week

/** Improvement bonus from higher weekly volume */
const VOLUME_IMPROVEMENT_RATE = 0.015; // 1.5% per 50km/week

/** Shape impact multipliers by distance (matching runalyze.ts) */
const SHAPE_IMPACT: Record<RaceDistance, number> = {
    '5K': 0.05,     // 5% penalty at 0% shape
    '10K': 0.08,    // 8% penalty at 0% shape
    'HALF': 0.15,   // 15% penalty at 0% shape
    'MARATHON': 0.30, // 30% penalty at 0% shape
};

// ============================================
// Core Functions
// ============================================

/**
 * Calculate the progression coefficient based on training plan parameters
 * 
 * The coefficient represents expected VDOT improvement over the plan duration.
 * Based on training science: ~0.5-1% VO2max improvement per 4 weeks.
 * 
 * @param durationWeeks - Total weeks of training
 * @param runsPerWeek - Number of running sessions per week
 * @param weeklyVolumeKm - Target weekly volume in km
 * @returns Progression factor (1.0 = no improvement, 1.15 = 15% improvement max)
 */
export function calculateProgressionCoefficient(
    durationWeeks: number,
    runsPerWeek: number,
    weeklyVolumeKm: number
): number {
    // Guard against invalid inputs
    if (durationWeeks <= 0) return 1.0;

    // Calculate individual contribution factors
    // Duration: ~0.8% per 4 weeks of training
    const durationContribution = (durationWeeks / 4) * DURATION_IMPROVEMENT_RATE;

    // Frequency: Higher running frequency = better adaptation
    // Normalized around 4 runs/week
    const frequencyContribution = (runsPerWeek / 4) * FREQUENCY_IMPROVEMENT_RATE;

    // Volume: ~1.5% per 50km/week
    // This captures the aerobic development from higher mileage
    const volumeContribution = (weeklyVolumeKm / 50) * VOLUME_IMPROVEMENT_RATE;

    // Total progression factor
    const progressionFactor = 1 + durationContribution + frequencyContribution + volumeContribution;

    // Cap at maximum improvement to prevent unrealistic predictions
    return Math.min(progressionFactor, MAX_IMPROVEMENT_FACTOR);
}

/**
 * Calculate shape penalty for a given race distance
 * 
 * Reuses the same penalty structure as calculateAllRacePredictions in runalyze.ts
 * to ensure consistency across the application.
 * 
 * @param raceDistance - Target race distance
 * @param currentShapePercent - Current marathon shape percentage (0-100+)
 * @returns Penalty factor (0.0 at 100% shape, varies by distance at 0% shape)
 */
export function calculateShapePenalty(
    raceDistance: RaceDistance,
    currentShapePercent: number
): number {
    const shapeImpact = SHAPE_IMPACT[raceDistance] || 0.30;

    // Penalty decreases as shape increases
    // At 100% shape: penalty = 0
    // At 0% shape: penalty = shapeImpact (5-30% depending on distance)
    const penalty = (1 - Math.min(currentShapePercent, 100) / 100) * shapeImpact;

    return penalty;
}

/**
 * Calculate projected goal time based on current fitness and plan settings
 * 
 * This is the main entry point for the projection algorithm.
 * It combines:
 * 1. Current VO2max/VDOT
 * 2. Projected improvement from training plan
 * 3. Shape penalty for the target distance
 * 
 * @param currentVO2max - User's current effective VO2max
 * @param planSettings - Training plan configuration
 * @param currentShapePercent - Current marathon shape percentage (default 70)
 * @returns Projected goal times (optimal, realistic, conservative)
 */
export function calculateProjectedGoalTime(
    currentVO2max: number,
    planSettings: PlanSettings,
    currentShapePercent: number = 70
): ProjectedGoalResult {
    // Default result for invalid inputs
    if (currentVO2max <= 0 || planSettings.durationWeeks <= 0) {
        return {
            optimalTime: 0,
            projectedTime: 0,
            conservativeTime: 0,
            projectedVdot: 0,
            improvementPercent: 0,
        };
    }

    // Step 1: Calculate expected VDOT improvement from training
    const progressionFactor = calculateProgressionCoefficient(
        planSettings.durationWeeks,
        planSettings.runsPerWeek,
        planSettings.weeklyMileageGoal
    );

    // Step 2: Project future VDOT
    const projectedVdot = currentVO2max * progressionFactor;
    const improvementPercent = (progressionFactor - 1) * 100;

    // Step 3: Calculate optimal time (at 100% shape with full improvement)
    // This represents the theoretical best the athlete can achieve
    const optimalTime = predictRaceTime(projectedVdot, planSettings.raceDistance);

    // Step 4: Calculate projected time (accounting for realistic shape improvement)
    // We assume shape will improve somewhat but not to 100%
    // Use a "projected shape" that's halfway between current and 100%
    const projectedShape = Math.min(100, currentShapePercent + (100 - currentShapePercent) * 0.5);
    const projectedPenalty = calculateShapePenalty(planSettings.raceDistance, projectedShape);
    const projectedTime = Math.round(optimalTime * (1 + projectedPenalty));

    // Step 5: Calculate conservative time (assumes less improvement)
    // Use current shape with only half the VDOT improvement
    const conservativeVdot = currentVO2max * (1 + (progressionFactor - 1) * 0.5);
    const conservativeBase = predictRaceTime(conservativeVdot, planSettings.raceDistance);
    const conservativePenalty = calculateShapePenalty(planSettings.raceDistance, currentShapePercent);
    const conservativeTime = Math.round(conservativeBase * (1 + conservativePenalty));

    return {
        optimalTime: Math.round(optimalTime),
        projectedTime,
        conservativeTime,
        projectedVdot: Math.round(projectedVdot * 10) / 10,
        improvementPercent: Math.round(improvementPercent * 10) / 10,
    };
}

/**
 * Calculate duration in weeks from race date
 * 
 * Helper function to calculate plan duration from a race date.
 * 
 * @param raceDate - Target race date
 * @param startDate - Plan start date (defaults to today)
 * @returns Number of weeks until race
 */
export function calculateWeeksUntilRace(
    raceDate: Date,
    startDate: Date = new Date()
): number {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffMs = raceDate.getTime() - startDate.getTime();
    return Math.max(0, Math.floor(diffMs / msPerWeek));
}
