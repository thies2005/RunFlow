
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

async function benchmark() {
  console.log('Starting Benchmark: Reconsent Performance (N+1 vs Batch)');

  // 1. Setup: Ensure we have a test user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in DB to test with. Please seed a user.');
    return;
  }
  const userId = user.id;
  console.log(`Using user: ${userId}`);

  // 2. Define the consents payload
  const consentTypes = ['TERMS', 'PRIVACY', 'HEALTH_DATA', 'AGE_REQUIREMENT'];
  const action = 'GRANTED';
  const ipAddress = '127.0.0.1';
  const userAgent = 'Benchmark/1.0';
  const policyVersions = {
      TERMS: '2026-02-25',
      PRIVACY: '2026-02-25',
      HEALTH_DATA: '1.0',
      AGE_REQUIREMENT: '1.0',
  };

  // Cleanup for start run
  await prisma.userConsent.deleteMany({
      where: { userId: userId }
  });

  // --- BASELINE: N+1 Requests Simulation ---
  const baselineStart = performance.now();

  await Promise.all(consentTypes.map(async (type) => {
    await prisma.userConsent.create({
        data: {
            userId: userId,
            consentType: type,
            action,
            policyVersion: action === 'GRANTED' ? policyVersions[type] : null,
            ipAddress,
            userAgent,
        }
    });

    if (type === 'HEALTH_DATA' && action === 'WITHDRAWN') {
       // logic...
    }
  }));

  const baselineEnd = performance.now();
  const baselineTime = baselineEnd - baselineStart;
  console.log(`Baseline (N+1 Writes): ${baselineTime.toFixed(2)} ms`);


  // Cleanup for next run
  await prisma.userConsent.deleteMany({
      where: { userId: userId }
  });


  // --- OPTIMIZED: Batch Request Simulation ---
  const optimizedStart = performance.now();

  await prisma.$transaction(
      consentTypes.map(type =>
          prisma.userConsent.create({
              data: {
                  userId: userId,
                  consentType: type,
                  action,
                  policyVersion: action === 'GRANTED' ? policyVersions[type] : null,
                  ipAddress,
                  userAgent,
              }
          })
      )
  );

  const optimizedEnd = performance.now();
  const optimizedTime = optimizedEnd - optimizedStart;
  console.log(`Optimized (Batch Write): ${optimizedTime.toFixed(2)} ms`);

  console.log(`\nImprovement: ${(baselineTime / optimizedTime).toFixed(2)}x faster`);
}

benchmark()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
