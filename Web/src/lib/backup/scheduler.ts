import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import { DAY_MS, RETENTION } from '@/lib/constants'
import { recordBackupSuccess, recordBackupFailure, setSchedulerRunning } from './status'
import { logger } from '@/lib/logging/logger'

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')

interface BackupConfig {
  dailyRetention: number
  weeklyRetention: number
  monthlyRetention: number
}

const BACKUP_CONFIG: BackupConfig = {
  dailyRetention: RETENTION.DAILY,
  weeklyRetention: RETENTION.WEEKLY,
  monthlyRetention: RETENTION.MONTHLY,
}

interface BackupMetadata {
  name: string
  path: string
  size: number
  createdAt: Date
  type: 'daily' | 'weekly' | 'monthly'
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function sanitizeShellArg(value: string, fieldName: string): string {
  if (!/^[a-zA-Z0-9.\-_]+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}: contains disallowed characters`)
  }
  return value
}

function parseDatabaseUrl(): { host: string; port: string; user: string; pass: string; name: string } | null {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    logger.error('[Backup] DATABASE_URL not configured', {})
    return null
  }

  try {
    const targetUrl = dbUrl.includes('://') ? dbUrl : `postgresql://${dbUrl}`
    const parsed = new URL(targetUrl)

    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username),
      pass: decodeURIComponent(parsed.password),
      name: decodeURIComponent(parsed.pathname.slice(1)).split('?')[0]
    }
  } catch (e) {
    logger.error('[Backup] Invalid DATABASE_URL format', { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

function spawnAsync(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ignore stdin and stdout to prevent buffering issues, pipe stderr for error reporting
    const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'pipe'] })

    let stderr = ''

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`))
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

const MAX_RESTORE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024 // 500 MB uncompressed ceiling
const FORBIDDEN_PSQL_PATTERNS = [
  /^\s*\\(?![.\r\n])/, // psql backslash meta-commands (\!, \copy, \i, \o, \gexec) except \. terminator
  /\bCOPY\b[\s\S]{0,200}?\b(?:FROM|TO)\s+PROGRAM\b/i,
]

function assertSafeSqlRestoreFile(sqlFilePath: string): void {
  const stats = fs.statSync(sqlFilePath)
  if (stats.size > MAX_RESTORE_UNCOMPRESSED_BYTES) {
    throw new Error('SQL backup exceeds maximum uncompressed restore size (500MB)')
  }
  const content = fs.readFileSync(sqlFilePath, 'utf8')
  const header = content.slice(0, 2048)
  const sqlHeaderPattern = /^(--|\/\*|CREATE|COPY|INSERT|SET|SELECT|PostgreSQL)/m
  if (!sqlHeaderPattern.test(header)) {
    throw new Error('Invalid SQL backup file header')
  }
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (FORBIDDEN_PSQL_PATTERNS[0].test(line)) {
      throw new Error(`Rejected unsafe psql meta-command in backup at line ${i + 1}`)
    }
    if (/\b(?:FROM|TO)\s+PROGRAM\b/i.test(line)) {
      throw new Error(`Rejected unsafe COPY PROGRAM clause in backup at line ${i + 1}`)
    }
  }
}

async function prepareRestoreFile(fullPath: string): Promise<{ restorePath: string; cleanupPath: string | null }> {
  if (!fullPath.endsWith('.gz')) {
    assertSafeSqlRestoreFile(fullPath)
    return { restorePath: fullPath, cleanupPath: null }
  }

  const tempPath = path.join(BACKUP_DIR, `${path.basename(fullPath, '.gz')}.restore-${Date.now()}.sql`)
  let decompressedBytes = 0
  const byteLimiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      decompressedBytes += chunk.length
      if (decompressedBytes > MAX_RESTORE_UNCOMPRESSED_BYTES) {
        callback(new Error('Decompressed backup exceeds maximum allowed size (500MB)'))
        return
      }
      callback(null, chunk)
    }
  })

  try {
    await pipeline(
      fs.createReadStream(fullPath),
      createGunzip(),
      byteLimiter,
      fs.createWriteStream(tempPath)
    )
    assertSafeSqlRestoreFile(tempPath)
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    throw err
  }

  return { restorePath: tempPath, cleanupPath: tempPath }
}

export async function createBackup(name?: string): Promise<BackupMetadata> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = name || `runflow-backup-${timestamp}.sql`
  const backupPath = path.join(BACKUP_DIR, backupName)

  ensureBackupDir()

  const dbConfig = parseDatabaseUrl()
  if (!dbConfig) {
    const errorMsg = 'Failed to parse DATABASE_URL'
    await recordBackupFailure(errorMsg)
    throw new Error(errorMsg)
  }

  const { host, port, user, pass, name: dbName } = dbConfig
  const safeHost = sanitizeShellArg(host, 'host')
  const safePort = sanitizeShellArg(port, 'port')
  const safeUser = sanitizeShellArg(user, 'user')
  const safeDbName = sanitizeShellArg(dbName, 'database name')

  logger.info('[Backup] Creating backup', { backupName, backupPath, db: safeDbName })

  try {
    await spawnAsync(
      'pg_dump',
      ['-h', safeHost, '-p', safePort, '-U', safeUser, '-d', safeDbName, '-F', 'p', '--clean', '--if-exists', '-f', backupPath],
      {
        ...process.env,
        PGPASSWORD: pass
      }
    )

    const stats = fs.statSync(backupPath)
    const duration = Date.now() - startTime

    logger.info('[Backup] Backup created successfully', {
      backupName,
      path: backupPath,
      sizeFormatted: formatBytes(stats.size),
      duration
    })

    await recordBackupSuccess(backupPath, stats.size)

    return {
      name: backupName,
      path: backupPath,
      size: stats.size,
      createdAt: new Date(stats.mtime),
      type: 'daily'
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('[Backup] Backup failed', { backupName, error: errorMsg })
    await recordBackupFailure(errorMsg)
    throw error
  }
}

export async function restoreBackup(backupPath: string): Promise<void> {
  const startTime = Date.now()
  const safePath = path.basename(backupPath)
  const fullPath = path.join(BACKUP_DIR, safePath)
  let cleanupPath: string | null = null

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup file not found: ${backupPath}`)
  }

  const dbConfig = parseDatabaseUrl()
  if (!dbConfig) {
    throw new Error('Failed to parse DATABASE_URL')
  }

  const { host, port, user, pass, name: dbName } = dbConfig
  const safeHost = sanitizeShellArg(host, 'host')
  const safePort = sanitizeShellArg(port, 'port')
  const safeUser = sanitizeShellArg(user, 'user')
  const safeDbName = sanitizeShellArg(dbName, 'database name')

  logger.info('[Backup] Restoring backup', { backupPath: fullPath, db: safeDbName })

  try {
    if (fullPath.endsWith('.dump')) {
      await spawnAsync(
        'pg_restore',
        ['-h', safeHost, '-p', safePort, '-U', safeUser, '-d', safeDbName, '--clean', '--if-exists', '--single-transaction', fullPath],
        {
          ...process.env,
          PGPASSWORD: pass
        }
      )
    } else {
      const prepared = await prepareRestoreFile(fullPath)
      cleanupPath = prepared.cleanupPath

      await spawnAsync(
        'psql',
        ['-h', safeHost, '-p', safePort, '-U', safeUser, '-d', safeDbName, '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', prepared.restorePath],
        {
          ...process.env,
          PGPASSWORD: pass
        }
      )
    }

    const duration = Date.now() - startTime
    logger.info('[Backup] Backup restored successfully', { backupPath: fullPath, duration })
  } catch (error) {
    logger.error('[Backup] Backup restore failed', { backupPath: fullPath, error: error instanceof Error ? error.message : String(error) })
    throw error
  } finally {
    if (cleanupPath && fs.existsSync(cleanupPath)) {
      fs.unlinkSync(cleanupPath)
    }
  }
}

export async function cleanupOldBackups(): Promise<{ deleted: number; kept: number }> {
  ensureBackupDir()

  logger.info('[Backup] Cleaning up old backups based on retention policy', {})

  try {
    const now = new Date()
    const dailyCutoff = new Date(now.getTime() - BACKUP_CONFIG.dailyRetention * DAY_MS)
    const weeklyCutoff = new Date(now.getTime() - BACKUP_CONFIG.weeklyRetention * 7 * DAY_MS)
    const monthlyCutoff = new Date(now.getTime() - BACKUP_CONFIG.monthlyRetention * 30 * DAY_MS)

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz') || f.endsWith('.dump'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        stats: fs.statSync(path.join(BACKUP_DIR, f))
      }))

    const dailyBackups = files.filter(f => f.stats.mtime >= dailyCutoff)
    const weeklyBackups = files
      .filter(f => f.stats.mtime >= weeklyCutoff && f.stats.mtime < dailyCutoff)
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
      .slice(0, 1)
    const monthlyBackups = files
      .filter(f => f.stats.mtime >= monthlyCutoff && f.stats.mtime < weeklyCutoff)
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
      .slice(0, 1)

    const toKeep = new Set([...dailyBackups, ...weeklyBackups, ...monthlyBackups].map(f => f.path))
    const toDelete = files.filter(f => !toKeep.has(f.path) && f.stats.mtime < monthlyCutoff)

    let deleted = 0
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.path)
        deleted++
        logger.info('[Backup] Deleted old backup', { name: file.name, age: `${Math.floor((now.getTime() - file.stats.mtime.getTime()) / DAY_MS)} days` })
      } catch (e) {
        logger.error('[Backup] Failed to delete backup', { name: file.name, error: e instanceof Error ? e.message : String(e) })
      }
    }

    logger.info('[Backup] Cleanup completed', { deleted, kept: files.length - deleted })

    return { deleted, kept: files.length - deleted }
  } catch (error) {
    logger.error('[Backup] Backup cleanup failed', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

export function listBackups(): BackupMetadata[] {
  ensureBackupDir()

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz') || f.endsWith('.dump'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f))
        const age = (Date.now() - stats.mtime.getTime()) / DAY_MS
        let type: 'daily' | 'weekly' | 'monthly' = 'daily'

        if (age > 30) {
          type = 'monthly'
        } else if (age > 7) {
          type = 'weekly'
        }

        return {
          name: f,
          path: path.join(BACKUP_DIR, f),
          size: stats.size,
          createdAt: stats.mtime,
          type
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return files
  } catch (error) {
    logger.error('[Backup] Failed to list backups', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

export function startBackupScheduler(): NodeJS.Timeout {
  const daily = DAY_MS

  const scheduler = setInterval(async () => {
    try {
      logger.info('[Backup] Running scheduled backup', {})
      await createBackup()
      await cleanupOldBackups()
      logger.info('[Backup] Scheduled backup completed successfully', {})
    } catch (error) {
      logger.error('[Backup] Scheduled backup failed', { error: error instanceof Error ? error.message : String(error) })
    }
  }, daily)

  // setSchedulerRunning updates status file asynchronously.
  // We don't necessarily need to await it here since this returns the scheduler handle immediately.
  // But good practice would be to handle the promise.
  setSchedulerRunning(true).catch(err => {
      logger.error('[Backup] Failed to set scheduler running status', { error: err instanceof Error ? err.message : String(err) })
  })
  logger.info('[Backup] Backup scheduler started (interval: 24 hours)', {})

  return scheduler
}

export function stopBackupScheduler(scheduler: NodeJS.Timeout): void {
  clearInterval(scheduler)
  setSchedulerRunning(false).catch(err => {
      logger.error('[Backup] Failed to set scheduler stopped status', { error: err instanceof Error ? err.message : String(err) })
  })
  logger.info('[Backup] Backup scheduler stopped', {})
}
