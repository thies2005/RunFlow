import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Health Check Endpoint
 * 
 * Used by Docker health checks and load balancers to verify the app is running.
 * Returns a simple JSON response with status and timestamp.
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    });
}
