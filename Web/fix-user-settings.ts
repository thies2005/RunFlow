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
    try {
        // Find users with custom API key but NO base URL (or default OpenAI URL)
        const usersToFix = await prisma.userAiSettings.findMany({
            where: {
                customApiKey: { not: null },
                OR: [
                    { customBaseUrl: null },
                    { customBaseUrl: '' },
                    { customBaseUrl: 'https://api.openai.com/v1' }
                ]
            },
            include: { user: true }
        });

        console.log(`Found ${usersToFix.length} users with potentially misconfigured custom keys.`);

        for (const settings of usersToFix) {
            console.log(`Clearing custom API key for user: ${settings.user.email || settings.userId}`);

            await prisma.userAiSettings.update({
                where: { userId: settings.userId },
                data: {
                    customApiKey: null,
                    customBaseUrl: null,
                    customModel: null
                }
            });
            console.log('  -> Cleared.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
