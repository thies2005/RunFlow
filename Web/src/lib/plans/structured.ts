import { z } from 'zod';
import { WorkoutType } from '@/generated/prisma/browser';
import { calculateTrainingPaces, type TrainingPaces } from '@/lib/metrics/vdot';
import { getZoneTarget, type HrZoneDefinition } from '@/lib/metrics/hr-zones';
import { estimateBikeFtpFromVdot, calculateBikeZones, type BikeZones } from './bike-zones';
import { estimateSwimPaceFromVdot, calculateSwimPaces } from './swim-pace';
import type { GeneratedWorkout } from './index';

export const MAX_REPEAT_TIMES = 100;
export const MAX_REPEAT_DEPTH = 3;

export interface StructuredWorkoutV2 {
    version: 2;
    source: 'engine' | 'builder' | 'editor' | 'progression' | 'template' | 'mcp';
    sport?: 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
    lockedPlannedTss?: number;
    steps: StepNode[];
}

export type StepNode = StructuredStep | RepeatGroup;

export interface RepeatGroup {
    kind: 'repeat';
    times: number; // 1..100
    setRest?: Duration; // rest between iterations (not after the last iteration)
    steps: StepNode[]; // nestable up to depth 3
    label?: string;
}

export interface StructuredStep {
    kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'steady' | 'transition';
    label?: string;
    note?: string;
    duration: Duration;
    target?: Target;
    /** Optional secondary HR zone (1..6) when primary target is pace or power */
    hrZone?: number;
    /** Optional cadence target in RPM (bike) or SPM (run/swim) */
    cadenceRpm?: number;
}

export type Duration =
    | { type: 'time'; seconds: number } // 1..86400
    | { type: 'distance'; meters: number } // 1..100000
    | { type: 'lap_press' };

export type Target =
    | { type: 'pace'; unit: 'sec_per_km' | 'sec_per_100m'; min?: number; max?: number; zoneLabel?: string }
    | { type: 'hr'; zone?: number; minBpm?: number; maxBpm?: number }
    | { type: 'power'; minWatts?: number; maxWatts?: number; ftpPercent?: number; zoneLabel?: string }
    | { type: 'rpe'; value: number }
    | { type: 'free' };

export interface FlattenedPlayerStep {
    kind: StructuredStep['kind'];
    label?: string;
    note?: string;
    duration: Duration;
    target?: Target;
    hrZone?: number;
    cadenceRpm?: number;
    repeatIteration?: number;
    totalIterations?: number;
    isSetRest?: boolean;
}

// ==========================================
// Zod Schemas
// ==========================================

export const durationSchema: z.ZodType<Duration> = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('time'),
        seconds: z.number().int().min(1).max(86400),
    }),
    z.object({
        type: z.literal('distance'),
        meters: z.number().min(1).max(100000),
    }),
    z.object({
        type: z.literal('lap_press'),
    }),
]);

export const paceTargetSchema = z
    .object({
        type: z.literal('pace'),
        unit: z.enum(['sec_per_km', 'sec_per_100m']),
        min: z.number().positive().optional(),
        max: z.number().positive().optional(),
        zoneLabel: z.string().optional(),
    })
    .refine((val) => val.min === undefined || val.max === undefined || val.min <= val.max, {
        message: 'pace min must be <= max',
    });

export const hrTargetSchema = z
    .object({
        type: z.literal('hr'),
        zone: z.number().int().min(1).max(6).optional(),
        minBpm: z.number().positive().optional(),
        maxBpm: z.number().positive().optional(),
    })
    .refine((val) => val.minBpm === undefined || val.maxBpm === undefined || val.minBpm <= val.maxBpm, {
        message: 'hr minBpm must be <= maxBpm',
    });

export const powerTargetSchema = z
    .object({
        type: z.literal('power'),
        minWatts: z.number().min(0).optional(),
        maxWatts: z.number().min(0).optional(),
        ftpPercent: z.number().positive().optional(),
        zoneLabel: z.string().optional(),
    })
    .refine((val) => val.minWatts === undefined || val.maxWatts === undefined || val.minWatts <= val.maxWatts, {
        message: 'power minWatts must be <= maxWatts',
    });

export const rpeTargetSchema = z.object({
    type: z.literal('rpe'),
    value: z.number().min(1).max(10),
});

export const freeTargetSchema = z.object({
    type: z.literal('free'),
});

export const targetSchema: z.ZodType<Target> = z.union([
    paceTargetSchema,
    hrTargetSchema,
    powerTargetSchema,
    rpeTargetSchema,
    freeTargetSchema,
]);

export const structuredStepSchema: z.ZodType<StructuredStep> = z.object({
    kind: z.enum(['warmup', 'work', 'recovery', 'cooldown', 'steady', 'transition']),
    label: z.string().optional(),
    note: z.string().optional(),
    duration: durationSchema,
    target: targetSchema.optional(),
    hrZone: z.number().int().min(1).max(6).optional(),
    cadenceRpm: z.number().int().positive().optional(),
});

function calculateNodeNestingDepth(node: StepNode): number {
    if (node.kind !== 'repeat') return 0;
    if (!node.steps || node.steps.length === 0) return 1;
    let maxChild = 0;
    for (const child of node.steps) {
        maxChild = Math.max(maxChild, calculateNodeNestingDepth(child));
    }
    return 1 + maxChild;
}

export function calculateMaxNestingDepth(steps: StepNode[]): number {
    let max = 0;
    for (const step of steps) {
        max = Math.max(max, calculateNodeNestingDepth(step));
    }
    return max;
}

export const repeatGroupSchema: z.ZodType<RepeatGroup> = z.lazy(() =>
    z.object({
        kind: z.literal('repeat'),
        times: z.number().int().min(1).max(100),
        setRest: durationSchema.optional(),
        steps: z.array(stepNodeSchema).min(1),
        label: z.string().optional(),
    })
);

export const stepNodeSchema: z.ZodType<StepNode> = z.lazy(() =>
    z.union([structuredStepSchema, repeatGroupSchema])
);

export const MAX_FLATTENED_STEPS = 500;

export function countExpandedSteps(steps: StepNode[]): number {
    let count = 0;
    for (const node of steps) {
        if (node.kind === 'repeat') {
            const childSteps = countExpandedSteps(node.steps || []);
            const restSteps = node.setRest ? 1 : 0;
            count += (childSteps * node.times) + (restSteps * Math.max(0, node.times - 1));
        } else {
            count += 1;
        }
    }
    return count;
}

export const structuredWorkoutV2Schema: z.ZodType<StructuredWorkoutV2> = z
    .object({
        version: z.literal(2),
        source: z.enum(['engine', 'builder', 'editor', 'progression', 'template', 'mcp']),
        sport: z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH']).optional(),
        lockedPlannedTss: z.number().min(0).max(1000).optional(),
        steps: z.array(stepNodeSchema),
    })
    .refine((val) => calculateMaxNestingDepth(val.steps) <= 3, {
        message: 'Repeat groups nesting depth must not exceed 3',
    })
    .refine((val) => countExpandedSteps(val.steps) <= MAX_FLATTENED_STEPS, {
        message: `Expanded step count must not exceed ${MAX_FLATTENED_STEPS}`,
    });

// ==========================================
// Helper Functions
// ==========================================

export function resolveWorkoutSport(
    workoutType?: string | null,
    sport?: string | null
): 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH' {
    const sp = sport?.trim().toUpperCase();
    if (sp === 'SWIM' || sp === 'BIKE' || sp === 'STRENGTH' || sp === 'RUN') {
        const wtCheck = workoutType?.trim().toUpperCase();
        // If workoutType explicitly specifies STRENGTH/BIKE/SWIM while sport was left at default RUN, honor workoutType
        if (sp === 'RUN' && wtCheck) {
            if (wtCheck === 'STRENGTH' || wtCheck === 'CORE' || wtCheck === 'GYM') return 'STRENGTH';
            if (wtCheck === 'RIDE' || wtCheck === 'LONG_RIDE' || wtCheck === 'RIDE_INTERVALS' || wtCheck === 'BRICK' || wtCheck === 'VIRTUAL_RIDE') return 'BIKE';
            if (wtCheck === 'SWIM' || wtCheck === 'SWIM_DRILL' || wtCheck === 'OPEN_WATER_SWIM') return 'SWIM';
        }
        return sp;
    }
    if (sp === 'RIDE' || sp === 'CYCLING' || sp === 'VIRTUAL_RIDE') return 'BIKE';
    if (sp === 'GYM' || sp === 'CORE') return 'STRENGTH';

    const wt = workoutType?.trim().toUpperCase();
    if (wt === 'SWIM' || wt === 'SWIM_DRILL' || wt === 'OPEN_WATER_SWIM') return 'SWIM';
    if (wt === 'RIDE' || wt === 'LONG_RIDE' || wt === 'RIDE_INTERVALS' || wt === 'BRICK' || wt === 'VIRTUAL_RIDE') return 'BIKE';
    if (wt === 'STRENGTH' || wt === 'CORE' || wt === 'GYM') return 'STRENGTH';

    return 'RUN';
}

function resolvePaceLetter(paceLetter: string, paces: TrainingPaces): { min: number; max: number } {
    const letter = paceLetter.trim().toUpperCase();
    switch (letter) {
        case 'E':
            return { min: paces.easy.min, max: paces.easy.max };
        case 'M':
            return { min: paces.marathon, max: paces.marathon };
        case 'T':
            return { min: paces.threshold, max: paces.threshold };
        case 'I':
            return { min: paces.interval, max: paces.interval };
        case 'R':
            return { min: paces.repetition, max: paces.repetition };
        default: {
            // Check if it's already a numeric seconds or mm:ss
            if (paceLetter.includes(':')) {
                const [minStr, secStr] = paceLetter.split(':');
                const m = parseInt(minStr, 10);
                const s = parseInt(secStr, 10);
                if (!isNaN(m) && !isNaN(s)) {
                    const sec = m * 60 + s;
                    return { min: sec, max: sec };
                }
            }
            const num = parseFloat(paceLetter);
            if (!isNaN(num) && num > 0) return { min: num, max: num };
            return { min: paces.threshold, max: paces.threshold };
        }
    }
}

// ==========================================
// Parser
// ==========================================

export function parseStructuredWorkout(
    input: unknown,
    workoutTypeOrSport?: string | null,
    vdot = 45,
    ftpWatts = 200
): StructuredWorkoutV2 | null {
    if (!input || (typeof input !== 'object' && !Array.isArray(input))) {
        return null;
    }

    const resolvedSport = resolveWorkoutSport(workoutTypeOrSport, workoutTypeOrSport);

    // Shape 1: Canonical v2 (version === 2)
    if (typeof input === 'object' && input !== null && 'version' in input && (input as { version: unknown }).version === 2) {
        const parsed = structuredWorkoutV2Schema.safeParse(input);
        if (parsed.success) {
            return parsed.data;
        }
        return null;
    }

    // Shape 2: Generator flat v1 ({ version: 1, steps: [...] })
    if (
        typeof input === 'object' &&
        input !== null &&
        'version' in input &&
        (input as { version: unknown }).version === 1 &&
        Array.isArray((input as { steps?: unknown }).steps)
    ) {
        const rawSteps = (input as unknown as { steps: unknown[] }).steps;
        const steps: StepNode[] = [];

        for (const raw of rawSteps) {
            if (!raw || typeof raw !== 'object') continue;
            const s = raw as Record<string, unknown>;

            let kind: StructuredStep['kind'] = 'work';
            const rawType = String(s.type || '').toLowerCase();
            if (rawType === 'warmup') kind = 'warmup';
            else if (rawType === 'cooldown') kind = 'cooldown';
            else if (rawType === 'recovery') kind = 'recovery';
            else if (rawType === 'steady') kind = 'steady';
            else if (rawType === 'transition') kind = 'transition';
            else kind = 'work';

            const distanceM = typeof s.distanceMeters === 'number' ? s.distanceMeters : 0;
            const durationS = typeof s.durationSeconds === 'number' ? s.durationSeconds : 0;

            let duration: Duration;
            if (distanceM > 0) {
                duration = { type: 'distance', meters: Math.min(100000, Math.max(1, Math.round(distanceM))) };
            } else if (durationS > 0) {
                duration = { type: 'time', seconds: Math.min(86400, Math.max(1, Math.round(durationS))) };
            } else {
                duration = { type: 'lap_press' };
            }

            let target: Target | undefined;
            const pace = typeof s.paceSecondsPerKm === 'number' ? s.paceSecondsPerKm : 0;
            const hrZone = typeof s.hrZone === 'number' ? s.hrZone : undefined;

            if (pace > 0) {
                target = {
                    type: 'pace',
                    unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                    min: Math.round(pace),
                    max: Math.round(pace),
                };
            } else if (hrZone !== undefined && hrZone >= 1 && hrZone <= 6) {
                target = {
                    type: 'hr',
                    zone: hrZone,
                };
            }

            steps.push({
                kind,
                label: typeof s.name === 'string' && s.name ? s.name : undefined,
                duration,
                target,
                hrZone: hrZone && hrZone >= 1 && hrZone <= 6 ? hrZone : undefined,
            });
        }

        const candidate: StructuredWorkoutV2 = {
            version: 2,
            source: 'engine',
            steps,
        };
        const parsed = structuredWorkoutV2Schema.safeParse(candidate);
        return parsed.success ? parsed.data : null;
    }

    // Shape 3: Builder nested / ProgressionWeekData (has warmup, main array, cooldown)
    if (
        typeof input === 'object' &&
        input !== null &&
        'main' in input &&
        Array.isArray((input as { main: unknown }).main) &&
        'warmup' in input &&
        'cooldown' in input
    ) {
        const prog = input as {
            warmup?: { distance?: number; pace?: string };
            main: Array<{ reps?: number; distance?: number; pace?: string; restSeconds?: number }>;
            cooldown?: { distance?: number; pace?: string };
        };

        const paces = calculateTrainingPaces(vdot > 0 ? vdot : 45);
        const steps: StepNode[] = [];

        // Warmup
        if (prog.warmup && typeof prog.warmup.distance === 'number' && prog.warmup.distance > 0) {
            const paceRange = resolvePaceLetter(prog.warmup.pace || 'E', paces);
            steps.push({
                kind: 'warmup',
                label: 'Warmup',
                duration: { type: 'distance', meters: Math.min(100000, Math.round(prog.warmup.distance)) },
                target: {
                    type: 'pace',
                    unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                    min: paceRange.min,
                    max: paceRange.max,
                    zoneLabel: prog.warmup.pace || 'E',
                },
            });
        }

        // Main sets
        for (const item of prog.main) {
            const reps = Math.max(1, Math.min(100, Math.round(item.reps || 1)));
            const dist = Math.max(1, Math.min(100000, Math.round(item.distance || 400)));
            const paceRange = resolvePaceLetter(item.pace || 'I', paces);
            const restSec = typeof item.restSeconds === 'number' && item.restSeconds > 0 ? Math.round(item.restSeconds) : 0;

            const workStep: StructuredStep = {
                kind: 'work',
                duration: { type: 'distance', meters: dist },
                target: {
                    type: 'pace',
                    unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                    min: paceRange.min,
                    max: paceRange.max,
                    zoneLabel: item.pace || 'I',
                },
            };

            const repeatGroup: RepeatGroup = {
                kind: 'repeat',
                times: reps,
                setRest: restSec > 0 ? { type: 'time', seconds: Math.min(86400, restSec) } : undefined,
                steps: [workStep],
            };
            steps.push(repeatGroup);
        }

        // Cooldown
        if (prog.cooldown && typeof prog.cooldown.distance === 'number' && prog.cooldown.distance > 0) {
            const paceRange = resolvePaceLetter(prog.cooldown.pace || 'E', paces);
            steps.push({
                kind: 'cooldown',
                label: 'Cooldown',
                duration: { type: 'distance', meters: Math.min(100000, Math.round(prog.cooldown.distance)) },
                target: {
                    type: 'pace',
                    unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                    min: paceRange.min,
                    max: paceRange.max,
                    zoneLabel: prog.cooldown.pace || 'E',
                },
            });
        }

        const candidate: StructuredWorkoutV2 = {
            version: 2,
            source: 'progression',
            steps,
        };
        const parsed = structuredWorkoutV2Schema.safeParse(candidate);
        return parsed.success ? parsed.data : null;
    }

    // Shape 4: Arrays
    if (Array.isArray(input)) {
        if (input.length === 0) {
            return {
                version: 2,
                source: 'editor',
                steps: [],
            };
        }

        // Determine if Shape 4a (Template items with distanceM, durationS, type === 'repeat')
        const isTemplateShape = input.some(
            (item) =>
                item &&
                typeof item === 'object' &&
                ('distanceM' in item || 'durationS' in item || 'durationM' in item || (item as { type?: unknown }).type === 'repeat')
        );

        if (isTemplateShape) {
            function mapTemplateSteps(items: unknown[]): StepNode[] {
                const res: StepNode[] = [];
                for (const raw of items) {
                    if (!raw || typeof raw !== 'object') continue;
                    const item = raw as Record<string, unknown>;
                    const rawType = String(item.type || '').toLowerCase();

                    if (rawType === 'repeat' && Array.isArray(item.steps)) {
                        const times = Math.max(1, Math.min(100, Math.round(Number(item.repeat) || 1)));
                        const childSteps = mapTemplateSteps(item.steps);
                        if (childSteps.length > 0) {
                            res.push({
                                kind: 'repeat',
                                times,
                                steps: childSteps,
                                label: typeof item.description === 'string' ? item.description : undefined,
                            });
                        }
                        continue;
                    }

                    let kind: StructuredStep['kind'] = 'work';
                    if (rawType === 'warmup') kind = 'warmup';
                    else if (rawType === 'cooldown') kind = 'cooldown';
                    else if (rawType === 'recovery') kind = 'recovery';
                    else if (rawType === 'steady') kind = 'steady';
                    else if (rawType === 'interval' || rawType === 'work') kind = 'work';
                    else kind = 'work';

                    const distanceM = typeof item.distanceM === 'number' ? item.distanceM : 0;
                    const durationS = typeof item.durationS === 'number' ? item.durationS : 0;
                    const durationM = typeof item.durationM === 'number' ? item.durationM : 0;

                    let duration: Duration;
                    if (distanceM > 0) {
                        duration = { type: 'distance', meters: Math.min(100000, Math.max(1, Math.round(distanceM))) };
                    } else if (durationS > 0) {
                        duration = { type: 'time', seconds: Math.min(86400, Math.max(1, Math.round(durationS))) };
                    } else if (durationM > 0) {
                        duration = { type: 'time', seconds: Math.min(86400, Math.max(1, Math.round(durationM * 60))) };
                    } else {
                        duration = { type: 'lap_press' };
                    }

                    let target: Target | undefined;
                    const targetPace = typeof item.targetPace === 'number' ? item.targetPace : 0;
                    if (targetPace > 0) {
                        target = {
                            type: 'pace',
                            unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
                            min: Math.round(targetPace),
                            max: Math.round(targetPace),
                        };
                    }

                    res.push({
                        kind,
                        label: typeof item.description === 'string' ? item.description : undefined,
                        duration,
                        target,
                    });
                }
                return res;
            }

            const candidate: StructuredWorkoutV2 = {
                version: 2,
                source: 'template',
                steps: mapTemplateSteps(input),
            };
            const parsed = structuredWorkoutV2Schema.safeParse(candidate);
            return parsed.success ? parsed.data : null;
        }

        // Shape 4b: Legacy progression array ([{ type: 'main', description: '...' }])
        const steps: StepNode[] = [];
        for (const raw of input) {
            if (!raw || typeof raw !== 'object') continue;
            const item = raw as Record<string, unknown>;
            steps.push({
                kind: 'work',
                label: typeof item.description === 'string' ? item.description : undefined,
                duration: { type: 'lap_press' },
                target: { type: 'free' },
            });
        }

        const candidate: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps,
        };
        const parsed = structuredWorkoutV2Schema.safeParse(candidate);
        return parsed.success ? parsed.data : null;
    }

    return null;
}

// ==========================================
// Flattener
// ==========================================

export function flattenStructuredWorkout(workout: StructuredWorkoutV2): FlattenedPlayerStep[] {
    const result: FlattenedPlayerStep[] = [];

    function processNodes(nodes: StepNode[], repeatIteration?: number, totalIterations?: number) {
        for (const node of nodes) {
            if (result.length >= MAX_FLATTENED_STEPS) return;
            if (node.kind === 'repeat') {
                const times = node.times;
                for (let i = 0; i < times; i++) {
                    if (result.length >= MAX_FLATTENED_STEPS) return;
                    processNodes(node.steps, i + 1, times);

                    // Inject setRest between iterations (not after the final iteration)
                    if (i < times - 1 && node.setRest) {
                        if (result.length >= MAX_FLATTENED_STEPS) return;
                        result.push({
                            kind: 'recovery',
                            label: node.label ? `${node.label} Rest` : 'Set Rest',
                            duration: node.setRest,
                            repeatIteration: i + 1,
                            totalIterations: times,
                            isSetRest: true,
                        });
                    }
                }
            } else {
                result.push({
                    kind: node.kind,
                    label: node.label,
                    note: node.note,
                    duration: node.duration,
                    target: node.target,
                    hrZone: node.hrZone,
                    cadenceRpm: node.cadenceRpm,
                    repeatIteration,
                    totalIterations,
                });
            }
        }
    }

    processNodes(workout.steps);
    return result;
}

// ==========================================
// Summarizer
// ==========================================

export function summarizeStructuredWorkout(
    workout: StructuredWorkoutV2,
    fallbackPaceSec?: number | null,
    ftpWatts?: number | null,
    sport?: string | null
): { totalDistanceMeters: number; totalDurationSeconds: number; estimatedTss: number; summaryText: string } {
    const flat = flattenStructuredWorkout(workout);
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let accumulatedTss = 0;

    const resolvedSport = resolveWorkoutSport(sport || workout.sport, sport || workout.sport);
    const hasPowerOrRpeOnlySteps = flat.length > 0 && flat.every(s => s.target?.type === 'power' || s.target?.type === 'rpe');
    const isRunOrPaceSport = resolvedSport === 'RUN' && !hasPowerOrRpeOnlySteps;

    const defaultPace = fallbackPaceSec && fallbackPaceSec > 0 ? fallbackPaceSec : 300; // 5:00/km default
    const ftp = ftpWatts && ftpWatts > 0 ? ftpWatts : 200;

    for (const step of flat) {
        let stepSeconds = 0;
        let stepMeters = 0;

        if (step.duration.type === 'distance') {
            stepMeters = step.duration.meters;
            totalDistanceMeters += stepMeters;

            let paceSec = defaultPace;
            if (step.target?.type === 'pace') {
                const p = step.target;
                const avgPace = p.min && p.max ? (p.min + p.max) / 2 : p.min || p.max || defaultPace;
                paceSec = p.unit === 'sec_per_100m' ? avgPace * 10 : avgPace;
            }
            stepSeconds = Math.round((stepMeters / 1000) * paceSec);
            totalDurationSeconds += stepSeconds;
        } else if (step.duration.type === 'time') {
            stepSeconds = step.duration.seconds;
            totalDurationSeconds += stepSeconds;

            if (step.target?.type === 'pace') {
                const p = step.target;
                const avgPace = p.min && p.max ? (p.min + p.max) / 2 : p.min || p.max || defaultPace;
                const paceSec = p.unit === 'sec_per_100m' ? avgPace * 10 : avgPace;
                if (paceSec > 0) {
                    stepMeters = Math.round((stepSeconds / paceSec) * 1000);
                    totalDistanceMeters += stepMeters;
                }
            } else if (isRunOrPaceSport && step.target?.type !== 'power' && step.target?.type !== 'rpe') {
                if (defaultPace > 0) {
                    stepMeters = Math.round((stepSeconds / defaultPace) * 1000);
                    totalDistanceMeters += stepMeters;
                }
            }
        }

        // TSS Estimation
        let intensityFactor = 0.7; // default endurance
        if (step.target?.type === 'power') {
            const p = step.target;
            if (p.ftpPercent) {
                intensityFactor = p.ftpPercent / 100;
            } else if (p.minWatts || p.maxWatts) {
                const avgWatts = (p.minWatts && p.maxWatts ? (p.minWatts + p.maxWatts) / 2 : p.minWatts || p.maxWatts || ftp);
                intensityFactor = avgWatts / ftp;
            }
        } else if (step.target?.type === 'hr' && step.target.zone) {
            intensityFactor = 0.5 + step.target.zone * 0.12;
        } else if (step.kind === 'warmup' || step.kind === 'cooldown' || step.kind === 'recovery') {
            intensityFactor = 0.6;
        } else if (step.kind === 'work') {
            intensityFactor = 0.9;
        }

        const stepTss = (stepSeconds * Math.pow(intensityFactor, 2)) / 36; // (s * IF^2) / 3600 * 100
        accumulatedTss += stepTss;
    }

    // Build human-readable summary text
    function formatNodeText(node: StepNode): string {
        if (node.kind === 'repeat') {
            const inner = node.steps.map(formatNodeText).join(' + ');
            return `${node.times}×(${inner})`;
        }
        if (node.duration.type === 'distance') {
            const d = node.duration.meters >= 1000 ? `${(node.duration.meters / 1000).toFixed(1)}km` : `${node.duration.meters}m`;
            return `${d} ${node.kind}`;
        }
        if (node.duration.type === 'time') {
            const m = Math.round(node.duration.seconds / 60);
            return `${m}m ${node.kind}`;
        }
        return `Lap ${node.kind}`;
    }

    const summaryText = workout.steps.map(formatNodeText).join(' + ');

    return {
        totalDistanceMeters: Math.round(totalDistanceMeters),
        totalDurationSeconds: Math.round(totalDurationSeconds),
        estimatedTss: Math.round(accumulatedTss),
        summaryText,
    };
}

/**
 * Context used to resolve pace / power / HR / swim targets when building the
 * canonical v2 structured step tree. Everything is optional: sensible defaults
 * are derived from `vdot` (bike FTP from VDOT, swim CSS from VDOT, VDOT 45)
 * so the builder never throws on partial input.
 */
export interface StructuredStepsContext {
    vdot?: number;
    ftpWatts?: number;
    swimCssSecPer100m?: number;
    weightKg?: number;
    /** Pre-resolved HR zone bpm bounds (from `resolveHrZones`). */
    hrZones?: HrZoneDefinition[] | null;
}

/** Minimal workout surface the structured-steps builder reads AND mutates. */
export type StructuredStepsWorkout = Partial<Pick<
    GeneratedWorkout,
    | 'type' | 'description' | 'totalDistance' | 'targetPace' | 'targetDuration' | 'targetHrZone'
    | 'targetPaceMinSecondsPerKm' | 'targetPaceMaxSecondsPerKm' | 'targetPaceZoneLabel'
    | 'targetHrZoneLabel' | 'targetHrMinBpm' | 'targetHrMaxBpm'
    | 'targetPowerWatts' | 'targetPowerMinWatts' | 'targetPowerMaxWatts' | 'targetPowerZone'
    | 'targetFtpPercent' | 'targetCadenceRpm' | 'targetRpe'
>> & {
    type?: WorkoutType | string;
    workoutType?: WorkoutType | string;
    description?: string;
    totalDistance?: number;
    distanceMeters?: number;
    sport?: string;
    vdot?: number;
    ftpWatts?: number;
    plannedTss?: number | null;
};

const clampInt = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, Math.round(value)));

const clampStepSeconds = (seconds: number): number => clampInt(seconds, 1, 86400);
const clampStepMeters = (meters: number): number => clampInt(meters, 1, 100000);

function timeStep(
    kind: StructuredStep['kind'],
    label: string,
    seconds: number,
    extra?: Partial<StructuredStep>,
): StructuredStep {
    return { kind, label, duration: { type: 'time', seconds: clampStepSeconds(seconds) }, ...extra };
}

function distanceStep(
    kind: StructuredStep['kind'],
    label: string,
    meters: number,
    extra?: Partial<StructuredStep>,
): StructuredStep {
    return { kind, label, duration: { type: 'distance', meters: clampStepMeters(meters) }, ...extra };
}

/** Power target for a bike zone range, with a midpoint %FTP and zone label. */
function powerTarget(zone: { min: number; max: number }, label: string, ftpWatts: number): Target {
    const midWatts = (zone.min + zone.max) / 2;
    return {
        type: 'power',
        minWatts: Math.round(zone.min),
        maxWatts: Math.round(zone.max),
        ftpPercent: ftpWatts > 0 ? Math.round((midWatts / ftpWatts) * 100) : undefined,
        zoneLabel: label,
    };
}

/** Pace target fixed at one sec/km value (the generator's exact step pace). */
function exactPaceTarget(paceSecPerKm: number): Target {
    const pace = Math.round(paceSecPerKm);
    return { type: 'pace', unit: 'sec_per_km', min: pace, max: pace };
}

/** Pace window around a sec/km value (±3%), used for brick run legs. */
function paceWindowTarget(paceSecPerKm: number, label?: string): Target {
    return {
        type: 'pace',
        unit: 'sec_per_km',
        min: Math.round(paceSecPerKm * 0.97),
        max: Math.round(paceSecPerKm * 1.03),
        zoneLabel: label,
    };
}

function repeatGroup(
    times: number,
    setRest: Duration | undefined,
    steps: StepNode[],
    label?: string,
): RepeatGroup {
    const group: RepeatGroup = { kind: 'repeat', times: clampInt(times, 1, MAX_REPEAT_TIMES), steps };
    if (setRest) group.setRest = setRest;
    if (label) group.label = label;
    return group;
}

/**
 * Fill the workout-level numeric target fields the builder can derive, WITHOUT
 * overwriting values the enrichment pipeline already set (every write is
 * guarded by `== null`).
 */
function populateStructuredTargets(
    workout: StructuredStepsWorkout,
    paces: TrainingPaces,
    hrZones: HrZoneDefinition[] | null,
    bikeZones: BikeZones,
    bikeFtp: number,
    bikeZoneNumber: number | null,
    bikeCadenceRpm: number | null,
): void {
    const paceTarget = getPaceTarget(
        { type: workout.type as WorkoutType, description: workout.description || '', targetPace: workout.targetPace },
        paces,
    );
    if (paceTarget) {
        if (workout.targetPaceMinSecondsPerKm == null) workout.targetPaceMinSecondsPerKm = paceTarget.min;
        if (workout.targetPaceMaxSecondsPerKm == null) workout.targetPaceMaxSecondsPerKm = paceTarget.max;
        if (workout.targetPaceZoneLabel == null) workout.targetPaceZoneLabel = paceTarget.label;
    }

    const hrTarget = getZoneTarget(workout.targetHrZone, hrZones);
    if (hrTarget) {
        if (workout.targetHrZoneLabel == null) workout.targetHrZoneLabel = hrTarget.label;
        if (workout.targetHrMinBpm == null) workout.targetHrMinBpm = hrTarget.min;
        if (workout.targetHrMaxBpm == null) workout.targetHrMaxBpm = hrTarget.max;
    }

    if (bikeZoneNumber != null) {
        const zone = bikeZoneNumber === 4 ? bikeZones.threshold : bikeZones.endurance;
        const midWatts = Math.round((zone.min + zone.max) / 2);
        if (workout.targetPowerWatts == null) workout.targetPowerWatts = midWatts;
        if (workout.targetPowerMinWatts == null) workout.targetPowerMinWatts = zone.min;
        if (workout.targetPowerMaxWatts == null) workout.targetPowerMaxWatts = zone.max;
        if (workout.targetPowerZone == null) workout.targetPowerZone = bikeZoneNumber;
        if (workout.targetFtpPercent == null && bikeFtp > 0) {
            workout.targetFtpPercent = Math.round((midWatts / bikeFtp) * 100);
        }
        if (bikeCadenceRpm != null && workout.targetCadenceRpm == null) {
            workout.targetCadenceRpm = bikeCadenceRpm;
        }
    }
}

/**
 * Build the canonical v2 structured step tree for a generated workout and
 * populate its first-class numeric target fields (task A2, step 1).
 *
 * Sport coverage:
 *   - RUN (EASY / LONG_RUN / RECOVERY / TEMPO / INTERVALS / REPETITIONS /
 *     FARTLEK / RACE): the exact v1 step paces, distances, durations and
 *     `hrZone` numbers, wrapped in v2 — intervals/repeats/fartlek mains become
 *     `RepeatGroup`s whose flatten yields the identical work/recovery sequence.
 *   - BIKE (RIDE / LONG_RIDE / RIDE_INTERVALS): power targets from
 *     `calculateBikeZones(ftp)` plus cadence (85–95 RPM endurance,
 *     90–100 RPM intervals), and the workout-level `targetPower*` columns.
 *   - SWIM (SWIM / SWIM_DRILL / OPEN_WATER_SWIM): warmup + main-set
 *     `RepeatGroup` in meters with a 20s `setRest` + cooldown, with
 *     `sec_per_100m` pace windows from `calculateSwimPaces(swimCss)`.
 *   - BRICK: bike steady (power) → 120s `T2 Bike-to-Run Transition` → run leg
 *     (pace).
 *   - STRENGTH: warmup + main circuit `RepeatGroup` + mobility cooldown with
 *     RPE targets (work rounds at RPE 7).
 *
 * Returns null when the workout carries neither distance nor duration.
 */
export function buildStructuredStepsForWorkout(
    workout: StructuredStepsWorkout,
    context: StructuredStepsContext = {},
): StructuredWorkoutV2 | null {
    const rawType = workout.type || workout.workoutType;
    if (!rawType) return null;
    const type = rawType as WorkoutType;
    const totalDist = workout.totalDistance ?? workout.distanceMeters ?? 0;
    const targetDur = workout.targetDuration ?? null;
    if (totalDist <= 0 && (!targetDur || targetDur <= 0)) return null;

    workout.type = type;
    workout.totalDistance = totalDist;
    if (!workout.description) {
        workout.description = typeof rawType === 'string' ? rawType : 'Workout';
    }

    const vdot = context.vdot && context.vdot > 0
        ? context.vdot
        : (workout.vdot && workout.vdot > 0 ? workout.vdot : 45);
    const bikeFtp = context.ftpWatts && context.ftpWatts > 0
        ? Math.round(context.ftpWatts)
        : (workout.ftpWatts && workout.ftpWatts > 0 ? Math.round(workout.ftpWatts) : estimateBikeFtpFromVdot(vdot, context.weightKg ?? 70));
    const swimCss = context.swimCssSecPer100m && context.swimCssSecPer100m > 0
        ? context.swimCssSecPer100m
        : estimateSwimPaceFromVdot(vdot);
    const bikeZones = calculateBikeZones(bikeFtp);
    const swimPaces = calculateSwimPaces(swimCss);
    const paces = calculateTrainingPaces(vdot);
    const easyPaceWindowTarget: Target = {
        type: 'pace',
        unit: 'sec_per_km',
        min: Math.round(paces.easy.min),
        max: Math.round(paces.easy.max),
        zoneLabel: 'E',
    };
    const targetPace = workout.targetPace && workout.targetPace > 0 ? workout.targetPace : undefined;
    const hrZone = workout.targetHrZone;

    // 1. STRENGTH & TRANSITION PRACTICE — RPE-targeted circuits.
    if (type === WorkoutType.STRENGTH || type === WorkoutType.TRANSITION_PRACTICE) {
        if (type === WorkoutType.TRANSITION_PRACTICE) {
            populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
            if (workout.targetRpe == null) workout.targetRpe = 5;
            return {
                version: 2,
                source: 'engine',
                steps: [timeStep('steady', 'Transition Practice', workout.targetDuration || 1800, {
                    target: { type: 'rpe', value: 5 },
                })],
            };
        }

        const totalSec = workout.targetDuration && workout.targetDuration > 0 ? workout.targetDuration : 2700;
        const warmupSec = Math.max(240, Math.round(totalSec * 0.12));
        const cooldownSec = Math.max(240, Math.round(totalSec * 0.12));
        const roundRestSec = 60;
        const rounds = 3;
        const roundSec = Math.max(
            240,
            Math.round((totalSec - warmupSec - cooldownSec - roundRestSec * (rounds - 1)) / rounds),
        );

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        if (workout.targetRpe == null) workout.targetRpe = 7;

        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('warmup', 'Warmup & Mobility', warmupSec, { target: { type: 'rpe', value: 4 } }),
                repeatGroup(rounds, { type: 'time', seconds: roundRestSec }, [
                    timeStep('work', 'Strength Circuit', roundSec, { target: { type: 'rpe', value: 7 } }),
                ], 'Main Circuit'),
                timeStep('cooldown', 'Mobility & Stretching', cooldownSec, { target: { type: 'rpe', value: 3 } }),
            ],
        };
    }

    // 2. BRICK — bike steady (power) → T2 transition → run leg (pace).
    if (type === WorkoutType.BRICK) {
        const match = workout.description.match(/(\d+)\s*min\s*Bike\s*(?:\u2192|->)\s*(\d+)\s*min\s*Run/i);
        const bikeSeconds = (match ? parseInt(match[1]) : 45) * 60;
        const runSeconds = (match ? parseInt(match[2]) : 15) * 60;
        const runBrickPace = targetPace ?? Math.round((paces.easy.min + paces.easy.max) / 2);

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, 2, 90);

        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('steady', 'Bike Leg', bikeSeconds, {
                    target: powerTarget(bikeZones.endurance, 'Z2 Endurance', bikeFtp),
                    cadenceRpm: 90,
                    hrZone: 2,
                }),
                timeStep('transition', 'T2 Bike-to-Run Transition', 120, { target: { type: 'free' } }),
                timeStep('work', 'Run Leg', runSeconds, {
                    target: paceWindowTarget(runBrickPace, 'Brick Run'),
                    hrZone: hrZone ?? 2,
                }),
            ],
        };
    }

    // 3. BIKE RIDES (Steady & Intervals) — power targets + cadence.
    if (type === WorkoutType.RIDE || type === WorkoutType.LONG_RIDE) {
        const durationSec = workout.targetDuration && workout.targetDuration > 0 ? workout.targetDuration : 3600;
        const explicitFtpPct = typeof workout.targetFtpPercent === 'number' && workout.targetFtpPercent > 0 ? workout.targetFtpPercent : null;
        const isFreeOrRecoveryRide =
            (workout.plannedTss !== undefined && workout.plannedTss !== null && workout.plannedTss <= 15) ||
            /\b(free\s*day|recovery\s*spin|easy\s*spin)\b/i.test(workout.description || '');

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, isFreeOrRecoveryRide ? 1 : 2, 90);

        let steadyTarget: Target;
        if (isFreeOrRecoveryRide && !explicitFtpPct) {
            steadyTarget = powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp);
        } else if (explicitFtpPct) {
            const centerW = Math.round((bikeFtp * explicitFtpPct) / 100);
            const minW = Math.max(0, Math.round(centerW * 0.95));
            const maxW = Math.round(centerW * 1.05);
            steadyTarget = {
                type: 'power',
                minWatts: minW,
                maxWatts: maxW,
                ftpPercent: explicitFtpPct,
                zoneLabel: `${explicitFtpPct}% FTP`,
            };
        } else {
            steadyTarget = powerTarget(bikeZones.endurance, 'Z2 Endurance', bikeFtp);
        }

        return {
            version: 2,
            source: 'engine',
            sport: 'BIKE',
            ...(typeof workout.plannedTss === 'number' && workout.plannedTss >= 0 ? { lockedPlannedTss: workout.plannedTss } : {}),
            steps: [timeStep('steady', type === WorkoutType.LONG_RIDE ? 'Long Ride' : 'Easy Ride', durationSec, {
                target: steadyTarget,
                cadenceRpm: workout.targetCadenceRpm ?? 90,
                hrZone: hrZone ?? (isFreeOrRecoveryRide ? 1 : 2),
            })],
        };
    }

    if (type === WorkoutType.RIDE_INTERVALS) {
        const desc = workout.description || '';
        const overUnderMatch = desc.match(
            /(\d+)\s*x\s*(\d+)\s*m(?:in)?\s*(?:over-?unders?)?\s*\(\s*(\d+)\s*m(?:in)?\s*@\s*(\d+)%\s*FTP\s*\/\s*(\d+)\s*m(?:in)?\s*@\s*(\d+)%\s*FTP\s*\)(?:.*?(\d+)\s*m(?:in)?\s*(?:recovery|rest))?/i
        );

        const explicitFtpPct =
            typeof workout.targetFtpPercent === 'number' && workout.targetFtpPercent > 0
                ? workout.targetFtpPercent
                : (() => {
                      const pctMatch = desc.match(/@\s*(\d{2,3})%\s*FTP/i);
                      return pctMatch ? parseInt(pctMatch[1], 10) : null;
                  })();

        const cadenceTarget = workout.targetCadenceRpm ?? 95;
        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, 4, cadenceTarget);

        if (overUnderMatch) {
            const sets = Math.max(1, Math.min(20, parseInt(overUnderMatch[1], 10)));
            const blockMinutes = Math.max(1, parseInt(overUnderMatch[2], 10));
            const underMin = Math.max(1, parseInt(overUnderMatch[3], 10));
            const underPct = parseInt(overUnderMatch[4], 10);
            const overMin = Math.max(1, parseInt(overUnderMatch[5], 10));
            const overPct = parseInt(overUnderMatch[6], 10);
            const setRestMinutes = overUnderMatch[7] ? parseInt(overUnderMatch[7], 10) : 4;

            const innerCycles = Math.max(1, Math.round(blockMinutes / (underMin + overMin)));
            const warmupSeconds = 600;
            const setRestSeconds = setRestMinutes * 60;
            const blockSeconds = innerCycles * (underMin + overMin) * 60;
            const fixedSeconds = warmupSeconds + sets * blockSeconds + (sets - 1) * setRestSeconds;
            const cooldownSeconds = Math.max(180, (workout.targetDuration || fixedSeconds + 300) - fixedSeconds);

            const underWatts = Math.round((bikeFtp * underPct) / 100);
            const overWatts = Math.round((bikeFtp * overPct) / 100);

            return {
                version: 2,
                source: 'engine',
                sport: 'BIKE',
                ...(typeof workout.plannedTss === 'number' && workout.plannedTss >= 0 ? { lockedPlannedTss: workout.plannedTss } : {}),
                steps: [
                    timeStep('warmup', 'Warm up spin', warmupSeconds, {
                        target: powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp),
                        cadenceRpm: 85,
                        hrZone: 1,
                    }),
                    repeatGroup(
                        sets,
                        { type: 'time', seconds: setRestSeconds },
                        [
                            repeatGroup(
                                innerCycles,
                                undefined,
                                [
                                    timeStep('work', `Under (${underPct}% FTP)`, underMin * 60, {
                                        target: {
                                            type: 'power',
                                            minWatts: Math.round(underWatts * 0.97),
                                            maxWatts: Math.round(underWatts * 1.03),
                                            ftpPercent: underPct,
                                            zoneLabel: `${underPct}% FTP`,
                                        },
                                        cadenceRpm: cadenceTarget,
                                        hrZone: hrZone ?? 4,
                                    }),
                                    timeStep('work', `Over (${overPct}% FTP)`, overMin * 60, {
                                        target: {
                                            type: 'power',
                                            minWatts: Math.round(overWatts * 0.97),
                                            maxWatts: Math.round(overWatts * 1.03),
                                            ftpPercent: overPct,
                                            zoneLabel: `${overPct}% FTP`,
                                        },
                                        cadenceRpm: cadenceTarget,
                                        hrZone: hrZone ?? 4,
                                    }),
                                ],
                                `${blockMinutes}min Over-Under`
                            ),
                        ],
                        `${sets}×${blockMinutes}min Over-Unders`
                    ),
                    timeStep('cooldown', 'Cool down spin', cooldownSeconds, {
                        target: powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp),
                        cadenceRpm: 85,
                        hrZone: 1,
                    }),
                ],
            };
        }

        const match = desc.match(/(\d+)\s*x\s*(\d+)\s*m(?:in)?/i);
        const reps = match ? parseInt(match[1], 10) : 4;
        const repMinutes = match ? parseInt(match[2], 10) : 5;
        const restMatch = desc.match(/(\d+)\s*m(?:in)?\s*(?:recovery|rest)/i);
        const recoverySeconds = restMatch ? parseInt(restMatch[1], 10) * 60 : 180;

        const warmupSeconds = 600;
        const repSeconds = repMinutes * 60;
        const fixedSeconds = warmupSeconds + reps * repSeconds + (reps - 1) * recoverySeconds;
        const cooldownSeconds = Math.max(180, (workout.targetDuration || 0) - fixedSeconds);

        const workPowerTarget: Target = explicitFtpPct
            ? {
                  type: 'power',
                  minWatts: Math.round((bikeFtp * (explicitFtpPct - 3)) / 100),
                  maxWatts: Math.round((bikeFtp * (explicitFtpPct + 3)) / 100),
                  ftpPercent: explicitFtpPct,
                  zoneLabel: `${explicitFtpPct}% FTP`,
              }
            : powerTarget(bikeZones.threshold, 'Z4 Threshold', bikeFtp);

        return {
            version: 2,
            source: 'engine',
            sport: 'BIKE',
            ...(typeof workout.plannedTss === 'number' && workout.plannedTss >= 0 ? { lockedPlannedTss: workout.plannedTss } : {}),
            steps: [
                timeStep('warmup', 'Warm up spin', warmupSeconds, {
                    target: powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp),
                    cadenceRpm: 85,
                    hrZone: 1,
                }),
                repeatGroup(
                    reps,
                    { type: 'time', seconds: recoverySeconds },
                    [
                        timeStep('work', 'Interval', repSeconds, {
                            target: workPowerTarget,
                            cadenceRpm: cadenceTarget,
                            hrZone: hrZone ?? 4,
                        }),
                    ],
                    `${reps}×${repMinutes}min`
                ),
                timeStep('cooldown', 'Cool down spin', cooldownSeconds, {
                    target: powerTarget(bikeZones.recovery, 'Z1 Recovery', bikeFtp),
                    cadenceRpm: 85,
                    hrZone: 1,
                }),
            ],
        };
    }

    // 4. SWIM SETS — warmup + main-set repeat group (meters, 20s setRest) + cooldown.
    if (type === WorkoutType.SWIM || type === WorkoutType.SWIM_DRILL || type === WorkoutType.OPEN_WATER_SWIM) {
        const totalDist = workout.totalDistance;
        const warmup = Math.min(200, Math.max(50, Math.round(totalDist * 0.15 / 50) * 50));
        const cooldown = Math.min(200, Math.max(50, Math.round(totalDist * 0.15 / 50) * 50));
        const mainSetDist = Math.max(0, totalDist - warmup - cooldown);

        // Pace windows: ground in calculateSwimPaces(css); when the generator
        // supplied an explicit sec/100m targetPace, center the main-set window
        // on it (±3%) so step targets agree with the workout-level pace.
        const easyWindow = swimPaces.easy;
        const useExplicitTargetPace = context.swimCssSecPer100m == null && targetPace != null;
        const warmupPaceTarget: Target = useExplicitTargetPace
            ? {
                type: 'pace', unit: 'sec_per_100m',
                min: Math.round(targetPace! * 1.02), max: Math.round(targetPace! * 1.08),
                zoneLabel: easyWindow.label,
            }
            : { type: 'pace', unit: 'sec_per_100m', min: easyWindow.min, max: easyWindow.max, zoneLabel: easyWindow.label };
        const isCssThreshold = workout.description?.includes('Threshold') || workout.description?.includes('CSS');
        const mainWindow = type === WorkoutType.SWIM_DRILL
            ? swimPaces.easy
            : isCssThreshold
                ? swimPaces.threshold
                : swimPaces.steady;
        const mainPaceTarget: Target = useExplicitTargetPace
            ? {
                type: 'pace', unit: 'sec_per_100m',
                min: Math.round(targetPace! * 0.97), max: Math.round(targetPace! * 1.03),
                zoneLabel: type === WorkoutType.SWIM_DRILL ? 'Swim Drill' : mainWindow.label,
            }
            : {
                type: 'pace', unit: 'sec_per_100m',
                min: mainWindow.min, max: mainWindow.max,
                zoneLabel: type === WorkoutType.SWIM_DRILL ? 'Swim Drill' : mainWindow.label,
            };

        const repDistance = type === WorkoutType.SWIM_DRILL ? 50 : 100;
        const steps: StepNode[] = [
            distanceStep('warmup', 'Warm up swim', warmup, { target: warmupPaceTarget, hrZone: 1 }),
        ];
        if (mainSetDist > 0) {
            const times = clampInt(Math.floor(mainSetDist / repDistance), 1, MAX_REPEAT_TIMES);
            const remainder = mainSetDist - times * repDistance;
            steps.push(repeatGroup(
                times,
                { type: 'time', seconds: 20 },
                [distanceStep('work', type === WorkoutType.SWIM_DRILL ? 'Drill' : 'Swim', repDistance, {
                    target: mainPaceTarget,
                    hrZone: hrZone ?? 2,
                })],
                `Main Set ${times}×${repDistance}m`,
            ));
            if (remainder >= repDistance / 2) {
                steps.push(distanceStep('steady', 'Steady swim', remainder, { target: mainPaceTarget, hrZone: hrZone ?? 2 }));
            }
        }
        steps.push(distanceStep('cooldown', 'Cool down swim', cooldown, { target: warmupPaceTarget, hrZone: 1 }));

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        return { version: 2, source: 'engine', steps };
    }

    // 5. RUN EASY / RECOVERY — flat steady step, or steady + strides repeat group.
    if (type === WorkoutType.EASY || type === WorkoutType.RECOVERY) {
        const stridesMatch = workout.description.match(/(\d+)x(\d+)m\s*Strides/i);
        if (stridesMatch) {
            const reps = parseInt(stridesMatch[1], 10);
            const repMeters = parseInt(stridesMatch[2], 10);
            const stridesTotalDist = reps * repMeters;
            const mainDist = workout.totalDistance > stridesTotalDist
                ? workout.totalDistance - stridesTotalDist
                : (workout.totalDistance > 0 ? workout.totalDistance : 0);

            const mainStep: StructuredStep = mainDist > 0
                ? distanceStep('steady', type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run', mainDist, {
                    target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget,
                    hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2),
                })
                : timeStep('steady', type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run', workout.targetDuration || 3600, {
                    target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget,
                    hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2),
                });

            const repPace = Math.round(paces.repetition);
            const strideStep = distanceStep('work', 'Strides', repMeters, {
                target: { type: 'pace', unit: 'sec_per_km', min: repPace, max: repPace, zoneLabel: 'R' },
                hrZone: 5,
            });

            const stridesGroup = repeatGroup(
                reps,
                { type: 'time', seconds: 60 },
                [strideStep],
                `${reps}×${repMeters}m Strides`,
            );

            populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
            return {
                version: 2,
                source: 'engine',
                steps: [mainStep, stridesGroup],
            };
        }

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        const step: StructuredStep = workout.totalDistance > 0
            ? distanceStep('steady',
                type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run',
                workout.totalDistance, { hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2), target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget })
            : timeStep('steady',
                type === WorkoutType.RECOVERY ? 'Recovery run' : 'Easy run',
                workout.targetDuration || 3600, { hrZone: hrZone ?? (type === WorkoutType.RECOVERY ? 1 : 2), target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget });
        return { version: 2, source: 'engine', steps: [step] };
    }

    // 5b. RUN LONG RUN — flat steady step, or steady easy + goal pace / progressive finish.
    if (type === WorkoutType.LONG_RUN) {
        const goalPaceMatch = workout.description.match(/([\d.]+)km\s*Easy\s*\+\s*([\d.]+)km\s*@\s*Goal\s*Pace/i);
        const progMatch = workout.description.match(/last\s*(\d+(?:\.\d+)?)\s*km\s*progressive/i);

        if (goalPaceMatch || progMatch) {
            let easyDist: number;
            let finishDist: number;
            let finishLabel: string;

            if (goalPaceMatch) {
                easyDist = Math.round(parseFloat(goalPaceMatch[1]) * 1000);
                finishDist = Math.round(parseFloat(goalPaceMatch[2]) * 1000);
                finishLabel = 'Goal Pace finish';
            } else {
                const progKm = parseFloat(progMatch![1]);
                finishDist = Math.round(progKm * 1000);
                easyDist = Math.max(0, workout.totalDistance - finishDist);
                finishLabel = 'Progressive finish';
            }

            populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
            return {
                version: 2,
                source: 'engine',
                steps: [
                    distanceStep('steady', 'Easy segment', easyDist > 0 ? easyDist : 1000, {
                        target: easyPaceWindowTarget,
                        hrZone: 2,
                    }),
                    distanceStep('work', finishLabel, finishDist, {
                        target: paceWindowTarget(paces.marathon, 'M'),
                        hrZone: 3,
                    }),
                ],
            };
        }

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        const step: StructuredStep = workout.totalDistance > 0
            ? distanceStep('steady', 'Long run', workout.totalDistance, { hrZone: hrZone ?? 2, target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget })
            : timeStep('steady', 'Long run', workout.targetDuration || 3600, { hrZone: hrZone ?? 2, target: targetPace ? exactPaceTarget(targetPace) : easyPaceWindowTarget });
        return { version: 2, source: 'engine', steps: [step] };
    }

    // 6. RUN QUALITY / INTERVALS — RepeatGroup so the flattened work/recovery
    // sequence is identical to the v1 flat list.
    const repMatch = workout.description.match(/(\d+)x(\d+(?:\.\d+)?)\s*(km|m)/i);
    if (repMatch) {
        const reps = parseInt(repMatch[1]);
        const value = parseFloat(repMatch[2]);
        const unit = repMatch[3].toLowerCase();
        const repDistMeters = unit === 'km' ? value * 1000 : value;

        let warmupDistance = workout.totalDistance >= 5000 ? 1500 : 0;
        let cooldownDistance = workout.totalDistance >= 5000 ? 1000 : 0;
        const workDistance = reps * repDistMeters;
        const supportDistance = Math.max(0, workout.totalDistance - workDistance);
        if (warmupDistance + cooldownDistance > supportDistance) {
            warmupDistance = Math.round(supportDistance * 0.6);
            cooldownDistance = supportDistance - warmupDistance;
        }
        const recoveryDistance = reps > 1
            ? Math.max(0, (supportDistance - warmupDistance - cooldownDistance) / (reps - 1))
            : 0;

        const steps: StepNode[] = [];
        if (warmupDistance >= 1) {
            steps.push(distanceStep('warmup', 'Warm up', warmupDistance, { hrZone: 1, target: easyPaceWindowTarget }));
        }

        const setRest: Duration = recoveryDistance >= 1
            ? { type: 'distance', meters: clampStepMeters(recoveryDistance) }
            : { type: 'time', seconds: 120 };

        const workStep = distanceStep('work', 'Rep', repDistMeters, { hrZone });
        if (targetPace) workStep.target = exactPaceTarget(targetPace);
        const repLabel = repDistMeters >= 1000
            ? `${Number.isInteger(repDistMeters / 1000) ? repDistMeters / 1000 : (repDistMeters / 1000).toFixed(1)}km`
            : `${Math.round(repDistMeters)}m`;
        steps.push(repeatGroup(reps, setRest, [workStep], `${reps}×${repLabel}`));

        if (cooldownDistance >= 1) {
            steps.push(distanceStep('cooldown', 'Cool down', cooldownDistance, { hrZone: 1, target: easyPaceWindowTarget }));
        }

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        return { version: 2, source: 'engine', steps };
    }

    // 7. RUN FARTLEK — hard/easy cycles as a RepeatGroup (recovery inside).
    const fartlekMatch = workout.description.match(/(\d+)\s*min\s*(?:hard|@\s*F).*?(\d+)\s*min\s*(?:easy|@\s*E)/i);
    if (fartlekMatch) {
        const hardMin = parseInt(fartlekMatch[1]);
        const easyMin = parseInt(fartlekMatch[2]);
        const cycleSeconds = (hardMin + easyMin) * 60;

        const warmupSeconds = 600;
        const cooldownSeconds = 600;
        const totalSecs = workout.targetDuration || Math.round((workout.totalDistance / 1000) * (targetPace || 300));
        const mainSecs = Math.max(cycleSeconds, totalSecs - warmupSeconds - cooldownSeconds);
        // Ensure faster (high-VDOT) athletes never invert to fewer cycles than slower athletes:
        // minimum cycles scales with session distance (e.g. 6km -> 3, 8km -> 4, 10km -> 4, 12km -> 5)
        const minCyclesByDist = workout.totalDistance >= 11000 ? 5 : workout.totalDistance >= 7500 ? 4 : 3;
        const reps = Math.max(workout.targetDuration ? 1 : minCyclesByDist, Math.max(minCyclesByDist, Math.floor(mainSecs / cycleSeconds)));

        const workStep = timeStep('work', 'Fartlek Hard', hardMin * 60, { hrZone });
        if (targetPace) workStep.target = exactPaceTarget(targetPace);
        const easyStep = timeStep('recovery', 'Fartlek Easy', easyMin * 60, {
            hrZone: 2,
        });
        if (targetPace) easyStep.target = exactPaceTarget(Math.round(targetPace * 1.15));

        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        return {
            version: 2,
            source: 'engine',
            steps: [
                timeStep('warmup', 'Warm up', warmupSeconds, { hrZone: 1, target: easyPaceWindowTarget }),
                repeatGroup(reps, undefined, [workStep, easyStep], 'Fartlek Cycles'),
                timeStep('cooldown', 'Cool down', cooldownSeconds, { hrZone: 1, target: easyPaceWindowTarget }),
            ],
        };
    }

    // 7b. RACE DAY — single race execution step (no artificial 1.5km warmup + 1km cooldown carved out of race distance).
    if (type === WorkoutType.RACE) {
        populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
        const isTimedRace = workout.description?.includes('12h') || workout.description?.includes('24h') || workout.description?.includes('Backyard Ultra');
        const raceStep: StructuredStep = isTimedRace && workout.targetDuration && workout.targetDuration > 0
            ? timeStep('work', 'Race Day', workout.targetDuration, {
                hrZone: hrZone ?? 2,
                ...(targetPace ? { target: exactPaceTarget(targetPace) } : {}),
            })
            : distanceStep('work', 'Race Day', Math.max(100, workout.totalDistance), {
                hrZone: hrZone ?? 3,
                ...(targetPace ? { target: exactPaceTarget(targetPace) } : {}),
            });
        return { version: 2, source: 'engine', steps: [raceStep] };
    }

    // 8. Generic fallback — warmup + work + cooldown around the main body.
    const warmupDistance = workout.totalDistance >= 5000 ? 1500 : 0;
    const cooldownDistance = workout.totalDistance >= 5000 ? 1000 : 0;
    const remainingDistance = Math.max(0, workout.totalDistance - warmupDistance - cooldownDistance);

    const steps: StepNode[] = [];
    if (warmupDistance >= 1) {
        steps.push(distanceStep('warmup', 'Warm up', warmupDistance, { hrZone: 1, target: easyPaceWindowTarget }));
    }
    const workStep = distanceStep(
        'work',
        workout.description.split(':')[0] || 'Main set',
        remainingDistance > 0 ? remainingDistance : workout.totalDistance,
        { hrZone },
    );
    if (targetPace) workStep.target = exactPaceTarget(targetPace);
    steps.push(workStep);
    if (cooldownDistance >= 1) {
        steps.push(distanceStep('cooldown', 'Cool down', cooldownDistance, { hrZone: 1, target: easyPaceWindowTarget }));
    }

    populateStructuredTargets(workout, paces, context.hrZones ?? null, bikeZones, bikeFtp, null, null);
    return { version: 2, source: 'engine', steps };
}

export function getPaceTarget(
    workout: Pick<GeneratedWorkout, 'type' | 'description' | 'targetPace'>,
    paces: TrainingPaces,
): { label: string; min: number; max: number } | null {
    if (!workout.targetPace || workout.targetPace <= 0) return null;

    switch (workout.type) {
        case WorkoutType.SWIM:
        case WorkoutType.SWIM_DRILL:
        case WorkoutType.OPEN_WATER_SWIM:
            return {
                label: workout.type === WorkoutType.SWIM_DRILL ? 'Swim Drill' : workout.type === WorkoutType.OPEN_WATER_SWIM ? 'OW Swim' : 'Swim Pace',
                min: Math.round(workout.targetPace * 0.95),
                max: Math.round(workout.targetPace * 1.05),
            };
        case WorkoutType.EASY:
        case WorkoutType.LONG_RUN:
        case WorkoutType.RECOVERY:
            return { label: 'Easy', min: paces.easy.min, max: paces.easy.max };
        case WorkoutType.TEMPO:
            if (workout.description.includes('HM Pace Segments')) {
                return paceWindow('HM Race Pace', workout.targetPace, 0.03);
            }
            if (workout.description.includes('MP Segments') || workout.description.includes('MP')) {
                return paceWindow('Marathon Pace', workout.targetPace, 0.03);
            }
            return paceWindow('Threshold', paces.threshold, 0.03);
        case WorkoutType.INTERVALS:
            return paceWindow('Interval', paces.interval, 0.02);
        case WorkoutType.REPETITIONS:
            return paceWindow('Repetition', paces.repetition, 0.02);
        case WorkoutType.FARTLEK:
            return {
                label: 'Fartlek',
                min: Math.min(paces.interval, paces.threshold),
                max: Math.max(paces.interval, paces.threshold),
            };
        case WorkoutType.RACE:
            return paceWindow('Race Pace', workout.targetPace, 0.03);
        default:
            return paceWindow('Target Pace', workout.targetPace, 0.03);
    }
}

function paceWindow(label: string, paceSecondsPerKm: number, fraction: number): { label: string; min: number; max: number } {
    return {
        label,
        min: Math.round(paceSecondsPerKm * (1 - fraction)),
        max: Math.round(paceSecondsPerKm * (1 + fraction)),
    };
}
