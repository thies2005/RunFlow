import { PrismaClient, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Setting up dummy data...");

    // Create a dummy user
    const user = await prisma.user.create({
        data: {
            email: `test_${Date.now()}@example.com`,
            name: "Benchmark User"
        }
    });

    const userId = user.id;

    // Create 100 negative activities
    const now = Date.now();
    const negativeData = [];
    const positiveData = [];

    for (let i = 0; i < 100; i++) {
        const time = now - i * 3600 * 1000;
        negativeData.push({
            userId,
            stravaId: BigInt(-1 * (i + 1)),
            type: ActivityType.RUN,
            startDate: new Date(time),
            name: `Neg Act ${i}`,
            distance: 1000,
            movingTime: 600,
            elapsedTime: 600
        });

        // 50% chance of having a duplicate
        if (i % 2 === 0) {
            positiveData.push({
                userId,
                stravaId: BigInt(i + 1),
                type: ActivityType.RUN,
                startDate: new Date(time + 60 * 1000), // 1 min later
                name: `Pos Act ${i}`,
                distance: 1000,
                movingTime: 600,
                elapsedTime: 600
            });
        }
    }

    await prisma.activity.createMany({ data: negativeData });
    await prisma.activity.createMany({ data: positiveData });

    console.log("Running baseline measurement...");

    const startBaseline = Date.now();
    const baselineDeletedCount = await baselineCleanup(userId);
    const endBaseline = Date.now();
    console.log(`Baseline time: ${endBaseline - startBaseline} ms. Deleted: ${baselineDeletedCount}`);

    // Set up dummy data again for optimized benchmark
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.activity.createMany({ data: negativeData });
    await prisma.activity.createMany({ data: positiveData });

    console.log("Running optimized measurement...");

    const startOptimized = Date.now();
    const optimizedDeletedCount = await optimizedCleanup(userId);
    const endOptimized = Date.now();
    console.log(`Optimized time: ${endOptimized - startOptimized} ms. Deleted: ${optimizedDeletedCount}`);

    // Clean up
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
}

async function baselineCleanup(userId: string): Promise<number> {
    const negativeActivities = await prisma.activity.findMany({
        where: {
            userId,
            stravaId: { lt: BigInt(0) }
        },
        select: {
            id: true,
            type: true,
            startDate: true
        }
    });

    if (negativeActivities.length === 0) return 0;

    let deletedCount = 0;
    const fiveMinutes = 5 * 60 * 1000;

    for (const negAct of negativeActivities) {
        const timestamp = negAct.startDate.getTime();
        const duplicate = await prisma.activity.findFirst({
            where: {
                userId,
                type: negAct.type,
                stravaId: { gt: BigInt(0) },
                startDate: {
                    gte: new Date(timestamp - fiveMinutes),
                    lte: new Date(timestamp + fiveMinutes),
                }
            }
        });

        if (duplicate) {
            await prisma.activity.delete({
                where: { id: negAct.id }
            });
            deletedCount++;
        }
    }

    return deletedCount;
}

async function optimizedCleanup(userId: string): Promise<number> {
    const negativeActivities = await prisma.activity.findMany({
        where: {
            userId,
            stravaId: { lt: BigInt(0) }
        },
        select: {
            id: true,
            type: true,
            startDate: true
        }
    });

    if (negativeActivities.length === 0) return 0;

    let deletedCount = 0;
    const fiveMinutes = 5 * 60 * 1000;

    let minDate = negativeActivities[0].startDate.getTime();
    let maxDate = negativeActivities[0].startDate.getTime();

    for (const act of negativeActivities) {
        const t = act.startDate.getTime();
        if (t < minDate) minDate = t;
        if (t > maxDate) maxDate = t;
    }

    const positiveActivities = await prisma.activity.findMany({
        where: {
            userId,
            stravaId: { gt: BigInt(0) },
            startDate: {
                gte: new Date(minDate - fiveMinutes),
                lte: new Date(maxDate + fiveMinutes),
            }
        },
        select: {
            id: true,
            type: true,
            startDate: true
        }
    });

    const idsToDelete: string[] = [];
    for (const negAct of negativeActivities) {
        const timestamp = negAct.startDate.getTime();

        const duplicate = positiveActivities.find(posAct =>
            posAct.type === negAct.type &&
            posAct.startDate.getTime() >= timestamp - fiveMinutes &&
            posAct.startDate.getTime() <= timestamp + fiveMinutes
        );

        if (duplicate) {
            idsToDelete.push(negAct.id);
        }
    }

    if (idsToDelete.length > 0) {
        await prisma.activity.deleteMany({
            where: {
                id: { in: idsToDelete }
            }
        });
        deletedCount = idsToDelete.length;
    }

    return deletedCount;
}

main().catch(console.error).finally(() => prisma.$disconnect());
