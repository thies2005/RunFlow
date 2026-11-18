import { MyWhooshWorkout, findClosestMyWhooshWorkout } from './mywhooshMatcher';
import type { StructuredWorkoutV2, StepNode } from './structured';
import { workoutToZwo } from './zwo-export';

function convertMyWhooshMatchToV2(match: MyWhooshWorkout | null, targetDurationSeconds: number): StructuredWorkoutV2 {
    const totalSec = targetDurationSeconds > 0 ? targetDurationSeconds : (match?.durationSeconds || 3600);
    const scale = match && match.durationSeconds > 0 ? totalSec / match.durationSeconds : 1.0;

    if (match && match.steps && match.steps.length > 0) {
        const steps: StepNode[] = match.steps.map((step, idx) => {
            const dur = Math.max(10, Math.round((step.durationSeconds * scale) / 5) * 5);
            const ftpPercent = Math.round(step.powerLowPct * 100);
            if (step.type === 'interval' && (step.repeatCount ?? 1) > 1) {
                const reps = Math.max(1, Math.round(step.repeatCount ?? 1));
                const offDur = Math.max(10, Math.round(((step.offDurationSeconds ?? 60) * scale) / 5) * 5);
                return {
                    kind: 'repeat',
                    times: reps,
                    setRest: { type: 'time', seconds: offDur },
                    label: `Interval ${idx + 1}`,
                    steps: [{
                        kind: 'work',
                        label: `Work ${idx + 1}`,
                        duration: { type: 'time', seconds: dur },
                        target: { type: 'power', ftpPercent },
                        ...(step.cadenceRpm ? { cadenceRpm: step.cadenceRpm } : {}),
                    }],
                };
            }
            const kind = step.type === 'warmup' ? 'warmup' : step.type === 'cooldown' ? 'cooldown' : 'steady';
            return {
                kind,
                label: step.type,
                duration: { type: 'time', seconds: dur },
                target: { type: 'power', ftpPercent: Math.round((kind === 'warmup' || kind === 'cooldown' ? step.powerHighPct : step.powerLowPct) * 100) },
                ...(step.cadenceRpm ? { cadenceRpm: step.cadenceRpm } : {}),
            };
        });
        return { version: 2, source: 'engine', steps };
    }

    const warmup = Math.min(600, Math.round(totalSec * 0.15));
    const cooldown = Math.min(600, Math.round(totalSec * 0.15));
    const main = Math.max(600, totalSec - warmup - cooldown);
    return {
        version: 2,
        source: 'engine',
        steps: [
            { kind: 'warmup', label: 'Warmup', duration: { type: 'time', seconds: warmup }, target: { type: 'power', ftpPercent: 68 }, cadenceRpm: 85 },
            { kind: 'steady', label: 'Main', duration: { type: 'time', seconds: main }, target: { type: 'power', ftpPercent: 70 }, cadenceRpm: 90 },
            { kind: 'cooldown', label: 'Cooldown', duration: { type: 'time', seconds: cooldown }, target: { type: 'power', ftpPercent: 65 }, cadenceRpm: 85 },
        ],
    };
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
    let structuredSteps = params.structuredSteps;

    if (!structuredSteps || !Array.isArray(structuredSteps.steps) || structuredSteps.steps.length === 0 || params.matchedWorkout) {
        const match = params.matchedWorkout ?? findClosestMyWhooshWorkout({
            workoutType: params.workoutType,
            targetDurationSeconds: params.targetDurationSeconds,
            description: params.description,
            phase: params.phase,
        });
        structuredSteps = convertMyWhooshMatchToV2(match, params.targetDurationSeconds);
    }

    const xml = workoutToZwo({
        customName: params.name,
        description: params.description,
        workoutType: params.workoutType,
        structuredSteps,
        sportType: 'bike',
        tags: ['RunFlow', 'MyWhoosh'],
    });

    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}
