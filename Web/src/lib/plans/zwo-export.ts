/**
 * ZWO (Zwift Workout) export.
 *
 * ZWO is an XML format for structured workouts used by Zwift and importable by
 * several other training platforms. It is the text-based half of the structured
 * export story (FIT is a binary format that needs a dedicated SDK).
 *
 * Power in a ZWO run workout is expressed as a fraction of FTP (functional
 * threshold power), equivalent to an Intensity Factor (IF). Run plans do not
 * carry an absolute wattage, so we map each step's intensity (derived from the
 * step type and HR zone) to an FTP-fraction estimate and emit it as the Power
 * attribute(s).
 */

import type { StructuredWorkoutStep } from './index';

/**
 * The structured-workout payload as stored on a Workout row (`structuredSteps`
 * column, `Json?`). The real shape produced by the plan generator is
 * {@link import('./index').StructuredWorkoutPlan}, but for export we accept a
 * looser interface so callers can pass a raw DB row without importing the full
 * plan types.
 */
export interface ZwoWorkoutInput {
    customName?: string | null;
    description?: string | null;
    workoutType?: string | null;
    /**
     * The stored structured steps. May be the full `StructuredWorkoutPlan`
     * object (with a `steps` array) or, for permissive callers, a bare array
     * of steps. `null`/`undefined` yields an empty workout.
     */
    structuredSteps?: { steps?: StructuredWorkoutStep[] } | StructuredWorkoutStep[] | null;
}

const AUTHOR = 'RunFlow';

/**
 * Map a step's intensity to an FTP-fraction (running power / FTP), reusing the
 * same intensity bands the rest of the app derives from HR zone and step type:
 *   - recovery / easy (Z1-Z2)       -> 0.70
 *   - tempo / Z3                    -> 0.82
 *   - threshold / Z4 / work         -> 0.92
 *   - VO2max / Z5 / repetitions     -> 1.00
 *   - Z6+ / race                    -> 1.05
 * Warmup and cooldown ramp between a low and high band.
 */
function powerFractionForStep(step: StructuredWorkoutStep): number {
    const zone = step.hrZone;
    if (typeof zone === 'number' && zone > 0) {
        if (zone <= 2) return 0.70;
        if (zone === 3) return 0.82;
        if (zone === 4) return 0.92;
        if (zone === 5) return 1.00;
        return 1.05; // Z6+
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

/**
 * Resolve a step's duration in seconds. Prefers `durationSeconds`; otherwise
 * derives it from `distanceMeters` + `paceSecondsPerKm`. Returns 0 when no
 * duration can be computed.
 */
function durationForStep(step: StructuredWorkoutStep): number {
    if (step.durationSeconds && step.durationSeconds > 0) {
        return Math.round(step.durationSeconds);
    }
    if (step.distanceMeters && step.distanceMeters > 0 && step.paceSecondsPerKm && step.paceSecondsPerKm > 0) {
        return Math.round((step.distanceMeters / 1000) * step.paceSecondsPerKm);
    }
    return 0;
}

/**
 * XML-escape text content and attribute values.
 */
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

function buildStepElement(step: StructuredWorkoutStep): string {
    const duration = durationForStep(step);

    switch (step.type) {
        case 'warmup': {
            const low = 0.50;
            const high = powerFractionForStep(step);
            return `  <Warmup Duration="${duration}" PowerLow="${pow(low)}" PowerHigh="${pow(high)}"/>`;
        }
        case 'cooldown': {
            const high = powerFractionForStep(step);
            const low = 0.50;
            return `  <Cooldown Duration="${duration}" PowerLow="${pow(high)}" PowerHigh="${pow(low)}"/>`;
        }
        case 'steady':
        case 'work':
        case 'recovery':
        default: {
            const power = powerFractionForStep(step);
            return `  <SteadyState Duration="${duration}" Power="${pow(power)}"/>`;
        }
    }
}

/**
 * Convert a workout's structured steps to a ZWO (Zwift Workout) XML string.
 *
 * Each step maps to a ZWO element:
 *   - warmup   -> <Warmup>   (ramp PowerLow -> PowerHigh)
 *   - cooldown -> <Cooldown> (ramp PowerHigh -> PowerLow)
 *   - steady   -> <SteadyState>
 *   - work     -> <SteadyState>
 *   - recovery -> <SteadyState> with a lower power fraction
 *
 * This implementation favours correct-and-simple: consecutive work/recovery
 * pairs are emitted as individual `<SteadyState>` elements rather than being
 * collapsed into `<IntervalsT>`. The result is still valid ZWO and imports
 * cleanly into Zwift.
 *
 * The returned string is a complete `<workout_file>` document with no leading
 * XML declaration (Zwift does not require one).
 */
export function workoutToZwo(workout: ZwoWorkoutInput): string {
    const name = escapeXml(workout.customName?.trim() || workout.workoutType || 'Workout');
    const description = escapeXml(workout.description?.trim() || '');

    const steps = extractSteps(workout.structuredSteps);
    const bodyLines = steps.map(buildStepElement);

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

/**
 * Normalize the various accepted shapes of `structuredSteps` into a flat
 * `StructuredWorkoutStep[]`.
 */
function extractSteps(
    structuredSteps: ZwoWorkoutInput['structuredSteps'],
): StructuredWorkoutStep[] {
    if (!structuredSteps) return [];
    if (Array.isArray(structuredSteps)) return structuredSteps;
    if (Array.isArray(structuredSteps.steps)) return structuredSteps.steps;
    return [];
}
