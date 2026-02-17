import * as fs from 'fs'
import * as path from 'path'

export interface BackupStatus {
    lastBackupTime: string | null
    lastBackupPath: string | null
    lastBackupSize: number | null
    lastBackupSuccess: boolean | null
    lastBackupError: string | null
    scheduledBackupsCount: number
    isSchedulerRunning: boolean
    uptime: number
}

const STATUS_FILE = path.join(process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'), '.backup-status.json')

let status: BackupStatus = {
    lastBackupTime: null,
    lastBackupPath: null,
    lastBackupSize: null,
    lastBackupSuccess: null,
    lastBackupError: null,
    scheduledBackupsCount: 0,
    isSchedulerRunning: false,
    uptime: 0
}

let startTime = Date.now()

function ensureStatusDir(): void {
    const dir = path.dirname(STATUS_FILE)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

function loadStatus(): BackupStatus {
    try {
        ensureStatusDir()
        if (fs.existsSync(STATUS_FILE)) {
            const data = fs.readFileSync(STATUS_FILE, 'utf-8')
            return JSON.parse(data) as BackupStatus
        }
    } catch (error) {
        console.error('[Backup Status] Failed to load status:', error)
    }
    return status
}

function saveStatus(): void {
    try {
        ensureStatusDir()
        status.uptime = Date.now() - startTime
        fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
    } catch (error) {
        console.error('[Backup Status] Failed to save status:', error)
    }
}

export function getBackupStatus(): BackupStatus {
    return loadStatus()
}

export function updateBackupStatus(updates: Partial<BackupStatus>): void {
    status = { ...status, ...updates }
    saveStatus()
}

export function recordBackupSuccess(backupPath: string, size: number): void {
    status.lastBackupTime = new Date().toISOString()
    status.lastBackupPath = backupPath
    status.lastBackupSize = size
    status.lastBackupSuccess = true
    status.lastBackupError = null
    status.scheduledBackupsCount += 1
    saveStatus()
}

export function recordBackupFailure(error: string): void {
    status.lastBackupTime = new Date().toISOString()
    status.lastBackupSuccess = false
    status.lastBackupError = error
    saveStatus()
}

export function setSchedulerRunning(running: boolean): void {
    status.isSchedulerRunning = running
    if (running) {
        startTime = Date.now()
    }
    saveStatus()
}
