import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import * as fs from 'fs';
import * as path from 'path';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    const filename = params.filename;

    if (!filename) {
        return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Security: Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(filepath)) {
        return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Check if file is actually within backups dir (paranoid check)
    if (!filepath.startsWith(BACKUPS_DIR)) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    try {
        const fileBuffer = fs.readFileSync(filepath);
        const stats = fs.statSync(filepath);

        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
        headers.set('Content-Type', 'application/octet-stream');
        headers.set('Content-Length', stats.size.toString());

        return new NextResponse(fileBuffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }
}
