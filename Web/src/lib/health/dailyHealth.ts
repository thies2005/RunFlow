import type { Prisma, PrismaClient } from '@prisma/client';

export type DailyHealthWeightSource = 'manual' | 'health_connect' | 'strava';

type DailyHealthDb = Pick<PrismaClient, 'dailyHealthLog'> | Prisma.TransactionClient;

interface UpsertDailyHealthLogParams {
    db: DailyHealthDb;
    userId: string;
    date: Date;
    source?: DailyHealthWeightSource;
    steps?: number;
    weight?: number | null;
    activeCalories?: number;
}

function shouldWriteWeight(
    existingWeight: number | null | undefined,
    nextWeight: number | null | undefined,
    source: DailyHealthWeightSource
) {
    if (nextWeight === undefined || nextWeight === null) {
        return false;
    }

    if (source === 'manual') {
        return true;
    }

    return existingWeight == null;
}

export async function upsertDailyHealthLog({
    db,
    userId,
    date,
    source = 'manual',
    steps,
    weight,
    activeCalories,
}: UpsertDailyHealthLogParams) {
    const existing = await db.dailyHealthLog.findUnique({
        where: {
            userId_date: { userId, date }
        }
    });

    const updateData: {
        steps?: number;
        weight?: number;
        activeCalories?: number;
    } = {};

    const createData: {
        userId: string;
        date: Date;
        steps?: number;
        weight?: number;
        activeCalories?: number;
    } = {
        userId,
        date,
    };

    if (steps !== undefined) {
        updateData.steps = steps;
        createData.steps = steps;
    }

    if (activeCalories !== undefined) {
        updateData.activeCalories = activeCalories;
        createData.activeCalories = activeCalories;
    }

    if (shouldWriteWeight(existing?.weight, weight, source)) {
        updateData.weight = weight as number;
        createData.weight = weight as number;
    }

    return db.dailyHealthLog.upsert({
        where: {
            userId_date: { userId, date }
        },
        update: updateData,
        create: createData,
    });
}
