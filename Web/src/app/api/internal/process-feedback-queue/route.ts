import { NextRequest, NextResponse } from 'next/server';
import { processPendingFeedbackJobs } from '@/lib/ai/feedbackQueue';

export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/process-feedback-queue
 * Internal endpoint called by cron to process pending AI feedback jobs.
 */
export async function POST(req: NextRequest) {
    // Verify internal secret
    const secret = req.headers.get('x-internal-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const result = await processPendingFeedbackJobs();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
