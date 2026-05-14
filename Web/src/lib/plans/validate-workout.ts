import { formatPace } from '../metrics/vdot';

export interface WorkoutFieldValues {
    targetDistance?: number | null;
    targetPace?: number | null;
    targetDuration?: number | null;
}

export interface ConsistencyWarning {
    field: 'targetDistance' | 'targetPace' | 'targetDuration';
    message: string;
    impliedValue: number;
    actualValue: number;
}

export function checkFieldConsistency(
    values: WorkoutFieldValues
): ConsistencyWarning[] {
    const warnings: ConsistencyWarning[] = [];
    const { targetDistance, targetPace, targetDuration } = values;

    const dist = targetDistance && targetDistance > 0 ? targetDistance : 0;
    const pace = targetPace && targetPace > 0 ? targetPace : 0;
    const dur = targetDuration && targetDuration > 0 ? targetDuration : 0;

    if (dist > 0 && pace > 0 && dur > 0) {
        const impliedDuration = Math.round((dist / 1000) * pace);
        const tolerance = 0.15;
        const ratio = dur / impliedDuration;

        if (ratio < (1 - tolerance) || ratio > (1 + tolerance)) {
            warnings.push({
                field: 'targetDuration',
                message: `Duration (${Math.round(dur / 60)}min) contradicts distance (${(dist / 1000).toFixed(1)}km) at pace (${formatPace(pace)}). Expected ~${Math.round(impliedDuration / 60)}min.`,
                impliedValue: impliedDuration,
                actualValue: dur,
            });
        }
    }

    if (dist > 0 && dur > 0 && pace === 0) {
        const impliedPace = Math.round((dur / (dist / 1000)));
        warnings.push({
            field: 'targetPace',
            message: `Pace is missing. Based on distance (${(dist / 1000).toFixed(1)}km) and duration (${Math.round(dur / 60)}min), implied pace is ~${formatPace(impliedPace)}.`,
            impliedValue: impliedPace,
            actualValue: 0,
        });
    }

    if (pace > 0 && dur > 0 && dist === 0) {
        const impliedDist = Math.round((dur / pace) * 1000 / 100) * 100;
        warnings.push({
            field: 'targetDistance',
            message: `Distance is missing. Based on pace (${formatPace(pace)}) and duration (${Math.round(dur / 60)}min), implied distance is ~${(impliedDist / 1000).toFixed(1)}km.`,
            impliedValue: impliedDist,
            actualValue: 0,
        });
    }

    return warnings;
}

export function deriveMissingField(values: WorkoutFieldValues): Partial<WorkoutFieldValues> {
    const { targetDistance, targetPace, targetDuration } = values;
    const dist = targetDistance && targetDistance > 0 ? targetDistance : 0;
    const pace = targetPace && targetPace > 0 ? targetPace : 0;
    const dur = targetDuration && targetDuration > 0 ? targetDuration : 0;

    const derived: Partial<WorkoutFieldValues> = {};

    if (dist > 0 && pace > 0 && dur === 0) {
        derived.targetDuration = Math.round((dist / 1000) * pace);
    } else if (dist > 0 && dur > 0 && pace === 0) {
        derived.targetPace = Math.round((dur / (dist / 1000)));
    } else if (pace > 0 && dur > 0 && dist === 0) {
        derived.targetDistance = Math.round((dur / pace) * 1000 / 100) * 100;
    }

    return derived;
}
