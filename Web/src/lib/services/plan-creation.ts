import { prisma } from '@/lib/db';
import { analyzeRace, calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { type ActivityForShape } from '@/lib/metrics/runalyze';
import { calculateProjectedGoalTime, type PlanSettings } from '@/lib/metrics/goalProjection';
import { generateTrainingPlan, type PlanConfig, type GeneratedWorkout } from '@/lib/plans';
import { WorkoutType, type RaceType, type PlanSport, type PlanCreationMode } from '@/generated/prisma/browser';
import { logger } from '@/lib/logging/logger';

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
            phase: w.phase ?? 'BASE',
            isCompleted: false,
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

export const CALIB_DISTANCE_MAP: Record<string, RaceDistance> = {
    '5K': '5K',
    '10K': '10K',
    'HALF': 'HALF',
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
}

export async function resolveVdot(input: ResolveVdotInput): Promise<ResolveVdotResult> {
    const { userId, raceType, calibrationTime, calibrationDistance, targetTime, useActivityVdot = true } = input;

    let currentVdot: number | null = null;
    let predictedTime: number | null = null;

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

    if (!currentVdot) {
        logger.info('No VDOT data available. Defaulting to VDOT 30.', { userId });
        currentVdot = 30.0;
    }

    return { currentVdot, predictedTime };
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

export async function createPlanWithWorkouts(input: CreatePlanInput): Promise<CreatePlanResult> {
    const {
        userId, name, raceType, raceDate, targetTime, weeklyMileageGoal,
        runsPerWeek, ridesPerWeek, strengthPerWeek, swimsPerWeek,
        maxLongRunKm,
        longRunDay, workoutDay, swimDay, restDays,
        calibrationTime, calibrationDistance, calibrationFactor,
        planStartDate, deactivateExisting = true,
        sport, planSource, creationMode,
        backyardLoopDistM, backyardLoopTimeS, targetLaps, customDistanceM,
        customSwimDistM, customBikeDistM, customRunDistM,
        subGoals,
    } = input;

    const isNoRace = !raceType;
    const effectiveSport = sport ?? (isNoRace ? 'RUN' : 'RUN');

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

    const { currentVdot } = await resolveVdot({
        userId,
        raceType: raceType ?? null,
        calibrationTime,
        calibrationDistance,
        calibrationFactor,
        targetTime,
        useActivityVdot: true,
    });

    let effectiveVdot = currentVdot;
    if (calibrationFactor && calibrationFactor > 0 && !calibrationTime) {
        const recentGoal = await prisma.goal.findFirst({
            where: { userId, currentVdot: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        const baseVdot = recentGoal?.currentVdot || 30.0;
        effectiveVdot = baseVdot * calibrationFactor;
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
        vdot: effectiveVdot,
        raceType: raceType ?? null,
        raceDate: finalRaceDate,
        startDate,
        sport: effectiveSport,
        runsPerWeek: runsPerWeek ?? 4,
        ridesPerWeek: ridesPerWeek ?? (effectiveSport === 'TRIATHLON' ? 2 : 0),
        strengthPerWeek: strengthPerWeek ?? 0,
        swimsPerWeek: swimsPerWeek ?? (effectiveSport === 'TRIATHLON' ? 2 : 0),
        weeklyMileageGoal: weeklyMileageGoal || null,
        taperWeeks: phases.taperWeeks,
        peakWeeks: phases.peakWeeks,
        buildWeeks: phases.buildWeeks,
        maxLongRunKm: maxLongRunKm ?? undefined,
        longRunDay: longRunDay ?? 0,
        workoutDay: workoutDay ?? 3,
        swimDay: typeof swimDay === 'number' ? swimDay : undefined,
        restDays: Array.isArray(restDays) ? restDays : undefined,
        weeksTotal: resolvedPlanWeeks,
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
                        vdot: effectiveVdot,
                        raceType: sg.raceType as RaceType,
                        raceDate: subRaceDate,
                        startDate,
                        sport: subGoalSport,
                        runsPerWeek: runsPerWeek ?? 4,
                        ridesPerWeek: ridesPerWeek ?? (subGoalSport === 'TRIATHLON' ? 2 : 0),
                        swimsPerWeek: swimsPerWeek ?? (subGoalSport === 'TRIATHLON' ? 2 : 0),
                        strengthPerWeek: strengthPerWeek ?? 0,
                        weeklyMileageGoal: weeklyMileageGoal ?? null,
                        taperWeeks: subTaper,
                        peakWeeks: subPeak,
                        buildWeeks: subBuild,
                        longRunDay: longRunDay ?? 0,
                        workoutDay: workoutDay ?? 3,
                        swimDay: swimDay ?? undefined,
                        restDays: restDays ?? undefined,
                        weeksTotal: weeksAvailable,
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
