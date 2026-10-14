import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { getReleaseComparison, trackRelease, detectPerformanceRegression } from '@/lib/monitoring/release-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const compare = searchParams.get('compare');
    const regression = searchParams.get('regression');

    if (compare) {
      const [version1, version2] = compare.split(',');
      const timeRange = searchParams.get('timeRange') || '24h';

      if (!version1 || !version2) {
        return NextResponse.json(
          { error: 'Two versions required for comparison' },
          { status: 400 }
        );
      }

      const comparison = await getReleaseComparison(version1, version2, timeRange);
      return NextResponse.json(comparison);
    }

    if (regression) {
      const [version1, version2] = regression.split(',');
      const threshold = parseInt(searchParams.get('threshold') || '20');

      if (!version1 || !version2) {
        return NextResponse.json(
          { error: 'Two versions required for regression check' },
          { status: 400 }
        );
      }

      const hasRegression = await detectPerformanceRegression(version1, version2, threshold);
      return NextResponse.json({ hasRegression, threshold });
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [releases, total] = await Promise.all([
      prisma.release.findMany({
        orderBy: { deployedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.release.count(),
    ]);

    return NextResponse.json({
      releases,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Failed to fetch releases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch releases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const isBearer = request.headers.get('authorization')?.startsWith('Bearer ');
  if (!isBearer && !validateCsrfToken(request)) {
    return csrfValidationErrorResponse();
  }

  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { notes } = await request.json();

    await trackRelease(notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track release:', error);
    return NextResponse.json(
      { error: 'Failed to track release' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const isBearer = request.headers.get('authorization')?.startsWith('Bearer ');
  if (!isBearer && !validateCsrfToken(request)) {
    return csrfValidationErrorResponse();
  }

  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // no body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Release ID is required' }, { status: 400 });
    }

    await prisma.release.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete release:', error);
    return NextResponse.json(
      { error: 'Failed to delete release' },
      { status: 500 }
    );
  }
}
