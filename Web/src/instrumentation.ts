export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironmentVariables } = await import('@/lib/config/validation')
    validateEnvironmentVariables()
    const { startBackupScheduler } = await import('@/lib/backup/scheduler')
    startBackupScheduler()

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
