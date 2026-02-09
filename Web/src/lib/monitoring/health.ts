import { prisma } from '../db';

export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: {
        database: {
            status: 'healthy' | 'degraded' | 'unhealthy';
            latency?: number;
            error?: string;
        };
        memory: {
            status: 'healthy' | 'degraded' | 'unhealthy';
            usedMB: number;
            totalMB: number;
            percentage: number;
        };
    };
    metrics: {
        errorRate: number;
        avgResponseTime: number;
        uptime: number;
    };
}

interface MetricEntry {
    timestamp: number;
    responseTime: number;
    error: boolean;
}

const metricsBuffer: MetricEntry[] = [];
const MAX_METRICS = 1000;
const METRICS_TTL = 5 * 60 * 1000;

const startTime = Date.now();

export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency?: number; error?: string }> {
    const start = Date.now();

    try {
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;

        if (latency > 1000) {
            return { status: 'degraded', latency };
        }

        return { status: 'healthy', latency };
    } catch (error) {
        return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export function recordMetric(responseTime: number, isError: boolean = false): void {
    const now = Date.now();

    metricsBuffer.push({ timestamp: now, responseTime, error: isError });

    while (metricsBuffer.length > 0 && now - metricsBuffer[0].timestamp > METRICS_TTL) {
        metricsBuffer.shift();
    }

    while (metricsBuffer.length > MAX_METRICS) {
        metricsBuffer.shift();
    }
}

export function getRecentMetrics(): { errorRate: number; avgResponseTime: number; uptime: number } {
    const now = Date.now();

    const errorCount = metricsBuffer.filter(m => m.error).length;
    const errorRate = metricsBuffer.length > 0 ? errorCount / metricsBuffer.length : 0;

    const totalResponseTime = metricsBuffer.reduce((sum, m) => sum + m.responseTime, 0);
    const avgResponseTime = metricsBuffer.length > 0 ? totalResponseTime / metricsBuffer.length : 0;

    const uptime = (now - startTime) / 1000;

    return { errorRate, avgResponseTime, uptime };
}

export function getMemoryUsage(): { usedMB: number; totalMB: number; percentage: number; status: 'healthy' | 'degraded' | 'unhealthy' } {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const percentage = (usedMB / totalMB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (percentage > 90) {
        status = 'unhealthy';
    } else if (percentage > 75) {
        status = 'degraded';
    }

    return { usedMB, totalMB, percentage, status };
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
    const dbCheck = await checkDatabaseHealth();
    const metrics = getRecentMetrics();
    const memory = getMemoryUsage();

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (dbCheck.status === 'unhealthy' || memory.status === 'unhealthy' || metrics.errorRate > 0.1) {
        overallStatus = 'unhealthy';
    } else if (dbCheck.status === 'degraded' || memory.status === 'degraded' || metrics.errorRate > 0.05) {
        overallStatus = 'degraded';
    }

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks: {
            database: dbCheck,
            memory,
        },
        metrics,
    };
}
