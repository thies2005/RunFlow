/**
 * Strava Data Transformation Module
 * 
 * Handles transformation of Strava data to internal format:
 * - Activity type mapping
 * - Workout type determination
 * - Zone time calculations
 * - Activity data transformation
 * - Metrics enrichment
 */

import { WorkoutType } from '@/lib/types';
import { type ActivityType as CalorieActivityType, calculateCalories, calculateAge } from '@/lib/metrics/calories';
import { calculateTrimp, type Sex } from '@/lib/metrics/trimp';
import { calculateRunningTss, getActivityContribution } from '@/lib/metrics/fitness';
import { calculateEffectiveVO2max } from '@/lib/metrics/runalyze';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import type { StravaActivity } from './fetch';

const DEFAULT_HR_MAX = 185;
const DEFAULT_HR_REST = 60;

export interface ActivityData {
    name: string;
    description: string | null;
    type: any;
    sportType: string;
    startDate: Date;
    timezone: string;
    distance: number;
    movingTime: number;
    elapsedTime: number;
    averageSpeed: number;
    maxSpeed: number;
    gradeAdjustedSpeed: number | null;
    averageHr: number | null;
    maxHr: number | null;
    averageCadence: number | null;
    hasHeartrate: boolean;
    totalElevation: number;
    elevHigh: number | null;
    elevLow: number | null;
    calories: number | null;
    trimp: number | null;
    runningTss: number | null;
    estimatedVdot: number | null;
    hrZone1Time: number;
    hrZone2Time: number;
    hrZone3Time: number;
    hrZone4Time: number;
    hrZone5Time: number;
    hrZone6Time: number;
    hrZone7Time: number;
    rawJson: any;
    streams: any;
    trainingType: WorkoutType;
}

export interface MetricsInput {
    activity: StravaActivity;
    user: {
        hrMax: number | null;
        hrRest: number | null;
        sex: string | null;
        weight: number | null;
        birthDate: Date | null;
        hrZone1Max: number | null;
        hrZone2Max: number | null;
        hrZone3Max: number | null;
        hrZone4Max: number | null;
        hrZone5Max: number | null;
        hrZone6Max: number | null;
    };
    currentHrMax: number | null;
    streams: { time: number[]; heartrate?: number[]; velocity_smooth?: number[]; altitude?: number[]; cadence?: number[] } | null;
    goals?: Array<{ currentVdot: number | null; isActive: boolean }>;
}

export interface ZoneTimes {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
    z6: number;
    z7: number;
}

export function mapActivityType(stravaType: string): string {
    const typeMap: Record<string, string> = {
        'Run': 'RUN',
        'VirtualRun': 'RUN',
        'TrailRun': 'RUN',
        'Ride': 'RIDE',
        'VirtualRide': 'VIRTUAL_RIDE',
        'Walk': 'WALK',
        'Hike': 'HIKE',
        'Swim': 'SWIM',
        'Workout': 'WORKOUT',
        'Rowing': 'ROWING',
        'Elliptical': 'ELLIPTICAL',
        'StairStepper': 'STAIR_STEPPER',
    };
    return typeMap[stravaType] || 'OTHER';
}

function determineWorkoutType(activity: StravaActivity): WorkoutType {
    if (activity.workout_type === 1) return 'RACE';
    if (activity.workout_type === 2) return 'LONG_RUN';
    if (activity.workout_type === 3) return 'INTERVALS';

    if (activity.type === 'Run' || activity.type === 'VirtualRun') {
        const distKm = activity.distance / 1000;
        if (distKm >= 15) return 'LONG_RUN';
        return 'EASY';
    }

    if (activity.type === 'Ride' || activity.type === 'VirtualRide') return 'RIDE';
    if (activity.type === 'Swim') return 'SWIM';
    if (activity.type === 'WeightTraining') return 'STRENGTH';

    return 'OTHER';
}

export function calculateZoneTimes(
    heartrates: number[],
    times: number[],
    zoneThresholds: { z1: number; z2: number; z3: number; z4: number; z5: number; z6: number } = { z1: 60, z2: 70, z3: 80, z4: 90, z5: 95, z6: 100 }
): ZoneTimes {
    const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };

    const z1Ceil = zoneThresholds.z1;
    const z2Ceil = zoneThresholds.z2;
    const z3Ceil = zoneThresholds.z3;
    const z4Ceil = zoneThresholds.z4;
    const z5Ceil = zoneThresholds.z5;
    const z6Ceil = zoneThresholds.z6;

    for (let i = 0; i < heartrates.length; i++) {
        const duration = (i < times.length - 1)
            ? Math.min(times[i + 1] - times[i], 10)
            : 1;

        const hr = heartrates[i];

        if (hr <= z1Ceil) zones.z1 += duration;
        else if (hr <= z2Ceil) zones.z2 += duration;
        else if (hr <= z3Ceil) zones.z3 += duration;
        else if (hr <= z4Ceil) zones.z4 += duration;
        else if (hr <= z5Ceil) zones.z5 += duration;
        else if (hr <= z6Ceil) zones.z6 += duration;
        else zones.z7 += duration;
    }

    return zones;
}

export function enrichActivityMetrics(input: MetricsInput): {
    trimp: number | null;
    calculatedCalories: number | null;
    runningTss: number | null;
    estimatedVdot: number | null;
    zoneTimes: ZoneTimes;
} {
    const { activity, user, currentHrMax, streams, goals } = input;
    const effectiveHrMax = currentHrMax || DEFAULT_HR_MAX;
    const effectiveHrRest = user.hrRest || DEFAULT_HR_REST;

    let trimp: number | null = null;
    if (activity.has_heartrate && activity.average_heartrate) {
        const result = calculateTrimp({
            durationMinutes: activity.moving_time / 60,
            averageHr: activity.average_heartrate,
            hrMax: effectiveHrMax,
            hrRest: effectiveHrRest,
            sex: (user.sex || 'MALE') as Sex,
        });
        trimp = result.trimp;
    }

    let calculatedCalories: number | null = activity.calories ?? null;
    if (calculatedCalories === null || calculatedCalories === 0) {
        const activityTypeForCalories = mapActivityType(activity.type) as CalorieActivityType;
        const calorieResult = calculateCalories({
            durationMinutes: activity.moving_time / 60,
            activityType: activityTypeForCalories,
            weightKg: user.weight ?? undefined,
            averageHr: activity.average_heartrate,
            age: user.birthDate ? calculateAge(user.birthDate) : undefined,
            sex: (user.sex || 'MALE') as 'MALE' | 'FEMALE',
            averageSpeedMps: activity.average_speed,
        });
        calculatedCalories = calorieResult.calories;
    }

    let runningTss: number | null = null;
    const contribution = getActivityContribution(mapActivityType(activity.type));
    if (contribution.contributesToRunningTss && activity.distance > 0) {
        let thresholdPace = 300;
        if (goals && goals.length > 0) {
            const activeGoal = goals.find((g: any) => g.isActive);
            if (activeGoal?.currentVdot && activeGoal.currentVdot > 0) {
                const paces = calculateTrainingPaces(activeGoal.currentVdot);
                thresholdPace = paces.threshold;
            }
        }
        runningTss = calculateRunningTss(
            activity.moving_time,
            activity.distance,
            thresholdPace
        );
    }

    let estimatedVdot: number | null = null;
    if ((activity.type === 'Run' || activity.type === 'VirtualRun') && activity.has_heartrate && activity.average_heartrate) {
        const maxHrForCalc = effectiveHrMax;
        const result = calculateEffectiveVO2max(
            activity.distance,
            activity.moving_time,
            activity.average_heartrate,
            maxHrForCalc
        );
        if (result > 0) estimatedVdot = result;
    }

    let zoneTimes: ZoneTimes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
    if (streams && streams.heartrate) {
        const zoneThresholds = {
            z1: user.hrZone1Max ?? 130,
            z2: user.hrZone2Max ?? 148,
            z3: user.hrZone3Max ?? 160,
            z4: user.hrZone4Max ?? 170,
            z5: user.hrZone5Max ?? 178,
            z6: user.hrZone6Max ?? 187,
        };
        zoneTimes = calculateZoneTimes(streams.heartrate, streams.time, zoneThresholds);
    }

    return {
        trimp,
        calculatedCalories,
        runningTss,
        estimatedVdot,
        zoneTimes,
    };
}

export function transformActivityData(
    activity: StravaActivity,
    metrics: ReturnType<typeof enrichActivityMetrics>
): ActivityData {
    return {
        name: activity.name,
        description: activity.description ?? null,
        type: mapActivityType(activity.type),
        sportType: activity.sport_type,
        startDate: new Date(activity.start_date),
        timezone: activity.timezone,
        distance: activity.distance,
        movingTime: activity.moving_time,
        elapsedTime: activity.elapsed_time,
        averageSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        gradeAdjustedSpeed: activity.average_grade_adjusted_speed ?? null,
        averageHr: activity.average_heartrate ?? null,
        maxHr: activity.max_heartrate ?? null,
        averageCadence: activity.average_cadence ? (activity.average_cadence * 2) : null,
        hasHeartrate: activity.has_heartrate,
        totalElevation: activity.total_elevation_gain,
        elevHigh: activity.elev_high ?? null,
        elevLow: activity.elev_low ?? null,
        calories: metrics.calculatedCalories,
        trimp: metrics.trimp,
        runningTss: metrics.runningTss,
        estimatedVdot: metrics.estimatedVdot,
        hrZone1Time: metrics.zoneTimes.z1,
        hrZone2Time: metrics.zoneTimes.z2,
        hrZone3Time: metrics.zoneTimes.z3,
        hrZone4Time: metrics.zoneTimes.z4,
        hrZone5Time: metrics.zoneTimes.z5,
        hrZone6Time: metrics.zoneTimes.z6,
        hrZone7Time: metrics.zoneTimes.z7,
        rawJson: activity as any,
        streams: null as any,
        trainingType: determineWorkoutType(activity),
    };
}
