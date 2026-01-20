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
import { spawn } from 'child_process';

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

                    // Parse DATABASE_URL using standard URL object for robustness
                    let dbConfig;
                    try {
                        // Check if URL starts with postgres:// or postgresql://
                        // If the protocol isn't supported by URL (unlikely for valid db url), it might throw
                        const targetUrl = dbUrl.includes('://') ? dbUrl : `postgresql://${dbUrl}`;
                        const parsed = new URL(targetUrl);

                        dbConfig = {
                            user: decodeURIComponent(parsed.username),
                            pass: decodeURIComponent(parsed.password),
                            host: parsed.hostname,
                            port: parsed.port || '5432',
                            name: parsed.pathname.slice(1) // Remove leading slash
                        };
                    } catch (e) {
                        return NextResponse.json(
                            { error: 'Invalid DATABASE_URL format' },
                            { status: 500 }
                        );
                    }

                    const { user: dbUser, pass: dbPass, host: dbHost, port: dbPort, name: dbName } = dbConfig;

                    // Validate database credentials to prevent command injection
                    if (!/^[a-zA-Z0-9_@.-]+$/.test(dbHost)) {
                        return NextResponse.json({ error: 'Invalid database host' }, { status: 500 });
                    }
                    if (!/^[0-9]+$/.test(dbPort)) {
                        return NextResponse.json({ error: 'Invalid database port' }, { status: 500 });
                    }
                    if (!/^[a-zA-Z0-9_]+$/.test(dbUser)) {
                        return NextResponse.json({ error: 'Invalid database user' }, { status: 500 });
                    }
                    if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
                        return NextResponse.json({ error: 'Invalid database name' }, { status: 500 });
                    }

                    if (action === 'create') {
                        // Create new backup
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const filenameBase = `runflow-backup-${timestamp}.sql`;
                        const filepath = path.join(BACKUPS_DIR, filenameBase);

                        try {
                            // Use spawn to avoid command injection - pass arguments as array
                            const pgDump = spawn('pg_dump', [
                                '-h', dbHost,
                                '-p', dbPort,
                                '-U', dbUser,
                                '-d', dbName,
                                '-Fc',
                                '-f', filepath
                            ], {
                                env: {
                                    ...process.env,
                                    PGPASSWORD: dbPass
                                }
                            });

                            // Wait for pg_dump to complete
                            await new Promise<void>((resolve, reject) => {
                                let errorData = '';
                                pgDump.stderr?.on('data', (data) => {
                                    errorData += data.toString();
                                });
                                pgDump.on('close', (code) => {
                                    if (code === 0) {
                                        resolve();
                                    } else {
                                        reject(new Error(`pg_dump exited with code ${code}: ${errorData}`));
                                    }
                                });
                                pgDump.on('error', reject);
                            });

                            // Compress with gzip (using spawn)
                            await new Promise<void>((resolve, reject) => {
                                const gzip = spawn('gzip', [filepath], { shell: false });
                                gzip.on('close', (code) => {
                                    if (code === 0) resolve();
                                    else reject(new Error(`gzip exited with code ${code}`));
                                });
                                gzip.on('error', reject);
                            });

                            const gzippedFile = filepath + '.gz';
                            const stats = fs.statSync(gzippedFile);
                            console.log(`[Admin Backups] Created backup: ${filenameBase}.gz (${formatBytes(stats.size)})`);

                            return NextResponse.json({
                                success: true,
                                message: 'Backup created successfully',
                                backup: {
                                    name: filenameBase + '.gz',
                                    size: stats.size,
                                    sizeFormatted: formatBytes(stats.size),
                                    createdAt: stats.mtime.toISOString(),
                                }
                            });
                        } catch (execError: any) {
                            console.error('[Admin Backups] Backup failed:', execError);
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

                        // Validate backup filename to prevent path traversal and injection
                        const safeFilename = path.basename(backupName);
                        if (safeFilename !== backupName || /[<>:"|?*\x00-\x1F]/.test(backupName)) {
                            return NextResponse.json(
                                { error: 'Invalid backup filename' },
                                { status: 400 }
                            );
                        }

                        const filepath = path.join(BACKUPS_DIR, backupName);

                        // Validate backup exists
                        if (!fs.existsSync(filepath)) {
                            return NextResponse.json(
                                { error: 'Backup file not found' },
                                { status: 404 }
                            );
                        }

                        // Security: Ensure filename doesn't escape backups directory
                        const realPath = fs.realpathSync(filepath);
                        const realBackupsDir = fs.realpathSync(BACKUPS_DIR);
                        if (!realPath.startsWith(realBackupsDir)) {
                            return NextResponse.json(
                                { error: 'Invalid backup name' },
                                { status: 400 }
                            );
                        }

                        try {
                            // Restore backup using spawn to avoid command injection
                            const pgRestoreArgs = [
                                '-h', dbHost,
                                '-p', dbPort,
                                '-U', dbUser,
                                '-d', dbName,
                                '--clean',
                                '--if-exists'
                            ];

                            let restoreProcess;

                            if (backupName.endsWith('.sql.gz')) {
                                // Decompress and restore in pipeline
                                const gunzip = spawn('gunzip', ['-c', filepath], { shell: false });
                                const pgRestore = spawn('pg_restore', pgRestoreArgs, {
                                    env: { ...process.env, PGPASSWORD: dbPass }
                                });

                                gunzip.stdout?.pipe(pgRestore.stdin);

                                restoreProcess = pgRestore;
                            } else if (backupName.endsWith('.sql')) {
                                restoreProcess = spawn('psql', [
                                    '-h', dbHost,
                                    '-p', dbPort,
                                    '-U', dbUser,
                                    '-d', dbName,
                                    '-f', filepath
                                ], {
                                    env: { ...process.env, PGPASSWORD: dbPass }
                                });
                            } else {
                                restoreProcess = spawn('pg_restore', [...pgRestoreArgs, filepath], {
                                    env: { ...process.env, PGPASSWORD: dbPass }
                                });
                            }

                            await new Promise<void>((resolve, reject) => {
                                let errorData = '';
                                restoreProcess.stderr?.on('data', (data) => {
                                    errorData += data.toString();
                                });
                                restoreProcess.on('close', (code) => {
                                    // pg_restore exit code 1 means "completed with warnings"
                                    // This often happens with version mismatches (e.g. ignoring transaction_timeout)
                                    if (code === 0 || code === 1) {
                                        if (code === 1) {
                                            console.warn('[Admin Backups] pg_restore completed with warnings:', errorData);
                                        }
                                        resolve();
                                    } else {
                                        reject(new Error(`Restore process exited with code ${code}: ${errorData}`));
                                    }
                                });
                                restoreProcess.on('error', reject);
                            });

                            console.log(`[Admin Backups] Restored from: ${backupName}`);

                            return NextResponse.json({
                                success: true,
                                message: `Database restored from ${backupName}`,
                            });
                        } catch (execError: any) {
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
