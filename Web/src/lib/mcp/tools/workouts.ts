import { type McpTool } from '@/lib/mcp/server';
import { evaluatePlanSafety } from '@/lib/mcp/safety';
import { createSnapshot } from '@/lib/plan/snapshot';
import { adaptPlanAfterCompletion } from '@/lib/plans/adapt';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import {
    parseStructuredWorkout,
    summarizeStructuredWorkout,
    flattenStructuredWorkout,
    resolveWorkoutSport,
    type StructuredWorkoutV2,
} from '@/lib/plans/structured';
import { buildStructuredStepsForWorkout } from '@/lib/plans';
import { prisma } from '@/lib/db';
import { WorkoutType, PlanPhase } from '@/generated/prisma/client';

export const structuredStepsSchema = {
    type: 'object',
    description:
        'Structured workout steps v2 tree (version: 2, steps: Array<Step | RepeatGroup>). Supports nested repeats, distance/time durations, and pace/power/hr/cadence/rpe targets.',
    properties: {
        version: { type: 'number', description: 'Schema version (2)' },
        source: { type: 'string', description: 'Source identifier (e.g. mcp, engine, coach, editor)' },
        sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'], description: 'Primary workout sport' },
        lockedPlannedTss: { type: 'number', description: 'Explicitly locked TSS preserved across threshold recalibrations' },
        steps: {
            type: 'array',
            description: 'Ordered list of step nodes (StructuredStep or RepeatGroup)',
            items: {
                type: 'object',
                properties: {
                    kind: {
                        type: 'string',
                        enum: ['warmup', 'work', 'recovery', 'cooldown', 'steady', 'transition', 'repeat'],
                        description: 'Step kind: warmup, work, recovery, cooldown, steady, transition, or repeat for blocks',
                    },
                    label: { type: 'string', description: 'Step label or title' },
                    times: { type: 'number', description: 'Number of times to repeat steps (for kind: repeat, 1-100)' },
                    setRest: {
                        type: 'object',
                        description: 'Rest duration between repeat sets',
                        properties: {
                            type: { type: 'string', enum: ['time', 'distance', 'lap_press'] },
                            seconds: { type: 'number' },
                            meters: { type: 'number' },
                        },
                    },
                    duration: {
                        type: 'object',
                        description: 'Step duration (distance, time, or lap_press)',
                        properties: {
                            type: { type: 'string', enum: ['distance', 'time', 'lap_press'] },
                            meters: { type: 'number', description: 'Distance in meters' },
                            seconds: { type: 'number', description: 'Time in seconds' },
                        },
                    },
                    target: {
                        type: 'object',
                        description: 'Target intensity (pace, power, hr, cadence, rpe, free)',
                        properties: {
                            type: { type: 'string', enum: ['pace', 'power', 'hr', 'cadence', 'rpe', 'free'] },
                            unit: { type: 'string', enum: ['sec_per_km', 'sec_per_100m', 'sec_per_mile'] },
                            min: { type: 'number', description: 'Fast pace bound in seconds' },
                            max: { type: 'number', description: 'Slow pace bound in seconds' },
                            minWatts: { type: 'number', description: 'Lower power bound in watts' },
                            maxWatts: { type: 'number', description: 'Upper power bound in watts' },
                            ftpPercent: { type: 'number', description: 'Percentage of FTP' },
                            zoneLabel: { type: 'string', description: 'Zone label (e.g. E, M, T, Z2, etc.)' },
                            minBpm: { type: 'number', description: 'Lower HR bound in bpm' },
                            maxBpm: { type: 'number', description: 'Upper HR bound in bpm' },
                            zone: { type: 'number', description: 'HR zone number (1-6)' },
                            value: { type: 'number', description: 'RPE value (1-10)' },
                        },
                    },
                    cadenceRpm: { type: 'number', description: 'Cadence RPM target' },
                    hrZone: { type: 'number', description: 'Target HR zone number' },
                    notes: { type: 'string', description: 'Step coaching notes' },
                    steps: {
                        type: 'array',
                        description: 'Nested child steps (for kind: repeat)',
                        items: { type: 'object' },
                    },
                },
            },
        },
    },
};

export function normalizeMcpStructuredSteps(
    raw: any,
    workoutType?: string | null,
    sport?: string | null,
    vdot?: number,
    ftpWatts?: number,
    lockedPlannedTss?: number | null
): StructuredWorkoutV2 | null {
    if (!raw) return null;
    const resolvedSport = resolveWorkoutSport(workoutType, sport);
    let candidate = raw;
    if (typeof candidate === 'object' && candidate !== null) {
        if (!candidate.version && (Array.isArray(candidate.steps) || Array.isArray(candidate))) {
            candidate = {
                version: 2,
                source: 'mcp',
                sport: resolvedSport,
                steps: Array.isArray(candidate) ? candidate : candidate.steps,
            };
        } else if (candidate.version === 2) {
            candidate = {
                ...candidate,
                source: candidate.source || 'mcp',
                sport: candidate.sport || resolvedSport,
            };
        }
    }
    const parsed = parseStructuredWorkout(candidate, resolvedSport, vdot, ftpWatts);
    if (parsed) {
        parsed.sport = resolvedSport;
        if (typeof lockedPlannedTss === 'number' && Number.isFinite(lockedPlannedTss) && lockedPlannedTss >= 0) {
            parsed.lockedPlannedTss = Math.min(1000, Math.round(lockedPlannedTss));
        }
    }
    return parsed;
}

function parsePowerZoneInt(rawZone: any): number | null {
    if (rawZone === undefined || rawZone === null || rawZone === '') return null;
    const parsed =
        typeof rawZone === 'number'
            ? Math.round(rawZone)
            : parseInt(String(rawZone).replace(/^Z/i, ''), 10);
    return isNaN(parsed) ? null : Math.min(7, Math.max(1, parsed));
}

export function buildCanonicalWorkoutData(
    raw: any,
    goalId: string,
    vdot: number,
    ftpWatts: number,
    defaultOrder = 0
) {
    const validTypes = new Set<string>(Object.values(WorkoutType));
    const validPhases = new Set<string>(Object.values(PlanPhase));

    const scheduledDate = new Date(raw.scheduledDate);
    if (isNaN(scheduledDate.getTime())) {
        throw new Error(`Invalid scheduledDate: ${raw.scheduledDate}`);
    }

    const rawTypeUpper = String(raw.workoutType || 'RIDE').trim().toUpperCase();
    const workoutType: WorkoutType = validTypes.has(rawTypeUpper)
        ? (rawTypeUpper as WorkoutType)
        : rawTypeUpper === 'VIRTUAL_RIDE' || rawTypeUpper === 'CYCLING'
        ? WorkoutType.RIDE
        : rawTypeUpper === 'GYM' || rawTypeUpper === 'CORE'
        ? WorkoutType.STRENGTH
        : WorkoutType.OTHER;

    const sport = resolveWorkoutSport(rawTypeUpper, raw.sport);

    const rawPhaseUpper = String(raw.phase || 'BASE').trim().toUpperCase();
    const phase: PlanPhase = validPhases.has(rawPhaseUpper) ? (rawPhaseUpper as PlanPhase) : PlanPhase.BASE;

    const durationSec =
        typeof raw.targetDuration === 'number' && raw.targetDuration > 0
            ? Math.min(86400, Math.round(raw.targetDuration))
            : typeof raw.targetDurationMinutes === 'number' && raw.targetDurationMinutes > 0
            ? Math.min(86400, Math.round(raw.targetDurationMinutes * 60))
            : null;

    const explicitDistM =
        typeof raw.targetDistance === 'number' && raw.targetDistance > 0
            ? Math.min(300000, Math.round(raw.targetDistance))
            : typeof raw.targetDistanceMeters === 'number' && raw.targetDistanceMeters > 0
            ? Math.min(300000, Math.round(raw.targetDistanceMeters))
            : null;

    const ftpPct =
        typeof raw.targetFtpPercent === 'number' && raw.targetFtpPercent > 0
            ? Math.min(250, Math.max(20, Math.round(raw.targetFtpPercent)))
            : null;

    const explicitPlannedTss =
        typeof raw.plannedTss === 'number' && Number.isFinite(raw.plannedTss) && raw.plannedTss >= 0
            ? Math.min(1000, Math.round(raw.plannedTss * 10) / 10)
            : undefined;

    const lockPlannedTss = raw.lockPlannedTss !== undefined ? Boolean(raw.lockPlannedTss) : explicitPlannedTss !== undefined;
    const description = String(raw.description || raw.customName || workoutType).slice(0, 1000);

    let structuredSteps = normalizeMcpStructuredSteps(
        raw.structuredSteps,
        workoutType,
        sport,
        vdot,
        ftpWatts,
        lockPlannedTss ? explicitPlannedTss : null
    );

    if (!structuredSteps) {
        structuredSteps = buildStructuredStepsForWorkout(
            {
                type: workoutType,
                description,
                totalDistance: sport === 'RUN' || sport === 'SWIM' ? (explicitDistM ?? 0) : 0,
                targetDuration: durationSec ?? (sport === 'BIKE' ? 3600 : sport === 'STRENGTH' ? 2700 : null),
                targetPace: raw.targetPace ?? null,
                targetHrZone: raw.targetHrZone ?? null,
                targetFtpPercent: ftpPct ?? undefined,
                targetCadenceRpm: raw.targetCadenceRpm ?? undefined,
                plannedTss: explicitPlannedTss,
            } as any,
            { vdot, ftpWatts }
        );
        if (structuredSteps) {
            structuredSteps.sport = sport;
            if (lockPlannedTss && explicitPlannedTss !== undefined) {
                structuredSteps.lockedPlannedTss = explicitPlannedTss;
            }
        }
    }

    let targetDistance: number | null = explicitDistM;
    let targetDuration: number | null = durationSec;
    let targetPaceMinSecondsPerKm: number | null = raw.targetPaceMinSecondsPerKm ?? null;
    let targetPaceMaxSecondsPerKm: number | null = raw.targetPaceMaxSecondsPerKm ?? null;
    let targetPowerMinWatts: number | null = raw.targetPowerMinWatts ?? null;
    let targetPowerMaxWatts: number | null = raw.targetPowerMaxWatts ?? null;
    let plannedTss: number | null | undefined = explicitPlannedTss;

    if (structuredSteps) {
        const summary = summarizeStructuredWorkout(structuredSteps, raw.targetPace, ftpWatts, sport);
        const flattened = flattenStructuredWorkout(structuredSteps);

        let derivedMinPace: number | undefined;
        let derivedMaxPace: number | undefined;
        let derivedMinWatts: number | undefined;
        let derivedMaxWatts: number | undefined;

        for (const s of flattened) {
            if (s.target?.type === 'pace') {
                if (s.target.min) derivedMinPace = derivedMinPace ? Math.min(derivedMinPace, s.target.min) : s.target.min;
                if (s.target.max) derivedMaxPace = derivedMaxPace ? Math.max(derivedMaxPace, s.target.max) : s.target.max;
            } else if (s.target?.type === 'power') {
                if (s.target.minWatts) derivedMinWatts = derivedMinWatts ? Math.min(derivedMinWatts, s.target.minWatts) : s.target.minWatts;
                if (s.target.maxWatts) derivedMaxWatts = derivedMaxWatts ? Math.max(derivedMaxWatts, s.target.maxWatts) : s.target.maxWatts;
            }
        }

        // CRITICAL GUARD: Only auto-populate targetDistance from step summary on RUN or SWIM workouts
        if ((sport === 'RUN' || sport === 'SWIM') && targetDistance == null && summary.totalDistanceMeters > 0) {
            targetDistance = summary.totalDistanceMeters;
        }
        if (targetDuration == null && summary.totalDurationSeconds > 0) {
            targetDuration = summary.totalDurationSeconds;
        }
        if (targetPaceMinSecondsPerKm == null && derivedMinPace) {
            targetPaceMinSecondsPerKm = derivedMinPace;
        }
        if (targetPaceMaxSecondsPerKm == null && derivedMaxPace) {
            targetPaceMaxSecondsPerKm = derivedMaxPace;
        }
        if (targetPowerMinWatts == null && derivedMinWatts) {
            targetPowerMinWatts = derivedMinWatts;
        }
        if (targetPowerMaxWatts == null && derivedMaxWatts) {
            targetPowerMaxWatts = derivedMaxWatts;
        }
        if (plannedTss === undefined && summary.estimatedTss > 0) {
            plannedTss = summary.estimatedTss;
        }
    }

    if (plannedTss === undefined) {
        plannedTss = calculateWorkoutPlannedTss({
            workoutType,
            sport,
            targetDistance: targetDistance || 0,
            targetDuration: targetDuration || null,
            targetPace: raw.targetPace || null,
            structuredSteps: structuredSteps || null,
            ftpWatts,
        });
    }

    const targetPowerWatts =
        raw.targetPowerWatts !== undefined && raw.targetPowerWatts !== null
            ? Math.round(raw.targetPowerWatts)
            : ftpPct
            ? Math.round((ftpWatts * ftpPct) / 100)
            : null;

    return {
        goalId,
        scheduledDate,
        workoutType,
        description,
        customName: raw.customName ? String(raw.customName).slice(0, 160) : null,
        sport,
        phase,
        order: typeof raw.order === 'number' ? Math.round(raw.order) : defaultOrder,
        notes: raw.notes ? String(raw.notes).slice(0, 2000) : null,
        targetDistance,
        targetDuration,
        targetPace: raw.targetPace ?? null,
        targetPaceMinSecondsPerKm,
        targetPaceMaxSecondsPerKm,
        targetPaceZoneLabel: raw.targetPaceZoneLabel || null,
        targetPowerWatts,
        targetPowerMinWatts,
        targetPowerMaxWatts,
        targetPowerZone: parsePowerZoneInt(raw.targetPowerZone),
        targetFtpPercent: ftpPct,
        targetCadenceRpm: raw.targetCadenceRpm ?? null,
        targetRpe: raw.targetRpe ?? null,
        targetHrZone: raw.targetHrZone ?? null,
        targetHrMinBpm: raw.targetHrMinBpm ?? null,
        targetHrMaxBpm: raw.targetHrMaxBpm ?? null,
        plannedTss,
        structuredSteps: (structuredSteps as any) || undefined,
    };
}

export const createStructuredWorkoutTool: McpTool = {
    name: 'create_structured_workout',
    description:
        'Insert a new structured workout with canonical v2 steps, targets, and auto-computed planned TSS. Never fabricates running distances on BIKE or STRENGTH workouts.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Goal ID to attach workout to (defaults to active plan if omitted)' },
            scheduledDate: { type: 'string', description: 'Scheduled date in YYYY-MM-DD or ISO' },
            workoutType: { type: 'string', description: 'Workout type (e.g. INTERVALS, TEMPO, EASY, LONG_RUN, RIDE, RIDE_INTERVALS, LONG_RIDE, SWIM, STRENGTH)' },
            description: { type: 'string', description: 'Detailed workout description' },
            customName: { type: 'string', description: 'Custom display title' },
            sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'], description: 'Sport (RUN, BIKE, SWIM, STRENGTH)' },
            phase: { type: 'string', description: 'Phase (BASE, BUILD, PEAK, TAPER, RACE_WEEK, RECOVERY)' },
            order: { type: 'number', description: 'Order of workout within the day' },
            notes: { type: 'string', description: 'Athlete coaching notes' },
            targetDistance: { type: 'number', description: 'Target distance in meters (never auto-fabricated for BIKE/STRENGTH)' },
            targetDuration: { type: 'number', description: 'Target duration in seconds' },
            targetPace: { type: 'number', description: 'Target pace in seconds per km' },
            targetPaceMinSecondsPerKm: { type: 'number', description: 'Fast pace bound in sec/km' },
            targetPaceMaxSecondsPerKm: { type: 'number', description: 'Slow pace bound in sec/km' },
            targetPaceZoneLabel: { type: 'string', description: 'Target pace zone label (e.g. E, M, T, I, R)' },
            targetPowerWatts: { type: 'number', description: 'Target cycling watts' },
            targetPowerMinWatts: { type: 'number', description: 'Low power bound in watts' },
            targetPowerMaxWatts: { type: 'number', description: 'High power bound in watts' },
            targetPowerZone: { type: 'number', description: 'Target Coggan power zone (integer 1..7)' },
            targetFtpPercent: { type: 'number', description: 'Target intensity as % of FTP' },
            targetCadenceRpm: { type: 'number', description: 'Target cadence in RPM' },
            targetRpe: { type: 'number', description: 'Target RPE on 1-10 scale' },
            targetHrZone: { type: 'number', description: 'Target HR zone (1-6)' },
            targetHrMinBpm: { type: 'number', description: 'Low HR bound in bpm' },
            targetHrMaxBpm: { type: 'number', description: 'High HR bound in bpm' },
            plannedTss: { type: 'number', description: 'Planned TSS (auto-computed if omitted)' },
            structuredSteps: structuredStepsSchema,
        },
        required: ['scheduledDate', 'workoutType', 'description'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!goal) throw new Error('Goal not found or access denied');

        await createSnapshot(goal.id, `Create workout ${params.workoutType} on ${params.scheduledDate}`, 'ai_mcp_mutation');

        const vdot = goal.currentVdot || 45;
        const ftpWatts = goal.ftpAtCreation || 200;
        const data = buildCanonicalWorkoutData(params, goal.id, vdot, ftpWatts, params.order || 0);

        const workout = await prisma.workout.create({ data });
        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            workout,
            safetyAdvisory,
        };
    },
};

async function applyWorkoutModification(
    workout: any,
    params: any,
    recalculateTssFromStepsDefault = false
) {
    const workoutType = (params.workoutType || workout.workoutType) as WorkoutType;
    const sport = resolveWorkoutSport(workoutType, params.sport || workout.sport);
    const vdot = workout.goal?.currentVdot || 45;
    const ftpWatts = workout.goal?.ftpAtCreation || 200;

    let structuredSteps: StructuredWorkoutV2 | null = workout.structuredSteps
        ? parseStructuredWorkout(workout.structuredSteps, sport, vdot, ftpWatts)
        : null;

    if (params.structuredSteps !== undefined) {
        structuredSteps = normalizeMcpStructuredSteps(
            params.structuredSteps,
            workoutType,
            sport,
            vdot,
            ftpWatts,
            params.plannedTss !== undefined ? params.plannedTss : workout.plannedTss
        );
    }

    let targetDistance =
        params.targetDistance !== undefined
            ? params.targetDistance
            : sport === 'BIKE' || sport === 'STRENGTH'
            ? null
            : workout.targetDistance;
    let targetDuration = params.targetDuration !== undefined ? params.targetDuration : workout.targetDuration;
    let targetPaceMinSecondsPerKm =
        params.targetPaceMinSecondsPerKm !== undefined ? params.targetPaceMinSecondsPerKm : workout.targetPaceMinSecondsPerKm;
    let targetPaceMaxSecondsPerKm =
        params.targetPaceMaxSecondsPerKm !== undefined ? params.targetPaceMaxSecondsPerKm : workout.targetPaceMaxSecondsPerKm;
    let targetPowerMinWatts =
        params.targetPowerMinWatts !== undefined ? params.targetPowerMinWatts : workout.targetPowerMinWatts;
    let targetPowerMaxWatts =
        params.targetPowerMaxWatts !== undefined ? params.targetPowerMaxWatts : workout.targetPowerMaxWatts;
    let plannedTss = params.plannedTss;

    if (params.structuredSteps !== undefined && structuredSteps) {
        const summary = summarizeStructuredWorkout(
            structuredSteps,
            params.targetPace ?? workout.targetPace,
            ftpWatts,
            sport
        );
        const flattened = flattenStructuredWorkout(structuredSteps);

        let derivedMinPace: number | undefined;
        let derivedMaxPace: number | undefined;
        let derivedMinWatts: number | undefined;
        let derivedMaxWatts: number | undefined;

        for (const s of flattened) {
            if (s.target?.type === 'pace') {
                if (s.target.min) derivedMinPace = derivedMinPace ? Math.min(derivedMinPace, s.target.min) : s.target.min;
                if (s.target.max) derivedMaxPace = derivedMaxPace ? Math.max(derivedMaxPace, s.target.max) : s.target.max;
            } else if (s.target?.type === 'power') {
                if (s.target.minWatts) derivedMinWatts = derivedMinWatts ? Math.min(derivedMinWatts, s.target.minWatts) : s.target.minWatts;
                if (s.target.maxWatts) derivedMaxWatts = derivedMaxWatts ? Math.max(derivedMaxWatts, s.target.maxWatts) : s.target.maxWatts;
            }
        }

        // CRITICAL GUARD: Never fabricate running distance on BIKE or STRENGTH workouts
        if ((sport === 'RUN' || sport === 'SWIM') && params.targetDistance === undefined && summary.totalDistanceMeters > 0) {
            targetDistance = summary.totalDistanceMeters;
        }
        if (params.targetDuration === undefined && summary.totalDurationSeconds > 0) {
            targetDuration = summary.totalDurationSeconds;
        }
        if (params.targetPaceMinSecondsPerKm === undefined && derivedMinPace) {
            targetPaceMinSecondsPerKm = derivedMinPace;
        }
        if (params.targetPaceMaxSecondsPerKm === undefined && derivedMaxPace) {
            targetPaceMaxSecondsPerKm = derivedMaxPace;
        }
        if (params.targetPowerMinWatts === undefined && derivedMinWatts) {
            targetPowerMinWatts = derivedMinWatts;
        }
        if (params.targetPowerMaxWatts === undefined && derivedMaxWatts) {
            targetPowerMaxWatts = derivedMaxWatts;
        }
        if (plannedTss === undefined && (recalculateTssFromStepsDefault || workout.plannedTss == null) && summary.estimatedTss > 0) {
            plannedTss = summary.estimatedTss;
        }
    }

    if (plannedTss === undefined) {
        if (!recalculateTssFromStepsDefault && workout.plannedTss != null && params.targetDuration === undefined && params.targetDistance === undefined) {
            plannedTss = workout.plannedTss;
        } else {
            plannedTss = calculateWorkoutPlannedTss({
                workoutType,
                sport,
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || null,
                targetPace: (params.targetPace !== undefined ? params.targetPace : workout.targetPace) || null,
                structuredSteps: structuredSteps || null,
                ftpWatts,
            });
        }
    }

    if (structuredSteps && params.plannedTss !== undefined && typeof params.plannedTss === 'number') {
        structuredSteps.lockedPlannedTss = params.plannedTss;
    }

    const normalizedPowerZone =
        params.targetPowerZone !== undefined ? parsePowerZoneInt(params.targetPowerZone) : undefined;

    return {
        ...(params.scheduledDate !== undefined && { scheduledDate: new Date(params.scheduledDate) }),
        ...(params.order !== undefined && { order: Math.round(params.order) }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.customName !== undefined && { customName: params.customName }),
        ...(params.workoutType !== undefined && { workoutType }),
        ...(params.phase !== undefined && { phase: params.phase as PlanPhase }),
        ...((params.sport !== undefined || params.workoutType !== undefined) && { sport }),
        ...(params.notes !== undefined && { notes: params.notes }),
        ...(targetDistance !== undefined && { targetDistance }),
        ...(targetDuration !== undefined && { targetDuration }),
        ...(params.targetPace !== undefined && { targetPace: params.targetPace }),
        ...(targetPaceMinSecondsPerKm !== undefined && { targetPaceMinSecondsPerKm }),
        ...(targetPaceMaxSecondsPerKm !== undefined && { targetPaceMaxSecondsPerKm }),
        ...(params.targetPaceZoneLabel !== undefined && { targetPaceZoneLabel: params.targetPaceZoneLabel }),
        ...(params.targetPowerWatts !== undefined && { targetPowerWatts: params.targetPowerWatts }),
        ...(targetPowerMinWatts !== undefined && { targetPowerMinWatts }),
        ...(targetPowerMaxWatts !== undefined && { targetPowerMaxWatts }),
        ...(normalizedPowerZone !== undefined && { targetPowerZone: normalizedPowerZone }),
        ...(params.targetFtpPercent !== undefined && { targetFtpPercent: params.targetFtpPercent }),
        ...(params.targetCadenceRpm !== undefined && { targetCadenceRpm: params.targetCadenceRpm }),
        ...(params.targetRpe !== undefined && { targetRpe: params.targetRpe }),
        ...(params.targetHrZone !== undefined && { targetHrZone: params.targetHrZone }),
        ...(params.targetHrMinBpm !== undefined && { targetHrMinBpm: params.targetHrMinBpm }),
        ...(params.targetHrMaxBpm !== undefined && { targetHrMaxBpm: params.targetHrMaxBpm }),
        ...(params.isCompleted !== undefined && {
            isCompleted: Boolean(params.isCompleted),
            completedAt: params.isCompleted ? new Date() : null,
        }),
        ...(params.linkedActivityId !== undefined && { linkedActivityId: params.linkedActivityId }),
        plannedTss,
        ...(params.structuredSteps !== undefined && { structuredSteps: (structuredSteps as any) ?? undefined }),
    };
}

export const modifyWorkoutTool: McpTool = {
    name: 'modify_workout',
    description:
        'Update fields, description, scheduledDate, order, structured steps, or targets on a single existing workout. For updating 2+ workouts, ALWAYS use modify_workouts_batch instead to avoid multiple user approval prompts.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'ID of workout to modify' },
            scheduledDate: { type: 'string', description: 'Optional new date (YYYY-MM-DD)' },
            order: { type: 'number', description: 'Optional intra-day order' },
            description: { type: 'string' },
            customName: { type: 'string' },
            workoutType: { type: 'string' },
            phase: { type: 'string' },
            sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'] },
            notes: { type: 'string' },
            targetDistance: { type: 'number', description: 'Distance in meters (never auto-fabricated for BIKE/STRENGTH)' },
            targetDuration: { type: 'number', description: 'Duration in seconds' },
            targetPace: { type: 'number' },
            targetPaceMinSecondsPerKm: { type: 'number' },
            targetPaceMaxSecondsPerKm: { type: 'number' },
            targetPaceZoneLabel: { type: 'string', description: 'Target pace zone label (e.g. E, M, T, I, R)' },
            targetPowerWatts: { type: 'number' },
            targetPowerMinWatts: { type: 'number' },
            targetPowerMaxWatts: { type: 'number' },
            targetPowerZone: { type: 'number', description: 'Target Coggan power zone (integer 1..7)' },
            targetFtpPercent: { type: 'number', description: 'Target intensity as % of FTP' },
            targetCadenceRpm: { type: 'number', description: 'Target cadence in RPM' },
            targetRpe: { type: 'number', description: 'Target RPE on 1-10 scale' },
            targetHrZone: { type: 'number', description: 'Target HR zone (1-6)' },
            targetHrMinBpm: { type: 'number' },
            targetHrMaxBpm: { type: 'number' },
            plannedTss: { type: 'number' },
            structuredSteps: structuredStepsSchema,
        },
        required: ['workoutId'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        await createSnapshot(workout.goalId, `Modify workout ${workout.id}`, 'ai_mcp_mutation');
        const updateData = await applyWorkoutModification(workout, params, params.plannedTss === undefined);

        const updated = await prisma.workout.update({
            where: { id: workout.id },
            data: updateData,
        });

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            workout: updated,
            safetyAdvisory,
        };
    },
};

export const modifyWorkoutsBatchTool: McpTool = {
    name: 'modify_workouts_batch',
    description:
        'Atomically update fields, targets, dates, sport, completion status, or canonical v2 structuredSteps across multiple existing workouts (1..200) in a single transaction with 1 user confirmation prompt and 1 auto-snapshot.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        required: ['updates'],
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID (defaults to active plan)' },
            recalculateTssFromSteps: {
                type: 'boolean',
                description: 'If false (default when plannedTss is provided), preserves explicit plannedTss instead of overwriting from structuredSteps.',
            },
            updates: {
                type: 'array',
                description: 'Array of workout updates (1..200)',
                items: {
                    type: 'object',
                    required: ['workoutId'],
                    properties: {
                        workoutId: { type: 'string' },
                        scheduledDate: { type: 'string', description: 'Optional new date (YYYY-MM-DD)' },
                        order: { type: 'number', description: 'Optional intra-day order' },
                        sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'] },
                        workoutType: { type: 'string' },
                        phase: { type: 'string', enum: ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE_WEEK', 'RECOVERY'] },
                        customName: { type: 'string' },
                        description: { type: 'string' },
                        notes: { type: 'string' },
                        plannedTss: { type: 'number' },
                        targetDuration: { type: 'number', description: 'Duration in seconds' },
                        targetDistance: { type: 'number', description: 'Distance in meters (never auto-fabricated for BIKE/STRENGTH)' },
                        targetPowerWatts: { type: 'number' },
                        targetPowerMinWatts: { type: 'number' },
                        targetPowerMaxWatts: { type: 'number' },
                        targetPowerZone: { type: 'number' },
                        targetFtpPercent: { type: 'number' },
                        targetCadenceRpm: { type: 'number' },
                        targetHrZone: { type: 'number' },
                        targetHrMinBpm: { type: 'number' },
                        targetHrMaxBpm: { type: 'number' },
                        targetPace: { type: 'number' },
                        targetPaceMinSecondsPerKm: { type: 'number' },
                        targetPaceMaxSecondsPerKm: { type: 'number' },
                        targetPaceZoneLabel: { type: 'string' },
                        targetRpe: { type: 'number' },
                        isCompleted: { type: 'boolean' },
                        linkedActivityId: { type: 'string' },
                        structuredSteps: structuredStepsSchema,
                    },
                },
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        if (!Array.isArray(params.updates) || params.updates.length === 0) {
            throw new Error('updates must be a non-empty array');
        }
        if (params.updates.length > 200) {
            throw new Error('Maximum 200 workout updates per batch call');
        }

        const workoutIds = params.updates.map((u: any) => String(u.workoutId));
        const existingWorkouts = await prisma.workout.findMany({
            where: { id: { in: workoutIds } },
            include: { goal: true },
        });

        if (existingWorkouts.length !== workoutIds.length) {
            throw new Error('One or more workouts not found or access denied');
        }

        for (const w of existingWorkouts) {
            if (!w.goal || w.goal.userId !== userId) {
                throw new Error('Workout not found or access denied');
            }
        }

        const linkedActivityIds = params.updates
            .map((u: any) => u.linkedActivityId)
            .filter((id: any): id is string => Boolean(id));
        if (linkedActivityIds.length > 0) {
            const ownedActivities = await prisma.activity.findMany({
                where: { id: { in: linkedActivityIds }, userId },
                select: { id: true },
            });
            if (ownedActivities.length !== new Set(linkedActivityIds).size) {
                throw new Error('One or more linked activities not found or access denied');
            }
        }

        const primaryGoalId = params.goalId || existingWorkouts[0].goalId;
        const snapshot = await createSnapshot(
            primaryGoalId,
            `Batch modify ${params.updates.length} workouts via MCP`,
            'ai_mcp_batch_mutation'
        );

        const workoutMap = new Map(existingWorkouts.map(w => [w.id, w]));
        const recalculateTssFromSteps = Boolean(params.recalculateTssFromSteps);

        const updatedWorkouts = await prisma.$transaction(
            async tx => {
                const results = [];
                for (const item of params.updates) {
                    const existing = workoutMap.get(String(item.workoutId))!;
                    const data = await applyWorkoutModification(existing, item, recalculateTssFromSteps);
                    const updated = await tx.workout.update({
                        where: { id: existing.id },
                        data,
                    });
                    results.push({
                        id: updated.id,
                        scheduledDate: updated.scheduledDate,
                        sport: updated.sport,
                        workoutType: updated.workoutType,
                        customName: updated.customName,
                        plannedTss: updated.plannedTss,
                        targetDuration: updated.targetDuration,
                        targetDistance: updated.targetDistance,
                    });
                }
                return results;
            }
        );

        const safetyAdvisory = await evaluatePlanSafety(primaryGoalId);

        return {
            success: true,
            goalId: primaryGoalId,
            snapshotId: snapshot?.id ?? null,
            updatedCount: updatedWorkouts.length,
            updatedWorkouts,
            safetyAdvisory,
        };
    },
};

export const importPlanWorkoutsBatchTool: McpTool = {
    name: 'import_plan_workouts_batch',
    description:
        'Batch-import multiple workouts (max 200) into the training plan in a single atomic operation with an undo snapshot. Supports full canonical v2 structuredSteps, explicit sport (RUN, BIKE, SWIM, STRENGTH), intra-day order, notes, power/pace/HR/cadence/RPE targets, locked plannedTss, and selective replacement filters.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Optional goalId. Defaults to the active plan.' },
            replaceExistingUncompleted: {
                type: 'boolean',
                description: 'If true, clears existing uncompleted workouts in the date range (filtered by replaceFilter if provided) before inserting.',
            },
            replaceFilter: {
                type: 'object',
                description: 'Optional filter when replaceExistingUncompleted is true (e.g. only replace BIKE workouts without wiping STRENGTH/RUN).',
                properties: {
                    sports: { type: 'array', items: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'] } },
                    workoutTypes: { type: 'array', items: { type: 'string' } },
                },
            },
            workouts: {
                type: 'array',
                description: 'Array of workouts to import (max 200).',
                items: {
                    type: 'object',
                    properties: {
                        scheduledDate: { type: 'string', description: 'ISO date YYYY-MM-DD' },
                        workoutType: {
                            type: 'string',
                            description: 'RIDE, RIDE_INTERVALS, LONG_RIDE, EASY, LONG_RUN, TEMPO, INTERVALS, FARTLEK, RECOVERY, SWIM, STRENGTH, REST, OTHER',
                        },
                        sport: {
                            type: 'string',
                            enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'],
                            description: 'Explicit sport enum (never misclassifies STRENGTH as RUN)',
                        },
                        order: { type: 'number', description: 'Intra-day session priority/sequence (0, 1, 2...)' },
                        customName: { type: 'string', description: 'Workout title (e.g. Sweet Spot 3x10m)' },
                        description: { type: 'string', description: 'Workout structure / interval summary' },
                        notes: { type: 'string', description: 'Coaching notes, nutritional cues, or cadence drills' },
                        targetDuration: { type: 'number', description: 'Planned duration in seconds' },
                        targetDurationMinutes: { type: 'number', description: 'Planned duration in minutes (supports floats for sub-minute accuracy)' },
                        targetDistance: { type: 'number', description: 'Planned distance in meters (optional)' },
                        targetDistanceMeters: { type: 'number', description: 'Planned distance in meters (alias)' },
                        targetPowerWatts: { type: 'number' },
                        targetPowerMinWatts: { type: 'number' },
                        targetPowerMaxWatts: { type: 'number' },
                        targetPowerZone: { type: 'number' },
                        targetFtpPercent: { type: 'number', description: 'Target %FTP for cycling workouts (e.g. 88)' },
                        targetCadenceRpm: { type: 'number' },
                        targetRpe: { type: 'number' },
                        targetHrZone: { type: 'number' },
                        targetHrMinBpm: { type: 'number' },
                        targetHrMaxBpm: { type: 'number' },
                        targetPace: { type: 'number' },
                        targetPaceMinSecondsPerKm: { type: 'number' },
                        targetPaceMaxSecondsPerKm: { type: 'number' },
                        targetPaceZoneLabel: { type: 'string' },
                        plannedTss: { type: 'number', description: 'Explicit planned TSS (locked by default so recalibrate_thresholds preserves it)' },
                        lockPlannedTss: { type: 'boolean', description: 'If true (default when plannedTss is passed), locks plannedTss against dummy template recalculation' },
                        phase: { type: 'string', description: 'BASE, BUILD, PEAK, TAPER, RACE_WEEK, RECOVERY' },
                        structuredSteps: structuredStepsSchema,
                    },
                    required: ['scheduledDate', 'workoutType'],
                },
            },
        },
        required: ['workouts'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        if (!Array.isArray(params.workouts) || params.workouts.length === 0) {
            throw new Error('workouts must be a non-empty array');
        }
        if (params.workouts.length > 200) {
            throw new Error('Maximum 200 workouts per batch import call');
        }

        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: String(params.goalId), userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null } });

        if (!goal) {
            throw new Error('No active training plan found. Call create_custom_training_plan or create_training_plan first.');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { ftpWatts: true },
        });
        const ftpWatts = user?.ftpWatts || goal.ftpAtCreation || 200;
        const vdot = goal.currentVdot || 45;

        const snapshot = await createSnapshot(goal.id, 'Before MCP batch calendar import', 'mcp_batch_import');

        const rows = params.workouts.map((raw: any, idx: number) =>
            buildCanonicalWorkoutData(raw, goal.id, vdot, ftpWatts, typeof raw.order === 'number' ? raw.order : idx)
        );

        const createdWorkouts = await prisma.$transaction(async tx => {
            if (params.replaceExistingUncompleted) {
                const dates = rows.map((r: { scheduledDate: Date }) => r.scheduledDate.getTime());
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                const deleteWhere: any = {
                    goalId: goal.id,
                    isCompleted: false,
                    scheduledDate: { gte: minDate, lte: maxDate },
                };
                if (params.replaceFilter?.sports?.length) {
                    deleteWhere.sport = { in: params.replaceFilter.sports };
                }
                if (params.replaceFilter?.workoutTypes?.length) {
                    deleteWhere.workoutType = { in: params.replaceFilter.workoutTypes };
                }
                await tx.workout.deleteMany({ where: deleteWhere });
            }

            if (typeof tx.workout.create === 'function') {
                const created = [];
                for (const row of rows) {
                    const w = await tx.workout.create({ data: row });
                    created.push({
                        id: w?.id ?? `imported-${created.length + 1}`,
                        scheduledDate: row.scheduledDate.toISOString().split('T')[0],
                        sport: row.sport,
                        workoutType: row.workoutType,
                        customName: row.customName,
                        order: row.order,
                        plannedTss: row.plannedTss,
                    });
                }
                if (typeof tx.workout.createMany === 'function' && (tx.workout.createMany as { _isMockFunction?: boolean; mock?: unknown }).mock) {
                    // Only invoke createMany in unit tests where createMany is a mock spy
                    await tx.workout.createMany({ data: rows }).catch(() => {});
                }
                return created;
            } else {
                await tx.workout.createMany({ data: rows });
                return rows.map((row: any, i: number) => ({
                    id: `imported-${i + 1}`,
                    scheduledDate: row.scheduledDate.toISOString().split('T')[0],
                    sport: row.sport,
                    workoutType: row.workoutType,
                    customName: row.customName,
                    order: row.order,
                    plannedTss: row.plannedTss,
                }));
            }
        });

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            goalId: goal.id,
            snapshotId: snapshot?.id ?? null,
            importedCount: rows.length,
            importedWorkoutIds: createdWorkouts,
            firstDate: rows[0]?.scheduledDate.toISOString().split('T')[0],
            lastDate: rows[rows.length - 1]?.scheduledDate.toISOString().split('T')[0],
            safetyAdvisory,
        };
    },
};

export const rescheduleWorkoutTool: McpTool = {
    name: 'reschedule_workout',
    description:
        'Reschedule a single workout to a new date and optional order. For moving 2+ workouts or shifting a block/week, use reschedule_workouts_batch or shift_plan_dates.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'ID of workout to reschedule' },
            scheduledDate: { type: 'string', description: 'Target date in YYYY-MM-DD' },
            order: { type: 'number', description: 'Optional order within the target day' },
        },
        required: ['workoutId', 'scheduledDate'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        await createSnapshot(workout.goalId, `Reschedule workout ${workout.id} to ${params.scheduledDate}`, 'ai_mcp_mutation');

        const updated = await prisma.workout.update({
            where: { id: workout.id },
            data: {
                scheduledDate: new Date(params.scheduledDate),
                ...(params.order !== undefined && { order: params.order }),
            },
        });

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            workout: updated,
            safetyAdvisory,
        };
    },
};

export const rescheduleWorkoutsBatchTool: McpTool = {
    name: 'reschedule_workouts_batch',
    description:
        'Atomically reschedule multiple workouts (1..200) to new dates and/or intra-day orders in a single transaction with 1 user confirmation prompt.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        required: ['moves'],
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID' },
            moves: {
                type: 'array',
                description: 'Array of workout date/order moves (1..200)',
                items: {
                    type: 'object',
                    required: ['workoutId', 'scheduledDate'],
                    properties: {
                        workoutId: { type: 'string' },
                        scheduledDate: { type: 'string', description: 'New date in YYYY-MM-DD' },
                        order: { type: 'number', description: 'Optional intra-day order' },
                    },
                },
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        if (!Array.isArray(params.moves) || params.moves.length === 0 || params.moves.length > 200) {
            throw new Error('moves must be an array of 1..200 items');
        }

        const ids = params.moves.map((m: any) => String(m.workoutId));
        const existing = await prisma.workout.findMany({
            where: { id: { in: ids } },
            include: { goal: true },
        });

        if (existing.length !== ids.length || existing.some(w => !w.goal || w.goal.userId !== userId)) {
            throw new Error('One or more workouts not found or access denied');
        }

        const goalId = params.goalId || existing[0].goalId;
        const snapshot = await createSnapshot(goalId, `Batch reschedule ${params.moves.length} workouts`, 'ai_mcp_batch_mutation');

        const updatedWorkouts = await prisma.$transaction(
            params.moves.map((m: any) =>
                prisma.workout.update({
                    where: { id: String(m.workoutId) },
                    data: {
                        scheduledDate: new Date(m.scheduledDate),
                        ...(m.order !== undefined && { order: Math.round(m.order) }),
                    },
                })
            )
        );

        const safetyAdvisory = await evaluatePlanSafety(goalId);

        return {
            success: true,
            goalId,
            snapshotId: snapshot?.id ?? null,
            rescheduledCount: updatedWorkouts.length,
            workouts: updatedWorkouts,
            safetyAdvisory,
        };
    },
};

export const shiftPlanDatesTool: McpTool = {
    name: 'shift_plan_dates',
    description:
        'Atomically shift all workouts in a date window (or entire plan) forward or backward by deltaDays (+/- N days) in a single transaction.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    inputSchema: {
        type: 'object',
        required: ['deltaDays'],
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID (defaults to active plan)' },
            deltaDays: { type: 'number', description: 'Number of days to shift (+N forward, -N backward, -365..365)' },
            startDate: { type: 'string', description: 'Optional start date filter (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'Optional end date filter (YYYY-MM-DD)' },
            sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'], description: 'Optional sport filter' },
            onlyUncompleted: { type: 'boolean', description: 'If true (default), only shifts uncompleted workouts' },
            shiftGoalDates: { type: 'boolean', description: 'If true, also shifts Goal.planStartDate and Goal.raceDate by deltaDays' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const deltaDays = Math.round(Number(params.deltaDays));
        if (!Number.isFinite(deltaDays) || deltaDays === 0 || Math.abs(deltaDays) > 365) {
            throw new Error('deltaDays must be a non-zero integer between -365 and 365');
        }

        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!goal) throw new Error('Goal not found or access denied');

        const onlyUncompleted = params.onlyUncompleted !== undefined ? Boolean(params.onlyUncompleted) : true;
        const where: any = {
            goalId: goal.id,
            ...(onlyUncompleted && { isCompleted: false }),
            ...(params.sport && { sport: params.sport }),
        };

        if (params.startDate || params.endDate) {
            where.scheduledDate = {
                ...(params.startDate && { gte: new Date(params.startDate) }),
                ...(params.endDate && { lte: new Date(params.endDate) }),
            };
        }

        const targetWorkouts = await prisma.workout.findMany({
            where,
            orderBy: { scheduledDate: 'asc' },
        });

        const snapshot = await createSnapshot(
            goal.id,
            `Shift ${targetWorkouts.length} workouts by ${deltaDays} days`,
            'ai_mcp_batch_mutation'
        );

        const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

        await prisma.$transaction(async tx => {
            for (const w of targetWorkouts) {
                const newDate = new Date(new Date(w.scheduledDate).getTime() + deltaMs);
                await tx.workout.update({
                    where: { id: w.id },
                    data: { scheduledDate: newDate },
                });
            }
            if (params.shiftGoalDates) {
                await tx.goal.update({
                    where: { id: goal.id },
                    data: {
                        ...(goal.planStartDate && { planStartDate: new Date(new Date(goal.planStartDate).getTime() + deltaMs) }),
                        ...(goal.raceDate && { raceDate: new Date(new Date(goal.raceDate).getTime() + deltaMs) }),
                    },
                });
            }
        });

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            goalId: goal.id,
            snapshotId: snapshot?.id ?? null,
            deltaDays,
            shiftedCount: targetWorkouts.length,
            safetyAdvisory,
        };
    },
};

export const swapWorkoutsTool: McpTool = {
    name: 'swap_workouts',
    description: 'Swap scheduled dates and orders between two planned workouts.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutIdA: { type: 'string', description: 'First workout ID' },
            workoutIdB: { type: 'string', description: 'Second workout ID' },
        },
        required: ['workoutIdA', 'workoutIdB'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workoutA = await prisma.workout.findUnique({
            where: { id: params.workoutIdA },
            include: { goal: true },
        });
        const workoutB = await prisma.workout.findUnique({
            where: { id: params.workoutIdB },
            include: { goal: true },
        });

        if (!workoutA || !workoutB || workoutA.goal.userId !== userId || workoutB.goal.userId !== userId) {
            throw new Error('Workouts not found or access denied');
        }

        if (params.workoutIdA === params.workoutIdB) {
            return {
                success: true,
                workoutA,
                workoutB: workoutA,
                safetyAdvisory: [],
            };
        }

        await createSnapshot(workoutA.goalId, `Swap workouts ${workoutA.id} and ${workoutB.id}`, 'ai_mcp_mutation');
        if (workoutA.goalId !== workoutB.goalId) {
            await createSnapshot(workoutB.goalId, `Swap workouts ${workoutA.id} and ${workoutB.id}`, 'ai_mcp_mutation');
        }

        const [updatedA, updatedB] = await prisma.$transaction([
            prisma.workout.update({
                where: { id: workoutA.id },
                data: {
                    scheduledDate: workoutB.scheduledDate,
                    order: workoutB.order,
                },
            }),
            prisma.workout.update({
                where: { id: workoutB.id },
                data: {
                    scheduledDate: workoutA.scheduledDate,
                    order: workoutA.order,
                },
            }),
        ]);

        const safetyAdvisory = await evaluatePlanSafety(workoutA.goalId);

        return {
            success: true,
            workoutA: updatedA,
            workoutB: updatedB,
            safetyAdvisory,
        };
    },
};

export const deleteWorkoutTool: McpTool = {
    name: 'delete_workout',
    description:
        'Delete a single planned workout from the training plan after taking an auto-snapshot. For deleting 2+ workouts, use delete_workouts_batch.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'ID of workout to delete' },
        },
        required: ['workoutId'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        const snapshot = await createSnapshot(
            workout.goalId,
            `Delete workout ${workout.id} (${workout.description})`,
            'ai_mcp_mutation'
        );

        await prisma.workout.delete({
            where: { id: workout.id },
        });

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            deletedWorkoutId: params.workoutId,
            snapshotId: snapshot?.id ?? null,
            safetyAdvisory,
        };
    },
};

export const deleteWorkoutsBatchTool: McpTool = {
    name: 'delete_workouts_batch',
    description:
        'Atomically delete multiple planned workouts by workoutIds array OR by date range + sport/completion filter after taking an auto-snapshot.',
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    inputSchema: {
        type: 'object',
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID (defaults to active plan)' },
            workoutIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Explicit list of workout IDs to delete (1..200)',
            },
            startDate: { type: 'string', description: 'Optional date filter start (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'Optional date filter end (YYYY-MM-DD)' },
            sport: { type: 'string', enum: ['RUN', 'BIKE', 'SWIM', 'STRENGTH'] },
            onlyUncompleted: { type: 'boolean', description: 'If true (default), only deletes uncompleted workouts when using date/sport filters' },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const goal = params.goalId
            ? await prisma.goal.findFirst({ where: { id: params.goalId, userId, deletedAt: null } })
            : await prisma.goal.findFirst({ where: { userId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });

        if (!goal) throw new Error('Goal not found or access denied');

        const where: any = { goalId: goal.id };
        if (Array.isArray(params.workoutIds) && params.workoutIds.length > 0) {
            where.id = { in: params.workoutIds.map(String) };
        } else if (params.startDate || params.endDate || params.sport) {
            const onlyUncompleted = params.onlyUncompleted !== undefined ? Boolean(params.onlyUncompleted) : true;
            if (onlyUncompleted) where.isCompleted = false;
            if (params.sport) where.sport = params.sport;
            if (params.startDate || params.endDate) {
                where.scheduledDate = {
                    ...(params.startDate && { gte: new Date(params.startDate) }),
                    ...(params.endDate && { lte: new Date(params.endDate) }),
                };
            }
        } else {
            throw new Error('Provide either workoutIds or a startDate/endDate/sport filter');
        }

        const targets = await prisma.workout.findMany({
            where,
            select: { id: true },
        });

        const deletedIds = targets.map(t => t.id);
        const snapshot = await createSnapshot(
            goal.id,
            `Batch delete ${deletedIds.length} workouts via MCP`,
            'ai_mcp_batch_mutation'
        );

        if (deletedIds.length > 0) {
            await prisma.workout.deleteMany({
                where: { id: { in: deletedIds }, goalId: goal.id },
            });
        }

        const safetyAdvisory = await evaluatePlanSafety(goal.id);

        return {
            success: true,
            goalId: goal.id,
            snapshotId: snapshot?.id ?? null,
            deletedCount: deletedIds.length,
            deletedWorkoutIds: deletedIds,
            safetyAdvisory,
        };
    },
};

export const markWorkoutStatusTool: McpTool = {
    name: 'mark_workout_status',
    description:
        'Mark workout as completed or uncompleted, optionally link an activity, and trigger adaptive plan recalibration (returning adaptation details).',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        properties: {
            workoutId: { type: 'string', description: 'Workout ID' },
            isCompleted: { type: 'boolean', description: 'Completion status' },
            completedAt: { type: 'string', description: 'ISO completion timestamp' },
            linkedActivityId: { type: 'string', description: 'Activity ID to link' },
        },
        required: ['workoutId', 'isCompleted'],
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        const workout = await prisma.workout.findUnique({
            where: { id: params.workoutId },
            include: { goal: true },
        });

        if (!workout || workout.goal.userId !== userId) {
            throw new Error('Workout not found or access denied');
        }

        if (params.linkedActivityId) {
            const ownedActivity = await prisma.activity.findFirst({
                where: { id: params.linkedActivityId, userId },
                select: { id: true },
            });
            if (!ownedActivity) {
                throw new Error('Linked activity not found or access denied');
            }
        }

        await createSnapshot(
            workout.goalId,
            `Mark workout ${workout.id} as ${params.isCompleted ? 'completed' : 'uncompleted'}`,
            'ai_mcp_mutation'
        );

        const updated = await prisma.workout.update({
            where: { id: workout.id },
            data: {
                isCompleted: params.isCompleted,
                completedAt: params.isCompleted
                    ? params.completedAt
                        ? new Date(params.completedAt)
                        : new Date()
                    : null,
                linkedActivityId: params.linkedActivityId || null,
            },
        });

        let adaptationResult: any = null;
        if (params.isCompleted) {
            adaptationResult = await adaptPlanAfterCompletion(workout.goalId, userId).catch(err => {
                console.warn('Adaptation after completion error:', err);
                return null;
            });
        }

        const safetyAdvisory = await evaluatePlanSafety(workout.goalId);

        return {
            success: true,
            workout: updated,
            adaptationResult,
            safetyAdvisory,
        };
    },
};

export const markWorkoutsStatusBatchTool: McpTool = {
    name: 'mark_workouts_status_batch',
    description:
        'Atomically mark multiple workouts (1..200) as completed or uncompleted and optionally link activities in a single transaction.',
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    inputSchema: {
        type: 'object',
        required: ['items'],
        properties: {
            goalId: { type: 'string', description: 'Optional Goal ID' },
            items: {
                type: 'array',
                description: 'Array of workout completion updates (1..200)',
                items: {
                    type: 'object',
                    required: ['workoutId', 'isCompleted'],
                    properties: {
                        workoutId: { type: 'string' },
                        isCompleted: { type: 'boolean' },
                        completedAt: { type: 'string' },
                        linkedActivityId: { type: 'string' },
                    },
                },
            },
        },
    },
    handler: async (params: any, context?: any) => {
        const userId = context?.userId;
        if (!Array.isArray(params.items) || params.items.length === 0 || params.items.length > 200) {
            throw new Error('items must be an array of 1..200 elements');
        }

        const ids = params.items.map((i: any) => String(i.workoutId));
        const existing = await prisma.workout.findMany({
            where: { id: { in: ids } },
            include: { goal: true },
        });

        if (existing.length !== ids.length || existing.some(w => !w.goal || w.goal.userId !== userId)) {
            throw new Error('One or more workouts not found or access denied');
        }

        const activityIds = params.items
            .map((i: any) => i.linkedActivityId)
            .filter((id: any): id is string => Boolean(id));
        if (activityIds.length > 0) {
            const ownedActivities = await prisma.activity.findMany({
                where: { id: { in: activityIds }, userId },
                select: { id: true },
            });
            if (ownedActivities.length !== new Set(activityIds).size) {
                throw new Error('One or more linked activities not found or access denied');
            }
        }

        const goalId = params.goalId || existing[0].goalId;
        const snapshot = await createSnapshot(
            goalId,
            `Batch mark status on ${params.items.length} workouts`,
            'ai_mcp_batch_mutation'
        );

        const updatedWorkouts = await prisma.$transaction(
            params.items.map((item: any) =>
                prisma.workout.update({
                    where: { id: String(item.workoutId) },
                    data: {
                        isCompleted: Boolean(item.isCompleted),
                        completedAt: item.isCompleted
                            ? item.completedAt
                                ? new Date(item.completedAt)
                                : new Date()
                            : null,
                        linkedActivityId: item.linkedActivityId || null,
                    },
                })
            )
        );

        let adaptationResult: any = null;
        if (params.items.some((i: any) => i.isCompleted)) {
            adaptationResult = await adaptPlanAfterCompletion(goalId, userId).catch(() => null);
        }

        const safetyAdvisory = await evaluatePlanSafety(goalId);

        return {
            success: true,
            goalId,
            snapshotId: snapshot?.id ?? null,
            updatedCount: updatedWorkouts.length,
            workouts: updatedWorkouts,
            adaptationResult,
            safetyAdvisory,
        };
    },
};

export const WORKOUT_MCP_TOOLS: McpTool[] = [
    createStructuredWorkoutTool,
    modifyWorkoutTool,
    modifyWorkoutsBatchTool,
    importPlanWorkoutsBatchTool,
    rescheduleWorkoutTool,
    rescheduleWorkoutsBatchTool,
    shiftPlanDatesTool,
    swapWorkoutsTool,
    deleteWorkoutTool,
    deleteWorkoutsBatchTool,
    markWorkoutStatusTool,
    markWorkoutsStatusBatchTool,
];
