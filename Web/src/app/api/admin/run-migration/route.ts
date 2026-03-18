import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'prisma/migrations/20260318_add_monitoring_tables/migration.sql'),
      'utf-8'
    );

    await prisma.$executeRawUnsafe(migrationSQL);
    
    const result: { success: true, message: 'Monitoring tables created successfully!' };
    
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
