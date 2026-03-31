import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
});

async function main() {
    const usage = await prisma.aiDailyTokenUsage.findMany({
        take: 10,
        orderBy: { date: 'desc' }
    });
    console.log('AI Daily Token Usage:', usage);

    const history = await prisma.aiUsageHistory.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' }
    });
    console.log('AI Usage History (last 10):', history);

    const usersWithUsage = await prisma.user.findMany({
        where: {
            usageHistory: {
                some: {}
            }
        },
        select: {
            id: true,
            email: true,
            _count: {
                select: { usageHistory: true }
            }
        }
    });
    console.log('Users with usage history:', usersWithUsage);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
