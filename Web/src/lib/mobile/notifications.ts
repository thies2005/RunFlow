import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';

// Use the local ReminderSettings type instead of Prisma direct import which might be outdated locally
export interface ReminderSettings {
    supplementMorningEnabled: boolean;
    supplementMorningTime: string;
    supplementNoonEnabled: boolean;
    supplementNoonTime: string;
    supplementEveningEnabled: boolean;
    supplementEveningTime: string;
    weightReminderEnabled: boolean;
    weightReminderTime: string;
    foodBreakfastEnabled: boolean;
    foodBreakfastTime: string;
    foodLunchEnabled: boolean;
    foodLunchTime: string;
    foodDinnerEnabled: boolean;
    foodDinnerTime: string;
    workoutReminderEnabled: boolean;
    workoutReminderMinutes: number;
}

// Simple hash map of notification IDs to identify what type of reminder fired
export const NOTIFICATION_IDS = {
    SUPPLEMENT_MORNING: 1001,
    SUPPLEMENT_NOON: 1002,
    SUPPLEMENT_EVENING: 1003,
    WEIGHT: 2001,
    FOOD_BREAKFAST: 3001,
    FOOD_LUNCH: 3002,
    FOOD_DINNER: 3003,
    WORKOUT: 4001,
};

/**
 * Parses a "HH:MM" string and returns hours and minutes
 */
function parseTime(timeStr: string): { hour: number; minute: number } {
    const [h, m] = timeStr.split(':').map(Number);
    return { hour: h || 0, minute: m || 0 };
}

/**
 * Helper to build a daily repeating notification item
 */
function createDailyNotification(id: number, title: string, body: string, timeStr: string, autoCancel = true): LocalNotificationSchema {
    const time = parseTime(timeStr);

    return {
        id,
        title,
        body,
        schedule: {
            on: {
                hour: time.hour,
                minute: time.minute,
            },
            repeats: true,
            allowWhileIdle: true, // Ensure it fires even if phone is dozing
        },
        autoCancel,
        smallIcon: 'ic_stat_runflow', // Uses the default push icon built into Android resource res/drawable
    };
}

/**
 * Cancels all currently scheduled local notifications.
 */
export async function clearAllLocalNotifications() {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
    }
}

/**
 * Syncs Native Local Notifications to match the ReminderSettings from the Server.
 * Note: Workout reminders are dynamic based on the calendar plan, so we can't schedule them
 * natively purely off ReminderSettings. The Native App handles Workout remotely or
 * we would have to pull the user's plan and schedule them individually at exact timestamps.
 * For now, we sync the static daily recurring ones (Supplements, Weight, Food).
 */
export async function syncLocalNotifications(settings: ReminderSettings | null) {
    if (!settings) {
        await clearAllLocalNotifications();
        return;
    }

    // Cancel anything old before we set the new ones
    await clearAllLocalNotifications();

    const notificationsToSchedule: LocalNotificationSchema[] = [];

    // --- Supplements ---
    if (settings.supplementMorningEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.SUPPLEMENT_MORNING,
                'Morning Supplements',
                "Time for your morning stack! 💊",
                settings.supplementMorningTime
            )
        );
    }
    if (settings.supplementNoonEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.SUPPLEMENT_NOON,
                'Midday Supplements',
                "Time for your afternoon stack! 💊",
                settings.supplementNoonTime
            )
        );
    }
    if (settings.supplementEveningEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.SUPPLEMENT_EVENING,
                'Evening Supplements',
                "Don't forget your evening stack! 💊",
                settings.supplementEveningTime
            )
        );
    }

    // --- Weight ---
    if (settings.weightReminderEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.WEIGHT,
                'Weigh-in Reminder',
                "Time to log your daily weight! ⚖️",
                settings.weightReminderTime
            )
        );
    }

    // --- Food ---
    if (settings.foodBreakfastEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.FOOD_BREAKFAST,
                'Breakfast Tracking',
                "Log your morning meal! 🍳",
                settings.foodBreakfastTime
            )
        );
    }
    if (settings.foodLunchEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.FOOD_LUNCH,
                'Lunch Tracking',
                "Log your afternoon meal! 🥪",
                settings.foodLunchTime
            )
        );
    }
    if (settings.foodDinnerEnabled) {
        notificationsToSchedule.push(
            createDailyNotification(
                NOTIFICATION_IDS.FOOD_DINNER,
                'Dinner Tracking',
                "Log your evening meal! 🍽️",
                settings.foodDinnerTime
            )
        );
    }

    // Note: Workout reminders are complex to schedule locally because they
    // change constantly based on the user's training plan. They are best left to
    // the backend cron server, but for now we sync the static ones.

    if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
            notifications: notificationsToSchedule,
        });
    }
}
