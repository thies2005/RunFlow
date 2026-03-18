import { NextRequest, NextResponse } from 'next/server';
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

function getCpuUsage(): number {
  const cpus = require('os').cpus();
  const totalIdle = cpus.reduce((acc: number, cpu: any) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce((acc: number, cpu: any) => {
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

export function withApiTracking(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const startCpu = getCpuUsage();
    const startMemory = getMemoryUsage();

    const url = new URL(req.url);
    const routePath = url.pathname;
    const method = req.method;

    let userId: string | undefined;
    try {
      const session = await req.cookies.get('next-auth.session-token')?.value;
      if (session) {
        userId = session;
      }
    } catch (error) {
      // Ignore auth errors
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || undefined;
    const requestSize = parseInt(req.headers.get('content-length') || '0');

    let response: NextResponse;
    let statusCode = 500;
    let isError = false;

    try {
      response = await handler(req);
      statusCode = response.status;
    } catch (error) {
      isError = true;
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;
    const endCpu = getCpuUsage();
    const endMemory = getMemoryUsage();
    const responseSize = parseInt(response.headers.get('content-length') || '0');

    const metricData: MetricData = {
      routePath,
      method,
      statusCode,
      responseTime,
      cpuUsage: endCpu,
      memoryUsage: endMemory,
      requestSize: requestSize || undefined,
      responseSize: responseSize || undefined,
      userId,
      userAgent,
      ipAddress,
    };

    trackApiMetric(metricData);

    if (isError) {
      const { trackError } = await import('@/lib/monitoring/error-tracker');
      const err = new Error('Internal server error');
      await trackError({
        routePath,
        method,
        errorMessage: err.message,
        stackTrace: err.stack,
        userId,
        userAgent,
      });
    }

    return response;
  };
}

export function withManualApiTracking(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    routePath?: string;
    method?: string;
    userId?: string;
  }
) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const url = new URL(req.url);
    const routePath = options?.routePath || url.pathname;
    const method = options?.method || req.method;

    let response: NextResponse;
    let isError = false;
    let error: Error | undefined;

    try {
      response = await handler(req);
    } catch (err) {
      isError = true;
      const errObj = err instanceof Error ? err : undefined;
      response = NextResponse.json(
        { error: errObj?.message || 'Internal server error' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    const cpuUsage = getCpuUsage();
    const memoryUsage = getMemoryUsage();

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || undefined;

    const metricData: MetricData = {
      routePath,
      method,
      statusCode,
      responseTime,
      cpuUsage,
      memoryUsage,
      userId: options?.userId,
      userAgent,
      ipAddress,
    };

    trackApiMetric(metricData);

    if (isError) {
      const { trackError } = await import('@/lib/monitoring/error-tracker');
      const err = new Error('Request failed');
      await trackError({
        routePath,
        method,
        errorMessage: err.message,
        stackTrace: err.stack,
        userId: options?.userId,
        userAgent,
      });
    }

    return response;
  };
}
