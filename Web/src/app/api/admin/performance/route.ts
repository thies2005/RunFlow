import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus, getRecentMetrics } from '@/lib/monitoring/health';
import { getAllMetrics } from '@/lib/monitoring/metrics';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import * as os from 'os';

export const dynamic = 'force-dynamic';

interface SystemMetrics {
    uptime: number;
    platform: string;
    nodeVersion: string;
    memory: {
        used: number;
        total: number;
        percentage: number;
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers: number;
    };
    cpu: {
        usage: number;
        loadAverage: number[];
    };
}

interface PerformanceData {
    health: any;
    system: SystemMetrics;
    requests: {
        errorRate: number;
        avgResponseTime: number;
        uptime: number;
        totalMetrics: number;
    };
    customMetrics: Record<string, Array<{ name: string; value: number; timestamp: number }>>;
    database: {
        connectionPool: {
            totalCount: number;
            activeCount: number;
            idleCount: number;
        };
        queriesLastMinute: number;
    };
}

function getCpuUsage(): number {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => {
        return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }, 0);
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    return ((total - idle) / total) * 100;
}

function getSystemMetrics(): SystemMetrics {
    const memory = process.memoryUsage();

    return {
        uptime: process.uptime(),
        platform: os.platform(),
        nodeVersion: process.version,
        memory: {
            used: Math.round((memory.heapUsed / 1024 / 1024)),
            total: Math.round((memory.heapTotal / 1024 / 1024)),
            percentage: ((memory.heapUsed / memory.heapTotal) * 100),
            rss: Math.round((memory.rss / 1024 / 1024)),
            heapTotal: Math.round((memory.heapTotal / 1024 / 1024)),
            heapUsed: Math.round((memory.heapUsed / 1024 / 1024)),
            external: Math.round((memory.external / 1024 / 1024)),
            arrayBuffers: Math.round((memory.arrayBuffers / 1024 / 1024)),
        },
        cpu: {
            usage: getCpuUsage(),
            loadAverage: os.loadavg(),
        },
    };
}

async function getDatabaseMetrics() {
    try {
        const pool: any = (prisma as any)._engine?.datasource?.connection?.pool;
        if (pool) {
            return {
                connectionPool: {
                    totalCount: pool.totalCount || 0,
                    activeCount: pool.activeCount || 0,
                    idleCount: pool.idleCount || 0,
                },
                queriesLastMinute: 0,
            };
        }

        return {
            connectionPool: {
                totalCount: 0,
                activeCount: 0,
                idleCount: 0,
            },
            queriesLastMinute: 0,
        };
    } catch (error) {
        return {
            connectionPool: {
                totalCount: 0,
                activeCount: 0,
                idleCount: 0,
            },
            queriesLastMinute: 0,
        };
    }
}

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);

    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const [health, requestMetrics, customMetrics, dbMetrics] = await Promise.all([
            getHealthStatus(),
            getRecentMetrics(),
            getAllMetrics(),
            getDatabaseMetrics(),
        ]);

        const system = getSystemMetrics();

        const data: PerformanceData = {
            health,
            system,
            requests: {
                errorRate: requestMetrics.errorRate * 100,
                avgResponseTime: requestMetrics.avgResponseTime,
                uptime: requestMetrics.uptime,
                totalMetrics: customMetrics
                    ? Object.values(customMetrics).reduce((sum, arr) => sum + arr.length, 0)
                    : 0,
            },
            customMetrics,
            database: dbMetrics,
        };

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            data,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to fetch performance data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
