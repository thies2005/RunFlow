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

const BACKUPS_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

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
        const allowedExtensions = ['.sql', '.sql.gz'];
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

        // Create buffer
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

        // Hard size cap: reject anything over 100MB. If a partial file somehow
        // exists at the target path (e.g. from an interrupted prior attempt),
        // remove it before bailing out.
        const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
        if (buffer.length > MAX_BACKUP_BYTES) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch {
                // Best-effort cleanup; the rejection below is the important part.
            }
            return NextResponse.json(
                { error: 'Backup file too large (max 100MB)' },
                { status: 413 }
            );
        }

        // Validate actual content via magic bytes / header sniffing, not just the
        // file extension. .sql.gz must start with the gzip magic bytes; plain
        // .sql must start with typical SQL header text in the first 2KB.
        const isGz = sanitizedFilename.toLowerCase().endsWith('.sql.gz');
        if (isGz) {
            if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
                return NextResponse.json(
                    { error: 'Invalid backup file format' },
                    { status: 415 }
                );
            }
        } else {
            // Plain .sql
            const header = buffer.subarray(0, 2048).toString('utf8');
            const sqlHeaderPattern = /^(--|\/\*|CREATE|COPY|INSERT|SET|SELECT|PostgreSQL)/m;
            if (!sqlHeaderPattern.test(header)) {
                return NextResponse.json(
                    { error: 'Invalid backup file format' },
                    { status: 415 }
                );
            }
        }

        fs.writeFileSync(filePath, buffer);

        logger.info('Admin backup uploaded', {
            admin: authResult.admin.username,
            filename: sanitizedFilename,
            sizeBytes: buffer.length,
        });

        await logAdminAction(request, 'UPLOAD_BACKUP', { type: 'BACKUP', id: sanitizedFilename }, { size: buffer.length }, authResult.admin.username);

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
