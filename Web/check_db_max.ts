import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
});

async function main() {
    console.log('Checking DailyFitness max values...');

    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found');
        return;
    }

    console.log(`Checking for user: ${user.email} (${user.id})`);

    const aggregate = await prisma.dailyFitness.aggregate({
        where: { userId: user.id },
        _max: {
            ctl: true,
            atl: true
        }
    });

    console.log('Max values from DB:', aggregate._max);

    const latest = await prisma.dailyFitness.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' }
    });

    console.log('Latest values:', latest ? { ctl: latest.ctl, atl: latest.atl } : 'None');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
