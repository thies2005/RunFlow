import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { syncUserActivities, getSyncStatus } from '@/lib/strava/sync';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Check if sync already in progress
        const status = await getSyncStatus(session.user.id);
        if (status.syncInProgress) {
            return NextResponse.json({
                error: 'Sync already in progress',
                ...status,
            }, { status: 409 });
        }

        // Start sync (this runs in the background effectively)
        const result = await syncUserActivities(session.user.id);

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json(
            { error: 'Failed to sync activities' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSyncStatus(session.user.id);
    return NextResponse.json(status);
}
