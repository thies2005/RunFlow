import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
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

interface RecalculationResult {
    updatedCount: number;
    skippedCount: number;
    warnings: string[];
}

export async function recalculateWorkoutPaces(
    goalId: string,
    newVdot: number
): Promise<RecalculationResult> {
    const paces = calculateTrainingPaces(newVdot);

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

        const res = await prisma.workout.updateMany({
            where: { goalId, workoutType: type as any, isCompleted: false },
            data: { targetPace: newPace },
        });
        updatedCount += res.count;
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
