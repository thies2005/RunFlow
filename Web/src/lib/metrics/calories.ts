/**
 * Calorie Calculator Module
 * 
 * Calculates calories burned during activities using:
 * 1. Heart Rate-based formula (PRIMARY) - More accurate when HR data available
 * 2. MET-based formula (BACKUP) - Used when HR data is not available
 * 
 * HR-based formulas from research (Keytel et al. 2005):
 * Male: Calories/min = (-55.0969 + 0.6309×HR + 0.1988×Weight + 0.2017×Age) / 4.184
 * Female: Calories/min = (-20.4022 + 0.4472×HR + 0.1263×Weight + 0.074×Age) / 4.184
 */

import type { Sex } from './trimp';
import { ActivityType } from '@/lib/types';

// ============================================
// Types
// ============================================

export interface CalorieInput {
    durationMinutes: number;
    activityType: ActivityType;
    weightKg?: number;
    averageHr?: number;
    age?: number;
    sex?: Sex;
    averageSpeedMps?: number; // meters per second
}

export interface CalorieResult {
    calories: number;
    method: 'hr' | 'met';
    confidence: 'high' | 'medium' | 'low';
}

// ============================================
// MET Values by Activity Type and Intensity
// ============================================

// MET values from Compendium of Physical Activities (Ainsworth et al.)
const MET_VALUES: Record<ActivityType, { light: number; moderate: number; vigorous: number }> = {
    RUN: { light: 7.0, moderate: 9.8, vigorous: 12.8 },
    RIDE: { light: 4.0, moderate: 8.0, vigorous: 12.0 },
    VIRTUAL_RIDE: { light: 4.0, moderate: 8.0, vigorous: 12.0 },
    SWIM: { light: 6.0, moderate: 8.0, vigorous: 10.0 },
    WALK: { light: 2.5, moderate: 3.5, vigorous: 5.0 },
    HIKE: { light: 5.0, moderate: 6.0, vigorous: 8.0 },
    WORKOUT: { light: 4.0, moderate: 6.0, vigorous: 8.0 },
    OTHER: { light: 3.0, moderate: 5.0, vigorous: 7.0 },
};

// Speed thresholds (m/s) to determine intensity
const SPEED_THRESHOLDS: Record<ActivityType, { moderate: number; vigorous: number }> = {
    RUN: { moderate: 2.5, vigorous: 3.5 },      // ~9 km/h moderate, ~12.6 km/h vigorous
    RIDE: { moderate: 5.5, vigorous: 8.5 },     // ~20 km/h moderate, ~30 km/h vigorous
    VIRTUAL_RIDE: { moderate: 5.5, vigorous: 8.5 },
    SWIM: { moderate: 0.5, vigorous: 1.0 },     // ~1.8 km/h moderate, ~3.6 km/h vigorous
    WALK: { moderate: 1.3, vigorous: 1.8 },     // ~4.7 km/h moderate, ~6.5 km/h vigorous
    HIKE: { moderate: 1.0, vigorous: 1.5 },
    WORKOUT: { moderate: 0, vigorous: 0 },      // No speed-based intensity
    OTHER: { moderate: 0, vigorous: 0 },
};

// ============================================
// Heart Rate-Based Calculation (PRIMARY)
// ============================================

const DEFAULT_AGE = 30;
const DEFAULT_WEIGHT_KG = 70;

/**
 * Calculate calories using heart rate-based formula
 * More accurate as it accounts for individual physiological response
 * 
 * Based on: Keytel et al. (2005) "Prediction of energy expenditure from heart rate"
 */
export function calculateCaloriesHr(
    durationMinutes: number,
    averageHr: number,
    weightKg: number,
    age: number,
    sex: Sex
): number {
    if (durationMinutes <= 0 || averageHr <= 0 || weightKg <= 0 || age <= 0) {
        return 0;
    }

    let caloriesPerMinute: number;

    if (sex === 'MALE') {
        // Male formula
        caloriesPerMinute = (-55.0969 + 0.6309 * averageHr + 0.1988 * weightKg + 0.2017 * age) / 4.184;
    } else {
        // Female formula (also used for OTHER)
        caloriesPerMinute = (-20.4022 + 0.4472 * averageHr + 0.1263 * weightKg + 0.074 * age) / 4.184;
    }

    // Ensure non-negative
    caloriesPerMinute = Math.max(0, caloriesPerMinute);

    return Math.round(caloriesPerMinute * durationMinutes);
}

// ============================================
// MET-Based Calculation (BACKUP)
// ============================================

/**
 * Determine activity intensity based on speed
 */
export function getIntensityFromSpeed(
    activityType: ActivityType,
    averageSpeedMps?: number
): 'light' | 'moderate' | 'vigorous' {
    if (!averageSpeedMps || averageSpeedMps <= 0) {
        return 'moderate'; // Default to moderate if no speed data
    }

    const thresholds = SPEED_THRESHOLDS[activityType];

    if (thresholds.vigorous > 0 && averageSpeedMps >= thresholds.vigorous) {
        return 'vigorous';
    }
    if (thresholds.moderate > 0 && averageSpeedMps >= thresholds.moderate) {
        return 'moderate';
    }
    return 'light';
}

/**
 * Calculate calories using MET-based formula
 * Calories = METs × Weight (kg) × Duration (hours)
 */
export function calculateCaloriesMet(
    durationMinutes: number,
    activityType: ActivityType,
    weightKg: number,
    intensity: 'light' | 'moderate' | 'vigorous' = 'moderate'
): number {
    if (durationMinutes <= 0 || weightKg <= 0) {
        return 0;
    }

    const mets = MET_VALUES[activityType]?.[intensity] ?? MET_VALUES.OTHER[intensity];
    const durationHours = durationMinutes / 60;

    return Math.round(mets * weightKg * durationHours);
}

// ============================================
// Main Calculation Function
// ============================================

/**
 * Calculate calories burned during an activity
 * Uses HR-based formula when heart rate data is available (more accurate)
 * Falls back to MET-based calculation otherwise
 */
export function calculateCalories(input: CalorieInput): CalorieResult {
    const {
        durationMinutes,
        activityType,
        weightKg = DEFAULT_WEIGHT_KG,
        averageHr,
        age = DEFAULT_AGE,
        sex = 'MALE',
        averageSpeedMps,
    } = input;

    // Validate duration
    if (durationMinutes <= 0) {
        return { calories: 0, method: 'met', confidence: 'low' };
    }

    // Primary: HR-based calculation (when HR data available)
    if (averageHr && averageHr > 0) {
        const calories = calculateCaloriesHr(
            durationMinutes,
            averageHr,
            weightKg,
            age,
            sex
        );

        // High confidence if we have user's weight
        const hasPersonalData = input.weightKg !== undefined && input.age !== undefined;

        return {
            calories,
            method: 'hr',
            confidence: hasPersonalData ? 'high' : 'medium',
        };
    }

    // Backup: MET-based calculation
    const intensity = getIntensityFromSpeed(activityType, averageSpeedMps);
    const calories = calculateCaloriesMet(durationMinutes, activityType, weightKg, intensity);

    return {
        calories,
        method: 'met',
        confidence: input.weightKg !== undefined ? 'medium' : 'low',
    };
}

/**
 * Get MET value for an activity type and intensity
 * Useful for display or debugging
 */
export function getMetValue(
    activityType: ActivityType,
    intensity: 'light' | 'moderate' | 'vigorous' = 'moderate'
): number {
    return MET_VALUES[activityType]?.[intensity] ?? MET_VALUES.OTHER[intensity];
}

/**
 * Estimate age from birth date
 */
export function calculateAge(birthDate: Date | null | undefined): number {
    if (!birthDate) return DEFAULT_AGE;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return Math.max(1, age);
}
