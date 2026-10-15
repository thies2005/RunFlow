import { MyWhooshWorkout, findClosestMyWhooshWorkout } from './mywhooshMatcher';

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function generateMyWhooshZwoXml(params: {
    name: string;
    description: string;
    workoutType: string;
    targetDurationSeconds: number;
    phase?: string;
    matchedWorkout?: MyWhooshWorkout | null;
}): string {
    const match = params.matchedWorkout ?? findClosestMyWhooshWorkout({
        workoutType: params.workoutType,
        targetDurationSeconds: params.targetDurationSeconds,
        description: params.description,
        phase: params.phase,
    });

    const totalSec = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : (match?.durationSeconds || 3600);
    const scale = match && match.durationSeconds > 0 ? totalSec / match.durationSeconds : 1.0;

    const stepLines: string[] = [];
    if (match && match.steps && match.steps.length > 0) {
        for (const step of match.steps) {
            const dur = Math.max(30, Math.round((step.durationSeconds * scale) / 15) * 15);
            const cadAttr = step.cadenceRpm ? ` Cadence="${step.cadenceRpm}"` : '';
            if (step.type === 'warmup') {
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
