export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironmentVariables } = await import('@/lib/config/validation')
    validateEnvironmentVariables()
    const { startBackupScheduler } = await import('@/lib/backup/scheduler')
    startBackupScheduler()
  }
}
