/**
 * StructuredWorkoutV2 — canonical structured workout schema (master workflow task A1).
 *
 * This module is the single source of truth for the v2 structured workout tree:
 *
 *   - Canonical TypeScript interfaces (`StructuredWorkoutV2`, `StepNode`, …)
 *   - Zod validation schemas (unknown fields are stripped)
 *   - `parseStructuredWorkout` — tolerant parser that upgrades every legacy
 *     input shape (generator flat v1, builder `ProgressionWeekData`, default
 *     template arrays, legacy progression arrays) to the canonical v2 tree
 *   - `flattenStructuredWorkout` — expands repeats into a flat player list
 *   - `summarizeStructuredWorkout` — distance/duration/TSS totals + summary text
 *   - Pace / power unit utilities shared by the web editor and exports
 *
 * WIRE FORMAT (must be mirrored field-for-field by the Android Kotlin parser
 * in the native player, task A5 — do not rename any key below):
 *
 *   StructuredWorkoutV2 : { version: 2, source, steps }
 *   RepeatGroup         : { kind: "repeat", times, setRest?, steps, label? }
 *   StructuredStep      : { kind, label?, note?, duration, target?, hrZone?, cadenceRpm? }
 *   Duration            : { type: "time", seconds } | { type: "distance", meters } | { type: "lap_press" }
 *   Target              : { type: "pace", unit, min?, max?, zoneLabel? }
 *                       | { type: "hr", zone?, minBpm?, maxBpm? }
 *                       | { type: "power", minWatts?, maxWatts?, ftpPercent?, zoneLabel? }
 *                       | { type: "rpe", value }
 *                       | { type: "free" }
 *
 * All keys are camelCase; discriminators are `kind` for tree nodes and `type`
 * for duration/target variants.
 *
 * The module is pure: no DB / Prisma / network imports, fully unit-testable.
 */

import { z } from 'zod';
import { calculateTrainingPaces, type TrainingPaces } from '../metrics/vdot';

// ---------------------------------------------------------------------------
// Canonical model
// ---------------------------------------------------------------------------

export type WorkoutSource = 'engine' | 'builder' | 'editor' | 'progression' | 'template' | 'mcp';

export const WORKOUT_SOURCES = [
    'engine',
    'builder',
    'editor',
    'progression',
    'template',
    'mcp',
] as const;

export type Duration =
    | { type: 'time'; seconds: number }       // 1..86400
    | { type: 'distance'; meters: number }    // 1..100000
    | { type: 'lap_press' };

export type Target =
    | { type: 'pace'; unit: 'sec_per_km' | 'sec_per_100m'; min?: number; max?: number; zoneLabel?: string }
    | { type: 'hr'; zone?: number; minBpm?: number; maxBpm?: number }
    | { type: 'power'; minWatts?: number; maxWatts?: number; ftpPercent?: number; zoneLabel?: string }
    | { type: 'rpe'; value: number }
    | { type: 'free' };

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

export interface RepeatGroup {
    kind: 'repeat';
    times: number;            // 1..100
    setRest?: Duration;       // rest between iterations (not after the last iteration)
    steps: StepNode[];        // nestable up to depth 3
    label?: string;
}

export type StepNode = StructuredStep | RepeatGroup;

export interface StructuredWorkoutV2 {
    version: 2;
    source: WorkoutSource;
    steps: StepNode[];
}

/** Maximum repeat-group nesting depth (a repeat inside a repeat inside a repeat). */
export const MAX_REPEAT_DEPTH = 3;
/** Maximum iterations of a single repeat group. */
export const MAX_REPEAT_TIMES = 100;
/**
 * Hard cap on the expanded player list: a schema-valid 100×100×100 repeat
 * tree unrolls to 1,000,000 steps, which would blow up list-view callers
 * (summarize/flatten). Real workouts stay far below this; anything beyond is
 * truncated after the cap is reached.
 */
export const MAX_FLATTENED_STEPS = 1000;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const durationSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('time'), seconds: z.number().min(1).max(86400) }),
    z.object({ type: z.literal('distance'), meters: z.number().min(1).max(100000) }),
    z.object({ type: z.literal('lap_press') }),
]);

const paceTargetSchema = z.object({
    type: z.literal('pace'),
    unit: z.enum(['sec_per_km', 'sec_per_100m']),
    min: z.number().min(1).max(3600).optional(),
    max: z.number().min(1).max(3600).optional(),
    zoneLabel: z.string().max(50).optional(),
});

const hrTargetSchema = z.object({
    type: z.literal('hr'),
    zone: z.number().int().min(1).max(6).optional(),
    minBpm: z.number().min(40).max(250).optional(),
    maxBpm: z.number().min(40).max(250).optional(),
});

const powerTargetSchema = z.object({
    type: z.literal('power'),
    minWatts: z.number().min(0).max(3000).optional(),
    maxWatts: z.number().min(0).max(3000).optional(),
    ftpPercent: z.number().min(1).max(1000).optional(),
    zoneLabel: z.string().max(50).optional(),
});

const rpeTargetSchema = z.object({
    type: z.literal('rpe'),
    value: z.number().min(0).max(10),
});

const freeTargetSchema = z.object({
    type: z.literal('free'),
});

const targetSchema = z.discriminatedUnion('type', [
    paceTargetSchema,
    hrTargetSchema,
    powerTargetSchema,
    rpeTargetSchema,
    freeTargetSchema,
]);

const structuredStepSchema = z.object({
    kind: z.enum(['warmup', 'work', 'recovery', 'cooldown', 'steady', 'transition']),
    label: z.string().max(200).optional(),
    note: z.string().max(2000).optional(),
    duration: durationSchema,
    target: targetSchema.optional(),
    hrZone: z.number().int().min(1).max(6).optional(),
    cadenceRpm: z.number().min(0).max(500).optional(),
});

// Deferred recursion: `stepNodeSchema` resolves `repeatGroupSchema` lazily
// (inside a thunk), while `repeatGroupSchema` may reference the (already
// initialized) `stepNodeSchema` eagerly. Annotated so TypeScript can resolve
// the mutual recursion.
const stepNodeSchema: z.ZodType<StepNode> = z.lazy(() =>
    z.union([structuredStepSchema, repeatGroupSchema])
);

const repeatGroupSchema = z.object({
    kind: z.literal('repeat'),
    times: z.number().int().min(1).max(MAX_REPEAT_TIMES),
    setRest: durationSchema.optional(),
    steps: z.array(stepNodeSchema).min(1),
    label: z.string().max(200).optional(),
});

/**
 * Canonical v2 validation. Unknown fields are stripped (Zod object default).
 * Cross-field rules (min <= max per range target, repeat nesting depth) are
 * enforced in a single superRefine walk so every variant stays a plain object
 * schema inside the discriminated unions.
 */
export const structuredWorkoutV2Schema = z
    .object({
        version: z.literal(2),
        source: z.enum(WORKOUT_SOURCES),
        steps: z.array(stepNodeSchema),
    })
    .superRefine((workout, ctx) => {
        walkStepNodes(workout.steps, 0, (node, depth, path) => {
            if (depth > MAX_REPEAT_DEPTH) {
                ctx.addIssue({
                    code: 'custom',
                    message: `Repeat nesting exceeds max depth ${MAX_REPEAT_DEPTH}`,
                    path: [...path, 'steps'],
                });
                return;
            }
            if (node.kind === 'repeat') return;
            const t = node.target;
            if (!t) return;
            const bad = (field: string) => {
                ctx.addIssue({
                    code: 'custom',
                    message: `Target range invalid: ${field} (min > max)`,
                    path: [...path, 'target', field],
                });
            };
            if (t.type === 'pace' && t.min !== undefined && t.max !== undefined && t.min > t.max) bad('min');
            if (t.type === 'hr' && t.minBpm !== undefined && t.maxBpm !== undefined && t.minBpm > t.maxBpm) bad('minBpm');
            if (t.type === 'power' && t.minWatts !== undefined && t.maxWatts !== undefined && t.minWatts > t.maxWatts) bad('minWatts');
        });
    });

type NodeVisitor = (node: StepNode, depth: number, path: (string | number)[]) => void;

/**
 * Iterative (explicit-stack) depth-first walk in document order.
 *
 * Iterative on purpose: parse inputs are untrusted, and a maliciously deep
 * tree (JSON.parse happily builds 50,000-level documents) must never overflow
 * the call stack in validation, depth measurement or the editor's checks.
 */
function walkStepNodes(nodes: StepNode[], depth: number, visit: NodeVisitor, path: (string | number)[] = []): void {
    type Frame = { nodes: StepNode[]; index: number; depth: number; path: (string | number)[] };
    const stack: Frame[] = [{ nodes, index: 0, depth, path }];
    while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (frame.index >= frame.nodes.length) {
            stack.pop();
            continue;
        }
        const node = frame.nodes[frame.index];
        const nodePath = [...frame.path, frame.index];
        frame.index += 1;
        visit(node, frame.depth, nodePath);
        if (node.kind === 'repeat') {
            stack.push({ nodes: node.steps, index: 0, depth: frame.depth + 1, path: [...nodePath, 'steps'] });
        }
    }
}

/**
 * Cycle-safe, iterative measurement of repeat-group nesting on RAW
 * (unvalidated, potentially attacker-controlled) input. Returns true as soon
 * as a repeat would sit deeper than `limit` levels, so pathologically deep
 * documents are rejected without walking the whole tree and without recursing.
 */
function rawRepeatDepthExceedsLimit(root: unknown, limit: number): boolean {
    type Frame = { node: unknown; depth: number };
    const stack: Frame[] = [{ node: root, depth: 0 }];
    const descended = new Set<unknown>(); // repeat objects already expanded (cycle guard)
    while (stack.length > 0) {
        const { node, depth } = stack.pop()!;
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node)) {
            for (const child of node) stack.push({ node: child, depth });
            continue;
        }
        const obj = node as Record<string, unknown>;
        if (obj.kind !== 'repeat') continue;
        if (descended.has(obj)) continue;
        descended.add(obj);
        // A repeat discovered at depth d is nesting level d + 1.
        if (depth + 1 > limit) return true;
        stack.push({ node: obj.steps, depth: depth + 1 });
    }
    return false;
}

/** Deepest repeat-group nesting in the tree (0 when there are no repeats). */
export function maxRepeatDepth(steps: StepNode[]): number {
    let max = 0;
    walkStepNodes(steps, 0, (node, depth) => {
        if (node.kind === 'repeat' && depth + 1 > max) max = depth + 1;
    });
    return max;
}

// ---------------------------------------------------------------------------
// Sport resolution
// ---------------------------------------------------------------------------

export type ResolvedSport = 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';

const SWIM_TYPES = new Set(['SWIM', 'SWIM_DRILL', 'OPEN_WATER_SWIM']);
const BIKE_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);
const STRENGTH_TYPES = new Set(['STRENGTH', 'CORE']);

/**
 * Resolve the effective sport of a workout. `workoutType` wins over `sport`
 * whenever it names a known swim/bike/strength type (never trust a `sport`
 * label alone — generated plans can carry stale sport tags).
 */
export function resolveWorkoutSport(workoutType?: string | null, sport?: string | null): ResolvedSport {
    const type = (workoutType ?? '').trim().toUpperCase();
    if (SWIM_TYPES.has(type)) return 'SWIM';
    if (BIKE_TYPES.has(type)) return 'BIKE';
    if (STRENGTH_TYPES.has(type)) return 'STRENGTH';

    const sportLabel = (sport ?? '').trim().toUpperCase();
    if (sportLabel === 'SWIM' || sportLabel === 'BIKE' || sportLabel === 'STRENGTH') {
        return sportLabel;
    }
    return 'RUN';
}

// ---------------------------------------------------------------------------
// Legacy-shape parsing
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toInt(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.round(value);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** Matches the v2 schema's `label` cap (structuredWorkoutV2Schema). */
const MAX_LABEL_LENGTH = 200;

/**
 * Normalize a legacy `name`/`description` into a v2 label: trimmed and
 * truncated to the schema cap, so upgraded trees re-validate (parse stays
 * idempotent) and unbounded user strings never reach the JSON column.
 */
function toLabel(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.length > MAX_LABEL_LENGTH ? trimmed.slice(0, MAX_LABEL_LENGTH) : trimmed;
}

/** Map a legacy v1 step `type` onto the v2 `kind` union (unknown → 'steady'). */
function v1Kind(type: unknown): StructuredStep['kind'] {
    switch (type) {
        case 'warmup':
        case 'work':
        case 'recovery':
        case 'cooldown':
        case 'steady':
        case 'transition':
            return type;
        default:
            return 'steady';
    }
}

/**
 * Resolve a builder pace letter (`E|M|T|I|R`) to a numeric sec/km pace target
 * from `calculateTrainingPaces(vdot)`. Unknown letters degrade to a `free`
 * target rather than guessing.
 */
function paceTargetFromLetter(letter: unknown, paces: TrainingPaces): Target {
    const l = typeof letter === 'string' ? letter.trim().toUpperCase() : '';
    const round = (n: number) => Math.round(n * 10) / 10;
    switch (l.charAt(0)) {
        case 'E':
            return { type: 'pace', unit: 'sec_per_km', min: round(paces.easy.min), max: round(paces.easy.max) };
        case 'M': {
            const m = Math.round(paces.marathon);
            return { type: 'pace', unit: 'sec_per_km', min: m, max: m };
        }
        case 'T': {
            const t = Math.round(paces.threshold);
            return { type: 'pace', unit: 'sec_per_km', min: t, max: t };
        }
        case 'I': {
            const i = Math.round(paces.interval);
            return { type: 'pace', unit: 'sec_per_km', min: i, max: i };
        }
        case 'R': {
            const r = Math.round(paces.repetition);
            return { type: 'pace', unit: 'sec_per_km', min: r, max: r };
        }
        default:
            return { type: 'free' };
    }
}

/**
 * Shared mapping for legacy steps that may carry pace / power / cadence /
 * HR info (`paceSecondsPerKm`, `targetPowerWatts`, `targetFtpPercent`,
 * `targetCadenceRpm`, `hrZone`). Pace wins over power, power over HR.
 */
function applyLegacyTarget(
    step: StructuredStep,
    raw: Record<string, unknown>,
    sport: ResolvedSport,
    ftpWatts: number,
): void {
    const pace = toNumber(raw.paceSecondsPerKm ?? raw.targetPace);
    const power = toNumber(raw.targetPowerWatts);
    const ftpPercent = toNumber(raw.targetFtpPercent);
    const hrZone = toInt(raw.hrZone);
    const cadence = toInt(raw.targetCadenceRpm);

    if (pace > 0) {
        // Legacy pace fields are sec/km for runs; swim plans stored the
        // per-100m value in the same field, so relabel the unit for swim.
        step.target = {
            type: 'pace',
            unit: sport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km',
            min: pace,
            max: pace,
        };
    } else if (power > 0 || ftpPercent > 0) {
        const target: Target = { type: 'power' };
        if (power > 0) {
            target.minWatts = Math.round(power);
            target.maxWatts = Math.round(power);
            if (ftpWatts > 0) target.ftpPercent = Math.round((power / ftpWatts) * 100);
        } else {
            target.ftpPercent = Math.round(ftpPercent);
            if (ftpWatts > 0) {
                const watts = Math.round((ftpPercent / 100) * ftpWatts);
                target.minWatts = watts;
                target.maxWatts = watts;
            }
        }
        step.target = target;
    } else if (hrZone !== undefined && hrZone >= 1 && hrZone <= 6) {
        step.target = { type: 'hr', zone: hrZone };
    }

    // hrZone is also kept as the secondary zone per the v2 interface.
    if (hrZone !== undefined && hrZone >= 1 && hrZone <= 6) {
        step.hrZone = hrZone;
    }
    if (cadence !== undefined && cadence > 0) {
        step.cadenceRpm = cadence;
    }
}

/** Shape 2 — generator flat v1 (`{ version: 1, steps: [...] }`). */
function fromV1Flat(obj: Record<string, unknown>, sport: ResolvedSport, ftpWatts: number): StructuredWorkoutV2 | null {
    const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
    const steps: StructuredStep[] = [];

    for (const raw of rawSteps) {
        if (!raw || typeof raw !== 'object') continue;
        const s = raw as Record<string, unknown>;

        const distanceMeters = toNumber(s.distanceMeters);
        const durationSeconds = toNumber(s.durationSeconds);
        let duration: Duration;
        if (distanceMeters > 0) {
            // Rounded so the emitted tree carries integral values — the Kotlin
            // parser mirrors seconds/meters as Int (task A5).
            duration = { type: 'distance', meters: clamp(Math.round(distanceMeters), 1, 100000) };
        } else if (durationSeconds > 0) {
            duration = { type: 'time', seconds: clamp(Math.round(durationSeconds), 1, 86400) };
        } else {
            duration = { type: 'lap_press' };
        }

        const step: StructuredStep = { kind: v1Kind(s.type), duration };
        const label = toLabel(s.name);
        if (label) step.label = label;
        applyLegacyTarget(step, s, sport, ftpWatts);
        steps.push(step);
    }

    if (steps.length === 0) return null;
    return { version: 2, source: 'engine', steps };
}

interface ProgressionSegment {
    distance: number;
    pace: unknown;
}

function asProgressionSegment(value: unknown): ProgressionSegment | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const seg = value as Record<string, unknown>;
    if (toNumber(seg.distance) <= 0 && typeof seg.pace !== 'string') return null;
    return { distance: toNumber(seg.distance), pace: seg.pace };
}

function progressionSegmentStep(seg: ProgressionSegment, kind: StructuredStep['kind'], paces: TrainingPaces): StructuredStep {
    return {
        kind,
        duration: seg.distance > 0
            ? { type: 'distance', meters: clamp(Math.round(seg.distance), 1, 100000) }
            : { type: 'lap_press' },
        target: paceTargetFromLetter(seg.pace, paces),
    };
}

/**
 * Shape 3 — builder nested `ProgressionWeekData`
 * (`{ warmup: {distance, pace}, main: [{reps, distance, pace, restSeconds}], cooldown: {...} }`).
 */
function fromProgressionWeekData(obj: Record<string, unknown>, vdot: number): StructuredWorkoutV2 | null {
    const paces = calculateTrainingPaces(vdot);
    const steps: StepNode[] = [];

    const warmup = asProgressionSegment(obj.warmup);
    if (warmup) steps.push(progressionSegmentStep(warmup, 'warmup', paces));

    if (Array.isArray(obj.main)) {
        for (const raw of obj.main) {
            if (!raw || typeof raw !== 'object') continue;
            const item = raw as Record<string, unknown>;

            const reps = toInt(item.reps);
            if (reps === undefined || reps < 1) continue;
            const distance = toNumber(item.distance);
            const restSeconds = toNumber(item.restSeconds);

            const group: RepeatGroup = {
                kind: 'repeat',
                // Legacy data is clamped into the v2 contract rather than rejected.
                times: clamp(reps, 1, MAX_REPEAT_TIMES),
                steps: [{
                    kind: 'work',
                    duration: distance > 0
                        ? { type: 'distance', meters: clamp(Math.round(distance), 1, 100000) }
                        : { type: 'lap_press' },
                    target: paceTargetFromLetter(item.pace, paces),
                }],
            };
            if (restSeconds > 0) {
                group.setRest = { type: 'time', seconds: clamp(Math.round(restSeconds), 1, 86400) };
            }
            steps.push(group);
        }
    }

    const cooldown = asProgressionSegment(obj.cooldown);
    if (cooldown) steps.push(progressionSegmentStep(cooldown, 'cooldown', paces));

    if (steps.length === 0) return null;
    return { version: 2, source: 'progression', steps };
}

function isTemplateElement(e: Record<string, unknown>): boolean {
    return (
        'distanceM' in e ||
        'durationS' in e ||
        'durationM' in e ||
        e.type === 'repeat'
    );
}

/** Shape 4a element — default workout template step (or nested `repeat`). */
function templateElementToNode(e: Record<string, unknown>, sport: ResolvedSport, ftpWatts: number): StepNode | null {
    const type = typeof e.type === 'string' ? e.type : '';

    if (type === 'repeat') {
        const times = toInt(e.repeat) ?? 1;
        if (times < 1) return null;
        const group: RepeatGroup = {
            kind: 'repeat',
            times: clamp(times, 1, MAX_REPEAT_TIMES),
            steps: [],
        };
        const children = Array.isArray(e.steps) ? e.steps : [];
        for (const child of children) {
            if (!child || typeof child !== 'object') continue;
            const mapped = templateElementToNode(child as Record<string, unknown>, sport, ftpWatts);
            if (mapped) group.steps.push(mapped);
        }
        if (group.steps.length === 0) return null;
        return group;
    }

    const distanceM = toNumber(e.distanceM);
    const durationS = toNumber(e.durationS);
    const durationM = toNumber(e.durationM);
    let duration: Duration;
    if (distanceM > 0) {
        duration = { type: 'distance', meters: clamp(Math.round(distanceM), 1, 100000) };
    } else if (durationS > 0) {
        duration = { type: 'time', seconds: clamp(Math.round(durationS), 1, 86400) };
    } else if (durationM > 0) {
        duration = { type: 'time', seconds: clamp(Math.round(durationM * 60), 1, 86400) };
    } else {
        duration = { type: 'lap_press' };
    }

    const step: StructuredStep = {
        kind: type === 'interval' ? 'work' : v1Kind(type),
        duration,
    };
    const label = toLabel(e.description);
    if (label) step.label = label;
    applyLegacyTarget(step, e, sport, ftpWatts);
    return step;
}

/** Shape 4b element — legacy progression array item (`{ type, description }`). */
function legacyProgressionElementToStep(e: Record<string, unknown>): StructuredStep | null {
    const type = typeof e.type === 'string' ? e.type : '';
    if (!type) return null;
    const kind: StructuredStep['kind'] = type === 'main' ? 'work' : v1Kind(type);
    const step: StructuredStep = {
        kind,
        duration: { type: 'lap_press' },
        target: { type: 'free' },
    };
    const label = toLabel(e.description);
    if (label) step.label = label;
    return step;
}

/** Shapes 4a / 4b — bare array input. */
function fromArrayShapes(arr: unknown[], sport: ResolvedSport, ftpWatts: number): StructuredWorkoutV2 | null {
    const templateLike = arr.some((raw) => !!raw && typeof raw === 'object' && isTemplateElement(raw as Record<string, unknown>));
    const steps: StepNode[] = [];

    for (const raw of arr) {
        if (!raw || typeof raw !== 'object') continue;
        const e = raw as Record<string, unknown>;
        if (templateLike && isTemplateElement(e)) {
            const mapped = templateElementToNode(e, sport, ftpWatts);
            if (mapped) steps.push(mapped);
        } else if (typeof e.type === 'string') {
            const mapped = legacyProgressionElementToStep(e);
            if (mapped) steps.push(mapped);
        }
    }

    if (steps.length === 0) return null;
    return { version: 2, source: templateLike ? 'template' : 'progression', steps };
}

/**
 * Parse any historical structured-steps payload into the canonical v2 tree.
 *
 * Handles, in order:
 *   1. Canonical v2 (`version === 2`)      — Zod-validated, unknowns stripped
 *   2. Generator flat v1 (`version === 1`) — `type`→`kind`, `name`→`label`
 *   3. Builder `ProgressionWeekData`       — warmup/main[]/cooldown with pace letters
 *   4a. Default template arrays            — distanceM/durationS/durationM/repeat
 *   4b. Legacy progression arrays          — `{ type, description }` only
 *
 * Returns null for anything unparseable or invalid (never throws).
 */
export function parseStructuredWorkout(
    input: unknown,
    workoutTypeOrSport?: string | null,
    vdot = 45,
    ftpWatts = 200,
): StructuredWorkoutV2 | null {
    const sport = resolveWorkoutSport(workoutTypeOrSport ?? null, workoutTypeOrSport ?? null);

    if (Array.isArray(input)) {
        return fromArrayShapes(input, sport, ftpWatts);
    }
    if (input === null || typeof input !== 'object') {
        return null;
    }
    const obj = input as Record<string, unknown>;

    // Shape 1 — canonical v2.
    if (obj.version === 2) {
        // Pre-bound the repeat depth iteratively BEFORE the recursive Zod
        // schema runs: JSON.parse accepts arbitrarily deep documents, and the
        // recursive `z.lazy` schema would overflow the call stack on them.
        // The try/catch is belt-and-braces so the "never throws" contract
        // holds even if validation surfaces an unexpected error.
        if (rawRepeatDepthExceedsLimit(obj.steps, MAX_REPEAT_DEPTH)) {
            return null;
        }
        try {
            const result = structuredWorkoutV2Schema.safeParse(obj);
            if (!result.success) return null;
            return result.data;
        } catch {
            return null;
        }
    }

    // Shape 2 — generator flat v1.
    if (obj.version === 1 && Array.isArray(obj.steps)) {
        return fromV1Flat(obj, sport, ftpWatts);
    }

    // Shape 3 — builder ProgressionWeekData.
    const hasMain = Array.isArray(obj.main) && obj.main.length > 0;
    if (hasMain || asProgressionSegment(obj.warmup) || asProgressionSegment(obj.cooldown)) {
        return fromProgressionWeekData(obj, vdot);
    }

    return null;
}

// ---------------------------------------------------------------------------
// Flattening (player list)
// ---------------------------------------------------------------------------

export interface FlattenedPlayerStep {
    kind: StructuredStep['kind'];
    label?: string;
    note?: string;
    duration: Duration;
    target?: Target;
    hrZone?: number;
    cadenceRpm?: number;
    /** 0-based iteration index within the enclosing repeat group (absent at top level) */
    repeatIndex?: number;
    /** Total iterations of the enclosing repeat group (absent at top level) */
    repeatCount?: number;
    /** Repeat-nesting depth: 0 = top level */
    depth: number;
}

/** Result of an expansion that may have been truncated. */
export interface FlattenedPlayerList {
    steps: FlattenedPlayerStep[];
    /** True when the expansion hit MAX_FLATTENED_STEPS or the depth bound — the list is a prefix of the full tree. */
    truncated: boolean;
}

/**
 * Expand the step tree into a flat, executable player list, reporting whether
 * truncation occurred. Repeat groups are unrolled `times` times with `setRest`
 * inserted between iterations (never after the last one).
 *
 * Bounds for hand-built/unvalidated trees (the parser never emits them):
 *   - output truncated at {@link MAX_FLATTENED_STEPS} entries, and never ends
 *     on an inter-iteration rest (a player must not finish on a pointless
 *     recovery);
 *   - the walk refuses to descend below {@link MAX_REPEAT_DEPTH}.
 *
 * `truncated` lets list-view consumers (plan studio, mobile player) surface
 * that the list is a prefix of the full tree.
 */
export function flattenStructuredWorkoutDetailed(workout: StructuredWorkoutV2): FlattenedPlayerList {
    const out: FlattenedPlayerStep[] = [];
    let truncated = false;

    const walk = (nodes: StepNode[], depth: number, rep?: { index: number; count: number }): void => {
        if (out.length >= MAX_FLATTENED_STEPS) {
            truncated = true;
            return;
        }
        if (depth > MAX_REPEAT_DEPTH) {
            truncated = true;
            return;
        }
        for (const node of nodes) {
            if (out.length >= MAX_FLATTENED_STEPS) {
                truncated = true;
                return;
            }
            if (node.kind === 'repeat') {
                for (let i = 0; i < node.times; i++) {
                    walk(node.steps, depth + 1, { index: i, count: node.times });
                    if (out.length >= MAX_FLATTENED_STEPS) {
                        truncated = true;
                        return;
                    }
                    // Skip the rest when pushing it would land exactly on the
                    // cap: the list must not END on an inter-iteration rest.
                    if (node.setRest && i < node.times - 1 && out.length < MAX_FLATTENED_STEPS - 1) {
                        out.push({
                            kind: 'recovery',
                            label: 'Recovery',
                            duration: node.setRest,
                            repeatIndex: i,
                            repeatCount: node.times,
                            depth: depth + 1,
                        });
                    }
                }
                continue;
            }

            const flat: FlattenedPlayerStep = {
                kind: node.kind,
                duration: node.duration,
                depth,
            };
            if (node.label !== undefined) flat.label = node.label;
            if (node.note !== undefined) flat.note = node.note;
            if (node.target !== undefined) flat.target = node.target;
            if (node.hrZone !== undefined) flat.hrZone = node.hrZone;
            if (node.cadenceRpm !== undefined) flat.cadenceRpm = node.cadenceRpm;
            if (rep) {
                flat.repeatIndex = rep.index;
                flat.repeatCount = rep.count;
            }
            out.push(flat);
        }
    };

    walk(workout.steps, 0);
    return { steps: out, truncated };
}

/**
 * Expand the step tree into a flat, executable player list (see
 * {@link flattenStructuredWorkoutDetailed} for the bounds and the truncation
 * flag — use the detailed variant when consumers need to surface truncation).
 */
export function flattenStructuredWorkout(workout: StructuredWorkoutV2): FlattenedPlayerStep[] {
    return flattenStructuredWorkoutDetailed(workout).steps;
}

// ---------------------------------------------------------------------------
// Summaries & estimates
// ---------------------------------------------------------------------------

export interface StructuredWorkoutSummary {
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    estimatedTss: number;
    summaryText: string;
    /** True when the expanded step list was truncated — totals cover a prefix of the tree only. */
    truncated: boolean;
}

const HR_ZONE_INTENSITY: Record<number, number> = {
    1: 0.6,
    2: 0.7,
    3: 0.8,
    4: 0.9,
    5: 1.0,
    6: 1.05,
};

const FALLBACK_INTENSITY = 0.75;

function clampIntensityFactor(ifValue: number): number {
    return clamp(ifValue, 0.3, 1.5);
}

/** Intensity Factor implied by a step target (power > pace > rpe > hr > fallback). */
function targetIntensityFactor(target: Target | undefined, fallbackPaceSec: number | null, ftpWatts: number | null): number {
    if (!target || target.type === 'free') return FALLBACK_INTENSITY;

    if (target.type === 'power') {
        if (target.ftpPercent !== undefined && target.ftpPercent > 0) {
            return clampIntensityFactor(target.ftpPercent / 100);
        }
        const watts = target.minWatts !== undefined && target.maxWatts !== undefined
            ? (target.minWatts + target.maxWatts) / 2
            : target.maxWatts ?? target.minWatts;
        if (watts && watts > 0 && ftpWatts && ftpWatts > 0) {
            return clampIntensityFactor(watts / ftpWatts);
        }
        return FALLBACK_INTENSITY;
    }

    if (target.type === 'rpe') {
        return clampIntensityFactor(target.value / 10);
    }

    if (target.type === 'pace') {
        // Caller-supplied fallback must be in the same unit as the target
        // (sec/km for runs, sec/100m for swims).
        const pace = target.max ?? target.min;
        if (pace && pace > 0 && fallbackPaceSec && fallbackPaceSec > 0) {
            return clampIntensityFactor(fallbackPaceSec / pace);
        }
        return FALLBACK_INTENSITY;
    }

    // hr target
    if (target.zone !== undefined) {
        return HR_ZONE_INTENSITY[target.zone] ?? FALLBACK_INTENSITY;
    }
    return FALLBACK_INTENSITY;
}

/** Estimated seconds for a distance-based step, from its pace target or the fallback pace. */
function distanceStepSeconds(step: FlattenedPlayerStep, fallbackPaceSec: number | null): number {
    if (step.duration.type !== 'distance') return 0;
    const meters = step.duration.meters;

    const target = step.target;
    if (target && target.type === 'pace') {
        const pace = target.max ?? target.min;
        if (pace && pace > 0) {
            const perUnitMeters = target.unit === 'sec_per_100m' ? 100 : 1000;
            return (meters / perUnitMeters) * pace;
        }
    }
    if (fallbackPaceSec && fallbackPaceSec > 0) {
        // Fallback is sec/km-equivalent for the workout's sport.
        return (meters / 1000) * fallbackPaceSec;
    }
    return 0;
}

function stepTss(seconds: number, target: Target | undefined, fallbackPaceSec: number | null, ftpWatts: number | null): number {
    if (seconds <= 0) return 0;
    const intensity = targetIntensityFactor(target, fallbackPaceSec, ftpWatts);
    return (seconds / 3600) * intensity * intensity * 100;
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Pace / power unit utilities
// ---------------------------------------------------------------------------

/** Format seconds-per-unit as `m:ss/km` or `m:ss/100m`. */
export function formatPace(seconds: number, unit: 'sec_per_km' | 'sec_per_100m'): string {
    const total = Math.max(0, Math.round(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}${unit === 'sec_per_100m' ? '/100m' : '/km'}`;
}

/** Convert a sec/km pace to the equivalent sec/100m pace (÷10). */
export function paceSecPerKmToSecPer100m(paceSecPerKm: number): number {
    return paceSecPerKm / 10;
}

/** Watts for a %FTP target, rounded to whole watts. */
export function wattsFromFtpPercent(ftpPercent: number, ftpWatts: number): number {
    return Math.round((ftpPercent / 100) * ftpWatts);
}

/** %FTP for a watts target, rounded to one decimal. */
export function ftpPercentFromWatts(watts: number, ftpWatts: number): number {
    if (ftpWatts <= 0) return 0;
    return round1((watts / ftpWatts) * 100);
}

// ---------------------------------------------------------------------------
// Human-readable summary text
// ---------------------------------------------------------------------------

function describeDuration(d: Duration): string {
    switch (d.type) {
        case 'time': {
            if (d.seconds >= 60) {
                const minutes = d.seconds / 60;
                return `${Number.isInteger(minutes) ? minutes : round1(minutes)}min`;
            }
            return `${Math.round(d.seconds)}s`;
        }
        case 'distance': {
            if (d.meters >= 1000) {
                const km = round1(d.meters / 1000);
                return `${Number.isInteger(km) ? km : km.toFixed(1)}km`;
            }
            return `${Math.round(d.meters)}m`;
        }
        case 'lap_press':
            return 'lap press';
    }
}

function describeTarget(target: Target | undefined): string {
    if (!target) return '';
    switch (target.type) {
        case 'pace': {
            const pace = target.min ?? target.max;
            if (pace === undefined) return '';
            if (target.min !== undefined && target.max !== undefined && target.min !== target.max) {
                return ` @ ${formatPace(target.min, target.unit)}-${formatPace(target.max, target.unit)}`;
            }
            return ` @ ${formatPace(pace, target.unit)}`;
        }
        case 'hr':
            if (target.zone !== undefined) return ` @ Z${target.zone}`;
            if (target.minBpm !== undefined && target.maxBpm !== undefined) return ` @ ${Math.round(target.minBpm)}-${Math.round(target.maxBpm)}bpm`;
            return '';
        case 'power': {
            if (target.ftpPercent !== undefined) return ` @ ${target.ftpPercent}% FTP`;
            if (target.minWatts !== undefined && target.maxWatts !== undefined && target.minWatts !== target.maxWatts) {
                return ` @ ${Math.round(target.minWatts)}-${Math.round(target.maxWatts)}W`;
            }
            const watts = target.minWatts ?? target.maxWatts;
            return watts !== undefined ? ` @ ${Math.round(watts)}W` : '';
        }
        case 'rpe':
            return ` @ RPE ${target.value}`;
        case 'free':
            return '';
    }
}

function describeLeafStep(step: StructuredStep): string {
    const label = step.label ?? '';
    const duration = describeDuration(step.duration);
    const target = describeTarget(step.target);
    const text = `${label} ${duration}${target}`.trim();
    return text.length > 0 ? text : step.kind;
}

/**
 * Depth-bounded tree-to-text walk, mirroring the flatten bounds: repeats at or
 * beyond {@link MAX_REPEAT_DEPTH} nesting levels are dropped instead of
 * recursed into, so a hand-built 100,000-level tree cannot overflow the stack
 * through the summary path. Empty fragments are filtered by the callers.
 */
function describeNode(node: StepNode, depth: number): string {
    if (node.kind !== 'repeat') return describeLeafStep(node);
    if (depth >= MAX_REPEAT_DEPTH) return '';
    const children = node.steps
        .map((child) => describeNode(child, depth + 1))
        .filter((text) => text.length > 0)
        .join(' + ');
    let inner = children;
    if (node.setRest) {
        const rest = `${describeDuration(node.setRest)} recovery`;
        inner = inner ? `${inner} + ${rest}` : rest;
    }
    return inner ? `${node.times}× (${inner})` : '';
}

/**
 * Summarize a v2 workout: totals over the flattened tree (repeats expanded)
 * plus a compact one-line summary like
 * `2km + 8× (400m @ 3:45/km + 90s recovery) + 1.6km`.
 *
 * `fallbackPaceSec` is the pace used for distance steps without an explicit
 * pace target, in the unit matching the workout's sport (sec/km for runs,
 * sec/100m for swims). `ftpWatts` grounds power targets for the TSS estimate.
 * `lap_press` steps contribute neither distance nor duration (unknowable in
 * advance). Totals cover the first {@link MAX_FLATTENED_STEPS} expanded steps;
 * `truncated` reports when that bound (or the repeat-depth bound) dropped
 * content, so callers can surface it.
 */
export function summarizeStructuredWorkout(
    workout: StructuredWorkoutV2,
    fallbackPaceSec?: number | null,
    ftpWatts?: number | null,
): StructuredWorkoutSummary {
    const { steps: flat, truncated } = flattenStructuredWorkoutDetailed(workout);

    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let estimatedTss = 0;

    for (const step of flat) {
        let seconds = 0;
        if (step.duration.type === 'time') {
            seconds = step.duration.seconds;
        } else if (step.duration.type === 'distance') {
            totalDistanceMeters += step.duration.meters;
            seconds = distanceStepSeconds(step, fallbackPaceSec ?? null);
        }
        totalDurationSeconds += seconds;
        estimatedTss += stepTss(seconds, step.target, fallbackPaceSec ?? null, ftpWatts ?? null);
    }

    return {
        totalDistanceMeters: Math.round(totalDistanceMeters),
        totalDurationSeconds: Math.round(totalDurationSeconds),
        estimatedTss: round1(estimatedTss),
        summaryText: workout.steps
            .map((node) => describeNode(node, 0))
            .filter((text) => text.length > 0)
            .join(' + '),
        truncated,
    };
}
