
import { prisma } from '../src/lib/db';
import { buildUserContext, formatContextForAi } from '../src/lib/ai/context-builder';

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found make sure you are runing this on a db with at least one user');
        return;
    }
    console.log(`Found user: ${user.id} (${user.email})`);

    // Ensure AI settings exist and enable everything for testing
    // We don't want to permanently change user settings if this was a real prod DB, but for dev local it's fine.
    // Actually, let's just use whatever settings they have, but log them.
    // If they are all false, we might not see anything.
    // The user ASKED "check if it has acces to the other metrics when enabled shown in menue"
    // So I should ENABLE them strictly for this test.

    await prisma.userAiSettings.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            aiEnabled: true,
            accessFitnessMetrics: true,
            accessHeartRateData: true,
            accessGoals: true,
            accessTrainingPlan: true,
            accessBiometrics: true,
            accessPerformance: true,
            accessActivityHistory: true
        },
        update: {
            accessFitnessMetrics: true,
            accessHeartRateData: true,
            accessGoals: true,
            accessTrainingPlan: true,
            accessBiometrics: true,
            accessPerformance: true,
            accessActivityHistory: true
        }
    });

    console.log('Temporary: Enabled all access flags for this user to test context generation.');

    const context = await buildUserContext(user.id);
    console.log('\n--- FORMATTED CONTEXT START ---');
    console.log(formatContextForAi(context));
    console.log('--- FORMATTED CONTEXT END ---\n');

    console.log('Raw context object keys:', Object.keys(context));

    console.log('\n--- EXTENDED HISTORY TEST ---');
    // NOTE: This test is commented out because buildExtendedHistoryContext is not exported from context-builder
    /*
    try {
        const { buildExtendedHistoryContext } = await import('../src/lib/ai/context-builder');
        const extended = await buildExtendedHistoryContext(user.id);
        console.log(extended.substring(0, 500) + '...'); // Print first 500 chars
    } catch (e) {
        console.error('Extended history test failed:', e);
    }
    */
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
