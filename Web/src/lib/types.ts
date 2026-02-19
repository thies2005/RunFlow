/**
 * Shared TypeScript types for RunFlow application
 * Replaces all 'any' types throughout the codebase
 */

import { ActivityType } from '@prisma/client';
export { ActivityType } from '@prisma/client';

// ============================================
// Activity Type Utilities (M-09)
// ============================================

/**
 * Normalize activity type to uppercase for consistent comparison
 * Use this instead of inline toUpperCase() calls for consistency
 */
export function normalizeActivityType(type: string | null | undefined): string {
    return (type || 'OTHER').toUpperCase();
}

/**
 * Check if activity type is a running activity
 */
export function isRunningActivity(type: string | null | undefined): boolean {
    const normalized = normalizeActivityType(type);
    return ['RUN', 'VIRTUAL_RUN', 'TRAIL_RUN'].includes(normalized);
}

/**
 * Check if activity type is a cycling activity
 */
export function isCyclingActivity(type: string | null | undefined): boolean {
    const normalized = normalizeActivityType(type);
    return ['RIDE', 'VIRTUAL_RIDE', 'CYCLING', 'INDOOR_CYCLING'].includes(normalized);
}

/**
 * Check if activity type is cross-training (non-running cardio)
 */
export function isCrossTrainingActivity(type: string | null | undefined): boolean {
    const normalized = normalizeActivityType(type);
    return isCyclingActivity(normalized) || isSwimmingActivity(normalized) || ['ROWING', 'ELLIPTICAL', 'WORKOUT'].includes(normalized);
}

/**
 * Check if activity type is a swimming activity
 */
export function isSwimmingActivity(type: string | null | undefined): boolean {
    const normalized = normalizeActivityType(type);
    return ['SWIM'].includes(normalized);
}

// ============================================
// Activity Types
// ============================================

/**
 * Activity data from the API/database
 */
export interface Activity {
    id: string;
    stravaId: bigint;
    userId: string;
    type: ActivityType;
    sportType: string | null;
    name: string;
    description: string | null;
    startDate: string | Date;
    timezone: string | null;
    distance: number;
    movingTime: number;
    elapsedTime: number;
    averageSpeed: number | null;
    maxSpeed: number | null;
    gradeAdjustedSpeed: number | null;
    averageHr: number | null;
    maxHr: number | null;
    averageCadence: number | null;
    hasHeartrate: boolean;
    totalElevation: number | null;
    elevHigh: number | null;
    elevLow: number | null;
    calories: number | null;
    trimp: number | null;
    runningTss: number | null;
    estimatedVdot: number | null;
    hrZone1Time: number | null;
    hrZone2Time: number | null;
    hrZone3Time: number | null;
    hrZone4Time: number | null;
    hrZone5Time: number | null;
    hrZone6Time: number | null;
    hrZone7Time: number | null;
    streams: ActivityStreams | null;
    trainingType: WorkoutType | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

/**
 * Activity streams data (GPS, HR, etc.) from Strava or Health Connect
 */
export interface ActivityStreams {
    time: number[];           // Seconds since start
    distance?: number[];       // Meters from start
    latlng?: [number, number][]; // GPS coordinates
    altitude?: number[];       // Elevation in meters
    heartrate?: number[];      // Heart rate in bpm
    cadence?: number[];        // Steps per minute (running)
    velocity_smooth?: number[]; // Smoothed speed m/s
    grade_smooth?: number[];   // Grade/slope percentage
    watts?: number[];          // Power in watts (if available)
}

/**
 * Lightweight activity type for calculations
 * Used by runalyze.ts metrics
 */
export interface ActivityForCalculation {
    startDate: string | Date;
    distance: number;
    movingTime: number;
    averageHr?: number | null;
    hasHeartrate: boolean;
    type?: string;
    hrZone2Time?: number | null;
    hrZone3Time?: number | null;
    hrZone4Time?: number | null;
}

// ============================================
// Goal Types
// ============================================

export type RaceType = 'FIVE_K' | 'TEN_K' | 'HALF_MARATHON' | 'MARATHON';

export interface Goal {
    id: string;
    userId: string;
    name: string;
    raceType: RaceType;
    raceDate: string | Date;
    targetTime: number | null;
    currentVdot: number | null;
    predictedTime: number | null;
    marathonShapeFactor: number;
    weeklyMileageGoal: number | null;
    planWeeks: number;
    runsPerWeek: number;
    ridesPerWeek: number;
    strengthPerWeek: number;
    swimsPerWeek: number;
    taperWeeks?: number;
    peakWeeks?: number;
    buildWeeks?: number;
    isActive: boolean;
    completedAt: string | Date | null;
    workouts?: Workout[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

// ============================================
// Workout Types
// ============================================

export type WorkoutType =
    | 'EASY'
    | 'LONG_RUN'
    | 'TEMPO'
    | 'INTERVALS'
    | 'REPETITIONS'
    | 'RECOVERY'
    | 'RACE'
    | 'REST'
    | 'CROSS_TRAIN'
    | 'RIDE'
    | 'SWIM'
    | 'STRENGTH'
    | 'OTHER';

export interface Workout {
    id: string;
    goalId: string;
    scheduledDate: string | Date;
    workoutType: WorkoutType;
    description: string;
    targetDistance: number | null;
    targetDuration: number | null;
    targetPace: number | null;
    targetHrZone: number | null;
    isCompleted: boolean;
    completedAt: string | Date | null;
    linkedActivityId: string | null;
}

/**
 * Workout with linked activity data included (for plan views)
 */
export interface WorkoutWithLinkedActivity extends Workout {
    linkedActivity?: {
        id: string;
        name: string;
        startDate: string | Date;
        distance: number;
        movingTime: number;
        averageSpeed: number | null;
        averageHr: number | null;
        type: string;
    } | null;
}

/**
 * Lightweight activity for list displays (dashboard, activity list)
 */
export interface ActivityListItem {
    id: string;
    stravaId: string;
    type: ActivityType;
    sportType: string | null;
    name: string;
    description: string | null;
    startDate: string;
    distance: number;
    movingTime: number;
    averageSpeed: number | null;
    maxSpeed: number | null;
    gradeAdjustedSpeed: number | null;
    averageHr: number | null;
    maxHr: number | null;
    hasHeartrate: boolean;
    totalElevation: number | null;
    elevHigh: number | null;
    elevLow: number | null;
    calories: number | null;
    trimp: number | null;
    runningTss: number | null;
    estimatedVdot: number | null;
    averageCadence: number | null;
    trainingType: WorkoutType | null;
    hrZone1Time: number | null;
    hrZone2Time: number | null;
    hrZone3Time: number | null;
    hrZone4Time: number | null;
    hrZone5Time: number | null;
    hrZone6Time: number | null;
    hrZone7Time: number | null;
}

// ============================================
// User Types
// ============================================

export interface UserSettings {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    hrMax: number | null;
    hrRest: number | null;
    weight: number | null;
    hrZone1Max: number;
    hrZone2Max: number;
    hrZone3Max: number;
    hrZone4Max: number;
    vdotCorrectionFactor: number;
}

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsStats {
    currentWeekMileage: number;
    effectiveVO2max: number;
    rawVO2max: number;
    vdotCorrectionFactor: number;
    marathonShape: MarathonShape;
    currentVdot: number | null;
    ctl: number;
    atl: number;
    tsb: number;
    workloadRatio: number;
    easyTrimp: number;
    hrMax?: number;
}

export interface MarathonShape {
    shape: number;
    mileageScore: number;
    longRunScore: number;
    crossTrainingScore: number;
    details: {
        avgWeeklyKm: number;
        targetWeeklyKm: number;
        longRunPoints: number;
        targetPoints: number;
        crossTrainingMinutes?: number;
    };
}

// ============================================
// API Response Types
// ============================================

export interface GoalsResponse {
    goals: Goal[];
}

export interface SyncStatus {
    syncInProgress: boolean;
    lastSyncAt: string | null;
    totalActivities: number;
}

export interface UnlinkedActivity {
    id: string;
    name: string;
    startDate: string | Date;
    distance: number;
    movingTime: number;
    averageHr: number | null;
    averageSpeed: number | null;
    type: string;
}

export interface PlanResponse {
    goal: (Goal & {
        workouts: WorkoutWithLinkedActivity[];
        planStartDate?: string | Date | null;
    }) | null;
    unlinkedActivities?: UnlinkedActivity[];
}

export interface ActivitiesResponse {
    activities: ActivityListItem[];
    total: number;
    limit: number;
    offset: number;
}

