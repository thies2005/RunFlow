/**
 * Admin Backups Endpoint
 * 
 * GET /api/admin/backups - List all backups
 * POST /api/admin/backups - Create or restore a backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { createBackup, restoreBackup, listBackups, cleanupOldBackups } from '@/lib/backup/scheduler';
import { handleError } from '@/lib/errors/handler';
import { logAdminAction } from '@/lib/admin/auditLog';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /api/admin/backups
 * List all available backups
 */
export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const backups = listBackups();

        const response = NextResponse.json({
            success: true,
            backups: backups.map(b => ({
                name: b.name,
                size: b.size,
                sizeFormatted: formatBytes(b.size),
                createdAt: b.createdAt.toISOString(),
                type: b.type
            }))
        });

        await logAdminAction(request, 'VIEW_BACKUPS', { type: 'SYSTEM' }, { count: backups.length });

        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * POST /api/admin/backups
 * Create or restore a backup
 * Body: { action: 'create' | 'restore' | 'cleanup', backupName?: string }
 */
export async function POST(request: NextRequest) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'sensitive');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const body = await request.json();
        const { action, backupName } = body;

        if (!action || !['create', 'restore', 'cleanup'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use "create", "restore", or "cleanup"' },
                { status: 400 }
            );
        }

        if (action === 'create') {
            const backup = await createBackup();

            const response = NextResponse.json({
                success: true,
                message: 'Backup created successfully',
                backup: {
                    name: backup.name,
                    size: backup.size,
                    sizeFormatted: formatBytes(backup.size),
                    createdAt: backup.createdAt.toISOString(),
                    type: backup.type
                }
            });

            await logAdminAction(request, 'UPLOAD_BACKUP', { type: 'BACKUP', id: backup.name }, { size: formatBytes(backup.size) });

            return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);
        }

        if (action === 'restore') {
            if (!backupName) {
                return NextResponse.json(
                    { error: 'backupName is required for restore' },
                    { status: 400 }
                );
            }

            await restoreBackup(backupName);

            const response = NextResponse.json({
                success: true,
                message: `Database restored from ${backupName}`
            });

            await logAdminAction(request, 'UPLOAD_BACKUP', { type: 'BACKUP', id: backupName }, { action: 'restore' });

            return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);
        }

        if (action === 'cleanup') {
            const result = await cleanupOldBackups();

            const response = NextResponse.json({
                success: true,
                message: 'Backup cleanup completed',
                cleanup: result
            });

            await logAdminAction(request, 'DELETE_BACKUP', { type: 'SYSTEM' }, { deletedCount: result.deleted });

            return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        return handleError(error);
    }
}
