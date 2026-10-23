import { type McpTool } from '@/lib/mcp/server';
import { evaluatePlanSafety } from '@/lib/mcp/safety';
import { createSnapshot, restoreFromSnapshot } from '@/lib/plan/snapshot';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';
import { updateFitnessCache } from '@/lib/metrics/fitnessCache';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import { createPlanWithWorkouts } from '@/lib/services/plan-creation';
import { summarizeStructuredWorkout, parseStructuredWorkout } from '@/lib/plans/structured';
import { buildCanonicalWorkoutData, structuredStepsSchema } from '@/lib/mcp/tools/workouts';
import { prisma } from '@/lib/db';
import { RaceType, PlanSport, PlanCreationMode, GoalPriority } from '@/generated/prisma/client';

function mapToPrismaSport(sportInput?: string | null): PlanSport {
    const s = String(sportInput || 'RUN').trim().toUpperCase();
    if (s === 'TRIATHLON' || s === 'DUATHLON' || s === 'BIKE' || s === 'CYCLING' || s === 'SWIM') {
        return PlanSport.TRIATHLON;
    }
    return PlanSport.RUN;
}

function mapToPrismaRaceType(raceTypeInput?: string | null): RaceType | null {
    if (!raceTypeInput) return null;
    const r = String(raceTypeInput).trim().toUpperCase();
    const valid = new Set<string>(Object.values(RaceType));
    if (valid.has(r)) return r as RaceType;
    if (r === 'IRONMAN') return RaceType.FULL_IRONMAN;
    if (r === 'ULTRA') return RaceType.FIFTY_K;
    if (r === 'GRAN_FONDO' || r === 'TIME_TRIAL' || r === 'CRITERIUM' || r === 'FTP_BUILDER') {
        return RaceType.CUSTOM_TRI;
    }
    if (r === 'GENERAL_FITNESS' || r === 'CUSTOM') {
        return RaceType.CUSTOM_DISTANCE;
    }
    return null;
}

export const getTrainingPlanTool: McpTool = {
    name: 'get_training_plan',
    description:
        'Get active or specified training plan, including structured phase blocks, target volume/TSS goals, coaching summaries, and workouts. Defaults to compact step summaries when includeAllWorkouts: true so 68-workout plans fit in ~16KB without LLM context truncation.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID (defaults to currently active plan)' },
            startDate: { type: 'string', description: 'Start date window in YYYY-MM-DD' },
            endDate: { type: 'string', description: 'End date window in YYYY-MM-DD' },
            sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'], description: 'Optional sport filter' },
            includeAllWorkouts: { type: 'boolean', description: 'If true, returns all workouts regardless of date' },
            includeStructuredSteps: {
                type: 'boolean',
                description: 'Whether to include full nested structuredSteps JSON trees (defaults to false when includeAllWorkouts is true, and true for windowed queries)',
            },
            summaryOnly: {
                type: 'boolean',
                description: 'If true, returns plan metadata, phaseBlocks, and weekly volume/TSS totals without individual workout rows',
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = params.goalId
            ? await prisma.goal.findFirst({
                  where: { id: params.goalId, userId, deletedAt: null },
              })
            : await prisma.goal.findFirst({
                  where: { userId, isActive: true, deletedAt: null },
                  orderBy: { createdAt: 'desc' },
              });

        if (!goal) {
            return { plan: null, message: 'No active training plan found' };
        }

        const workoutWhere: any = {
            goalId: goal.id,
            ...(params.sport && { sport: params.sport }),
        };

        if (!params.includeAllWorkouts) {
            const start = params.startDate
                ? new Date(params.startDate)
                : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const end = params.endDate
                ? new Date(params.endDate)
                : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);

            workoutWhere.scheduledDate = {
                gte: start,
                lte: end,
            };
        }

        const workouts = await prisma.workout.findMany({
            where: workoutWhere,
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        const coachingSummaries = await prisma.planSnapshot.findMany({
            where: {
                goalId: goal.id,
                operation: 'coaching_summary',
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        const includeSteps =
            params.includeStructuredSteps !== undefined
                ? Boolean(params.includeStructuredSteps)
                : !Boolean(params.includeAllWorkouts);

        const goalMetadata = {
            id: goal.id,
            name: goal.name,
            sport: goal.sport,
            trainingFocus: goal.trainingFocus,
            creationMode: goal.creationMode,
            planSource: goal.planSource,
            raceType: goal.raceType,
            raceDate: goal.raceDate,
            planStartDate: goal.planStartDate,
            targetTime: goal.targetTime,
            currentVdot: goal.currentVdot,
            ftpAtCreation: goal.ftpAtCreation,
            swimCssAtCreation: goal.swimCssAtCreation,
            runsPerWeek: goal.runsPerWeek,
            ridesPerWeek: goal.ridesPerWeek,
            swimsPerWeek: goal.swimsPerWeek,
            strengthPerWeek: goal.strengthPerWeek,
            restDays: goal.restDays,
            weeklyMileageGoal: goal.weeklyMileageGoal,
            weeklyBikeTssGoal: goal.weeklyBikeTssGoal,
            weeklySwimMetersGoal: goal.weeklySwimMetersGoal,
            targetWeeklyTss: goal.targetWeeklyTss,
            phaseBlocks: goal.phaseBlocks,
            isActive: goal.isActive,
        };

        if (params.summaryOnly) {
            return {
                goal: goalMetadata,
                coachingSummaries: coachingSummaries.map(s => ({
                    id: s.id,
                    createdAt: s.createdAt,
                    description: s.description,
                    data: s.snapshot,
                })),
                workoutsCount: workouts.length,
            };
        }

        return {
            goal: goalMetadata,
            coachingSummaries: coachingSummaries.map(s => ({
                id: s.id,
                createdAt: s.createdAt,
                description: s.description,
                data: s.snapshot,
            })),
            workoutsCount: workouts.length,
            workouts: workouts.map(w => {
                let stepsSummary: string | undefined = undefined;
                if (!includeSteps && w.structuredSteps) {
                    const parsed = parseStructuredWorkout(
                        w.structuredSteps,
                        w.sport,
                        goal.currentVdot || 45,
                        goal.ftpAtCreation || 200
                    );
                    if (parsed) {
                        stepsSummary = summarizeStructuredWorkout(
                            parsed,
                            w.targetPace,
                            goal.ftpAtCreation || 200,
                            w.sport
                        ).summaryText;
                    }
                }
                return {
                    id: w.id,
                    scheduledDate: w.scheduledDate,
                    workoutType: w.workoutType,
                    sport: w.sport,
                    phase: w.phase,
                    order: w.order,
                    description: w.description,
                    customName: w.customName,
                    notes: w.notes,
                    targetDistance: w.targetDistance,
                    targetDuration: w.targetDuration,
                    targetPace: w.targetPace,
                    targetPaceMinSecondsPerKm: w.targetPaceMinSecondsPerKm,
                    targetPaceMaxSecondsPerKm: w.targetPaceMaxSecondsPerKm,
                    targetPaceZoneLabel: w.targetPaceZoneLabel,
                    targetPowerWatts: w.targetPowerWatts,
                    targetPowerMinWatts: w.targetPowerMinWatts,
                    targetPowerMaxWatts: w.targetPowerMaxWatts,
                    targetPowerZone: w.targetPowerZone,
                    targetFtpPercent: w.targetFtpPercent,
                    targetCadenceRpm: w.targetCadenceRpm,
                    targetRpe: w.targetRpe,
                    targetHrZone: w.targetHrZone,
                    targetHrMinBpm: w.targetHrMinBpm,
                    targetHrMaxBpm: w.targetHrMaxBpm,
                    plannedTss: w.plannedTss,
                    isCompleted: w.isCompleted,
                    completedAt: w.completedAt,
                    linkedActivityId: w.linkedActivityId,
                    ...(includeSteps ? { structuredSteps: w.structuredSteps } : { stepsSummary }),
                };
            }),
        };
    },
};

export const createTrainingPlanTool: McpTool = {
    name: 'create_training_plan',
    description:
        'Generate and persist a template-based training plan using the internal STANDARD_BUILDER engine. To upload a custom training plan with custom phaseBlocks or custom workouts without running the standard template generator, use create_custom_training_plan instead.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Name of the plan or race' },
            raceType: { type: 'string', description: 'Race distance or event type (e.g. MARATHON, HALF_MARATHON, TEN_K, FIVE_K, HALF_IRONMAN)' },
            raceDate: { type: 'string', description: 'Race date in YYYY-MM-DD' },
            targetTime: { type: 'number', description: 'Goal race time in seconds' },
            planStartDate: { type: 'string', description: 'Start date in YYYY-MM-DD' },
            weeklyMileageGoal: { type: 'number', description: 'Peak weekly running volume in meters' },
            weeklyBikeTssGoal: { type: 'number', description: 'Peak weekly cycling TSS' },
            weeklySwimMetersGoal: { type: 'number', description: 'Peak weekly swim volume in meters' },
            targetWeeklyTss: { type: 'number', description: 'Target weekly total TSS' },
            runsPerWeek: { type: 'number', description: 'Number of runs per week' },
            ridesPerWeek: { type: 'number', description: 'Number of bike rides per week' },
            swimsPerWeek: { type: 'number', description: 'Number of swim sessions per week' },
            strengthPerWeek: { type: 'number', description: 'Number of strength/gym sessions per week' },
            sport: { type: 'string', description: 'Plan sport (RUN, TRIATHLON, CYCLING, NO_RACE)' },
            phaseBlocks: { type: 'array', description: 'Optional custom phaseBlocks override' },
        },
        required: ['name', 'raceType'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;

        if (params.raceDate) {
            const raceDate = new Date(params.raceDate);
            if (isNaN(raceDate.getTime())) {
                throw new Error('Invalid raceDate format');
            }
            if (Math.abs(raceDate.getTime() - Date.now()) > 104 * 7 * 24 * 60 * 60 * 1000) {
                throw new Error('Race date must be within 104 weeks from today');
            }
        }

        const result = await createPlanWithWorkouts({
            userId,
            name: params.name,
            raceType: mapToPrismaRaceType(params.raceType) || ('MARATHON' as RaceType),
            raceDate: params.raceDate || null,
            targetTime: params.targetTime || null,
            planStartDate: params.planStartDate || null,
            weeklyMileageGoal: params.weeklyMileageGoal || null,
            runsPerWeek: params.runsPerWeek ?? null,
            ridesPerWeek: params.ridesPerWeek ?? null,
            swimsPerWeek: params.swimsPerWeek ?? null,
            strengthPerWeek: params.strengthPerWeek ?? null,
            sport: mapToPrismaSport(params.sport),
            deactivateExisting: true,
        });

        if (
            params.phaseBlocks !== undefined ||
            params.weeklyBikeTssGoal !== undefined ||
            params.weeklySwimMetersGoal !== undefined ||
            params.targetWeeklyTss !== undefined ||
            params.strengthPerWeek !== undefined
        ) {
            result.goal = await prisma.goal.update({
                where: { id: result.goal.id },
                data: {
                    ...(params.phaseBlocks !== undefined && { phaseBlocks: params.phaseBlocks }),
                    ...(params.weeklyBikeTssGoal !== undefined && { weeklyBikeTssGoal: params.weeklyBikeTssGoal }),
                    ...(params.weeklySwimMetersGoal !== undefined && { weeklySwimMetersGoal: params.weeklySwimMetersGoal }),
                    ...(params.targetWeeklyTss !== undefined && { targetWeeklyTss: params.targetWeeklyTss }),
                    ...(params.strengthPerWeek !== undefined && { strengthPerWeek: params.strengthPerWeek }),
                },
            });
        }

        await createSnapshot(result.goal.id, 'Initial plan creation via MCP', 'ai_mcp_mutation');
        const safetyAdvisory = await evaluatePlanSafety(result.goal.id);

        return {
            success: true,
            goalId: result.goal.id,
            goal: result.goal,
            safetyAdvisory,
        };
    },
};

export const createCustomTrainingPlanTool: McpTool = {
    name: 'create_custom_training_plan',
    description:
        'Create and persist a fully custom training plan (creationMode: AI_ASSISTED / CUSTOM) with explicit phaseBlocks, multi-sport weekly volume/TSS goals, schedule preferences, and optional initial structured workouts in 1 atomic call without triggering the standard template generator.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        required: ['name', 'sport', 'planStartDate', 'raceDate'],
        properties: {
            name: { type: 'string' },
            sport: {
                type: 'string',
                enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'TRIATHLON', 'DUATHLON', 'CUSTOM'],
            },
            raceType: {
                type: 'string',
                enum: [
                    'FIVE_K',
                    'TEN_K',
                    'HALF_MARATHON',
                    'MARATHON',
                    'ULTRA',
                    'SPRINT_TRI',
                    'OLYMPIC_TRI',
                    'HALF_IRONMAN',
                    'IRONMAN',
                    'GRAN_FONDO',
                    'TIME_TRIAL',
                    'CRITERIUM',
                    'FTP_BUILDER',
                    'GENERAL_FITNESS',
                    'CUSTOM',
                ],
            },
            planStartDate: { type: 'string', description: 'YYYY-MM-DD' },
            raceDate: { type: 'string', description: 'YYYY-MM-DD' },
            setAsActive: { type: 'boolean', description: 'Whether to mark this plan active (default: true)' },
            runsPerWeek: { type: 'number' },
            ridesPerWeek: { type: 'number' },
            swimsPerWeek: { type: 'number' },
            strengthPerWeek: { type: 'number' },
            restDays: { type: 'array', items: { type: 'number' }, description: '0=Sun..6=Sat' },
            longRunDay: { type: 'number' },
            workoutDay: { type: 'number' },
            swimDay: { type: 'number' },
            targetWeeklyTss: { type: 'number' },
            weeklyBikeTssGoal: { type: 'number' },
            weeklyMileageGoal: { type: 'number' },
            weeklySwimMetersGoal: { type: 'number' },
            customDistanceM: { type: 'number' },
            customBikeDistM: { type: 'number' },
            customRunDistM: { type: 'number' },
            customSwimDistM: { type: 'number' },
            priority: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'TUNE_UP', 'MILESTONE'] },
            parentGoalId: { type: 'string' },
            trainingFocus: { type: 'string' },
            phaseBlocks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        phase: { type: 'string' },
                        startWeek: { type: 'number' },
                        endWeek: { type: 'number' },
                        weeklyTssTarget: { type: 'number' },
                        focus: { type: 'string' },
                    },
                },
            },
            workouts: {
                type: 'array',
                description: 'Optional initial structured workouts (max 200) inserted atomically with the plan',
                items: {
                    type: 'object',
                    required: ['scheduledDate', 'workoutType'],
                    properties: {
                        scheduledDate: { type: 'string' },
                        workoutType: { type: 'string' },
                        sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'] },
                        order: { type: 'number' },
                        phase: { type: 'string' },
                        customName: { type: 'string' },
                        description: { type: 'string' },
                        notes: { type: 'string' },
                        targetDuration: { type: 'number' },
                        targetDurationMinutes: { type: 'number' },
                        targetDistance: { type: 'number' },
                        targetFtpPercent: { type: 'number' },
                        targetPowerWatts: { type: 'number' },
                        targetPowerMinWatts: { type: 'number' },
                        targetPowerMaxWatts: { type: 'number' },
                        targetPowerZone: { type: 'number' },
                        targetCadenceRpm: { type: 'number' },
                        targetRpe: { type: 'number' },
                        targetHrZone: { type: 'number' },
                        targetHrMinBpm: { type: 'number' },
                        targetHrMaxBpm: { type: 'number' },
                        targetPace: { type: 'number' },
                        targetPaceMinSecondsPerKm: { type: 'number' },
                        targetPaceMaxSecondsPerKm: { type: 'number' },
                        targetPaceZoneLabel: { type: 'string' },
                        plannedTss: { type: 'number' },
                        structuredSteps: structuredStepsSchema,
                    },
                },
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const startDate = new Date(params.planStartDate);
        const raceDate = new Date(params.raceDate);
        if (isNaN(startDate.getTime()) || isNaN(raceDate.getTime())) {
            throw new Error('Invalid planStartDate or raceDate format');
        }
        if (Array.isArray(params.workouts) && params.workouts.length > 200) {
            throw new Error('Maximum 200 initial workouts per create_custom_training_plan call');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { ftpWatts: true, swimCssSecPer100m: true },
        });
        const ftpWatts = user?.ftpWatts || 200;
        const vdot = 45;
        const setAsActive = params.setAsActive !== undefined ? Boolean(params.setAsActive) : true;
        const planWeeks = Math.max(
            1,
            Math.min(104, Math.ceil((raceDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
        );

        const created = await prisma.$transaction(async tx => {
            if (setAsActive && typeof tx.goal.updateMany === 'function') {
                await tx.goal.updateMany({
                    where: { userId, isActive: true },
                    data: { isActive: false },
                });
            }

            const goal = await tx.goal.create({
                data: {
                    userId,
                    name: String(params.name).trim(),
                    sport: mapToPrismaSport(params.sport),
                    raceType: mapToPrismaRaceType(params.raceType),
                    planStartDate: startDate,
                    raceDate,
                    planWeeks,
                    isActive: setAsActive,
                    creationMode: PlanCreationMode.AI_ASSISTED,
                    planSource: `mcp_custom:${String(params.sport).toLowerCase()}`,
                    trainingFocus: params.trainingFocus || `${params.sport}${params.raceType ? `:${params.raceType}` : ''}`,
                    runsPerWeek: params.runsPerWeek ?? (params.sport === 'BIKE' || params.sport === 'STRENGTH' ? 0 : 4),
                    ridesPerWeek: params.ridesPerWeek ?? (params.sport === 'BIKE' ? 5 : 0),
                    swimsPerWeek: params.swimsPerWeek ?? (params.sport === 'SWIM' ? 3 : 0),
                    strengthPerWeek: params.strengthPerWeek ?? (params.sport === 'STRENGTH' ? 3 : 0),
                    restDays: params.restDays ?? [1, 5],
                    longRunDay: params.longRunDay ?? 0,
                    workoutDay: params.workoutDay ?? 3,
                    swimDay: params.swimDay ?? null,
                    ftpAtCreation: ftpWatts,
                    swimCssAtCreation: user?.swimCssSecPer100m ?? null,
                    currentVdot: vdot,
                    targetWeeklyTss: params.targetWeeklyTss ?? null,
                    weeklyBikeTssGoal: params.weeklyBikeTssGoal ?? null,
                    weeklyMileageGoal: params.weeklyMileageGoal ?? null,
                    weeklySwimMetersGoal: params.weeklySwimMetersGoal ?? null,
                    customDistanceM: params.customDistanceM ?? null,
                    customBikeDistM: params.customBikeDistM ?? null,
                    customRunDistM: params.customRunDistM ?? null,
                    customSwimDistM: params.customSwimDistM ?? null,
                    priority: (params.priority as GoalPriority) || GoalPriority.PRIMARY,
                    parentGoalId: params.parentGoalId ?? null,
                    phaseBlocks: params.phaseBlocks ?? [],
                },
            });

            const importedWorkoutIds: any[] = [];
            if (Array.isArray(params.workouts) && params.workouts.length > 0) {
                const rows = params.workouts.map((raw: any, idx: number) =>
                    buildCanonicalWorkoutData(raw, goal.id, vdot, ftpWatts, typeof raw.order === 'number' ? raw.order : idx)
                );

                for (const row of rows) {
                    const w = await tx.workout.create({ data: row });
                    importedWorkoutIds.push({
                        id: w?.id ?? `custom-${importedWorkoutIds.length + 1}`,
                        scheduledDate: row.scheduledDate.toISOString().split('T')[0],
                        sport: row.sport,
                        workoutType: row.workoutType,
                        customName: row.customName,
                        plannedTss: row.plannedTss,
                    });
                }
            }

            return { goal, importedWorkoutIds };
        });

        const snapshot = await createSnapshot(
            created.goal.id,
            `Create custom training plan "${created.goal.name}" (${created.importedWorkoutIds.length} workouts)`,
            'ai_mcp_custom_plan'
        );
        const safetyAdvisory = await evaluatePlanSafety(created.goal.id);

        return {
            success: true,
            goalId: created.goal.id,
            goal: created.goal,
            importedCount: created.importedWorkoutIds.length,
            importedWorkoutIds: created.importedWorkoutIds,
            snapshotId: snapshot?.id ?? null,
            safetyAdvisory,
        };
    },
};

export const updateTrainingPlanPhasesTool: McpTool = {
    name: 'update_training_plan_phases',
    description:
        'Update plan metadata (name, planStartDate, raceDate, sport, raceType, trainingFocus), weekly frequency/rest days, phaseBlocks, or weekly volume & TSS targets.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID to update (defaults to active plan if omitted)' },
            name: { type: 'string', description: 'Updated plan name' },
            planStartDate: { type: 'string', description: 'Updated plan start date in YYYY-MM-DD' },
            raceDate: { type: 'string', description: 'New race date in YYYY-MM-DD' },
            targetTime: { type: 'number', description: 'Target race time in seconds' },
            sport: { type: 'string', description: 'Updated sport (RUN, BIKE, SWIM, STRENGTH, TRIATHLON, CUSTOM)' },
            raceType: { type: 'string', description: 'Updated raceType' },
            trainingFocus: { type: 'string', description: 'Updated training focus' },
            runsPerWeek: { type: 'number' },
            ridesPerWeek: { type: 'number' },
            swimsPerWeek: { type: 'number' },
            strengthPerWeek: { type: 'number' },
            restDays: { type: 'array', items: { type: 'number' } },
            longRunDay: { type: 'number' },
            workoutDay: { type: 'number' },
            swimDay: { type: 'number' },
            phaseBlocks: { type: 'array', description: 'Updated structured phaseBlocks array' },
            weeklyMileageGoal: { type: 'number', description: 'Peak weekly running distance in meters' },
            weeklyBikeTssGoal: { type: 'number', description: 'Peak weekly cycling TSS' },
            weeklySwimMetersGoal: { type: 'number', description: 'Peak weekly swim volume in meters' },
            targetWeeklyTss: { type: 'number', description: 'Target weekly total TSS' },
            customDistanceM: { type: 'number' },
            customBikeDistM: { type: 'number' },
            customRunDistM: { type: 'number' },
            customSwimDistM: { type: 'number' },
        },
        required: ['goalId'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = await prisma.goal.findFirst({
            where: { id: params.goalId, userId, deletedAt: null },
        });

        if (!goal) throw new Error('Goal not found or access denied');

        await createSnapshot(goal.id, 'Update plan phases and targets via MCP', 'ai_mcp_mutation');

        const updated = await prisma.goal.update({
            where: { id: goal.id },
            data: {
                ...(params.name !== undefined && { name: String(params.name).trim() }),
                ...(params.planStartDate !== undefined && {
                    planStartDate: params.planStartDate ? new Date(params.planStartDate) : null,
                }),
                ...(params.raceDate !== undefined && {
                    raceDate: params.raceDate ? new Date(params.raceDate) : null,
                }),
                ...(params.targetTime !== undefined && { targetTime: params.targetTime }),
                ...(params.sport !== undefined && { sport: mapToPrismaSport(params.sport) }),
                ...(params.raceType !== undefined && { raceType: mapToPrismaRaceType(params.raceType) }),
                ...(params.trainingFocus !== undefined && { trainingFocus: params.trainingFocus }),
                ...(params.runsPerWeek !== undefined && { runsPerWeek: params.runsPerWeek }),
                ...(params.ridesPerWeek !== undefined && { ridesPerWeek: params.ridesPerWeek }),
                ...(params.swimsPerWeek !== undefined && { swimsPerWeek: params.swimsPerWeek }),
                ...(params.strengthPerWeek !== undefined && { strengthPerWeek: params.strengthPerWeek }),
                ...(params.restDays !== undefined && { restDays: params.restDays }),
                ...(params.longRunDay !== undefined && { longRunDay: params.longRunDay }),
                ...(params.workoutDay !== undefined && { workoutDay: params.workoutDay }),
                ...(params.swimDay !== undefined && { swimDay: params.swimDay }),
                ...(params.phaseBlocks !== undefined && { phaseBlocks: params.phaseBlocks }),
                ...(params.weeklyMileageGoal !== undefined && { weeklyMileageGoal: params.weeklyMileageGoal }),
                ...(params.weeklyBikeTssGoal !== undefined && { weeklyBikeTssGoal: params.weeklyBikeTssGoal }),
                ...(params.weeklySwimMetersGoal !== undefined && { weeklySwimMetersGoal: params.weeklySwimMetersGoal }),
                ...(params.targetWeeklyTss !== undefined && { targetWeeklyTss: params.targetWeeklyTss }),
                ...(params.customDistanceM !== undefined && { customDistanceM: params.customDistanceM }),
                ...(params.customBikeDistM !== undefined && { customBikeDistM: params.customBikeDistM }),
                ...(params.customRunDistM !== undefined && { customRunDistM: params.customRunDistM }),
                ...(params.customSwimDistM !== undefined && { customSwimDistM: params.customSwimDistM }),
            },
        });

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            goalId: updated.id,
            updatedGoal: updated,
            safetyAdvisory,
        };
    },
};

export const listTrainingPlansTool: McpTool = {
    name: 'list_training_plans',
    description:
        'List all training plans (active, inactive, completed, or archived) for the athlete with workout counts and target summaries.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            includeArchived: { type: 'boolean', description: 'If true, includes soft-deleted/archived plans (default: false)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const plans = await prisma.goal.findMany({
            where: {
                userId,
                ...(params.includeArchived ? {} : { deletedAt: null }),
            },
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
            include: {
                _count: {
                    select: { workouts: true, snapshots: true },
                },
            },
        });

        return {
            count: plans.length,
            plans: plans.map(p => ({
                id: p.id,
                name: p.name,
                isActive: p.isActive,
                sport: p.sport,
                trainingFocus: p.trainingFocus,
                raceType: p.raceType,
                planStartDate: p.planStartDate,
                raceDate: p.raceDate,
                creationMode: p.creationMode,
                planSource: p.planSource,
                runsPerWeek: p.runsPerWeek,
                ridesPerWeek: p.ridesPerWeek,
                swimsPerWeek: p.swimsPerWeek,
                strengthPerWeek: p.strengthPerWeek,
                targetWeeklyTss: p.targetWeeklyTss,
                weeklyBikeTssGoal: p.weeklyBikeTssGoal,
                weeklyMileageGoal: p.weeklyMileageGoal,
                workoutsCount: (p as any)._count?.workouts ?? 0,
                snapshotsCount: (p as any)._count?.snapshots ?? 0,
                deletedAt: p.deletedAt,
                createdAt: p.createdAt,
            })),
        };
    },
};

export const setActiveTrainingPlanTool: McpTool = {
    name: 'set_active_training_plan',
    description: 'Switch the active training plan (isActive: true) to the specified goalId and deactivate other plans.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        required: ['goalId'],
        properties: {
            goalId: { type: 'string', description: 'Goal ID to activate' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = await prisma.goal.findFirst({
            where: { id: params.goalId, userId },
        });
        if (!goal) throw new Error('Goal not found or access denied');

        const updated = await prisma.$transaction(async tx => {
            if (typeof tx.goal.updateMany === 'function') {
                await tx.goal.updateMany({
                    where: { userId, isActive: true },
                    data: { isActive: false },
                });
            }
            return tx.goal.update({
                where: { id: goal.id },
                data: { isActive: true, deletedAt: null },
            });
        });

        return {
            success: true,
            activeGoalId: updated.id,
            goal: updated,
        };
    },
};

export const deleteTrainingPlanTool: McpTool = {
    name: 'delete_training_plan',
    description:
        'Archive (soft-delete) or permanently delete a training plan by goalId, optionally activating the most recent remaining plan.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
    inputSchema: {
        type: 'object',
        required: ['goalId'],
        properties: {
            goalId: { type: 'string', description: 'Goal ID to archive or delete' },
            permanent: { type: 'boolean', description: 'If true, permanently deletes the Goal row instead of soft-archiving (default: false)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = await prisma.goal.findFirst({
            where: { id: params.goalId, userId },
        });
        if (!goal) throw new Error('Goal not found or access denied');

        if (params.permanent) {
            await prisma.goal.delete({ where: { id: goal.id } });
        } else {
            await prisma.goal.update({
                where: { id: goal.id },
                data: { isActive: false, deletedAt: new Date() },
            });
        }

        let newActiveGoalId: string | null = null;
        if (goal.isActive) {
            const fallback = await prisma.goal.findFirst({
                where: { userId, deletedAt: null, id: { not: goal.id } },
                orderBy: { createdAt: 'desc' },
            });
            if (fallback) {
                await prisma.goal.update({
                    where: { id: fallback.id },
                    data: { isActive: true },
                });
                newActiveGoalId = fallback.id;
            }
        }

        return {
            success: true,
            deletedGoalId: goal.id,
            permanent: Boolean(params.permanent),
            newActiveGoalId,
        };
    },
};

export const listPlanSnapshotsTool: McpTool = {
    name: 'list_plan_snapshots',
    description:
        'List available undo snapshots for a training plan so accidental batch mutations or threshold recalibrations can be inspected and rolled back.',
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID (defaults to active plan)' },
            limit: { type: 'number', description: 'Max snapshots to return (default: 20, max: 50)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!goal) throw new Error('Goal not found or access denied');

        const limit = Math.min(Math.max(params.limit || 20, 1), 50);
        const snapshots = await prisma.planSnapshot.findMany({
            where: {
                goalId: goal.id,
                OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return {
            goalId: goal.id,
            count: snapshots.length,
            snapshots: snapshots.map(s => ({
                id: s.id,
                createdAt: s.createdAt,
                operation: s.operation,
                description: s.description,
                workoutsCount: Array.isArray(s.snapshot) ? s.snapshot.length : 0,
            })),
        };
    },
};

export const restorePlanSnapshotTool: McpTool = {
    name: 'restore_plan_snapshot',
    description:
        'Atomically roll back a training plan to a specified snapshotId (or the most recent undo snapshot) in a single transaction after taking a pre-restore safety backup.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID (defaults to active plan)' },
            snapshotId: { type: 'string', description: 'Optional Snapshot ID to restore (defaults to latest undo snapshot)' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!goal) throw new Error('Goal not found or access denied');

        const restored = await restoreFromSnapshot(goal.id, params.snapshotId, true);
        if (!restored) {
            throw new Error('Snapshot could not be restored');
        }

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            goalId: goal.id,
            restoredSnapshotId: restored.id,
            restoredDescription: restored.description,
            restoredWorkoutsCount: Array.isArray(restored.snapshot) ? restored.snapshot.length : 0,
            safetyAdvisory,
        };
    },
};

export const recalibrateThresholdsTool: McpTool = {
    name: 'recalibrate_thresholds',
    description:
        'Update athlete thresholds (VDOT, Bike FTP, Swim CSS, HR zones), recalculate future workout paces/targets, and update fitness cache. Preserves explicit/custom plannedTss on cycling workouts by default unless recalculateTssFromSteps: true is passed.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            vdot: { type: 'number', description: 'New VDOT score' },
            ftpWatts: { type: 'number', description: 'New Cycling FTP in Watts' },
            swimCssSecPer100m: { type: 'number', description: 'New Swim CSS in seconds per 100m' },
            thresholdHeartRate: { type: 'number', description: 'Lactate threshold heart rate in bpm' },
            hrMax: { type: 'number', description: 'Maximum heart rate in bpm' },
            hrRest: { type: 'number', description: 'Resting heart rate in bpm' },
            hrZone1Max: { type: 'number' },
            hrZone2Max: { type: 'number' },
            hrZone3Max: { type: 'number' },
            hrZone4Max: { type: 'number' },
            hrZone5Max: { type: 'number' },
            hrZone6Max: { type: 'number' },
            preserveCustomWorkoutTss: {
                type: 'boolean',
                description: 'If true (default), preserves explicit/locked plannedTss on cycling workouts instead of overwriting from generic engine step templates.',
            },
            recalculateTssFromSteps: {
                type: 'boolean',
                description: 'If true (default: false), forces recalculation of plannedTss from structuredSteps across all future workouts.',
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;

        await prisma.user.update({
            where: { id: userId },
            data: {
                ...(params.ftpWatts !== undefined && { ftpWatts: params.ftpWatts }),
                ...(params.swimCssSecPer100m !== undefined && { swimCssSecPer100m: params.swimCssSecPer100m }),
                ...(params.thresholdHeartRate !== undefined && { thresholdHeartRate: params.thresholdHeartRate }),
                ...(params.hrMax !== undefined && { hrMax: params.hrMax }),
                ...(params.hrRest !== undefined && { hrRest: params.hrRest }),
                ...(params.hrZone1Max !== undefined && { hrZone1Max: params.hrZone1Max }),
                ...(params.hrZone2Max !== undefined && { hrZone2Max: params.hrZone2Max }),
                ...(params.hrZone3Max !== undefined && { hrZone3Max: params.hrZone3Max }),
                ...(params.hrZone4Max !== undefined && { hrZone4Max: params.hrZone4Max }),
                ...(params.hrZone5Max !== undefined && { hrZone5Max: params.hrZone5Max }),
                ...(params.hrZone6Max !== undefined && { hrZone6Max: params.hrZone6Max }),
            },
        });

        const activeGoal = await prisma.goal.findFirst({
            where: { userId, isActive: true, deletedAt: null },
        });

        let safetyAdvisory: any[] = [];
        let updatedBikeWorkoutsCount = 0;
        let preservedTssCount = 0;

        if (activeGoal) {
            await createSnapshot(activeGoal.id, 'Recalibrate thresholds via MCP', 'ai_mcp_mutation');

            if (params.vdot !== undefined || params.thresholdHeartRate !== undefined || params.hrMax !== undefined) {
                const effectiveVdot = params.vdot || activeGoal.currentVdot || 45;
                await recalculateWorkoutPaces(activeGoal.id, effectiveVdot, {
                    thresholdHeartRate: params.thresholdHeartRate,
                    hrMax: params.hrMax,
                    hrRest: params.hrRest,
                    hrZone1Max: params.hrZone1Max,
                    hrZone2Max: params.hrZone2Max,
                    hrZone3Max: params.hrZone3Max,
                    hrZone4Max: params.hrZone4Max,
                    hrZone5Max: params.hrZone5Max,
                    hrZone6Max: params.hrZone6Max,
                });
            }

            if (params.ftpWatts !== undefined) {
                const preserveCustom =
                    params.preserveCustomWorkoutTss !== undefined ? Boolean(params.preserveCustomWorkoutTss) : true;
                const forceRecalc = Boolean(params.recalculateTssFromSteps);
                const oldFtp = activeGoal.ftpAtCreation || params.ftpWatts;

                const bikeWorkouts = await prisma.workout.findMany({
                    where: {
                        goalId: activeGoal.id,
                        isCompleted: false,
                        sport: 'BIKE',
                    },
                });

                for (const bw of bikeWorkouts) {
                    const stepsObj = bw.structuredSteps as any;
                    const stepSource = stepsObj?.source;
                    const hasLockedTss =
                        typeof stepsObj?.lockedPlannedTss === 'number' ||
                        (bw.plannedTss === 0) ||
                        (preserveCustom && bw.plannedTss != null && stepSource === 'engine');

                    const shouldRecomputeTss =
                        forceRecalc ||
                        bw.plannedTss == null ||
                        (!hasLockedTss && (stepSource === 'mcp' || stepSource === 'editor'));

                    const newTss = shouldRecomputeTss
                        ? calculateWorkoutPlannedTss({
                              workoutType: bw.workoutType,
                              sport: 'BIKE',
                              targetDistance: bw.targetDistance || 0,
                              targetDuration: bw.targetDuration || null,
                              structuredSteps: bw.structuredSteps || null,
                              ftpWatts: params.ftpWatts,
                          })
                        : bw.plannedTss;

                    if (!shouldRecomputeTss) {
                        preservedTssCount++;
                    }

                    const scaledPowerWatts =
                        bw.targetFtpPercent && bw.targetFtpPercent > 0
                            ? Math.round((params.ftpWatts * bw.targetFtpPercent) / 100)
                            : bw.targetPowerWatts && oldFtp > 0
                            ? Math.round((bw.targetPowerWatts * params.ftpWatts) / oldFtp)
                            : bw.targetPowerWatts;

                    await prisma.workout.update({
                        where: { id: bw.id },
                        data: {
                            plannedTss: newTss,
                            ...(scaledPowerWatts !== undefined && { targetPowerWatts: scaledPowerWatts }),
                        },
                    });
                    updatedBikeWorkoutsCount++;
                }

                await prisma.goal.update({
                    where: { id: activeGoal.id },
                    data: { ftpAtCreation: params.ftpWatts },
                });
            }

            await updateFitnessCache(userId, [{ startDate: new Date() }]).catch(() => {});
            safetyAdvisory = await evaluatePlanSafety(activeGoal.id);
        }

        return {
            success: true,
            updatedThresholds: params,
            updatedBikeWorkoutsCount,
            preservedTssCount,
            safetyAdvisory,
        };
    },
};

export const saveWeeklyCoachingSummaryTool: McpTool = {
    name: 'save_weekly_coaching_summary',
    description:
        'Save, update, or delete a weekly coaching advice summary with action items in plan snapshots (rendered on calendar and plan header).',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID (defaults to active plan)' },
            snapshotId: { type: 'string', description: 'Optional existing coaching summary snapshotId to update or delete' },
            delete: { type: 'boolean', description: 'If true and snapshotId is provided, deletes the coaching summary' },
            weekNumber: { type: 'number', description: 'Training plan week number' },
            startDate: { type: 'string', description: 'Start date of the week in YYYY-MM-DD' },
            summary: { type: 'string', description: 'Markdown-formatted coaching summary' },
            actionItems: { type: 'array', items: { type: 'string' }, description: 'Specific focus action items' },
        },
        required: ['summary'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const targetGoal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!targetGoal) throw new Error('Goal not found or access denied');

        if (params.snapshotId && params.delete) {
            await prisma.planSnapshot.deleteMany({
                where: { id: params.snapshotId, goalId: targetGoal.id, operation: 'coaching_summary' },
            });
            return {
                success: true,
                deletedSnapshotId: params.snapshotId,
                operation: 'coaching_summary',
            };
        }

        if (params.snapshotId) {
            const updated = await prisma.planSnapshot.update({
                where: { id: params.snapshotId },
                data: {
                    snapshot: {
                        weekNumber: params.weekNumber,
                        startDate: params.startDate,
                        summary: params.summary,
                        actionItems: params.actionItems || [],
                    } as unknown as object[],
                    description: String(params.summary).slice(0, 1000),
                },
            });
            return {
                success: true,
                snapshotId: updated.id,
                operation: 'coaching_summary',
            };
        }

        const snapshot = await prisma.planSnapshot.create({
            data: {
                goalId: targetGoal.id,
                snapshot: {
                    weekNumber: params.weekNumber,
                    startDate: params.startDate,
                    summary: params.summary,
                    actionItems: params.actionItems || [],
                } as unknown as object[],
                description: String(params.summary).slice(0, 1000),
                operation: 'coaching_summary',
            },
        });

        return {
            success: true,
            snapshotId: snapshot.id,
            operation: 'coaching_summary',
        };
    },
};

export const PLAN_MCP_TOOLS: McpTool[] = [
    getTrainingPlanTool,
    createTrainingPlanTool,
    createCustomTrainingPlanTool,
    updateTrainingPlanPhasesTool,
    listTrainingPlansTool,
    setActiveTrainingPlanTool,
    deleteTrainingPlanTool,
    listPlanSnapshotsTool,
    restorePlanSnapshotTool,
    recalibrateThresholdsTool,
    saveWeeklyCoachingSummaryTool,
];
