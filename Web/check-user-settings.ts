
import { PrismaClient } from '@prisma/client';
import { decryptToken } from './src/lib/crypto';

const prisma = new PrismaClient();

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
                    try {
                        const decrypted = decryptToken(s.customApiKey);
                        console.log('    Decrypted Key Start:', (decrypted ? decrypted.substring(0, 10) : 'NULL/FAILED') + '...');
                    } catch (e) {
                        console.log('    Could not decrypt key (might be plaintext):', s.customApiKey.substring(0, 10));
                    }
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
