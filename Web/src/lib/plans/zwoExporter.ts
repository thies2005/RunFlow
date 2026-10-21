import { MyWhooshWorkout, findClosestMyWhooshWorkout } from './mywhooshMatcher';
import type { StructuredWorkoutV2, StepNode, StructuredStep } from './structured';

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function resolveStepPowerPct(step: StructuredStep, fallbackPct: number): number {
    if (step.target?.type === 'power' && typeof step.target.ftpPercent === 'number' && step.target.ftpPercent > 0) {
        return step.target.ftpPercent / 100;
    }
    return fallbackPct;
}

function resolveStepSeconds(step: StructuredStep, fallbackSeconds: number): number {
    if (step.duration?.type === 'time' && typeof step.duration.seconds === 'number' && step.duration.seconds > 0) {
        return Math.max(10, Math.round(step.duration.seconds));
    }
    return fallbackSeconds;
}

function serializeStructuredNodesToZwoLines(nodes: StepNode[]): string[] {
    const lines: string[] = [];
    for (const node of nodes) {
        if (node.kind === 'repeat') {
            const reps = Math.max(1, Math.round(node.times || 1));
            const innerSteps = node.steps.filter((s): s is StructuredStep => s.kind !== 'repeat');
            if (innerSteps.length === 2 && innerSteps[0].kind === 'work' && innerSteps[1].kind === 'recovery') {
                const onDur = resolveStepSeconds(innerSteps[0], 180);
                const offDur = resolveStepSeconds(innerSteps[1], 60);
                const onPow = resolveStepPowerPct(innerSteps[0], 0.95).toFixed(2);
                const offPow = resolveStepPowerPct(innerSteps[1], 0.55).toFixed(2);
                const cadAttr = innerSteps[0].cadenceRpm ? ` Cadence="${innerSteps[0].cadenceRpm}"` : '';
                lines.push(`        <IntervalsT Repeat="${reps}" OnDuration="${onDur}" OffDuration="${offDur}" OnPower="${onPow}" OffPower="${offPow}"${cadAttr}/>`);
            } else {
                for (let i = 0; i < reps; i++) {
                    lines.push(...serializeStructuredNodesToZwoLines(node.steps));
                }
            }
        } else {
            const dur = resolveStepSeconds(node, 300);
            const cadAttr = node.cadenceRpm ? ` Cadence="${node.cadenceRpm}"` : '';
            if (node.target?.type === 'free') {
                lines.push(`        <FreeRide Duration="${dur}"${cadAttr}/>`);
            } else if (node.kind === 'warmup') {
                const pHigh = resolveStepPowerPct(node, 0.70);
                const pLow = Math.max(0.40, Number((pHigh - 0.15).toFixed(2)));
                lines.push(`        <Warmup Duration="${dur}" PowerLow="${pLow.toFixed(2)}" PowerHigh="${pHigh.toFixed(2)}"${cadAttr}/>`);
            } else if (node.kind === 'cooldown') {
                const pHigh = resolveStepPowerPct(node, 0.60);
                const pLow = Math.max(0.40, Number((pHigh - 0.15).toFixed(2)));
                lines.push(`        <Cooldown Duration="${dur}" PowerLow="${pHigh.toFixed(2)}" PowerHigh="${pLow.toFixed(2)}"${cadAttr}/>`);
            } else {
                const p = resolveStepPowerPct(node, 0.70).toFixed(2);
                lines.push(`        <SteadyState Duration="${dur}" Power="${p}"${cadAttr}/>`);
            }
        }
    }
    return lines;
}

export function generateMyWhooshZwoXml(params: {
    name: string;
    description: string;
    workoutType: string;
    targetDurationSeconds: number;
    phase?: string;
    matchedWorkout?: MyWhooshWorkout | null;
    structuredSteps?: StructuredWorkoutV2 | null;
}): string {
    const stepLines: string[] = [];

    if (params.structuredSteps && Array.isArray(params.structuredSteps.steps) && params.structuredSteps.steps.length > 0 && !params.matchedWorkout) {
        stepLines.push(...serializeStructuredNodesToZwoLines(params.structuredSteps.steps));
    }

    if (stepLines.length === 0) {
        const match = params.matchedWorkout ?? findClosestMyWhooshWorkout({
            workoutType: params.workoutType,
            targetDurationSeconds: params.targetDurationSeconds,
            description: params.description,
            phase: params.phase,
        });

        const totalSec = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : (match?.durationSeconds || 3600);
        const scale = match && match.durationSeconds > 0 ? totalSec / match.durationSeconds : 1.0;

        if (match && match.steps && match.steps.length > 0) {
            for (const step of match.steps) {
                const dur = Math.max(10, Math.round((step.durationSeconds * scale) / 5) * 5);
                const cadAttr = step.cadenceRpm ? ` Cadence="${step.cadenceRpm}"` : '';
                if (step.type === 'interval' && (step.repeatCount ?? 1) > 1) {
                    const reps = Math.max(1, Math.round(step.repeatCount ?? 1));
                    const offDur = Math.max(10, Math.round(((step.offDurationSeconds ?? 60) * scale) / 5) * 5);
                    const offPow = (step.offPowerPct ?? 0.50).toFixed(2);
                    stepLines.push(`        <IntervalsT Repeat="${reps}" OnDuration="${dur}" OffDuration="${offDur}" OnPower="${step.powerLowPct.toFixed(2)}" OffPower="${offPow}"${cadAttr}/>`);
                } else if (step.type === 'warmup') {
                    stepLines.push(`        <Warmup Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
                } else if (step.type === 'cooldown') {
                    stepLines.push(`        <Cooldown Duration="${dur}" PowerLow="${step.powerHighPct.toFixed(2)}" PowerHigh="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
                } else if (Math.abs(step.powerHighPct - step.powerLowPct) > 0.03) {
                    stepLines.push(`        <Ramp Duration="${dur}" PowerLow="${step.powerLowPct.toFixed(2)}" PowerHigh="${step.powerHighPct.toFixed(2)}"${cadAttr}/>`);
                } else {
                    stepLines.push(`        <SteadyState Duration="${dur}" Power="${step.powerLowPct.toFixed(2)}"${cadAttr}/>`);
                }
            }
        } else {
            const warmup = Math.min(600, Math.round(totalSec * 0.15));
            const cooldown = Math.min(600, Math.round(totalSec * 0.15));
            const main = Math.max(600, totalSec - warmup - cooldown);
            stepLines.push(`        <Warmup Duration="${warmup}" PowerLow="0.50" PowerHigh="0.68" Cadence="85"/>`);
            stepLines.push(`        <SteadyState Duration="${main}" Power="0.70" Cadence="90"/>`);
            stepLines.push(`        <Cooldown Duration="${cooldown}" PowerLow="0.65" PowerHigh="0.50" Cadence="85"/>`);
        }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>RunFlow</author>
    <name>${escapeXml(params.name)}</name>
    <description>${escapeXml(params.description)}</description>
    <sportType>bike</sportType>
    <tags>
        <tag name="RunFlow"/>
        <tag name="MyWhoosh"/>
    </tags>
    <workout>
${stepLines.join('\n')}
    </workout>
</workout_file>`;
}
