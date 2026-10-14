import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit } from '@/lib/rateLimitAdmin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const isBearer = request.headers.get('authorization')?.startsWith('Bearer ');
  if (!isBearer && !validateCsrfToken(request)) {
    return csrfValidationErrorResponse();
  }

  const rateLimit = await adminRateLimit(request, 'sensitive');
  if (!rateLimit.success) {
    return rateLimit.error!;
  }

  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'prisma/migrations/20260318_add_monitoring_tables/migration.sql'),
      'utf-8'
    );

    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }

    const result = { success: true, message: 'Monitoring tables created successfully!' };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Migration error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create monitoring tables',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
