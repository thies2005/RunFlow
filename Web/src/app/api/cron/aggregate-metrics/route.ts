import { NextRequest, NextResponse } from 'next/server';
import { aggregateAllTimeRanges, cleanupOldMetrics } from '@/lib/monitoring/performance-aggregator';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Constant-time comparison of a Bearer Authorization header against the secret.
 * Fails closed (returns false) if the secret is unset or the header is missing.
 */
function safeCompareBearer(authHeader: string | null, secret: string | null | undefined): boolean {
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

export async function GET(request: NextRequest) {
  if (!safeCompareBearer(request.headers.get('authorization'), CRON_SECRET)) {
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
