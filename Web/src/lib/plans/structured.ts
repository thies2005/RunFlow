import { z } from 'zod';
import { calculateTrainingPaces, type TrainingPaces } from '@/lib/metrics/vdot';

export const MAX_REPEAT_TIMES = 100;
export const MAX_REPEAT_DEPTH = 3;

export interface StructuredWorkoutV2 {
    version: 2;
    source: 'engine' | 'builder' | 'editor' | 'progression' | 'template' | 'mcp';
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
    const wt = workoutType?.toUpperCase();
    if (wt === 'SWIM' || wt === 'SWIM_DRILL' || wt === 'OPEN_WATER_SWIM') return 'SWIM';
    if (wt === 'RIDE' || wt === 'LONG_RIDE' || wt === 'RIDE_INTERVALS' || wt === 'BRICK') return 'BIKE';
    if (wt === 'STRENGTH' || wt === 'CORE') return 'STRENGTH';

    const sp = sport?.toUpperCase();
    if (sp === 'SWIM' || sp === 'BIKE' || sp === 'STRENGTH') return sp;
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
    ftpWatts?: number | null
): { totalDistanceMeters: number; totalDurationSeconds: number; estimatedTss: number; summaryText: string } {
    const flat = flattenStructuredWorkout(workout);
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let accumulatedTss = 0;

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

            let paceSec = defaultPace;
            if (step.target?.type === 'pace') {
                const p = step.target;
                const avgPace = p.min && p.max ? (p.min + p.max) / 2 : p.min || p.max || defaultPace;
                paceSec = p.unit === 'sec_per_100m' ? avgPace * 10 : avgPace;
            }
            if (paceSec > 0) {
                stepMeters = Math.round((stepSeconds / paceSec) * 1000);
                totalDistanceMeters += stepMeters;
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
