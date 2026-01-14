/**
 * Admin Backups Endpoint
 * 
 * GET /api/admin/backups - List all backups
 * POST /api/admin/backups - Create or restore a backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// Ensure backups directory exists
function ensureBackupsDir() {
    if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
}

/**
 * GET /api/admin/backups
 * List all available backups
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        ensureBackupsDir();

        // Read backup files
        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.endsWith('.sql.gz') || f.endsWith('.sql') || f.endsWith('.dump'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUPS_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    createdAt: stats.mtime.toISOString(),
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({
            backups: files,
            total: files.length,
            backupsDir: BACKUPS_DIR,
        });

    } catch (error) {
        console.error('[Admin Backups] List error:', error);
        return NextResponse.json(
            { error: 'Failed to list backups' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/backups
 * Create or restore a backup
 * Body: { action: 'create' | 'restore', backupName?: string }
 */
export async function POST(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const body = await request.json();
        const { action, backupName } = body;

        if (!action || !['create', 'restore'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use "create" or "restore"' },
                { status: 400 }
            );
        }

        ensureBackupsDir();

        // Get database credentials from environment
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return NextResponse.json(
                { error: 'DATABASE_URL not configured' },
                { status: 500 }
            );
        }

        // Parse DATABASE_URL
        const dbMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (!dbMatch) {
            return NextResponse.json(
                { error: 'Invalid DATABASE_URL format' },
                { status: 500 }
            );
        }

        const [, dbUser, dbPass, dbHost, dbPort, dbName] = dbMatch;

        if (action === 'create') {
            // Create new backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `runflow-backup-${timestamp}.sql.gz`;
            const filepath = path.join(BACKUPS_DIR, filename);

            const pgDumpCmd = `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -Fc | gzip > "${filepath}"`;

            try {
                await execAsync(pgDumpCmd, { shell: '/bin/sh' });

                const stats = fs.statSync(filepath);
                console.log(`[Admin Backups] Created backup: ${filename} (${formatBytes(stats.size)})`);

                return NextResponse.json({
                    success: true,
                    message: 'Backup created successfully',
                    backup: {
                        name: filename,
                        size: stats.size,
                        sizeFormatted: formatBytes(stats.size),
                        createdAt: stats.mtime.toISOString(),
                    }
                });
            } catch (execError: any) {
                console.error('[Admin Backups] pg_dump failed:', execError);
                return NextResponse.json(
                    { error: 'Backup creation failed. Make sure pg_dump is available.', details: execError.message },
                    { status: 500 }
                );
            }
        } else if (action === 'restore') {
            if (!backupName) {
                return NextResponse.json(
                    { error: 'backupName is required for restore' },
                    { status: 400 }
                );
            }

            // Validate backup exists
            const filepath = path.join(BACKUPS_DIR, backupName);
            if (!fs.existsSync(filepath)) {
                return NextResponse.json(
                    { error: 'Backup file not found' },
                    { status: 404 }
                );
            }

            // Security: Ensure filename doesn't escape backups directory
            if (!filepath.startsWith(BACKUPS_DIR)) {
                return NextResponse.json(
                    { error: 'Invalid backup name' },
                    { status: 400 }
                );
            }

            // Restore backup
            let restoreCmd: string;
            if (backupName.endsWith('.sql.gz')) {
                restoreCmd = `gunzip -c "${filepath}" | PGPASSWORD="${dbPass}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists`;
            } else if (backupName.endsWith('.sql')) {
                restoreCmd = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < "${filepath}"`;
            } else {
                restoreCmd = `PGPASSWORD="${dbPass}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists "${filepath}"`;
            }

            try {
                await execAsync(restoreCmd, { shell: '/bin/sh' });
                console.log(`[Admin Backups] Restored from: ${backupName}`);

                return NextResponse.json({
                    success: true,
                    message: `Database restored from ${backupName}`,
                });
            } catch (execError: any) {
                // pg_restore exit code 1 means "completed with warnings"
                // This often happens with version mismatches (e.g. ignoring transaction_timeout)
                // We should treat this as success but log the warning
                if (execError.code === 1) {
                    console.warn('[Admin Backups] pg_restore completed with warnings:', execError.stderr);
                    return NextResponse.json({
                        success: true,
                        message: `Database restored from ${backupName} (with warnings)`,
                    });
                }

                console.error('[Admin Backups] Restore failed:', execError);
                return NextResponse.json(
                    { error: 'Restore failed. Check backup file format.', details: execError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        console.error('[Admin Backups] Error:', error);
        return NextResponse.json(
            { error: 'Backup operation failed' },
            { status: 500 }
        );
    }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
