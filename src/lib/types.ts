/**
 * Shared TypeScript types for RunFlow application
 * Replaces all 'any' types throughout the codebase
 */

import { ActivityType as PrismaActivityType } from '@prisma/client';

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
    type: PrismaActivityType;
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
    hasHeartrate: boolean;
    totalElevation: number | null;
    elevHigh: number | null;
    elevLow: number | null;
    trimp: number | null;
    runningTss: number | null;
    estimatedVdot: number | null;
    hrZone1Time: number | null;
    hrZone2Time: number | null;
    hrZone3Time: number | null;
    hrZone4Time: number | null;
    hrZone5Time: number | null;
    streams: any | null; // Using any for Json type, or could define a more specific type
    trainingType: WorkoutType | null;
    createdAt: string | Date;
    updatedAt: string | Date;
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

export interface ActivitiesResponse {
    activities: Activity[];
    total?: number;
}

export interface GoalsResponse {
    goals: Goal[];
}

export interface SyncStatus {
    syncInProgress: boolean;
    lastSyncAt: string | null;
    totalActivities: number;
}
