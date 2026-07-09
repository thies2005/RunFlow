import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cronAuth';
import { processWorkoutEmails } from '@/lib/workoutEmail';

/**
 * Cron endpoint to send "tomorrow's workout" email notifications.
 * Intended to run once per day (e.g. early evening local to each user).
 * Protected by CRON_SECRET via Authorization header (preferred) or query parameter (legacy).
 */
export async function GET(request: NextRequest) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const results = await processWorkoutEmails({ now });

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            ...results,
        });
    } catch (error) {
        console.error('Cron workout-email error:', error);
        return NextResponse.json(
            { error: 'Failed to process workout email reminders' },
            { status: 500 }
        );
    }
}
