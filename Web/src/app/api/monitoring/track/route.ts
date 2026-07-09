import { NextRequest, NextResponse } from 'next/server';
import { recordTrackedRequest } from '@/lib/monitoring/request-tracker';
import { trackApiMetric } from '@/lib/middleware/api-tracker';
import { recordMetric } from '@/lib/monitoring/health';
import { trackError } from '@/lib/monitoring/error-tracker';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const TRACKING_SECRET = process.env.CRON_SECRET;

/**
 * Constant-time comparison of a Bearer Authorization header against the secret.
 * Fails closed (returns false) if the secret is unset or the header is missing.
 */
function safeCompareBearer(authHeader: string | null, secret: string | null): boolean {
    if (!secret) return false; // fail closed when secret unset
    if (!authHeader) return false;
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(authHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!TRACKING_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (!safeCompareBearer(authHeader, TRACKING_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { routePath, method, statusCode, responseTime, errorMessage } = data;

    if (!routePath || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const status = typeof statusCode === 'number' ? statusCode : 200;
    const rt = typeof responseTime === 'number' ? responseTime : 0;

    recordTrackedRequest({
      routePath,
      method,
      statusCode: status,
      responseTime: rt,
      timestamp: Date.now(),
    });

    trackApiMetric({
      routePath,
      method,
      statusCode: status,
      responseTime: rt,
      cpuUsage: undefined,
      memoryUsage: undefined,
    });

    recordMetric(rt, status >= 400);

    if (status >= 400) {
      trackError({
        routePath,
        method,
        errorMessage: errorMessage || `HTTP ${status} on ${method} ${routePath}`,
        userAgent: data.userAgent,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
