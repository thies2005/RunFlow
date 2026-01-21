import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
