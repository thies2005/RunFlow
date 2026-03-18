import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      errors,
      total,
      hasMore: offset + limit < total,
      errorGroups,
    });
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
    if (!groups.has(error.fingerprint)) {
      groups.set(error.fingerprint, {
        fingerprint: error.fingerprint,
        errorMessage: error.errorMessage,
        routePath: error.routePath,
        method: error.method,
        count: error.count,
        resolved: error.resolved,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        occurrences: [],
      });
    }

    const group = groups.get(error.fingerprint);
    group.count += error.count - 1;
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
