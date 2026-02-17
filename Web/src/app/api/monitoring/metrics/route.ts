import { NextRequest, NextResponse } from 'next/server';
import { getAllMetrics } from '@/lib/monitoring/metrics';
import { requireAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);

    if ('error' in authResult) {
        return authResult.error;
    }

    const metrics = getAllMetrics();

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        metrics,
    });
}