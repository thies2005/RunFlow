/**
 * Mobile API Type Definitions
 * 
 * Shared types for mobile-specific API requests and responses.
 */

import { ActivityType, RaceType, WorkoutType, PlanPhase } from '@/generated/prisma/browser';

export interface MobileUser {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    sex?: string | null;
    birthDate?: string | null;
    hrMax?: number | null;
    hrRest?: number | null;
    weight?: number | null;
    height?: number | null;
    vdotCorrectionFactor?: number | null;
    lastSyncAt?: string | null;
    createdAt?: string;
}

export interface MobileAuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    user: MobileUser;
}

export interface MobileStats {
    currentWeekMileage: number;
    effectiveVO2max: number;
    rawVO2max: number;
    vdotCorrectionFactor: number;
    marathonShape: {
        shape: number;
        mileageScore: number;
        longRunScore: number;
        crossTrainingScore: number;
    };
    currentVdot: number | null;
    ctl: number;
    atl: number;
    tsb: number;
    workloadRatio: number;
    easyTrimp: number;
    hrMax: number;
}

export interface MobileSyncStatus {
    syncInProgress: boolean;
    lastSyncAt: string | null;
    totalActivities: number;
}

export interface MobileDashboardResponse {
    stats: MobileStats;
    recentActivities: MobileActivity[];
    goals: MobileGoal[];
    syncStatus: MobileSyncStatus;
    user: Partial<MobileUser>;
}

export interface MobileActivity {
    id: string;
    stravaId: string;
    type: ActivityType;
    sportType?: string | null;
    name: string;
    startDate: string;
    distance: number;
    movingTime: number;
    averageSpeed?: number;
    averageHr?: number | null;
    maxHr?: number | null;
    averageCadence?: number | null;
    hasHeartrate: boolean;
    totalElevation: number;
    trimp?: number | null;
    runningTss?: number | null;
    estimatedVdot?: number | null;
    trainingType?: string;
}

export interface MobileWorkout {
    id: string;
    goalId: string;
    scheduledDate: string;
    workoutType: WorkoutType;
    description: string;
    targetDistance: number;
    targetPace: number;
    targetDuration: number;
    targetHrZone?: number | null;
    isCompleted: boolean;
    completedAt?: string | null;
    linkedActivityId?: string | null;
    phase: PlanPhase;
    order: number;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface MobileGoal {
    id: string;
    userId: string;
    name: string;
    raceType: RaceType;
    raceDate: string;
    targetTime: number | null;
    weeklyMileageGoal: number | null;
    planWeeks: number;
    runsPerWeek: number;
    longRunDay: number;
    workoutDay: number;
    currentVdot: number | null;
    predictedTime: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    workouts?: MobileWorkout[];
}
