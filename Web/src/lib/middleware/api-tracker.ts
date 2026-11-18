import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';

interface MetricData {
  routePath: string;
  method: string;
  statusCode: number;
  responseTime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  requestSize?: number;
  responseSize?: number;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

const metricsBuffer: MetricData[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

export async function trackApiMetric(data: MetricData) {
  metricsBuffer.push(data);

  if (metricsBuffer.length >= 100) {
    flushMetrics();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushMetrics();
    }, 5000);
  }
}

async function flushMetrics() {
  if (metricsBuffer.length === 0) {
    return;
  }

  const metricsToFlush = [...metricsBuffer];
  metricsBuffer.length = 0;

  try {
    await prisma.apiRouteMetric.createMany({
      data: metricsToFlush,
    });
  } catch (error) {
    console.error('Failed to flush API metrics:', error);
  }

  try {
    const redisClient = await getRedisClient();
    if (redisClient) {
      await redisClient.del('api:metrics:recent');
      const recentMetrics = await prisma.apiRouteMetric.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 60000),
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });
      await redisClient.set('api:metrics:recent', JSON.stringify(recentMetrics), { ex: 60 });
    }
  } catch (error) {
    console.error('Failed to cache metrics in Redis:', error);
  }

  flushTimeout = null;
}
