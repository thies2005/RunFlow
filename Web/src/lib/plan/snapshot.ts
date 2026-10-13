import { prisma } from '@/lib/db';
import { PlanPhase, WorkoutType } from '@/generated/prisma/client';

export async function createSnapshot(goalId: string, description?: string, operation?: string) {
    const workouts = await prisma.workout.findMany({
        where: { goalId },
        orderBy: { scheduledDate: 'asc' },
        select: {
            id: true,
            scheduledDate: true,
            workoutType: true,
            description: true,
            displayDesc: true,
            phase: true,
            order: true,
            notes: true,
            targetDistance: true,
            targetDuration: true,
            targetPace: true,
            targetPaceMinSecondsPerKm: true,
            targetPaceMaxSecondsPerKm: true,
            targetPaceZoneLabel: true,
            targetHrZone: true,
            targetHrMinBpm: true,
            targetHrMaxBpm: true,
            targetHrZoneLabel: true,
            targetPowerWatts: true,
            targetPowerMinWatts: true,
            targetPowerMaxWatts: true,
            targetPowerZone: true,
            targetFtpPercent: true,
            targetCadenceRpm: true,
            targetRpe: true,
            intensityZone: true,
            plannedTss: true,
            sport: true,
            isCompleted: true,
            completedAt: true,
            linkedActivityId: true,
            customName: true,
            color: true,
            structuredSteps: true,
            groupId: true,
            subGoalId: true,
            intervalProgressionId: true,
        },
    });

    const snapshot = await prisma.planSnapshot.create({
        data: {
            goalId,
            snapshot: workouts as unknown as object[],
            description: description || `Auto-snapshot before ${operation || 'operation'}`,
            operation,
        },
    });

    const count = await prisma.planSnapshot.count({
        where: {
            goalId,
            OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
        },
    });

    if (count > 50) {
        const oldest = await prisma.planSnapshot.findMany({
            where: {
                goalId,
                OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
            },
            orderBy: { createdAt: 'asc' },
            take: count - 50,
            select: { id: true },
        });

        if (oldest.length > 0) {
            await prisma.planSnapshot.deleteMany({
                where: { id: { in: oldest.map(s => s.id) } },
            });
        }
    }

    return snapshot;
}

export async function restoreFromSnapshot(goalId: string, snapshotId?: string) {
    const snapshot = snapshotId
        ? await prisma.planSnapshot.findUnique({ where: { id: snapshotId } })
        : await prisma.planSnapshot.findFirst({
              where: {
                  goalId,
                  OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }],
              },
              orderBy: { createdAt: 'desc' },
          });

    if (!snapshot) {
        throw new Error('No snapshot found');
    }

    if (!Array.isArray(snapshot.snapshot)) {
        return false;
    }

    const workoutsData = snapshot.snapshot as Array<Record<string, unknown>>;

    return await prisma.$transaction(async (tx) => {
        await tx.workout.deleteMany({ where: { goalId } });

        for (const w of workoutsData) {
            const { ...data } = w;
            await tx.workout.create({
                data: {
                    ...(data.id ? { id: data.id as string } : {}),
                    goalId,
                    scheduledDate: new Date(data.scheduledDate as string | Date),
                    workoutType: data.workoutType as WorkoutType,
                    description: (data.description as string) || '',
                    displayDesc: data.displayDesc as string | undefined,
                    phase: (data.phase as PlanPhase) || PlanPhase.BASE,
                    order: (data.order as number) || 0,
                    notes: data.notes as string | undefined,
                    targetDistance: data.targetDistance != null ? (data.targetDistance as number) : undefined,
                    targetDuration: data.targetDuration != null ? (data.targetDuration as number) : undefined,
                    targetPace: data.targetPace != null ? (data.targetPace as number) : undefined,
                    targetPaceMinSecondsPerKm: data.targetPaceMinSecondsPerKm != null ? (data.targetPaceMinSecondsPerKm as number) : undefined,
                    targetPaceMaxSecondsPerKm: data.targetPaceMaxSecondsPerKm != null ? (data.targetPaceMaxSecondsPerKm as number) : undefined,
                    targetPaceZoneLabel: data.targetPaceZoneLabel as string | undefined,
                    targetHrZone: data.targetHrZone != null ? (data.targetHrZone as number) : undefined,
                    targetHrMinBpm: data.targetHrMinBpm != null ? (data.targetHrMinBpm as number) : undefined,
                    targetHrMaxBpm: data.targetHrMaxBpm != null ? (data.targetHrMaxBpm as number) : undefined,
                    targetHrZoneLabel: data.targetHrZoneLabel as string | undefined,
                    targetPowerWatts: data.targetPowerWatts != null ? (data.targetPowerWatts as number) : undefined,
                    targetPowerMinWatts: data.targetPowerMinWatts != null ? (data.targetPowerMinWatts as number) : undefined,
                    targetPowerMaxWatts: data.targetPowerMaxWatts != null ? (data.targetPowerMaxWatts as number) : undefined,
                    targetPowerZone: data.targetPowerZone != null ? (data.targetPowerZone as number) : undefined,
                    targetFtpPercent: data.targetFtpPercent != null ? (data.targetFtpPercent as number) : undefined,
                    targetCadenceRpm: data.targetCadenceRpm != null ? (data.targetCadenceRpm as number) : undefined,
                    targetRpe: data.targetRpe != null ? (data.targetRpe as number) : undefined,
                    intensityZone: data.intensityZone as string | undefined,
                    plannedTss: data.plannedTss != null ? (data.plannedTss as number) : undefined,
                    sport: (data.sport as string) || 'RUN',
                    isCompleted: Boolean(data.isCompleted),
                    completedAt: data.completedAt ? new Date(data.completedAt as string | Date) : undefined,
                    linkedActivityId: data.linkedActivityId as string | undefined,
                    customName: data.customName as string | undefined,
                    color: data.color as string | undefined,
                    structuredSteps: data.structuredSteps as object | undefined,
                    groupId: data.groupId as string | undefined,
                    subGoalId: data.subGoalId as string | undefined,
                    intervalProgressionId: data.intervalProgressionId as string | undefined,
                },
            });
        }

        return snapshot;
    });
}
