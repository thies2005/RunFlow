import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { sendWorkoutReminderEmail } from '@/lib/email';

export interface WorkoutEmailResult {
    sent: number;
    skipped: number;
    errors: number;
}

/**
 * Format a date (in a given IANA timezone) as "YYYY-MM-DD".
 * Falls back to UTC if the timezone is invalid.
 */
export function formatDateInTz(date: Date, timezone: string): string {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = formatter.formatToParts(date);
        const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
        return `${get('year')}-${get('month')}-${get('day')}`;
    } catch {
        // Fallback to UTC if timezone is invalid
        return date.toISOString().slice(0, 10);
    }
}

/**
 * Returns the [start, end) Date range (in UTC) covering a full calendar day
 * for the given YYYY-MM-DD date string interpreted in the user's timezone.
 * Falls back to a UTC-based interpretation if the timezone is invalid.
 */
export function getDayRange(dateStr: string, timezone: string): { start: Date; end: Date } {
    const [y, m, d] = dateStr.split('-').map(Number);
    try {
        // Probe the timezone validity with Intl. If it throws, we fall back to UTC.
        Intl.DateTimeFormat('en-US', { timeZone: timezone });
        // Compute the UTC offset (in minutes) for this calendar day in the tz.
        const asIfUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
        // Use parts in the target tz to find the offset between the wall-clock
        // and the same instant expressed as UTC.
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(new Date(asIfUtc));
        const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
        const tzInstant = Date.UTC(
            Number(get('year')),
            Number(get('month')) - 1,
            Number(get('day')),
            Number(get('hour')) === 24 ? 0 : Number(get('hour')),
            Number(get('minute')),
            Number(get('second'))
        );
        const offsetMs = tzInstant - asIfUtc;
        const start = new Date(asIfUtc - offsetMs);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start, end };
    } catch {
        // Fallback to UTC day bounds
        const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start, end };
    }
}

/**
 * Compute tomorrow's calendar day in the user's timezone and return the UTC
 * [start, end) range covering that whole day.
 */
export function getTomorrowRange(now: Date, timezone: string): { start: Date; end: Date } {
    // Advance the wall-clock date by one day in the user's timezone, then derive
    // the UTC range for that calendar day. We add the day to the date STRING
    // (not to a UTC ms instant) so we stay correct across timezones where
    // midnight-UTC falls on the previous local day.
    const todayStr = formatDateInTz(now, timezone);
    const [y, m, d] = todayStr.split('-').map(Number);
    const tomorrowDate = new Date(Date.UTC(y, m - 1, d));
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getUTCDate()).padStart(2, '0')}`;
    return getDayRange(tomorrowStr, timezone);
}

/**
 * Batch-processor: sends "tomorrow's workout" email notifications to all users
 * who have workout email reminders enabled. Designed to run on a cron schedule
 * (e.g. once per day). Idempotent per calendar day via lastWorkoutEmailSent.
 *
 * Per-user work is wrapped in try/catch so one user's failure doesn't stop the batch.
 */
export async function processWorkoutEmails(opts: { now?: Date; appUrl?: string } = {}): Promise<WorkoutEmailResult> {
    const now = opts.now ?? new Date();
    const appUrl = opts.appUrl ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    const results: WorkoutEmailResult = { sent: 0, skipped: 0, errors: 0 };

    const settingsList = await prisma.reminderSettings.findMany({
        where: { workoutEmailEnabled: true },
    });

    logger.info('Processing workout email reminders', { count: settingsList.length });

    for (const settings of settingsList) {
        try {
            // Idempotency: skip if already sent today (in the user's tz)
            if (settings.lastWorkoutEmailSent) {
                const lastSentStr = formatDateInTz(settings.lastWorkoutEmailSent, settings.timezone);
                const todayStr = formatDateInTz(now, settings.timezone);
                if (lastSentStr === todayStr) {
                    results.skipped++;
                    continue;
                }
            }

            const { start, end } = getTomorrowRange(now, settings.timezone);

            const workout = await prisma.workout.findFirst({
                where: {
                    goal: {
                        userId: settings.userId,
                        isActive: true,
                        deletedAt: null,
                    },
                    scheduledDate: { gte: start, lt: end },
                },
                orderBy: { scheduledDate: 'asc' },
            });

            if (!workout) {
                results.skipped++;
                continue;
            }

            const user = await prisma.user.findUnique({
                where: { id: settings.userId },
                select: { email: true, emailVerified: true },
            });

            if (!user?.email || !user.emailVerified) {
                results.skipped++;
                continue;
            }

            await sendWorkoutReminderEmail(user.email, {
                name: workout.customName ?? undefined,
                workoutType: workout.workoutType,
                description: workout.description || undefined,
                targetDistance: workout.targetDistance,
                targetDuration: workout.targetDuration,
                scheduledDate: workout.scheduledDate,
                appUrl,
            });

            await prisma.reminderSettings.update({
                where: { userId: settings.userId },
                data: { lastWorkoutEmailSent: new Date() },
            });

            results.sent++;
            logger.info('Sent workout email reminder', { userId: settings.userId, workoutId: workout.id });
        } catch (error) {
            results.errors++;
            logger.error('Failed to send workout email reminder', {
                userId: settings.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    logger.info('Workout email reminders complete', { ...results });
    return results;
}
