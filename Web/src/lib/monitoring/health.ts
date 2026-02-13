import { prisma } from '../db';

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    checks: {
        database: {
            status: 'healthy' | 'unhealthy';
            latency?: number;
            error?: string;
        };
        strava: {
            status: 'healthy' | 'unhealthy';
            error?: string;
        };
        aiProviders: {
            status: 'healthy' | 'unhealthy';
            error?: string;
        };
        memory: {
            status: 'healthy' | 'unhealthy';
            usedMB: number;
            totalMB: number;
            percentage: number;
        };
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

export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const start = Date.now();

    try {
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;

        if (latency > 5000) {
            return { status: 'unhealthy', latency, error: `Database latency too high: ${latency}ms` };
        }

        return { status: 'healthy', latency };
    } catch (error) {
        return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export async function checkStravaHealth(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
        if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
            return { status: 'unhealthy', error: 'Strava credentials not configured' };
        }

        return { status: 'healthy' };
    } catch (error) {
        return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export async function checkAiProvidersHealth(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
        const hasProvider = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY;

        if (!hasProvider) {
            return { status: 'unhealthy', error: 'No AI provider configured' };
        }

        return { status: 'healthy' };
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

export function getMemoryUsage(): { usedMB: number; totalMB: number; percentage: number; status: 'healthy' | 'unhealthy' } {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const percentage = (usedMB / totalMB) * 100;

    let status: 'healthy' | 'unhealthy' = 'healthy';

    if (percentage > 90) {
        status = 'unhealthy';
    }

    return { usedMB, totalMB, percentage, status };
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
    const [dbCheck, stravaCheck, aiProvidersCheck] = await Promise.all([
        checkDatabaseHealth(),
        checkStravaHealth(),
        checkAiProvidersHealth(),
    ]);
    const memory = getMemoryUsage();

    const criticalChecks = [dbCheck.status, memory.status];
    const overallStatus = criticalChecks.includes('unhealthy') ? 'unhealthy' : 'healthy';

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks: {
            database: dbCheck,
            strava: stravaCheck,
            aiProviders: aiProvidersCheck,
            memory,
        },
    };
}
