/**
 * Admin Backup Upload Endpoint
 * 
 * POST /api/admin/backups/upload
 * 
 * Handles uploading of .sql or .sql.gz backup files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logger } from '@/lib/logging/logger';
import { logAdminAction } from '@/lib/admin/auditLog';
import * as fs from 'fs';
import * as path from 'path';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

export async function POST(request: NextRequest) {
    // Validate CSRF token
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
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Sanitize filename - use basename and remove dangerous characters
        const rawFilename = file.name;
        const sanitizedFilename = path.basename(rawFilename)
            .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove null bytes and control characters
            .replace(/\.\./g, ''); // Remove directory traversal attempts

        // Validate file extension
        const allowedExtensions = ['.sql', '.gz', '.sql.gz'];
        const isAllowed = allowedExtensions.some(ext => sanitizedFilename.toLowerCase().endsWith(ext));

        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Invalid file type. Only .sql or .sql.gz files are allowed.' },
                { status: 400 }
            );
        }

        // Ensure backups directory exists
        if (!fs.existsSync(BACKUPS_DIR)) {
            fs.mkdirSync(BACKUPS_DIR, { recursive: true });
        }

        // Create buffer and write file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filePath = path.join(BACKUPS_DIR, sanitizedFilename);

        // Security check: ensure resolved path is within backups directory
        const resolvedPath = path.resolve(filePath);
        const resolvedBackupsDir = path.resolve(BACKUPS_DIR);

        if (!resolvedPath.startsWith(resolvedBackupsDir + path.sep)) {
            return NextResponse.json(
                { error: 'Invalid filename' },
                { status: 400 }
            );
        }

        fs.writeFileSync(filePath, buffer);

        logger.info('Admin backup uploaded', {
            admin: authResult.admin.username,
            filename: sanitizedFilename,
            sizeBytes: buffer.length,
        });

        await logAdminAction(request, 'UPLOAD_BACKUP', { type: 'BACKUP', id: sanitizedFilename }, { size: buffer.length });

        const response = NextResponse.json({
            success: true,
            message: 'Backup uploaded successfully',
            filename: file.name
        });

        return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        console.error('[Admin Backup Upload] Error:', error);
        return NextResponse.json(
            { error: 'Failed to upload backup' },
            { status: 500 }
        );
    }
}
