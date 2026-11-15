import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = await adminRateLimit(request, 'read');
  if (!rateLimit.success) {
    return rateLimit.error!;
  }

  const { id } = await params;
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const error = await prisma.errorLog.findUnique({
      where: { id },
    });

    if (!error) {
      return NextResponse.json(
        { error: 'Error not found' },
        { status: 404 }
      );
    }

    const relatedErrors = await prisma.errorLog.findMany({
      where: {
        fingerprint: error.fingerprint,
        id: { not: error.id },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const response = NextResponse.json({
      error,
      relatedErrors,
    });
    return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    console.error('Failed to fetch error details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isBearer = request.headers.get('authorization')?.startsWith('Bearer ');
  if (!isBearer && !validateCsrfToken(request)) {
    return csrfValidationErrorResponse();
  }

  const rateLimit = await adminRateLimit(request, 'write');
  if (!rateLimit.success) {
    return rateLimit.error!;
  }

  const { id } = await params;
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { resolved } = await request.json();

    const error = await prisma.errorLog.update({
      where: { id },
      data: { resolved: Boolean(resolved) },
    });

    await logAdminAction(
      request,
      'MODIFY_ERROR_LOGS',
      { type: 'ERROR_LOG', id },
      { action: 'RESOLVE', resolved: Boolean(resolved) },
      authResult.admin.username
    );

    const response = NextResponse.json(error);
    return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    console.error('Failed to update error:', error);
    return NextResponse.json(
      { error: 'Failed to update error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isBearer = request.headers.get('authorization')?.startsWith('Bearer ');
  if (!isBearer && !validateCsrfToken(request)) {
    return csrfValidationErrorResponse();
  }

  const rateLimit = await adminRateLimit(request, 'write');
  if (!rateLimit.success) {
    return rateLimit.error!;
  }

  const { id } = await params;
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const error = await prisma.errorLog.delete({
      where: { id },
    });

    await logAdminAction(
      request,
      'MODIFY_ERROR_LOGS',
      { type: 'ERROR_LOG', id },
      { action: 'DELETE' },
      authResult.admin.username
    );

    const response = NextResponse.json({ success: true, id: error.id });
    return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    console.error('Failed to delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete error' },
      { status: 500 }
    );
  }
}
