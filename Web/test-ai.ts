import { PrismaClient } from '@prisma/client';
import { generateCompletion } from './src/lib/ai/providers';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing AI generation for non-realtimes...');

    const globalSettings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: { activeProvider: true, fallbackProvider: true }
    });

    console.log('Global model configured for activity feedback:', globalSettings?.activityFeedbackModel);
    
    // Test fetch just to see what generateCompletion returns
    // Let's use the DB's actual activeProvider manually
    if (!globalSettings?.activeProvider) {
        console.log('No active provider found');
        process.exit();
    }

    const { type, baseUrl, apiKey, models } = globalSettings.activeProvider;
    console.log('Active Provider:', type, baseUrl);
    
    const { decryptToken } = await import('./src/lib/crypto');
    const decryptedKey = decryptToken(apiKey);
    const key = decryptedKey?.split(',')[0].trim() || '';

    const config = {
        provider: type as any,
        baseUrl,
        apiKey: key,
        apiKeys: [key],
        model: globalSettings?.activityFeedbackModel || models[0],
    };

    console.log('Using config:', { ...config, apiKey: '***', apiKeys: ['***'] });

    try {
        const result = await generateCompletion(config, [
            { role: 'system', content: 'You are a test assistant.' },
            { role: 'user', content: 'Say hello world in 2 words.' }
        ]);
        console.log('Result LENGTH:', result.length);
        console.log('Result:', JSON.stringify(result));
    } catch (e) {
        console.error('Failed:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
