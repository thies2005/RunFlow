import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * @deprecated This endpoint has been merged into /api/plans.
 * Use /api/plans?planSource=advanced&parentOnly=true for listing,
 * and POST /api/plans with planSource='advanced' for creation.
 */
export async function GET() {
    return NextResponse.json(
        { error: 'Deprecated: use /api/plans?planSource=advanced&parentOnly=true instead' },
        { status: 410, headers: { 'X-Deprecated-Endpoint': '/api/plans' } },
    );
}

export async function POST() {
    return NextResponse.json(
        { error: 'Deprecated: use POST /api/plans with planSource="advanced" instead' },
        { status: 410, headers: { 'X-Deprecated-Endpoint': '/api/plans' } },
    );
}
