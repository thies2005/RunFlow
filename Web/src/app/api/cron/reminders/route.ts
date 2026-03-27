import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPushToUser, PushPayload } from '@/lib/push';
import crypto from 'crypto';

const CRON_SECRET = process.env.CRON_SECRET || '';

function verifyCronSecret(request: NextRequest): boolean {
    if (!CRON_SECRET) return false;

    const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (headerSecret) {
        try {
            const a = Buffer.from(headerSecret);
            const b = Buffer.from(CRON_SECRET);
            return a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    const querySecret = request.nextUrl.searchParams.get('secret');
    if (querySecret) {
        try {
            const a = Buffer.from(querySecret);
            const b = Buffer.from(CRON_SECRET);
            return a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    return false;
}

/**
 * Cron endpoint to process and send due reminders.
 * Called every 5 minutes by the cron container.
 * Protected by CRON_SECRET via Authorization header (preferred) or query parameter (legacy).
 */
export async function GET(request: NextRequest) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const results = { processed: 0, sent: 0, errors: 0 };

        // Fetch all users with any reminder enabled and at least one push subscription
        const usersWithReminders = await prisma.reminderSettings.findMany({
            where: {
                OR: [
                    { supplementMorningEnabled: true },
                    { supplementNoonEnabled: true },
                    { supplementEveningEnabled: true },
                    { weightReminderEnabled: true },
                    { foodBreakfastEnabled: true },
                    { foodLunchEnabled: true },
                    { foodDinnerEnabled: true },
                    { workoutReminderEnabled: true },
                ],
                user: {
                    pushSubscriptions: { some: {} }, // Must have at least one subscription
                },
            },
        });

        for (const settings of usersWithReminders) {
            results.processed++;

            try {
                // Calculate user's local time
                const userLocalTime = getUserLocalTime(now, settings.timezone);
                const userTimeStr = formatTimeHHMM(userLocalTime);
                const todayStr = formatDateYYYYMMDD(userLocalTime);

                // --- Supplement reminders ---
                if (settings.supplementMorningEnabled) {
                    await maybeSendReminder(
                        settings, 'supplementMorning', settings.supplementMorningTime,
                        userTimeStr, todayStr, settings.lastSupplementMorningSent,
                        settings.userId,
                        {
                            title: '💊 Morning Supplements',
                            body: 'Time to take your morning supplements!',
                            tag: 'supplement-morning',
                            url: '/health',
                        },
                        results
                    );
                }

                if (settings.supplementNoonEnabled) {
                    await maybeSendReminder(
                        settings, 'supplementNoon', settings.supplementNoonTime,
                        userTimeStr, todayStr, settings.lastSupplementNoonSent,
                        settings.userId,
                        {
                            title: '💊 Noon Supplements',
                            body: 'Time to take your noon supplements!',
                            tag: 'supplement-noon',
                            url: '/health',
                        },
                        results
                    );
                }

                if (settings.supplementEveningEnabled) {
                    await maybeSendReminder(
                        settings, 'supplementEvening', settings.supplementEveningTime,
                        userTimeStr, todayStr, settings.lastSupplementEveningSent,
                        settings.userId,
                        {
                            title: '💊 Evening Supplements',
                            body: 'Time to take your evening supplements!',
                            tag: 'supplement-evening',
                            url: '/health',
                        },
                        results
                    );
                }

                // --- Weight reminder ---
                if (settings.weightReminderEnabled) {
                    await maybeSendReminder(
                        settings, 'weight', settings.weightReminderTime,
                        userTimeStr, todayStr, settings.lastWeightSent,
                        settings.userId,
                        {
                            title: '⚖️ Weigh Yourself',
                            body: 'Don\'t forget to log your weight today!',
                            tag: 'weight-reminder',
                            url: '/health',
                        },
                        results
                    );
                }

                // --- Food tracking reminders ---
                if (settings.foodBreakfastEnabled) {
                    await maybeSendReminder(
                        settings, 'foodBreakfast', settings.foodBreakfastTime,
                        userTimeStr, todayStr, settings.lastFoodBreakfastSent,
                        settings.userId,
                        {
                            title: '🍳 Log Breakfast',
                            body: 'Remember to track what you ate for breakfast!',
                            tag: 'food-breakfast',
                            url: '/health',
                        },
                        results
                    );
                }

                if (settings.foodLunchEnabled) {
                    await maybeSendReminder(
                        settings, 'foodLunch', settings.foodLunchTime,
                        userTimeStr, todayStr, settings.lastFoodLunchSent,
                        settings.userId,
                        {
                            title: '🥗 Log Lunch',
                            body: 'Remember to track what you ate for lunch!',
                            tag: 'food-lunch',
                            url: '/health',
                        },
                        results
                    );
                }

                if (settings.foodDinnerEnabled) {
                    await maybeSendReminder(
                        settings, 'foodDinner', settings.foodDinnerTime,
                        userTimeStr, todayStr, settings.lastFoodDinnerSent,
                        settings.userId,
                        {
                            title: '🍽️ Log Dinner',
                            body: 'Remember to track what you ate for dinner!',
                            tag: 'food-dinner',
                            url: '/health',
                        },
                        results
                    );
                }

                // --- Workout reminders ---
                if (settings.workoutReminderEnabled) {
                    await processWorkoutReminders(settings, now, results);
                }

            } catch (error) {
                console.error(`Error processing reminders for user ${settings.userId}:`, error);
                results.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            ...results,
        });
    } catch (error) {
        console.error('Cron reminders error:', error);
        return NextResponse.json(
            { error: 'Failed to process reminders' },
            { status: 500 }
        );
    }
}

// ============================================
// Helper functions
// ============================================

function getUserLocalTime(now: Date, timezone: string): Date {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const get = (type: string) => parts.find(p => p.type === type)?.value || '00';

        return new Date(
            parseInt(get('year')),
            parseInt(get('month')) - 1,
            parseInt(get('day')),
            parseInt(get('hour')),
            parseInt(get('minute'))
        );
    } catch {
        // Fallback to UTC if timezone is invalid
        return now;
    }
}

function formatTimeHHMM(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/** Check if a time-based reminder is due (within a 5-minute window) and hasn't been sent today */
function isReminderDue(targetTime: string, currentTime: string, lastSent: Date | null, todayStr: string): boolean {
    const [targetH, targetM] = targetTime.split(':').map(Number);
    const [currentH, currentM] = currentTime.split(':').map(Number);

    const targetMinutes = targetH * 60 + targetM;
    const currentMinutes = currentH * 60 + currentM;

    // Within a 6-minute window (cron runs every 5 min, 1 min buffer)
    const inWindow = currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 6;

    if (!inWindow) return false;

    // Check if already sent today
    if (lastSent) {
        const lastSentDate = formatDateYYYYMMDD(lastSent);
        if (lastSentDate === todayStr) return false;
    }

    return true;
}

type ReminderType = 'supplementMorning' | 'supplementNoon' | 'supplementEvening' | 'weight' | 'foodBreakfast' | 'foodLunch' | 'foodDinner';

const lastSentFieldMap: Record<ReminderType, string> = {
    supplementMorning: 'lastSupplementMorningSent',
    supplementNoon: 'lastSupplementNoonSent',
    supplementEvening: 'lastSupplementEveningSent',
    weight: 'lastWeightSent',
    foodBreakfast: 'lastFoodBreakfastSent',
    foodLunch: 'lastFoodLunchSent',
    foodDinner: 'lastFoodDinnerSent',
};

async function maybeSendReminder(
    settings: any,
    type: ReminderType,
    targetTime: string,
    currentTime: string,
    todayStr: string,
    lastSent: Date | null,
    userId: string,
    payload: PushPayload,
    results: { sent: number; errors: number }
) {
    if (!isReminderDue(targetTime, currentTime, lastSent, todayStr)) return;

    try {
        const pushResult = await sendPushToUser(userId, payload);
        if (pushResult.sent > 0) {
            results.sent++;
            // Update last sent timestamp
            await prisma.reminderSettings.update({
                where: { userId },
                data: { [lastSentFieldMap[type]]: new Date() },
            });
        }
    } catch (error) {
        console.error(`Failed to send ${type} reminder for user ${userId}:`, error);
        results.errors++;
    }
}

async function processWorkoutReminders(settings: any, now: Date, results: { sent: number; errors: number }) {
    const leadMinutes = settings.workoutReminderMinutes || 60;

    // Find workouts scheduled for today that haven't been completed,
    // and are within the lead-time window
    const windowStart = new Date(now.getTime());
    const windowEnd = new Date(now.getTime() + (leadMinutes + 5) * 60 * 1000);

    // Get today's workouts for this user's active goals
    const workouts = await prisma.workout.findMany({
        where: {
            goal: {
                userId: settings.userId,
                isActive: true,
            },
            isCompleted: false,
            scheduledDate: {
                gte: windowStart,
                lte: windowEnd,
            },
            // Only send for non-rest workouts
            workoutType: { not: 'REST' },
        },
        include: {
            goal: { select: { name: true } },
        },
    });

    for (const workout of workouts) {
        // Check if we already notified about this workout (use tag to dedupe on client)
        const payload: PushPayload = {
            title: `🏃 Upcoming: ${workout.workoutType.replace(/_/g, ' ')}`,
            body: workout.description.length > 100
                ? workout.description.substring(0, 100) + '...'
                : workout.description,
            tag: `workout-${workout.id}`,
            url: '/plan',
        };

        try {
            const pushResult = await sendPushToUser(settings.userId, payload);
            if (pushResult.sent > 0) results.sent++;
        } catch (error) {
            console.error(`Failed to send workout reminder for workout ${workout.id}:`, error);
            results.errors++;
        }
    }
}
