import { execSync } from 'child_process';
import { prisma } from '@/lib/db';

export interface ReleaseInfo {
  version: string;
  commitHash?: string;
  deployedBy?: string;
  notes?: string;
}

export async function getCurrentRelease(): Promise<ReleaseInfo> {
  try {
    const version = process.env.NEXT_PUBLIC_APP_VERSION || 'unknown';
    
    let commitHash: string | undefined;
    let deployedBy: string | undefined;

    try {
      commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().substring(0, 7);
      deployedBy = execSync('git log -1 --format=%an', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.error('Failed to get git info:', error);
    }

    return {
      version,
      commitHash,
      deployedBy,
    };
  } catch (error) {
    console.error('Failed to get current release info:', error);
    return {
      version: 'unknown',
    };
  }
}

export async function trackRelease(notes?: string): Promise<void> {
  try {
    const releaseInfo = await getCurrentRelease();

    const existing = await prisma.release.findUnique({
      where: { version: releaseInfo.version },
    });

    if (existing) {
      await prisma.release.update({
        where: { id: existing.id },
        data: {
          deployedAt: new Date(),
          deployedBy: releaseInfo.deployedBy,
          commitHash: releaseInfo.commitHash,
          notes,
        },
      });
    } else {
      await prisma.release.create({
        data: {
          version: releaseInfo.version,
          deployedAt: new Date(),
          deployedBy: releaseInfo.deployedBy,
          commitHash: releaseInfo.commitHash,
          notes,
        },
      });
    }

    const { aggregateAllTimeRanges } = await import('./performance-aggregator');
    await aggregateAllTimeRanges();
  } catch (error) {
    console.error('Failed to track release:', error);
  }
}

export async function getReleaseComparison(
  version1: string,
  version2: string,
  timeRange: string = '24h'
) {
  const release1 = await prisma.release.findUnique({
    where: { version: version1 },
  });

  const release2 = await prisma.release.findUnique({
    where: { version: version2 },
  });

  if (!release1 || !release2) {
    throw new Error('One or both releases not found');
  }

  const earlierRelease = release1.deployedAt < release2.deployedAt ? release1 : release2;
  const laterRelease = release1.deployedAt > release2.deployedAt ? release1 : release2;

  const timeRangeMinutes = getTimeRangeMinutes(timeRange);
  
  const earlierPeriodStart = new Date(earlierRelease.deployedAt.getTime());
  const earlierPeriodEnd = new Date(earlierPeriodStart.getTime() + timeRangeMinutes * 60 * 1000);

  const laterPeriodStart = new Date(laterRelease.deployedAt.getTime());
  const laterPeriodEnd = new Date(laterPeriodStart.getTime() + timeRangeMinutes * 60 * 1000);

  const [earlierMetrics, laterMetrics] = await Promise.all([
    getAggregatedMetrics(earlierPeriodStart, earlierPeriodEnd),
    getAggregatedMetrics(laterPeriodStart, laterPeriodEnd),
  ]);

  return {
    earlierRelease: {
      version: earlierRelease.version,
      deployedAt: earlierRelease.deployedAt,
      metrics: earlierMetrics,
    },
    laterRelease: {
      version: laterRelease.version,
      deployedAt: laterRelease.deployedAt,
      metrics: laterMetrics,
    },
    comparison: {
      avgResponseTimeChange: calculatePercentChange(earlierMetrics.avgResponseTime, laterMetrics.avgResponseTime),
      errorRateChange: calculatePercentChange(earlierMetrics.errorRate, laterMetrics.errorRate),
      requestCountChange: calculatePercentChange(earlierMetrics.requestCount, laterMetrics.requestCount),
    },
  };
}

function getTimeRangeMinutes(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 60,
    '6h': 360,
    '24h': 1440,
    '7d': 10080,
    '30d': 43200,
  };
  return ranges[timeRange] || 1440;
}

async function getAggregatedMetrics(startDate: Date, endDate: Date) {
  const metrics = await prisma.apiRouteMetric.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (metrics.length === 0) {
    return {
      requestCount: 0,
      errorCount: 0,
      errorRate: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
    };
  }

  const errorCount = metrics.filter(m => m.statusCode >= 400).length;
  const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

  return {
    requestCount: metrics.length,
    errorCount,
    errorRate: (errorCount / metrics.length) * 100,
    avgResponseTime,
    p50ResponseTime: p50,
    p95ResponseTime: p95,
    p99ResponseTime: p99,
  };
}

function calculatePercentChange(before: number, after: number): number {
  if (before === 0) return after === 0 ? 0 : 100;
  return ((after - before) / before) * 100;
}

export async function detectPerformanceRegression(
  previousVersion: string,
  currentVersion: string,
  threshold: number = 20
): Promise<boolean> {
  try {
    const comparison = await getReleaseComparison(previousVersion, currentVersion, '24h');

    const hasRegression =
      comparison.comparison.avgResponseTimeChange > threshold ||
      comparison.comparison.errorRateChange > threshold;

    return hasRegression;
  } catch (error) {
    console.error('Failed to detect performance regression:', error);
    return false;
  }
}
