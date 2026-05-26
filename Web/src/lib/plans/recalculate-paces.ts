import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
import { getZoneTarget, resolveHrZones, type HrZoneInput } from '../metrics/hr-zones';
import { prisma } from '@/lib/db';

function getPaceForType(paces: TrainingPaces, type: string): number | null {
    switch (type) {
        case 'EASY':
        case 'LONG_RUN':
            return Math.round((paces.easy.min + paces.easy.max) / 2);
        case 'RECOVERY':
            return paces.easy.max;
        case 'TEMPO':
            return paces.threshold;
        case 'INTERVALS':
            return paces.interval;
        case 'REPETITIONS':
            return paces.repetition;
        case 'FARTLEK':
            return Math.round((paces.threshold + paces.interval) / 2);
        case 'RACE':
            return null;
        default:
            return null;
    }
}

function getPaceTargetLabel(type: string): string | null {
    switch (type) {
        case 'EASY':
        case 'LONG_RUN':
        case 'RECOVERY':
            return 'Easy';
        case 'TEMPO':
            return 'Threshold';
        case 'INTERVALS':
            return 'Interval';
        case 'REPETITIONS':
            return 'Repetition';
        case 'FARTLEK':
            return 'Fartlek';
        default:
            return null;
    }
}

function paceWindow(paceSecondsPerKm: number, fraction: number): { min: number; max: number } {
    return {
        min: Math.round(paceSecondsPerKm * (1 - fraction)),
        max: Math.round(paceSecondsPerKm * (1 + fraction)),
    };
}

function getPaceTargetRange(type: string, paces: TrainingPaces, targetPace: number): { min: number; max: number } | null {
    switch (type) {
        case 'EASY':
        case 'LONG_RUN':
        case 'RECOVERY':
            return { min: paces.easy.min, max: paces.easy.max };
        case 'TEMPO':
            return paceWindow(paces.threshold, 0.03);
        case 'INTERVALS':
            return paceWindow(paces.interval, 0.02);
        case 'REPETITIONS':
            return paceWindow(paces.repetition, 0.02);
        case 'FARTLEK':
            return {
                min: Math.min(paces.interval, paces.threshold),
                max: Math.max(paces.interval, paces.threshold),
            };
        default:
            return paceWindow(targetPace, 0.03);
    }
}

interface RecalculationResult {
    updatedCount: number;
    skippedCount: number;
    warnings: string[];
}

export async function recalculateWorkoutPaces(
    goalId: string,
    newVdot: number,
    hrInput?: HrZoneInput
): Promise<RecalculationResult> {
    const paces = calculateTrainingPaces(newVdot);
    const hrZones = hrInput ? resolveHrZones(hrInput).zones : null;

    let updatedCount = 0;
    let skippedCount = 0;
    const warnings: string[] = [];

    // Batch updates by workout type to avoid N+1 queries
    const types = ['EASY', 'LONG_RUN', 'RECOVERY', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'FARTLEK'];
    for (const type of types) {
        const newPace = getPaceForType(paces, type);
        if (newPace === null) {
            skippedCount++;
            continue;
        }

        const workouts = await prisma.workout.findMany({
            where: { goalId, workoutType: type as any, isCompleted: false },
            select: { id: true, targetHrZone: true },
        });
        for (const workout of workouts) {
            const hrTarget = getZoneTarget(workout.targetHrZone, hrZones);
            const paceLabel = getPaceTargetLabel(type);
            const paceRange = getPaceTargetRange(type, paces, newPace);
            await prisma.workout.update({
                where: { id: workout.id },
                data: {
                    targetPace: newPace,
                    ...(paceLabel && { targetPaceZoneLabel: paceLabel }),
                    ...(paceRange && {
                        targetPaceMinSecondsPerKm: paceRange.min,
                        targetPaceMaxSecondsPerKm: paceRange.max,
                    }),
                    ...(hrTarget && {
                        targetHrZoneLabel: hrTarget.label,
                        targetHrMinBpm: hrTarget.min,
                        targetHrMaxBpm: hrTarget.max,
                    }),
                },
            });
            updatedCount++;
        }
    }

    if (hrZones) {
        const remaining = await prisma.workout.findMany({
            where: { goalId, isCompleted: false, targetHrZone: { not: null } },
            select: { id: true, targetHrZone: true },
        });
        for (const workout of remaining) {
            const hrTarget = getZoneTarget(workout.targetHrZone, hrZones);
            if (!hrTarget) continue;
            await prisma.workout.update({
                where: { id: workout.id },
                data: {
                    targetHrZoneLabel: hrTarget.label,
                    targetHrMinBpm: hrTarget.min,
                    targetHrMaxBpm: hrTarget.max,
                },
            });
        }
    }

    await prisma.$executeRaw`
        UPDATE "Workout"
        SET "targetDuration" = ROUND(("targetDistance" / 1000.0) * "targetPace")
        WHERE "goalId" = ${goalId}
          AND "isCompleted" = false
          AND "targetDistance" > 0
          AND "targetPace" > 0
    `;

    await prisma.goal.update({
        where: { id: goalId },
        data: { currentVdot: newVdot },
    });

    return { updatedCount, skippedCount, warnings };
}
