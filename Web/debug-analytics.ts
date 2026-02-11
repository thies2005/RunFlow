
import { prisma } from './src/lib/db';

async function main() {
    console.log('Starting debug script...');
    try {
        console.log('Checking connection...');
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);

        console.log('Checking AiDailyTokenUsage table...');
        // @ts-ignore
        const analyticsCount = await prisma.aiDailyTokenUsage.count();
        console.log('AiDailyTokenUsage count:', analyticsCount);

        console.log('Debug script completed successfully.');
    } catch (e) {
        console.error('Debug script failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
