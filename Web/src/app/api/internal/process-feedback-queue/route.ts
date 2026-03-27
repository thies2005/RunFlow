import { NextRequest, NextResponse } from 'next/server';
import { processPendingFeedbackJobs } from '@/lib/ai/feedbackQueue';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-internal-secret');
    const expected = process.env.CRON_SECRET || '';
    if (!secret || !expected) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const a = Buffer.from(secret);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const result = await processPendingFeedbackJobs();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
