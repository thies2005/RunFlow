import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { syncUserActivities, getSyncStatus } from '@/lib/strava/sync';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('Sync POST: No session or user ID');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if sync already in progress
        const status = await getSyncStatus(session.user.id);
        if (status.syncInProgress) {
            return NextResponse.json({
                error: 'Sync already in progress',
                ...status,
            }, { status: 409 });
        }

        // Get options
        const body = await request.json().catch(() => ({}));
        const range = body.range || 'ALL'; // Default to ALL when sync is triggered manually

        // Start sync
        console.log(`Starting sync for user ${session.user.id} with range: ${range}`);
        const result = await syncUserActivities(session.user.id, range);
        console.log(`Sync complete for user ${session.user.id}:`, result);

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
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('Sync GET: No session or user ID');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const status = await getSyncStatus(session.user.id);
        return NextResponse.json(status);
    } catch (error) {
        console.error('Sync status error:', error);
        return NextResponse.json(
            { error: 'Failed to get sync status' },
            { status: 500 }
        );
    }
}
