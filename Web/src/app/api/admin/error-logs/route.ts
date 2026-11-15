import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rateLimit = await adminRateLimit(request, 'read');
  if (!rateLimit.success) {
    return rateLimit.error!;
  }

  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const resolved = searchParams.get('resolved');
    const route = searchParams.get('route');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (resolved !== null) {
      where.resolved = resolved === 'true';
    }

    if (route) {
      where.routePath = { contains: route, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.errorLog.count({ where }),
    ]);

    const errorGroups = groupErrorsByFingerprint(errors);

    const response = NextResponse.json({
      errors,
      total,
      hasMore: offset + limit < total,
      errorGroups,
    });
    return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

function groupErrorsByFingerprint(errors: any[]) {
  const groups = new Map<string, any>();

  for (const error of errors) {
    const key = error.fingerprint || `${error.method}:${error.routePath}:${error.errorMessage}`;
    const occurrencesToAdd = typeof error.count === 'number' && error.count > 0 ? error.count : 1;

    if (!groups.has(key)) {
      groups.set(key, {
        fingerprint: key,
        errorMessage: error.errorMessage,
        routePath: error.routePath,
        method: error.method,
        count: 0,
        resolved: error.resolved,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        occurrences: [],
      });
    }

    const group = groups.get(key);
    group.count += occurrencesToAdd;
    group.resolved = group.resolved && error.resolved;
    group.occurrences.push(error);

    if (new Date(error.timestamp) < new Date(group.firstSeen)) {
      group.firstSeen = error.timestamp;
    }
    if (new Date(error.timestamp) > new Date(group.lastSeen)) {
      group.lastSeen = error.timestamp;
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
