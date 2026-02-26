import { promises as fsPromises } from 'fs'
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
let isInitialized = false

async function ensureStatusDirAsync(): Promise<void> {
    const dir = path.dirname(STATUS_FILE)
    try {
        await fsPromises.access(dir)
    } catch {
        await fsPromises.mkdir(dir, { recursive: true })
    }
}

async function loadStatusAsync(): Promise<BackupStatus> {
    try {
        await ensureStatusDirAsync()
        try {
            await fsPromises.access(STATUS_FILE)
            const data = await fsPromises.readFile(STATUS_FILE, 'utf-8')
            status = JSON.parse(data) as BackupStatus
            isInitialized = true
            return status
        } catch (e) {
            // File doesn't exist or other error, return default status
            isInitialized = true
            return status
        }
    } catch (error) {
        console.error('[Backup Status] Failed to load status:', error)
        return status
    }
}

async function saveStatusAsync(): Promise<void> {
    try {
        await ensureStatusDirAsync()
        status.uptime = Date.now() - startTime
        await fsPromises.writeFile(STATUS_FILE, JSON.stringify(status, null, 2))
    } catch (error) {
        console.error('[Backup Status] Failed to save status:', error)
    }
}

export async function getBackupStatus(): Promise<BackupStatus> {
    // The original implementation called loadStatus() every time which did a synchronous read.
    // To maintain "freshness" guarantee of original code, we read from disk.
    return loadStatusAsync()
}

export async function updateBackupStatus(updates: Partial<BackupStatus>): Promise<void> {
    status = { ...status, ...updates }
    await saveStatusAsync()
}

export async function recordBackupSuccess(backupPath: string, size: number): Promise<void> {
    status.lastBackupTime = new Date().toISOString()
    status.lastBackupPath = backupPath
    status.lastBackupSize = size
    status.lastBackupSuccess = true
    status.lastBackupError = null
    status.scheduledBackupsCount += 1
    await saveStatusAsync()
}

export async function recordBackupFailure(error: string): Promise<void> {
    status.lastBackupTime = new Date().toISOString()
    status.lastBackupSuccess = false
    status.lastBackupError = error
    await saveStatusAsync()
}

export async function setSchedulerRunning(running: boolean): Promise<void> {
    status.isSchedulerRunning = running
    if (running) {
        startTime = Date.now()
    }
    await saveStatusAsync()
}
