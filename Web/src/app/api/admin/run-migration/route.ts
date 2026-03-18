import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { exec } = require('child_process');
    
    return new Promise<NextResponse>((resolve) => {
      exec(
        'npx prisma migrate deploy',
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
          },
        },
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error('Migration error:', error);
            resolve(NextResponse.json(
              { 
                error: 'Migration failed',
                details: stderr,
              },
              { status: 500 }
            ));
          } else {
            console.log('Migration output:', stdout);
            resolve(NextResponse.json({
              success: true,
              output: stdout,
            }));
          }
        }
      );
    });
  } catch (error) {
    console.error('Failed to run migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run migration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
