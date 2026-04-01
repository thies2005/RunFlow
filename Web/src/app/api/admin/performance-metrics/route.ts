import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';
import { getRouteStatistics, getTopRoutesByMetric, type TimeRange } from '@/lib/monitoring/performance-aggregator';
import { getRecentMetrics } from '@/lib/monitoring/health';
import { getRealTimeStats, getTrackedRouteStats } from '@/lib/monitoring/request-tracker';
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
  const cpuUsage = getCpuUsage();
  const memoryUsage = getMemoryUsage();
  const timestamp = new Date().toISOString();

  try {
    const redisClient = await getRedisClient();
    if (redisClient) {
      const cached = await redisClient.get('api:metrics:recent');

      if (cached) {
        const metrics: Array<{ timestamp: string; statusCode: number; responseTime: number }> = JSON.parse(cached);
        const now = Date.now();
        const lastMinute = metrics.filter(m => now - new Date(m.timestamp).getTime() < 60000);

        if (lastMinute.length > 0) {
          const requestsPerSecond = lastMinute.length / 60;
          const errorsPerSecond = lastMinute.filter(m => m.statusCode >= 400).length / 60;
          const avgResponseTime = lastMinute.reduce((sum, m) => sum + m.responseTime, 0) / lastMinute.length;
          const errorRate = lastMinute.filter(m => m.statusCode >= 400).length / lastMinute.length * 100;

          return { requestsPerSecond, errorsPerSecond, avgResponseTime, errorRate, cpuUsage, memoryUsage, timestamp };
        }
      }
    }
  } catch (error) {
    console.error('Failed to get real-time metrics from cache:', error);
  }

  try {
    const recentDbMetrics = await prisma.apiRouteMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 60000),
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    if (recentDbMetrics.length > 0) {
      const requestsPerSecond = recentDbMetrics.length / 60;
      const errors = recentDbMetrics.filter(m => m.statusCode >= 400);
      const errorsPerSecond = errors.length / 60;
      const avgResponseTime = recentDbMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentDbMetrics.length;
      const errorRate = (errors.length / recentDbMetrics.length) * 100;

      return { requestsPerSecond, errorsPerSecond, avgResponseTime, errorRate, cpuUsage, memoryUsage, timestamp };
    }
  } catch {
    // DB query failed, fall through to in-memory
  }

  const memStats = getRealTimeStats();
  return {
    requestsPerSecond: memStats.requestsPerSecond,
    errorsPerSecond: memStats.errorsPerSecond,
    avgResponseTime: memStats.avgResponseTime,
    errorRate: memStats.errorRate,
    cpuUsage,
    memoryUsage,
    timestamp,
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

async function getRoutesFromDb(timeRange: string) {
  const rangeMinutes: Record<string, number> = {
    '1h': 60, '6h': 360, '24h': 1440, '7d': 10080, '30d': 43200,
  };
  const minutes = rangeMinutes[timeRange] || 1440;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  try {
    const metrics = await prisma.apiRouteMetric.findMany({
      where: { timestamp: { gte: cutoff } },
      orderBy: { timestamp: 'desc' },
      take: 10000,
    });

    if (metrics.length === 0) return [];

    const grouped = new Map<string, typeof metrics>();
    for (const m of metrics) {
      const key = `${m.routePath}:${m.method}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    const results: any[] = [];
    grouped.forEach((routeMetrics, key) => {
      const [routePath, method] = key.split(':');
      const errorCount = routeMetrics.filter(m => m.statusCode >= 400).length;
      const responseTimes = routeMetrics.map(m => m.responseTime).sort((a, b) => a - b);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
      const cpuUsages = routeMetrics.map(m => m.cpuUsage).filter((c): c is number => c != null);
      const avgCpuUsage = cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0;
      const memoryUsages = routeMetrics.map(m => m.memoryUsage).filter((m): m is number => m != null);
      const avgMemoryUsage = memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0;

      results.push({
        id: `db-${key}`,
        routePath,
        method,
        timeRange,
        requestCount: routeMetrics.length,
        errorCount,
        avgResponseTime,
        p50ResponseTime: p50,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
        avgCpuUsage,
        avgMemoryUsage,
        timestamp: new Date(),
      });
    });

    return results.sort((a, b) => b.requestCount - a.requestCount);
  } catch {
    return [];
  }
}

function getRoutesFromMemory() {
  const tracked = getTrackedRouteStats();
  return tracked.map(r => ({
    id: `mem-${r.method}-${r.routePath}`,
    routePath: r.routePath,
    method: r.method,
    timeRange: 'realtime',
    requestCount: r.requestCount,
    errorCount: r.errorCount,
    avgResponseTime: r.avgResponseTime,
    p50ResponseTime: r.avgResponseTime,
    p95ResponseTime: r.avgResponseTime,
    p99ResponseTime: r.avgResponseTime,
    avgCpuUsage: 0,
    avgMemoryUsage: 0,
    timestamp: new Date(),
  }));
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

    let summaries = await prisma.performanceSummary.findMany({
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

    let dataSource = 'aggregated';

    if (summaries.length === 0) {
      summaries = await getRoutesFromDb(timeRange);
      dataSource = summaries.length > 0 ? 'database' : 'memory';
    }

    if (summaries.length === 0) {
      summaries = getRoutesFromMemory();
      dataSource = 'memory';
    }

    const realTime = await getRealTimeMetrics();
    const requestMetrics = getRecentMetrics();

    return NextResponse.json({
      timeRange,
      routes: summaries,
      realTime,
      dataSource,
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
