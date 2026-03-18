import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    await prisma.$executeRaw`SELECT 1`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection verified. Tables may need migration.',
    });
  } catch (error) {
    console.error('Failed to verify database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
