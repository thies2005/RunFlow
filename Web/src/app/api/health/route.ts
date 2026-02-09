import { NextResponse } from 'next/server';
import { getHealthStatus, recordMetric } from '@/lib/monitoring/health';

export const dynamic = 'force-dynamic';

export async function GET() {
    const start = Date.now();
    const startTime = process.hrtime();

    try {
        const health = await getHealthStatus();

        const responseTime = Date.now() - start;
        recordMetric(responseTime, false);

        const [seconds, nanoseconds] = startTime;
        const hrTime = process.hrtime(startTime);
        const responseTimeNs = hrTime[0] * 1000000000 + hrTime[1];

        return NextResponse.json({
            status: health.status,
            timestamp: new Date().toISOString(),
            version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
            uptime: health.metrics.uptime,
            responseTime: {
                ms: responseTime,
                ns: responseTimeNs,
            },
            checks: {
                database: {
                    status: health.checks.database.status,
                    latency: health.checks.database.latency,
                },
                memory: {
                    status: health.checks.memory.status,
                    used: health.checks.memory.usedMB,
                    total: health.checks.memory.totalMB,
                    percentage: health.checks.memory.percentage,
                },
            },
            metrics: {
                errorRate: health.metrics.errorRate,
                avgResponseTime: health.metrics.avgResponseTime,
            },
        });
    } catch (error) {
        const responseTime = Date.now() - start;
        recordMetric(responseTime, true);

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 503 });
    }
}
