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
      'utf8'
    );

    await prisma.$executeRawUnsafe(migrationSQL);
    
    return NextResponse.json({
      success: true,
      message: 'Monitoring tables created successfully!',
      tablesCreated: [
        'ApiRouteMetric - API request tracking',
        'ErrorLog - Error logging with fingerprinting',
        'PerformanceSummary - Time-based aggregated metrics',
        'SessionReplay - User session replay data',
        'Release - Deployment and release tracking'
      ],
    });
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

  try {
    const { execSync } = require('child_process');
    
    console.log('Starting database migration...');
    const output = execSync(
      'npx prisma migrate deploy',
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          PATH: process.env.PATH,
        },
        stdio: 'pipe',
        timeout: 120000,
      }
    ).toString();
    
    console.log('Migration output:', output);
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      output: output.substring(0, 500) + (output.length > 500 ? '...' : ''),
      tablesCreated: [
        'ApiRouteMetric - API request tracking',
        'ErrorLog - Error logging with fingerprinting',
        'PerformanceSummary - Time-based aggregated metrics',
        'SessionReplay - User session replay data',
        'Release - Deployment and release tracking'
      ],
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message || 'Unknown error',
        stdout: error.stdout ? error.stdout.substring(0, 500) : '',
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
