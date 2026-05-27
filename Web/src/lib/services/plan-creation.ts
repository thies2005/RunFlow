import { prisma } from '@/lib/db';
import { analyzeRace, calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { type ActivityForShape } from '@/lib/metrics/runalyze';
import { calculateProjectedGoalTime, type PlanSettings } from '@/lib/metrics/goalProjection';
import { buildStructuredStepsForWorkout, generateTrainingPlan, type PlanConfig, type GeneratedWorkout, getMinStartVolume } from '@/lib/plans';
import { WorkoutType, RaceType, PlanSport, PlanCreationMode } from '@/generated/prisma/browser';
import { logger } from '@/lib/logging/logger';
import { z } from 'zod';
import { getRaceDefaults } from '@/lib/plans/defaults';

// ─── Shared Plan Creation Schema (superset for onboarding + advanced) ───

const dateStringSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
});

export const SubGoalSchema = z.object({
    name: z.string().min(1).max(255),
    sport: z.enum(['RUN', 'TRIATHLON', 'NO_RACE']).optional(),
    raceType: z.nativeEnum(RaceType).nullable().optional(),
    raceDate: dateStringSchema.nullable().optional(),
    priority: z.enum(['SECONDARY', 'TUNE_UP', 'MILESTONE']).optional(),
    targetTime: z.number().int().positive().optional(),
});

export const PlanCreateInputSchema = z.object({
    // Required
    name: z.string().min(1).max(255),

    // Sport / race configuration
    sport: z.enum(['RUN', 'TRIATHLON', 'NO_RACE']).optional(),
    raceType: z.nativeEnum(RaceType).nullable().optional(),
    raceDate: dateStringSchema.nullable().optional(),
    planStartDate: dateStringSchema.nullable().optional(),
    durationWeeks: z.number().int().min(4).max(52).optional(),

    // Volume
    runsPerWeek: z.number().int().nonnegative().max(7).optional(),
    ridesPerWeek: z.number().int().nonnegative().max(7).optional(),
    swimsPerWeek: z.number().int().nonnegative().max(7).optional(),
    strengthPerWeek: z.number().int().nonnegative().max(7).optional(),
    weeklyMileageGoal: z.number().positive().nullable().optional(),
    startWeeklyMileage: z.number().positive().nullable().optional(),
    maxLongRunKm: z.number().min(6).max(200).optional(),

    // Phases
    taperWeeks: z.number().int().nonnegative().optional(),
    peakWeeks: z.number().int().nonnegative().optional(),
    buildWeeks: z.number().int().nonnegative().optional(),

    // Scheduling
    longRunDay: z.number().int().min(0).max(6).optional(),
    workoutDay: z.number().int().min(0).max(6).optional(),
    swimDay: z.number().int().min(0).max(6).optional(),
    restDays: z.array(z.number().int().min(0).max(6)).optional(),

    // Goal time
    targetTime: z.number().int().positive().optional(),

    // Calibration
    calibrationTime: z.number().int().positive().optional(),
    calibrationDistance: z.enum(['5K', 'FIVE_K', '10K', 'TEN_K', 'HALF', 'HALF_MARATHON', 'MARATHON']).optional(),
    calibrationFactor: z.number().min(0.5).max(2.0).optional(),

    // Advanced fields
    planWeeks: z.number().int().positive().nullable().optional(),
    planSource: z.string().optional(),
    creationMode: z.nativeEnum(PlanCreationMode).optional(),
    backyardLoopDistM: z.number().min(100).nullable().optional(),
    backyardLoopTimeS: z.number().nullable().optional(),
    targetLaps: z.number().int().min(1).max(100).nullable().optional(),
    customDistanceM: z.number().nullable().optional(),
    customSwimDistM: z.number().nullable().optional(),
    customBikeDistM: z.number().nullable().optional(),
    customRunDistM: z.number().nullable().optional(),
    subGoals: z.array(SubGoalSchema).optional(),

    // Heart rate profile
    maxHeartRate: z.number().int().min(60).max(250).optional(),
    restingHeartRate: z.number().int().min(20).max(100).optional(),
    thresholdHeartRate: z.number().int().min(60).max(250).optional(),
    thresholdPaceSecondsPerKm: z.number().positive().optional(),
    hrZoneMethod: z.enum(['LTHR', 'KARVONEN', 'CUSTOM']).optional(),
});

export type PlanCreateInput = z.infer<typeof PlanCreateInputSchema>;

// ─── Normalizer: converts API input → CreatePlanInput ───

export interface NormalizedPlanParams extends Omit<CreatePlanInput, 'userId' | 'name'> {
    userId: string;
    name: string;
}

export function normalizePlanInput(
    raw: PlanCreateInput,
    userId: string,
): NormalizedPlanParams {
    const {
        name, sport, raceType, raceDate, planStartDate, durationWeeks,
        runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek,
        weeklyMileageGoal, maxLongRunKm,
        startWeeklyMileage,
        taperWeeks, peakWeeks, buildWeeks,
        longRunDay, workoutDay, swimDay, restDays,
        targetTime,
        calibrationTime, calibrationDistance, calibrationFactor,
        planWeeks, planSource, creationMode,
        backyardLoopDistM, backyardLoopTimeS, targetLaps,
        customDistanceM, customSwimDistM, customBikeDistM, customRunDistM,
        subGoals,
        maxHeartRate, restingHeartRate, thresholdHeartRate,
        thresholdPaceSecondsPerKm, hrZoneMethod,
    } = raw;

    // Resolve sport: default to RUN
    const resolvedSport: 'RUN' | 'TRIATHLON' | 'NO_RACE' = sport ?? 'RUN';
    const isNoRace = resolvedSport === 'NO_RACE';

    // Resolve race type / date for NO_RACE
    const resolvedRaceType: RaceType | null = isNoRace ? null : (raceType ?? null);
    const resolvedRaceDate: string | null = isNoRace ? null : (raceDate ?? null);

    // Resolve plan weeks
    let resolvedPlanWeeks: number | null = planWeeks ?? null;
    if (!resolvedPlanWeeks && isNoRace && durationWeeks) {
        resolvedPlanWeeks = durationWeeks;
    }
    if (!resolvedPlanWeeks && resolvedRaceDate && planStartDate) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weeks = Math.max(4, Math.ceil(
            (new Date(resolvedRaceDate).getTime() - new Date(planStartDate).getTime()) / msPerWeek,
        ));
        resolvedPlanWeeks = weeks;
    }
    if (!resolvedPlanWeeks) {
        resolvedPlanWeeks = 12;
    }

    // Unit guard: weeklyMileageGoal < 200 → likely km, convert to meters
    let resolvedWeeklyMileage = weeklyMileageGoal ?? null;
    if (resolvedWeeklyMileage && resolvedWeeklyMileage > 0 && resolvedWeeklyMileage < 200) {
        resolvedWeeklyMileage = resolvedWeeklyMileage * 1000;
    }

    let resolvedStartMileage = startWeeklyMileage ?? null;
    if (resolvedStartMileage && resolvedStartMileage > 0 && resolvedStartMileage < 200) {
        resolvedStartMileage = resolvedStartMileage * 1000;
    }

    // Defaults from race defaults when missing
    const raceTypeKey = resolvedRaceType ?? 'MARATHON';
    const defaults = getRaceDefaults(raceTypeKey);

    const resolvedRunsPerWeek = runsPerWeek ?? defaults.runsPerWeek;
    const resolvedRidesPerWeek = ridesPerWeek ?? defaults.ridesPerWeek;
    const resolvedSwimsPerWeek = swimsPerWeek ?? defaults.swimsPerWeek;
    const resolvedStrengthPerWeek = strengthPerWeek ?? defaults.strengthPerWeek;

    // Clean sub-goals
    const resolvedSubGoals = (subGoals ?? [])
        .filter(sg => sg.name?.trim())
        .map(sg => ({
            ...sg,
            name: sg.name.trim(),
        }));

    return {
        userId,
        name: name.trim(),
        raceType: resolvedRaceType,
        raceDate: resolvedRaceDate,
        planStartDate: planStartDate ?? null,
        targetTime: targetTime ?? null,
        weeklyMileageGoal: resolvedWeeklyMileage,
        startWeeklyMileage: resolvedStartMileage,
        planWeeks: resolvedPlanWeeks,
        runsPerWeek: resolvedRunsPerWeek,
        ridesPerWeek: resolvedRidesPerWeek,
        swimsPerWeek: resolvedSwimsPerWeek,
        strengthPerWeek: resolvedStrengthPerWeek,
        taperWeeks: taperWeeks ?? null,
        peakWeeks: peakWeeks ?? null,
        buildWeeks: buildWeeks ?? null,
        maxLongRunKm: maxLongRunKm ?? null,
        longRunDay: longRunDay ?? 0,
        workoutDay: workoutDay ?? 3,
        swimDay: swimDay ?? null,
        restDays: restDays ?? null,
        calibrationTime: calibrationTime ?? null,
        calibrationDistance: calibrationDistance ?? null,
        calibrationFactor: calibrationFactor ?? null,
        deactivateExisting: planSource !== 'advanced',
        sport: resolvedSport === 'NO_RACE' ? 'RUN' : resolvedSport,
        planSource: planSource ?? undefined,
        creationMode: creationMode ?? undefined,
        backyardLoopDistM: backyardLoopDistM ?? null,
        backyardLoopTimeS: backyardLoopTimeS ?? null,
        targetLaps: targetLaps ?? null,
        customDistanceM: customDistanceM ?? null,
        customSwimDistM: customSwimDistM ?? null,
        customBikeDistM: customBikeDistM ?? null,
        customRunDistM: customRunDistM ?? null,
        subGoals: resolvedSubGoals,
        maxHeartRate: maxHeartRate ?? null,
        restingHeartRate: restingHeartRate ?? null,
        thresholdHeartRate: thresholdHeartRate ?? null,
        thresholdPaceSecondsPerKm: thresholdPaceSecondsPerKm ?? null,
        hrZoneMethod: hrZoneMethod ?? null,
    };
}

export interface MapWorkoutsOptions {
    goalId: string;
    subGoalId?: string;
    descriptionPrefix?: string;
}

export function mapWorkoutsForDb(
    workouts: GeneratedWorkout[],
    options: MapWorkoutsOptions,
) {
    return workouts.map(w => {
        const displayDesc = w.displayDescription ?? null;
        const intensityZone = w.intensityZone ?? null;
        const structuredSteps = w.structuredSteps ?? buildStructuredStepsForWorkout(w);
        return {
            goalId: options.goalId,
            ...(options.subGoalId && { subGoalId: options.subGoalId }),
            scheduledDate: w.date,
            workoutType: w.type as WorkoutType,
            description: options.descriptionPrefix
                ? `${options.descriptionPrefix}${w.description}`
                : w.description,
            targetDistance: w.totalDistance,
            targetPace: w.targetPace ?? 0,
            targetDuration: w.targetDuration ?? 0,
            targetHrZone: w.targetHrZone ?? null,
            targetHrZoneLabel: w.targetHrZoneLabel ?? null,
            targetHrMinBpm: w.targetHrMinBpm ?? null,
            targetHrMaxBpm: w.targetHrMaxBpm ?? null,
            targetPaceZoneLabel: w.targetPaceZoneLabel ?? null,
            targetPaceMinSecondsPerKm: w.targetPaceMinSecondsPerKm ?? null,
            targetPaceMaxSecondsPerKm: w.targetPaceMaxSecondsPerKm ?? null,
            phase: w.phase ?? 'BASE',
            isCompleted: false,
            ...(structuredSteps && { structuredSteps }),
            ...(displayDesc && { customName: displayDesc }),
            ...(intensityZone && { notes: `[auto] intensity:${intensityZone}` }),
        };
    });
}

const RACE_DISTANCE_MAP: Record<string, number> = {
    'FIVE_K': 5000,
    'TEN_K': 10000,
    'HALF_MARATHON': 21097,
    'MARATHON': 42195,
};

const RACE_TYPE_TO_VDOT_DIST: Record<string, RaceDistance> = {
    'FIVE_K': '5K',
    'TEN_K': '10K',
    'HALF_MARATHON': 'HALF',
    'MARATHON': 'MARATHON',
};

export function resolveTrainingVdotForGoal(params: {
    currentVdot: number;
    targetTime?: number | null;
    raceType?: RaceType | null;
    hasFitnessBaseline: boolean;
    maxImprovementFactor?: number;
}): { trainingVdot: number; targetVdot?: number; wasCapped: boolean } {
    const maxImprovementFactor = params.maxImprovementFactor ?? 1.15;
    const distance = params.raceType ? RACE_TYPE_TO_VDOT_DIST[params.raceType] : undefined;
    if (!params.targetTime || !distance || !params.hasFitnessBaseline) {
        return { trainingVdot: params.currentVdot, wasCapped: false };
    }

    const targetVdot = calculateVdot({ distance, timeSeconds: params.targetTime });
    const maxTrainingVdot = Math.round(params.currentVdot * maxImprovementFactor * 10) / 10;
    if (targetVdot > maxTrainingVdot) {
        return { trainingVdot: maxTrainingVdot, targetVdot, wasCapped: true };
    }

    return { trainingVdot: Math.max(params.currentVdot, targetVdot), targetVdot, wasCapped: false };
}

export const CALIB_DISTANCE_MAP: Record<string, RaceDistance> = {
    '5K': '5K',
    'FIVE_K': '5K',
    '10K': '10K',
    'TEN_K': '10K',
    'HALF': 'HALF',
    'HALF_MARATHON': 'HALF',
    'MARATHON': 'MARATHON',
};

export function predictTimeForDist(vdot: number, distM: number): number {
    let low = 600;
    let high = 18000;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const tv = calculateVdot({ distance: distM, timeSeconds: mid });
        if (Math.abs(tv - vdot) < 0.01) return Math.round(mid);
        if (tv > vdot) low = mid;
        else high = mid;
    }
    return Math.round((low + high) / 2);
}

export interface ResolveVdotInput {
    userId: string;
    raceType: RaceType | null;
    calibrationTime?: number | null;
    calibrationDistance?: string | null;
    calibrationFactor?: number | null;
    targetTime?: number | null;
    useActivityVdot?: boolean;
}

export interface ResolveVdotResult {
    currentVdot: number;
    predictedTime: number | null;
    vdotFromActivities: boolean;
}

export async function resolveVdot(input: ResolveVdotInput): Promise<ResolveVdotResult> {
    const { userId, raceType, calibrationTime, calibrationDistance, targetTime, useActivityVdot = true } = input;

    let currentVdot: number | null = null;
    let predictedTime: number | null = null;
    let vdotFromActivities = false;

    if (calibrationTime && calibrationTime > 0 && calibrationDistance) {
        const calDist = CALIB_DISTANCE_MAP[calibrationDistance] || '5K';
        const result = analyzeRace({
            distance: calDist,
            timeSeconds: calibrationTime,
        });
        currentVdot = result.vdot;
        predictedTime = result.predictions[calDist];
    }

    if (!currentVdot && useActivityVdot && raceType) {
        const targetDistance = RACE_DISTANCE_MAP[raceType];

        if (targetDistance) {
            const recentRaceEffort = await prisma.activity.findFirst({
                where: {
                    userId,
                    type: 'RUN',
                    distance: {
                        gte: targetDistance * 0.9,
                        lte: targetDistance * 1.1,
                    },
                    startDate: {
                        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    },
                },
                orderBy: { startDate: 'desc' },
            });

            if (recentRaceEffort) {
                const targetRaceDistance = RACE_TYPE_TO_VDOT_DIST[raceType] || '5K';
                const result = analyzeRace({
                    distance: targetRaceDistance,
                    timeSeconds: recentRaceEffort.movingTime,
                });
                currentVdot = result.vdot;
                predictedTime = result.predictions[targetRaceDistance];
            }
        }
    }

    if (!currentVdot && useActivityVdot) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { hrMax: true, vdotCorrectionFactor: true },
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const runActivities = await prisma.activity.findMany({
            where: {
                userId,
                type: 'RUN',
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                startDate: true,
                distance: true,
                movingTime: true,
                averageHr: true,
                hasHeartrate: true,
            },
            orderBy: { startDate: 'desc' },
        });

        if (runActivities.length > 0) {
            const maxHR = user?.hrMax || 185;
            const correctionFactor = user?.vdotCorrectionFactor || 1.0;
            const { effectiveVO2max } = AnalyticsService.calculateVO2max(
                runActivities as ActivityForShape[],
                maxHR,
                correctionFactor,
            );
            if (effectiveVO2max > 0) {
                currentVdot = effectiveVO2max;
                vdotFromActivities = true;
            }
        }
    }

    if (!currentVdot && targetTime && raceType) {
        const dist = RACE_TYPE_TO_VDOT_DIST[raceType] || 'MARATHON';
        const result = analyzeRace({
            distance: dist,
            timeSeconds: targetTime,
        });
        currentVdot = result.vdot;
    }

    if (currentVdot && !vdotFromActivities && userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { vdotCorrectionFactor: true },
        });
        const correctionFactor = user?.vdotCorrectionFactor ?? 1.0;
        if (correctionFactor !== 1.0) {
            currentVdot = Math.round(currentVdot * correctionFactor * 10) / 10;
        }
    }

    if (!currentVdot) {
        logger.info('No VDOT data available. Defaulting to VDOT 30.', { userId });
        currentVdot = 30.0;
    }

    return { currentVdot, predictedTime, vdotFromActivities };
}

export interface ResolvePhasesInput {
    planWeeks: number;
    taperWeeks?: number | null;
    peakWeeks?: number | null;
    buildWeeks?: number | null;
    isTriathlon?: boolean;
}

export interface ResolvePhasesResult {
    planWeeks: number;
    taperWeeks: number;
    peakWeeks: number;
    buildWeeks: number;
}

export function resolvePhases(input: ResolvePhasesInput): ResolvePhasesResult {
    const { planWeeks, isTriathlon } = input;
    const resolvedPlanWeeks = Math.max(4, planWeeks);

    let safeTaper = input.taperWeeks ?? (isTriathlon ? 1 : 2);
    let safePeak = input.peakWeeks ?? Math.min(4, Math.floor(resolvedPlanWeeks / 3));
    let safeBuild = input.buildWeeks ?? Math.min(4, Math.floor(resolvedPlanWeeks / 3));

    if (safeTaper + safePeak + safeBuild > resolvedPlanWeeks) {
        const proportion = resolvedPlanWeeks / (safeTaper + safePeak + safeBuild);
        safeTaper = Math.max(1, Math.round(safeTaper * proportion));
        safePeak = Math.max(1, Math.round(safePeak * proportion));
        safeBuild = Math.max(0, resolvedPlanWeeks - safeTaper - safePeak);

        if (safeBuild < 0) {
            safeBuild = 0;
            safePeak = Math.max(1, resolvedPlanWeeks - safeTaper);
            if (safeTaper + safePeak > resolvedPlanWeeks) {
                safeTaper = Math.max(0, resolvedPlanWeeks - safePeak);
            }
        }
    }

    return {
        planWeeks: resolvedPlanWeeks,
        taperWeeks: safeTaper,
        peakWeeks: safePeak,
        buildWeeks: safeBuild,
    };
}

export async function resolveStartWeeklyMileage(
    userId: string,
    providedValue: number | null | undefined,
    raceType: RaceType | null,
): Promise<number> {
    const minStart = getMinStartVolume(raceType);

    if (providedValue && providedValue > 0) {
        return Math.max(providedValue, minStart);
    }

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const result = await prisma.activity.aggregate({
        where: {
            userId,
            type: 'RUN',
            startDate: { gte: twelveWeeksAgo },
        },
        _sum: { distance: true },
    });

    const totalDistanceMeters = result._sum.distance ?? 0;

    const monday = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const periodStart = monday(twelveWeeksAgo);
    const periodEnd = monday(new Date());
    const weeksInPeriod = Math.max(
        1,
        Math.round((periodEnd.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    );

    const avgWeeklyMeters = totalDistanceMeters / weeksInPeriod;

    return Math.max(avgWeeklyMeters, minStart);
}

export interface SubGoalInput {
    name: string;
    sport?: 'RUN' | 'TRIATHLON' | 'NO_RACE';
    raceType?: RaceType | null;
    raceDate?: string | null;
    priority?: 'SECONDARY' | 'TUNE_UP' | 'MILESTONE';
    targetTime?: number | null;
}

export interface CreatePlanInput {
    userId: string;
    name: string;
    raceType: RaceType | null;
    raceDate?: string | null;
    targetTime?: number | null;
    weeklyMileageGoal?: number | null;
    startWeeklyMileage?: number | null;
    planWeeks?: number | null;
    runsPerWeek?: number | null;
    ridesPerWeek?: number | null;
    strengthPerWeek?: number | null;
    swimsPerWeek?: number | null;
    taperWeeks?: number | null;
    peakWeeks?: number | null;
    buildWeeks?: number | null;
    maxLongRunKm?: number | null;
    longRunDay?: number | null;
    workoutDay?: number | null;
    swimDay?: number | null;
    restDays?: number[] | null;
    calibrationTime?: number | null;
    calibrationDistance?: string | null;
    calibrationFactor?: number | null;
    planStartDate?: string | null;
    deactivateExisting?: boolean;
    sport?: PlanSport;
    planSource?: string;
    creationMode?: PlanCreationMode;
    backyardLoopDistM?: number | null;
    backyardLoopTimeS?: number | null;
    targetLaps?: number | null;
    customDistanceM?: number | null;
    customSwimDistM?: number | null;
    customBikeDistM?: number | null;
    customRunDistM?: number | null;
    subGoals?: SubGoalInput[];
    maxHeartRate?: number | null;
    restingHeartRate?: number | null;
    thresholdHeartRate?: number | null;
    thresholdPaceSecondsPerKm?: number | null;
    hrZoneMethod?: string | null;
    hrZone1Max?: number | null;
    hrZone2Max?: number | null;
    hrZone3Max?: number | null;
    hrZone4Max?: number | null;
    hrZone5Max?: number | null;
    hrZone6Max?: number | null;
    hrMax?: number | null;
    hrRest?: number | null;
}

export interface CreatePlanResult {
    goal: Awaited<ReturnType<typeof prisma.goal.create>> & { workouts?: Awaited<ReturnType<typeof prisma.workout.findMany>> };
    subGoals?: Awaited<ReturnType<typeof prisma.goal.findMany>> & { subGoalId?: string }[];
    vdot: number;
}

const TRIATHLON_RACE_TYPES = new Set<RaceType>([
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
]);

function resolveDbSport(sport: 'RUN' | 'TRIATHLON' | 'NO_RACE'): PlanSport {
    return sport === 'NO_RACE' ? 'RUN' : sport;
}

function resolveSubGoalSport(
    parentSport: 'RUN' | 'TRIATHLON' | 'NO_RACE',
    subGoalSport?: 'RUN' | 'TRIATHLON' | 'NO_RACE',
    raceType?: RaceType | null,
): PlanSport {
    if (subGoalSport) return resolveDbSport(subGoalSport);
    if (raceType) return TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : 'RUN';
    return resolveDbSport(parentSport);
}

/**
 * Creates a training plan with workouts.
 *
 * UNIT CONTRACT:
 * - weeklyMileageGoal: METERS (stored in DB as meters)
 * - maxLongRunKm: KILOMETERS (despite the km suffix, converted internally)
 * - All workout targetDistance: METERS
 * - All workout targetPace: SECONDS PER KM
 */
export async function createPlanWithWorkouts(input: CreatePlanInput): Promise<CreatePlanResult> {
    const {
        userId, name, raceType, raceDate, targetTime,
        runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
        maxLongRunKm,
        longRunDay, workoutDay, swimDay, restDays,
        calibrationTime, calibrationDistance, calibrationFactor,
        planStartDate, deactivateExisting = true,
        sport, planSource, creationMode,
        backyardLoopDistM, backyardLoopTimeS, targetLaps, customDistanceM,
        customSwimDistM, customBikeDistM, customRunDistM,
        subGoals,
        startWeeklyMileage,
        thresholdHeartRate,
        hrZoneMethod,
        hrZone1Max,
        hrZone2Max,
        hrZone3Max,
        hrZone4Max,
        hrZone5Max,
        hrZone6Max,
        hrMax,
        hrRest,
    } = input;

    let weeklyMileageGoal = input.weeklyMileageGoal ?? null;

    // Sanity check: weeklyMileageGoal should be in meters (> 1000 for any
    // reasonable training plan). If it's < 200, it was likely passed in km.
    if (weeklyMileageGoal && weeklyMileageGoal > 0 && weeklyMileageGoal < 200) {
        console.warn(`weeklyMileageGoal=${weeklyMileageGoal} appears to be in km, not meters. Auto-converting.`);
        weeklyMileageGoal = weeklyMileageGoal * 1000;
    }

    const isNoRace = !raceType;
    const effectiveSport = sport || 'RUN';

    if (deactivateExisting) {
        await prisma.goal.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false, completedAt: new Date() },
        });
    }

    const userUpdatePromise = calibrationFactor && calibrationFactor > 0
        ? prisma.user.update({
            where: { id: userId },
            data: {
                vdotCorrectionFactor: calibrationFactor,
                ...(calibrationFactor !== 1.0 && {
                    autoRevolvingVo2max: null,
                    autoRevolvingCalculatedAt: null,
                }),
            },
        }).then(res => ({ result: res, error: null }))
            .catch(err => ({ result: null, error: err }))
        : Promise.resolve({ result: null, error: null });

    const now = new Date();
    const pStartDate = planStartDate ? new Date(planStartDate) : now;
    const startDate = pStartDate > now ? pStartDate : now;

    let totalWeeks: number;
    if (isNoRace) {
        totalWeeks = input.planWeeks || 12;
    } else if (raceDate) {
        const rDate = new Date(raceDate);
        totalWeeks = Math.max(4, Math.ceil((rDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    } else {
        totalWeeks = 12;
    }

    const resolvedPlanWeeks = Math.max(4, totalWeeks);

    const phases = resolvePhases({
        planWeeks: resolvedPlanWeeks,
        taperWeeks: input.taperWeeks,
        peakWeeks: input.peakWeeks,
        buildWeeks: input.buildWeeks,
        isTriathlon: effectiveSport === 'TRIATHLON',
    });

    const { currentVdot, vdotFromActivities } = await resolveVdot({
        userId,
        raceType: raceType ?? null,
        calibrationTime,
        calibrationDistance,
        calibrationFactor,
        targetTime,
        useActivityVdot: true,
    });

    const effectiveVdot = currentVdot;

    const trainingVdotResult = resolveTrainingVdotForGoal({
        currentVdot: effectiveVdot,
        targetTime,
        raceType: raceType ?? null,
        hasFitnessBaseline: Boolean(vdotFromActivities || calibrationTime),
    });
    const trainingVdot = trainingVdotResult.trainingVdot;
    if (trainingVdotResult.wasCapped) {
        logger.warn('Target time VDOT exceeds safe progression cap; capping training paces', {
            userId,
            raceType,
            currentVdot: effectiveVdot,
            targetVdot: trainingVdotResult.targetVdot,
            trainingVdot,
        });
    }

    let calculatedTargetTime: number | null = null;
    if (!targetTime && currentVdot && raceType) {
        const projectionDistance = RACE_TYPE_TO_VDOT_DIST[raceType] || 'MARATHON';
        const planSettings: PlanSettings = {
            durationWeeks: phases.planWeeks,
            runsPerWeek: runsPerWeek ?? 4,
            weeklyMileageGoal: (weeklyMileageGoal || 40000) / 1000,
            raceDistance: projectionDistance,
            taperWeeks: phases.taperWeeks,
            peakWeeks: phases.peakWeeks,
            buildWeeks: phases.buildWeeks,
        };
        const projection = calculateProjectedGoalTime(currentVdot, planSettings, 70);
        calculatedTargetTime = projection.projectedTime;
    }

    const finalRaceDate = raceDate ? new Date(raceDate) : new Date(startDate.getTime() + resolvedPlanWeeks * 7 * 24 * 60 * 60 * 1000);

    const resolvedStartMileage = await resolveStartWeeklyMileage(
        userId,
        startWeeklyMileage,
        raceType ?? null,
    );

    const computedBackyardLoopTimeS = backyardLoopDistM && backyardLoopDistM > 0
        ? predictTimeForDist(effectiveVdot, backyardLoopDistM)
        : null;

    const goalData: Parameters<typeof prisma.goal.create>[0]['data'] = {
        userId,
        name,
        raceType: raceType ?? null,
        raceDate: raceDate ? new Date(raceDate) : null,
        planStartDate: planStartDate ? new Date(planStartDate) : null,
        targetTime: targetTime || calculatedTargetTime || null,
        weeklyMileageGoal: weeklyMileageGoal || null,
        planWeeks: phases.planWeeks,
        runsPerWeek: runsPerWeek ?? 4,
        ridesPerWeek: ridesPerWeek ?? 0,
        strengthPerWeek: strengthPerWeek ?? 0,
        swimsPerWeek: swimsPerWeek ?? 0,
        taperWeeks: phases.taperWeeks,
        peakWeeks: phases.peakWeeks,
        buildWeeks: phases.buildWeeks,
        longRunDay: longRunDay ?? 0,
        workoutDay: workoutDay ?? 3,
        swimDay: typeof swimDay === 'number' ? swimDay : null,
        currentVdot: effectiveVdot,
        ...(Array.isArray(restDays) && { restDays }),
        sport: effectiveSport,
        ...(planSource && { planSource }),
        ...(creationMode && { creationMode }),
        ...(backyardLoopDistM && backyardLoopDistM > 0 && { backyardLoopDistM }),
        ...(computedBackyardLoopTimeS && { backyardLoopTimeS: computedBackyardLoopTimeS }),
        ...(backyardLoopTimeS && !computedBackyardLoopTimeS && { backyardLoopTimeS }),
        ...(targetLaps && { targetLaps }),
        ...(customDistanceM != null && { customDistanceM }),
        ...(customSwimDistM != null && { customSwimDistM }),
        ...(customBikeDistM != null && { customBikeDistM }),
        ...(customRunDistM != null && { customRunDistM }),
    };

    const goal = await prisma.goal.create({ data: goalData });

    const planConfig: PlanConfig = {
        vdot: trainingVdot,
        raceType: raceType ?? null,
        raceDate: finalRaceDate,
        startDate,
        sport: effectiveSport,
        runsPerWeek: runsPerWeek ?? 4,
        ridesPerWeek: ridesPerWeek ?? (effectiveSport === 'TRIATHLON' ? 2 : 0),
        strengthPerWeek: strengthPerWeek ?? 0,
        swimsPerWeek: swimsPerWeek ?? (effectiveSport === 'TRIATHLON' ? 2 : 0),
        weeklyMileageGoal: weeklyMileageGoal || null,
        startWeeklyMileage: resolvedStartMileage,
        taperWeeks: phases.taperWeeks,
        peakWeeks: phases.peakWeeks,
        buildWeeks: phases.buildWeeks,
        maxLongRunKm: maxLongRunKm ?? undefined,
        longRunDay: longRunDay ?? 0,
        workoutDay: workoutDay ?? 3,
        swimDay: typeof swimDay === 'number' ? swimDay : undefined,
        restDays: Array.isArray(restDays) ? restDays : undefined,
        weeksTotal: resolvedPlanWeeks,
        thresholdHeartRate: thresholdHeartRate ?? null,
        hrZoneMethod: hrZoneMethod ?? null,
        hrZone1Max: hrZone1Max ?? null,
        hrZone2Max: hrZone2Max ?? null,
        hrZone3Max: hrZone3Max ?? null,
        hrZone4Max: hrZone4Max ?? null,
        hrZone5Max: hrZone5Max ?? null,
        hrZone6Max: hrZone6Max ?? null,
        hrMax: hrMax ?? null,
        hrRest: hrRest ?? null,
        customDistanceM: customDistanceM ?? null,
        customSwimDistM: customSwimDistM ?? undefined,
        customBikeDistM: customBikeDistM ?? undefined,
        customRunDistM: customRunDistM ?? undefined,
    };

    const workouts = generateTrainingPlan(planConfig);

    if (workouts.length > 0) {
        await prisma.workout.createMany({
            data: mapWorkoutsForDb(workouts, { goalId: goal.id }),
        });
    } else {
        logger.warn('Plan generation returned 0 workouts', {
            userId,
            goalId: goal.id,
            vdot: effectiveVdot,
            raceType,
            planWeeks: phases.planWeeks,
        });
    }

    const createdSubGoals: Awaited<ReturnType<typeof prisma.goal.create>>[] = [];

    if (subGoals && Array.isArray(subGoals) && subGoals.length > 0) {
        for (const sg of subGoals) {
            if (!sg.name || typeof sg.name !== 'string' || !sg.name.trim()) continue;

            const subGoalSport = resolveSubGoalSport(
                effectiveSport === 'TRIATHLON' ? 'TRIATHLON' : (isNoRace ? 'NO_RACE' : 'RUN'),
                sg.sport,
                sg.raceType,
            );

            const subGoal = await prisma.goal.create({
                data: {
                    userId,
                    name: sg.name.trim(),
                    parentGoalId: goal.id,
                    sport: subGoalSport,
                    raceType: sg.raceType || null,
                    raceDate: sg.raceDate ? new Date(sg.raceDate) : null,
                    priority: sg.priority || 'SECONDARY',
                    planSource: planSource || 'advanced',
                    creationMode: creationMode || 'EXPERT_MANUAL',
                    currentVdot: effectiveVdot,
                    targetTime: sg.targetTime ?? null,
                },
            });

            createdSubGoals.push(subGoal);

            if (sg.raceType && sg.raceDate) {
                const subRaceDate = new Date(sg.raceDate);
                if (subRaceDate > now) {
                    const weeksAvailable = Math.max(1, Math.ceil((subRaceDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
                    const priority = sg.priority || 'SECONDARY';
                    const subPhaseWeeks = Math.max(1, weeksAvailable - 1);
                    const subTaper = Math.min(priority === 'TUNE_UP' ? 1 : phases.taperWeeks, subPhaseWeeks);
                    const subPeak = Math.min(phases.peakWeeks, Math.max(0, Math.floor(subPhaseWeeks / 3)));
                    const subBuild = Math.min(phases.buildWeeks, Math.max(0, subPhaseWeeks - subTaper - subPeak));

                    const subWorkouts = generateTrainingPlan({
                        vdot: trainingVdot,
                        raceType: sg.raceType as RaceType,
                        raceDate: subRaceDate,
                        startDate,
                        sport: subGoalSport,
                        runsPerWeek: runsPerWeek ?? 4,
                        ridesPerWeek: ridesPerWeek ?? (subGoalSport === 'TRIATHLON' ? 2 : 0),
                        swimsPerWeek: swimsPerWeek ?? (subGoalSport === 'TRIATHLON' ? 2 : 0),
                        strengthPerWeek: strengthPerWeek ?? 0,
                        weeklyMileageGoal: weeklyMileageGoal ?? null,
                        startWeeklyMileage: resolvedStartMileage,
                        taperWeeks: subTaper,
                        peakWeeks: subPeak,
                        buildWeeks: subBuild,
                        longRunDay: longRunDay ?? 0,
                        workoutDay: workoutDay ?? 3,
                        swimDay: swimDay ?? undefined,
                        restDays: restDays ?? undefined,
                        weeksTotal: weeksAvailable,
                        thresholdHeartRate: thresholdHeartRate ?? null,
                        hrZoneMethod: hrZoneMethod ?? null,
                        hrZone1Max: hrZone1Max ?? null,
                        hrZone2Max: hrZone2Max ?? null,
                        hrZone3Max: hrZone3Max ?? null,
                        hrZone4Max: hrZone4Max ?? null,
                        hrZone5Max: hrZone5Max ?? null,
                        hrZone6Max: hrZone6Max ?? null,
                        hrMax: hrMax ?? null,
                        hrRest: hrRest ?? null,
                    });

                    const parentRaceDate = raceDate ? new Date(raceDate) : null;
                    const filteredWorkouts = parentRaceDate
                        ? subWorkouts.filter(w => w.date <= parentRaceDate)
                        : subWorkouts;

                    if (filteredWorkouts.length > 0) {
                        await prisma.workout.createMany({
                            data: mapWorkoutsForDb(filteredWorkouts, {
                                goalId: goal.id,
                                subGoalId: subGoal.id,
                                descriptionPrefix: `[${sg.name.trim()}] `,
                            }),
                        });
                    }
                }
            }
        }
    }

    const finalUpdateResult = await userUpdatePromise;
    if (finalUpdateResult.error) throw finalUpdateResult.error;

    const goalWithWorkouts = await prisma.goal.findUnique({
        where: { id: goal.id },
        include: {
            workouts: { orderBy: { scheduledDate: 'asc' } },
            ...(createdSubGoals.length > 0 && {
                subGoals: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
            }),
        },
    });

    return {
        goal: goalWithWorkouts ?? goal,
        subGoals: createdSubGoals.length > 0 ? createdSubGoals : undefined,
        vdot: effectiveVdot,
    };
}
