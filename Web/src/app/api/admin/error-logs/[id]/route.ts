import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    return NextResponse.json({
      error,
      relatedErrors,
    });
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
  const { id } = await params;
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { resolved } = await request.json();

    const error = await prisma.errorLog.update({
      where: { id },
      data: { resolved },
    });

    return NextResponse.json(error);
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
  const { id } = await params;
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const error = await prisma.errorLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id: error.id });
  } catch (error) {
    console.error('Failed to delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete error' },
      { status: 500 }
    );
  }
}
