import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';
import { getRouteStatistics, getTopRoutesByMetric, type TimeRange } from '@/lib/monitoring/performance-aggregator';
import { getRecentMetrics } from '@/lib/monitoring/health';
import * as os from 'os';

export const dynamic = 'force-dynamic';

interface RealTimeMetrics {
  requestsPerSecond: number;
  errorsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
}

async function getRealTimeMetrics(): Promise<RealTimeMetrics> {
  try {
    const redisClient = await getRedisClient();
    if (redisClient) {
      const cached = await redisClient.get('api:metrics:recent');
      
      if (cached) {
        const metrics = JSON.parse(cached) as any[];
        const now = Date.now();
        const lastMinute = metrics.filter(m => now - new Date(m.timestamp).getTime() < 60000);
        
        const requestsPerSecond = lastMinute.length / 60;
        const errorsPerSecond = lastMinute.filter(m => m.statusCode >= 400).length / 60;
        const avgResponseTime = lastMinute.reduce((sum, m) => sum + m.responseTime, 0) / lastMinute.length;
        const errorRate = lastMinute.filter(m => m.statusCode >= 400).length / lastMinute.length * 100;
        
        const cpuUsage = getCpuUsage();
        const memoryUsage = getMemoryUsage();
        
        return {
          requestsPerSecond,
          errorsPerSecond,
          avgResponseTime,
          errorRate,
          cpuUsage,
          memoryUsage,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.error('Failed to get real-time metrics from cache:', error);
  }

  return {
    requestsPerSecond: 0,
    errorsPerSecond: 0,
    avgResponseTime: 0,
    errorRate: 0,
    cpuUsage: getCpuUsage(),
    memoryUsage: getMemoryUsage(),
    timestamp: new Date().toISOString(),
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

function getMemoryUsage(): number {
  const memory = process.memoryUsage();
  return Math.round(memory.heapUsed / 1024 / 1024);
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as TimeRange) || '24h';
    const route = searchParams.get('route');
    const method = searchParams.get('method');
    const topBy = searchParams.get('topBy');
    const topLimit = parseInt(searchParams.get('topLimit') || '10');

    if (route && method) {
      const stats = await getRouteStatistics(route, method, timeRange);
      return NextResponse.json(stats);
    }

    if (topBy) {
      const topRoutes = await getTopRoutesByMetric(
        topBy as 'requestCount' | 'avgResponseTime' | 'errorCount',
        timeRange,
        topLimit
      );
      return NextResponse.json(topRoutes);
    }

    const summaries = await prisma.performanceSummary.findMany({
      where: {
        timeRange,
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
      orderBy: [
        { avgResponseTime: 'desc' },
      ],
      take: 1000,
    });

    const realTime = await getRealTimeMetrics();
    const requestMetrics = getRecentMetrics();

    return NextResponse.json({
      timeRange,
      routes: summaries,
      realTime,
      system: {
        uptime: process.uptime(),
        platform: os.platform(),
        nodeVersion: process.version,
        cpuUsage: realTime.cpuUsage,
        memoryUsage: realTime.memoryUsage,
      },
      requests: {
        errorRate: requestMetrics.errorRate * 100,
        avgResponseTime: requestMetrics.avgResponseTime,
        uptime: requestMetrics.uptime,
      },
    });
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
