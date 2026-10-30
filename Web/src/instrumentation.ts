export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironmentVariables } = await import('@/lib/config/validation')
    validateEnvironmentVariables()
    const { startBackupScheduler } = await import('@/lib/backup/scheduler')
    startBackupScheduler()

    // Self-healing database schema check: ensure recently added columns exist
    try {
      const { prisma } = await import('@/lib/db')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "primaryLoadMetric" TEXT NOT NULL DEFAULT 'TSS';
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uiPreferences" JSONB;
      `)
    } catch {
      // Safe to ignore at build time or when DB connection is deferred
    }

    process.on('uncaughtException', (error) => {
      console.error('[Global Error Handler] Uncaught exception:', error.message);
      import('@/lib/monitoring/error-tracker').then(({ trackError }) => {
        trackError({
          routePath: 'global/uncaught',
          method: 'UNKNOWN',
          errorMessage: error.message,
          stackTrace: error.stack,
        });
      }).catch(() => {});
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      console.error('[Global Error Handler] Unhandled rejection:', error.message);
      import('@/lib/monitoring/error-tracker').then(({ trackError }) => {
        trackError({
          routePath: 'global/unhandled-rejection',
          method: 'UNKNOWN',
          errorMessage: error.message,
          stackTrace: error.stack,
        });
      }).catch(() => {});
    });
  }
}
