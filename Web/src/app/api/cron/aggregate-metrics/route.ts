import { NextRequest, NextResponse } from 'next/server';
import { aggregateAllTimeRanges, cleanupOldMetrics } from '@/lib/monitoring/performance-aggregator';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await aggregateAllTimeRanges();
    await cleanupOldMetrics();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to aggregate metrics:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate metrics' },
      { status: 500 }
    );
  }
}
