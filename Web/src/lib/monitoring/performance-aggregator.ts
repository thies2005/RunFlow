import { prisma } from '@/lib/db';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

const TIME_RANGES: Record<TimeRange, { minutes: number; label: string }> = {
  '1h': { minutes: 60, label: '1 hour' },
  '6h': { minutes: 360, label: '6 hours' },
  '24h': { minutes: 1440, label: '24 hours' },
  '7d': { minutes: 10080, label: '7 days' },
  '30d': { minutes: 43200, label: '30 days' },
};

export async function aggregatePerformanceMetrics(timeRange: TimeRange) {
  const { minutes } = TIME_RANGES[timeRange];
  const cutoffDate = new Date(Date.now() - minutes * 60 * 1000);

  const routes = await prisma.apiRouteMetric.findMany({
    where: {
      timestamp: {
        gte: cutoffDate,
      },
    },
  });

  const groupedByRoute = new Map<string, typeof routes>();

  for (const metric of routes) {
    const key = `${metric.routePath}:${metric.method}`;
    if (!groupedByRoute.has(key)) {
      groupedByRoute.set(key, []);
    }
    groupedByRoute.get(key)!.push(metric);
  }

  const summaries: any[] = [];

  groupedByRoute.forEach((metrics, key) => {
    const [routePath, method] = key.split(':');
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;

    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    const cpuUsages = metrics.map(m => m.cpuUsage).filter((c): c is number => c !== undefined && c !== null);
    const avgCpuUsage = cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0;

    const memoryUsages = metrics.map(m => m.memoryUsage).filter((m): m is number => m !== undefined && m !== null);
    const avgMemoryUsage = memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0;

    summaries.push({
      routePath,
      method,
      timeRange,
      requestCount: metrics.length,
      errorCount,
      avgResponseTime,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      avgCpuUsage,
      avgMemoryUsage,
    });
  });

  await prisma.performanceSummary.deleteMany({
    where: {
      timeRange,
      timestamp: {
        lt: new Date(Date.now() - 5 * 60 * 1000),
      },
    },
  });

  await prisma.performanceSummary.createMany({
    data: summaries.map(s => ({
      ...s,
      timestamp: new Date(),
    })),
  });

  return summaries;
}

export async function aggregateAllTimeRanges() {
  const results = await Promise.all(
    Object.keys(TIME_RANGES).map(timeRange => 
      aggregatePerformanceMetrics(timeRange as TimeRange)
    )
  );

  return results.flat();
}

export async function cleanupOldMetrics() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  await prisma.apiRouteMetric.deleteMany({
    where: {
      timestamp: {
        lt: ninetyDaysAgo,
      },
    },
  });

  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  await prisma.performanceSummary.deleteMany({
    where: {
      timestamp: {
        lt: oneYearAgo,
      },
    },
  });

  await prisma.errorLog.deleteMany({
    where: {
      timestamp: {
        lt: oneYearAgo,
      },
      resolved: true,
    },
  });
}

export async function getRouteStatistics(routePath: string, method: string, timeRange: TimeRange) {
  const { minutes } = TIME_RANGES[timeRange];
  const cutoffDate = new Date(Date.now() - minutes * 60 * 1000);

  const summary = await prisma.performanceSummary.findFirst({
    where: {
      routePath,
      method,
      timeRange,
      timestamp: {
        gte: new Date(Date.now() - 10 * 60 * 1000),
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  if (summary) {
    return summary;
  }

  const metrics = await prisma.apiRouteMetric.findMany({
    where: {
      routePath,
      method,
      timestamp: {
        gte: cutoffDate,
      },
    },
  });

  if (metrics.length === 0) {
    return null;
  }

  const errorCount = metrics.filter(m => m.statusCode >= 400).length;
  const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

  const cpuUsages = metrics.map(m => m.cpuUsage).filter((c): c is number => c !== undefined && c !== null);
  const avgCpuUsage = cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0;

  const memoryUsages = metrics.map(m => m.memoryUsage).filter((m): m is number => m !== undefined && m !== null);
  const avgMemoryUsage = memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0;

  return {
    routePath,
    method,
    timeRange,
    requestCount: metrics.length,
    errorCount,
    avgResponseTime,
    p50ResponseTime: p50,
    p95ResponseTime: p95,
    p99ResponseTime: p99,
    avgCpuUsage,
    avgMemoryUsage,
  };
}

export async function getTopRoutesByMetric(metric: 'requestCount' | 'avgResponseTime' | 'errorCount', timeRange: TimeRange, limit = 10) {
  const { minutes } = TIME_RANGES[timeRange];
  const cutoffDate = new Date(Date.now() - minutes * 60 * 1000);

  const summaries = await prisma.performanceSummary.findMany({
    where: {
      timeRange,
      timestamp: {
        gte: new Date(Date.now() - 10 * 60 * 1000),
      },
    },
    orderBy: {
      [metric]: 'desc',
    },
    take: limit,
  });

  if (summaries.length > 0) {
    return summaries;
  }

  const routes = await prisma.apiRouteMetric.findMany({
    where: {
      timestamp: {
        gte: cutoffDate,
      },
    },
  });

  const groupedByRoute = new Map<string, typeof routes>();

  for (const metric of routes) {
    const key = `${metric.routePath}:${metric.method}`;
    if (!groupedByRoute.has(key)) {
      groupedByRoute.set(key, []);
    }
    groupedByRoute.get(key)!.push(metric);
  }

  const results: any[] = [];

  groupedByRoute.forEach((metrics, key) => {
    const [routePath, method] = key.split(':');
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;

    results.push({
      routePath,
      method,
      timeRange,
      requestCount: metrics.length,
      errorCount,
      avgResponseTime,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
    });
  });

  return results.sort((a, b) => b[metric] - a[metric]).slice(0, limit);
}
