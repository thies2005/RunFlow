import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
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
