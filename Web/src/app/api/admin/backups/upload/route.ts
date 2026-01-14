/**
 * Admin Backup Upload Endpoint
 * 
 * POST /api/admin/backups/upload
 * 
 * Handles uploading of .sql or .sql.gz backup files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

export async function POST(request: NextRequest) {
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

        // Validate file extension
        const allowedExtensions = ['.sql', '.gz'];
        const isAllowed = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

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
        const filePath = path.join(BACKUPS_DIR, file.name);

        // Security check: prevent directory traversal
        if (!filePath.startsWith(BACKUPS_DIR)) {
            return NextResponse.json(
                { error: 'Invalid filename' },
                { status: 400 }
            );
        }

        fs.writeFileSync(filePath, buffer);

        console.log(`[Admin Backup Upload] Saved: ${file.name} (${buffer.length} bytes)`);

        return NextResponse.json({
            success: true,
            message: 'Backup uploaded successfully',
            filename: file.name
        });

    } catch (error) {
        console.error('[Admin Backup Upload] Error:', error);
        return NextResponse.json(
            { error: 'Failed to upload backup' },
            { status: 500 }
        );
    }
}
