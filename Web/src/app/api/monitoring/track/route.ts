import { NextRequest, NextResponse } from 'next/server';
import { recordTrackedRequest } from '@/lib/monitoring/request-tracker';
import { trackApiMetric } from '@/lib/middleware/api-tracker';
import { recordMetric } from '@/lib/monitoring/health';
import { trackError } from '@/lib/monitoring/error-tracker';

export const dynamic = 'force-dynamic';

const TRACKING_SECRET = process.env.CRON_SECRET || 'internal-tracking';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${TRACKING_SECRET}`) {
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
