import { prisma } from '@/lib/db';
import { PlanPhase, WorkoutType } from '@/generated/prisma/client';

export async function createSnapshot(goalId: string, description?: string, operation?: string) {
    const workouts = await prisma.workout.findMany({
        where: { goalId },
        orderBy: { scheduledDate: 'asc' },
        select: {
            scheduledDate: true,
            workoutType: true,
            description: true,
            phase: true,
            order: true,
            notes: true,
            targetDistance: true,
            targetDuration: true,
            targetPace: true,
            targetHrZone: true,
            customName: true,
            color: true,
            structuredSteps: true,
            groupId: true,
            subGoalId: true,
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
        where: { goalId },
    });

    if (count > 50) {
        const oldest = await prisma.planSnapshot.findMany({
            where: { goalId },
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
              where: { goalId },
              orderBy: { createdAt: 'desc' },
          });

    if (!snapshot) {
        throw new Error('No snapshot found');
    }

    const workoutsData = snapshot.snapshot as Array<Record<string, unknown>>;

    return await prisma.$transaction(async (tx) => {
        await tx.workout.deleteMany({ where: { goalId } });

        for (const w of workoutsData) {
            const { ...data } = w;
            await tx.workout.create({
                data: {
                    goalId,
                    scheduledDate: data.scheduledDate as Date,
                    workoutType: data.workoutType as WorkoutType,
                    description: data.description as string,
                    phase: (data.phase as PlanPhase) || PlanPhase.BASE,
                    order: (data.order as number) || 0,
                    notes: data.notes as string | undefined,
                    targetDistance: data.targetDistance as number | undefined,
                    targetDuration: data.targetDuration as number | undefined,
                    targetPace: data.targetPace as number | undefined,
                    targetHrZone: data.targetHrZone as number | undefined,
                    customName: data.customName as string | undefined,
                    color: data.color as string | undefined,
                    structuredSteps: data.structuredSteps as object | undefined,
                    groupId: data.groupId as string | undefined,
                    subGoalId: data.subGoalId as string | undefined,
                },
            });
        }

        return snapshot;
    });
}
