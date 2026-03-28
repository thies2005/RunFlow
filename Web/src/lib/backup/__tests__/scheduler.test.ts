/**
 * @jest-environment node
 */
import { createBackup, restoreBackup, listBackups } from '../scheduler'
import * as child_process from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    cb(null, 'stdout', 'stderr');
  }),
  spawn: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}))

// Mock logger to avoid cluttering output
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

import { logger } from '@/lib/logging/logger'

// Mock status module
jest.mock('../status', () => ({
  recordBackupSuccess: jest.fn(),
  recordBackupFailure: jest.fn(),
  setSchedulerRunning: jest.fn(),
}))

describe('Backup Scheduler Security', () => {
  const mockSpawn = child_process.spawn as unknown as jest.Mock
  const mockExec = child_process.exec as unknown as jest.Mock
  // BACKUP_DIR is resolved at import time, likely to process.cwd() + '/backups'
  // since process.env.BACKUP_DIR is not set initially in the test environment.
  const expectedBackupDir = path.join(process.cwd(), 'backups')

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dbname'
    // Setting process.env.BACKUP_DIR here won't affect the module-level constant
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
    ;(fs.statSync as jest.Mock).mockReturnValue({
      size: 1024,
      mtime: new Date(),
    })
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
  })

  it('createBackup should use spawn instead of exec', async () => {
    // Mock spawn to return a process-like object
    const mockChildProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') callback(0)
      }),
    }
    mockSpawn.mockReturnValue(mockChildProcess)

    const backupName = 'test-backup.sql'
    await createBackup(backupName)

    // It should NOT use exec
    expect(mockExec).not.toHaveBeenCalled()

    // It should use spawn with correct arguments
    expect(mockSpawn).toHaveBeenCalledWith(
      'pg_dump',
      [
        '-h', 'localhost',
        '-p', '5432',
        '-U', 'user',
        '-d', 'dbname',
        '-F', 'p',
        '--clean',
        '--if-exists',
        '-f', path.join(expectedBackupDir, backupName)
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          PGPASSWORD: 'pass'
        })
      })
    )
  })

  it('restoreBackup should use spawn instead of exec', async () => {
    // Mock spawn to return a process-like object
    const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0)
        }),
      }
    mockSpawn.mockReturnValue(mockChildProcess)

    const backupName = 'test-backup.sql'
    const backupPath = path.join(expectedBackupDir, backupName)

    // Ensure file exists check passes
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)

    await restoreBackup(backupPath)

    // It should NOT use exec
    expect(mockExec).not.toHaveBeenCalled()

    // It should use spawn with correct arguments
    expect(mockSpawn).toHaveBeenCalledWith(
      'psql',
      [
        '-h', 'localhost',
        '-p', '5432',
        '-U', 'user',
        '-d', 'dbname',
        '--single-transaction',
        '-f', path.join(expectedBackupDir, backupName)
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          PGPASSWORD: 'pass'
        })
      })
    )
  })
})

describe('listBackups', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
  })

  it('should return an empty array when no backup files exist', () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const result = listBackups();

    expect(result).toEqual([]);
    expect(fs.readdirSync).toHaveBeenCalled();
  });

  it('should catch and log errors when fs.readdirSync fails', () => {
    const error = new Error('EACCES: permission denied');
    (fs.readdirSync as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => listBackups()).toThrow('EACCES: permission denied');
    expect(logger.error).toHaveBeenCalledWith('[Backup] Failed to list backups', { error: 'EACCES: permission denied' });
  });
})
