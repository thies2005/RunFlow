import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/monitoring/health';
import { verifyAdminToken } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const health = await getHealthStatus();

        // Check for admin authentication
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const isAdmin = token ? await verifyAdminToken(token) : null;

        // For unauthenticated requests, return minimal info (for Docker/load balancer)
        if (!isAdmin) {
            const status = health.status;
            let statusCode = 200;
            if (health.status === 'unhealthy') {
                statusCode = 503;
            } else if (health.checks?.database?.status === 'unhealthy') {
                statusCode = 503;
            }
            return NextResponse.json({ status }, { status: statusCode });
        }

        // For admin, return full details
        if (health.status === 'unhealthy') {
            return NextResponse.json(health, { status: 503 });
        }

        return NextResponse.json(health);
    } catch (error) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 503 }
        );
    }
}

export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
