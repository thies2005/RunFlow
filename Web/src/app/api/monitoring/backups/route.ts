import { NextRequest, NextResponse } from 'next/server';
import { getBackupStatus } from '@/lib/backup/status';
import { checkBackupHealth } from '@/lib/backup/alert';
import { listBackups } from '@/lib/backup/scheduler';
import { requireAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);

    if ('error' in authResult) {
        return authResult.error;
    }

    const status = getBackupStatus();
    const healthCheck = checkBackupHealth();
    const backups = listBackups();

    return NextResponse.json({
        status,
        health: healthCheck,
        backups: {
            count: backups.length,
            latest: backups[0] || null,
            totalSize: backups.reduce((acc, b) => acc + b.size, 0)
        },
        timestamp: new Date().toISOString()
    });
}
