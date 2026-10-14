/**
 * ZWO (Zwift Workout) export.
 *
 * ZWO is an XML format for structured workouts used by Zwift and importable by
 * several other training platforms. It is the text-based half of the structured
 * export story (FIT is a binary format that needs a dedicated SDK).
 *
 * Power in a ZWO workout is expressed as a fraction of FTP (functional
 * threshold power), equivalent to an Intensity Factor (IF). Canonical v2
 * structured steps (task A1/A2) resolve their fraction from, in priority
 * order:
 *   1. `target.type === 'power'`   → `ftpPercent / 100`
 *   2. `hrZone ?? hrTarget.zone`   → the same intensity bands the rest of the
 *      app derives from HR zone (Z3 = 0.82, Z4 = 0.92, Z5 = 1.00)
 *   3. `kind`                      → the conventional per-kind fraction
 *
 * Repeat groups whose inner content is a single work step and that carry a
 * `setRest` collapse into one native `<IntervalsT Repeat=… On… Off…>` element;
 * every other repeat shape is flattened to individual steady elements.
 *
 * Legacy payloads (generator flat v1 objects, bare step arrays) keep exporting
 * through the pre-v2 mapping.
 */

import type { StructuredStep } from './structured';
import { parseStructuredWorkout, flattenStructuredWorkout, type StepNode } from './structured';

/**
 * The structured-workout payload as stored on a Workout row (`structuredSteps`
 * column, `Json?`). Accepts the canonical v2 object, the legacy generator v1
 * object, or (for permissive callers) a bare array of legacy steps.
 * `null`/`undefined` yields an empty workout.
 */
export interface ZwoWorkoutInput {
    customName?: string | null;
    description?: string | null;
    workoutType?: string | null;
    structuredSteps?: unknown;
}

const AUTHOR = 'RunFlow';

/** HR zone → FTP-fraction bands (preserved from the pre-v2 exporter). */
function powerFractionForHrZone(zone: number): number {
    if (zone <= 2) return 0.70;
    if (zone === 3) return 0.82;
    if (zone === 4) return 0.92;
    if (zone === 5) return 1.00;
    return 1.05; // Z6+
}

/**
 * Map a v2 step's intensity to an FTP-fraction, per the priority contract:
 * power target first, then HR zone (`step.hrZone` or an `hr` target's `zone`),
 * then the step kind.
 */
function powerFractionForStep(step: StructuredStep): number {
    const target = step.target;
    if (target && target.type === 'power') {
        if (target.ftpPercent !== undefined && target.ftpPercent > 0) {
            return target.ftpPercent / 100;
        }
        // Watt ranges cannot be converted to an FTP fraction without knowing
        // the athlete's FTP — fall through to the HR/kind bands.
    }
    const zone = step.hrZone ?? (target && target.type === 'hr' ? target.zone : undefined);
    if (typeof zone === 'number' && zone > 0) {
        return powerFractionForHrZone(zone);
    }
    switch (step.kind) {
        case 'recovery':
            return 0.65;
        case 'warmup':
            return 0.70;
        case 'cooldown':
            return 0.70;
        case 'transition':
            return 0.50;
        case 'steady':
            return 0.75;
        case 'work':
            return 0.92;
        default:
            return 0.75;
    }
}

/**
 * Resolve a v2 step's duration in seconds. Prefers time durations; derives
 * distance durations from the step's pace target (unit-aware). Returns 0 when
 * no duration can be computed (e.g. `lap_press`).
 */
function durationForV2Step(step: StructuredStep): number {
    switch (step.duration.type) {
        case 'time':
            return Math.round(step.duration.seconds);
        case 'distance': {
            const target = step.target;
            if (target && target.type === 'pace') {
                const pace = target.max ?? target.min;
                if (pace && pace > 0) {
                    const perUnitMeters = target.unit === 'sec_per_100m' ? 100 : 1000;
                    return Math.round((step.duration.meters / perUnitMeters) * pace);
                }
            }
            return 0;
        }
        case 'lap_press':
        default:
            return 0;
    }
}

/** XML-escape text content and attribute values. */
function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Round a power fraction to 2 decimals for stable, readable output.
 */
function pow(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
}

function buildV2StepElement(step: StructuredStep): string {
    const duration = durationForV2Step(step);

    switch (step.kind) {
        case 'warmup': {
            const high = powerFractionForStep(step);
            return `  <Warmup Duration="${duration}" PowerLow="${pow(0.50)}" PowerHigh="${pow(high)}"/>`;
        }
        case 'cooldown': {
            const high = powerFractionForStep(step);
            return `  <Cooldown Duration="${duration}" PowerLow="${pow(high)}" PowerHigh="${pow(0.50)}"/>`;
        }
        default: {
            const power = powerFractionForStep(step);
            return `  <SteadyState Duration="${duration}" Power="${pow(power)}"/>`;
        }
    }
}

/**
 * Emit a native `<IntervalsT>` for a repeat group whose inner content is a
 * single work step and that carries a `setRest` — Zwift's native repeat form.
 * Returns null for any other repeat shape (caller flattens instead).
 */
function buildIntervalsT(group: Extract<StepNode, { kind: 'repeat' }>): string | null {
    if (!group.setRest || group.setRest.type !== 'time') return null;
    if (group.steps.length !== 1) return null;
    const inner = group.steps[0];
    if (inner.kind === 'repeat') return null;
    if (inner.kind !== 'work') return null;

    const onDuration = durationForV2Step(inner);
    const onPower = powerFractionForStep(inner);
    const offDuration = Math.round(group.setRest.seconds);
    const offPower = 0.65; // recovery spin between efforts
    return `  <IntervalsT Repeat="${group.times}" OnDuration="${onDuration}" OnPower="${pow(onPower)}" OffDuration="${offDuration}" OffPower="${pow(offPower)}"/>`;
}

/**
 * Render the canonical v2 step tree as ZWO body lines: single-work-step
 * repeats with `setRest` collapse into `<IntervalsT>`, everything else is
 * flattened to per-step elements in player order.
 */
function buildV2Body(steps: StepNode[]): string[] {
    const lines: string[] = [];
    for (const node of steps) {
        if (node.kind === 'repeat') {
            const intervals = buildIntervalsT(node);
            if (intervals) {
                lines.push(intervals);
                continue;
            }
            for (const flat of flattenStructuredWorkout({ version: 2, source: 'engine', steps: [node] })) {
                lines.push(buildV2StepElement(flat));
            }
            continue;
        }
        lines.push(buildV2StepElement(node));
    }
    return lines;
}

// ---------------------------------------------------------------------------
// Legacy (pre-v2) payload mapping — preserved behavior
// ---------------------------------------------------------------------------

/** Minimal legacy step shape (generator v1 / bare arrays). */
interface LegacyStep {
    type?: string;
    name?: string;
    distanceMeters?: number;
    durationSeconds?: number;
    paceSecondsPerKm?: number;
    hrZone?: number;
}

function legacyPowerFraction(step: LegacyStep): number {
    const zone = step.hrZone;
    if (typeof zone === 'number' && zone > 0) {
        return powerFractionForHrZone(zone);
    }
    switch (step.type) {
        case 'recovery':
            return 0.65;
        case 'warmup':
            return 0.70;
        case 'cooldown':
            return 0.70;
        case 'steady':
            return 0.75;
        case 'work':
            return 0.92;
        default:
            return 0.75;
    }
}

function legacyDuration(step: LegacyStep): number {
    if (step.durationSeconds && step.durationSeconds > 0) {
        return Math.round(step.durationSeconds);
    }
    if (step.distanceMeters && step.distanceMeters > 0 && step.paceSecondsPerKm && step.paceSecondsPerKm > 0) {
        return Math.round((step.distanceMeters / 1000) * step.paceSecondsPerKm);
    }
    return 0;
}

function buildLegacyStepElement(step: LegacyStep): string {
    const duration = legacyDuration(step);
    const legacyType = step.type ?? '';

    switch (legacyType) {
        case 'warmup': {
            const high = legacyPowerFraction(step);
            return `  <Warmup Duration="${duration}" PowerLow="${pow(0.50)}" PowerHigh="${pow(high)}"/>`;
        }
        case 'cooldown': {
            const high = legacyPowerFraction(step);
            return `  <Cooldown Duration="${duration}" PowerLow="${pow(high)}" PowerHigh="${pow(0.50)}"/>`;
        }
        default: {
            const power = legacyPowerFraction(step);
            return `  <SteadyState Duration="${duration}" Power="${pow(power)}"/>`;
        }
    }
}

/**
 * Normalize the legacy accepted shapes of `structuredSteps` into a flat
 * legacy step list.
 */
function extractLegacySteps(structuredSteps: unknown): LegacyStep[] {
    if (!structuredSteps) return [];
    if (Array.isArray(structuredSteps)) return structuredSteps as LegacyStep[];
    if (typeof structuredSteps === 'object' && Array.isArray((structuredSteps as { steps?: unknown }).steps)) {
        return (structuredSteps as { steps: LegacyStep[] }).steps;
    }
    return [];
}

/**
 * Convert a workout's structured steps to a ZWO (Zwift Workout) XML string.
 *
 * Canonical v2 payloads (and all legacy shapes `parseStructuredWorkout`
 * upgrades) resolve per-step power targets first, HR zones second, and kind
 * bands last; single-work-step repeats with `setRest` emit native
 * `<IntervalsT>` elements. Legacy payloads keep the flat mapping:
 *   - warmup   -> <Warmup>       (ramp PowerLow -> PowerHigh)
 *   - cooldown -> <Cooldown>     (ramp PowerHigh -> PowerLow)
 *   - steady   -> <SteadyState>
 *   - work     -> <SteadyState>
 *   - recovery -> <SteadyState> with a lower power fraction
 *
 * The returned string is a complete `<workout_file>` document with no leading
 * XML declaration (Zwift does not require one).
 */
export function workoutToZwo(workout: ZwoWorkoutInput): string {
    const name = escapeXml(workout.customName?.trim() || workout.workoutType || 'Workout');
    const description = escapeXml(workout.description?.trim() || '');

    // Bare arrays are the legacy permissive input (flat v1 steps with
    // `durationSeconds` keys) — they keep the pre-v2 mapping verbatim. Objects
    // (canonical v2 and legacy generator v1) upgrade through the parser.
    let bodyLines: string[];
    if (Array.isArray(workout.structuredSteps)) {
        bodyLines = extractLegacySteps(workout.structuredSteps).map(buildLegacyStepElement);
    } else {
        const parsed = parseStructuredWorkout(workout.structuredSteps, workout.workoutType);
        bodyLines = parsed && parsed.steps.length > 0
            ? buildV2Body(parsed.steps)
            : extractLegacySteps(workout.structuredSteps).map(buildLegacyStepElement);
    }

    const lines = [
        '<workout_file>',
        `  <author>${AUTHOR}</author>`,
        `  <name>${name}</name>`,
        `  <description>${description}</description>`,
        '  <sportType>run</sportType>',
        '  <tags/>',
        '  <workout>',
        ...bodyLines,
        '  </workout>',
        '</workout_file>',
    ];

    return lines.join('\n');
}
