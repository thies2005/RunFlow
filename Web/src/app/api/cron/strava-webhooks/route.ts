import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cronAuth';
import { retryStravaWebhooks } from '@/lib/strava/webhookQueue';
import { recoverStravaSyncRequests } from '@/lib/strava/startSync';
import { runBackgroundTask } from '@/lib/utils/backgroundTask';

export async function POST(request: NextRequest) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    runBackgroundTask(async () => {
        await recoverStravaSyncRequests();
        await retryStravaWebhooks();
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
}
