import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';
import { decryptToken } from './src/lib/crypto';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
});

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: {
                aiSettings: true,
            },
        });

        console.log('Found users:', users.length);
        for (const user of users) {
            console.log(`User: ${user.email || user.id}`);
            if (user.aiSettings) {
                const s = user.aiSettings;
                console.log('  AI Settings:');
                console.log('    AI Enabled:', s.aiEnabled);
                console.log('    Custom API Key Set:', !!s.customApiKey);
                if (s.customApiKey) {
                    // We don't log the key even in part for security reasons
                    console.log('    Custom API Key: [PRESENT]');
                }
                console.log('    Custom Base URL:', s.customBaseUrl);
            } else {
                console.log('  No AI Settings found.');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
