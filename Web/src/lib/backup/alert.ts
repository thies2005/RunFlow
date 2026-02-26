import { getBackupStatus } from './status'
import { DAY_MS } from '@/lib/constants'

export interface BackupHealthCheck {
    healthy: boolean
    issues: string[]
    recommendations: string[]
}

const BACKUP_AGE_THRESHOLD = 2 * DAY_MS

export async function checkBackupHealth(): Promise<BackupHealthCheck> {
    const status = await getBackupStatus()
    const issues: string[] = []
    const recommendations: string[] = []
    const now = Date.now()

    if (!status.lastBackupTime) {
        issues.push('No backup has ever been created')
        recommendations.push('Create an initial backup manually')
        return { healthy: false, issues, recommendations }
    }

    const lastBackupTime = new Date(status.lastBackupTime).getTime()
    const backupAge = now - lastBackupTime

    if (backupAge > BACKUP_AGE_THRESHOLD) {
        issues.push(`Last backup is ${Math.floor(backupAge / DAY_MS)} days old`)
        recommendations.push('Check if the backup scheduler is running')
    }

    if (!status.lastBackupSuccess) {
        issues.push('Last backup attempt failed')
        recommendations.push('Review backup logs and error messages')
    }

    if (status.lastBackupError) {
        issues.push(`Backup error: ${status.lastBackupError}`)
        recommendations.push('Investigate and resolve the error condition')
    }

    if (!status.isSchedulerRunning) {
        issues.push('Backup scheduler is not running')
        recommendations.push('Start the backup scheduler')
    }

    if (status.lastBackupSize === 0) {
        issues.push('Last backup file is empty')
        recommendations.push('Check database connection and storage')
    }

    return {
        healthy: issues.length === 0,
        issues,
        recommendations
    }
}
