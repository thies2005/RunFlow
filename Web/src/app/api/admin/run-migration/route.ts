import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
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

    await logAdminAction(
      request,
      'RUN_MIGRATION',
      { type: 'SYSTEM' },
      { statementsExecuted: statements.length },
      authResult.admin.username
    );

    const response = NextResponse.json({
      success: true,
      message: 'Monitoring tables created successfully!',
      statementsExecuted: statements.length,
    });

    return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);
  } catch (error) {
    console.error('Migration error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create monitoring tables',
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
