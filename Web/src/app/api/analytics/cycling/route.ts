import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCyclingAnalytics } from '@/lib/metrics/cyclingAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rawRange = request.nextUrl.searchParams.get('range') || '90d';
        const allowedRanges = ['42d', '90d', '180d', '365d', '1y', 'all'];
        const range = allowedRanges.includes(rawRange.toLowerCase()) ? rawRange.toLowerCase() : '90d';
        const analytics = await getCyclingAnalytics(session.user.id, range);

        return NextResponse.json(analytics);
    } catch (error) {
        console.error('Failed to get cycling analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
