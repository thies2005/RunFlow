import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { syncLocalNotifications, clearAllLocalNotifications } from '@/lib/mobile/notifications';

// Mirrors the PushNotificationState interface so the UI components don't know the difference
export interface MobileNotificationState {
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    isLoading: boolean;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

export function useMobileNotifications(): MobileNotificationState {
    const isSupported = Capacitor.isNativePlatform();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isSupported) {
            setIsLoading(false);
            return;
        }

        const checkStatus = async () => {
            try {
                // Check permissions
                const permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display === 'granted') {
                    setPermission('granted');
                } else if (permStatus.display === 'denied') {
                    setPermission('denied');
                } else {
                    setPermission('default');
                }

                // Make absolutely sure we check if *any* notifications are scheduled
                // We use this to determine the pseudo-state "isSubscribed"
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.length > 0) {
                    setIsSubscribed(true);
                } else {
                    // Check if they have notifications enabled on the server but not scheduled yet
                    const response = await fetch('/api/reminders/settings');
                    if (response.ok) {
                        const settings = await response.json();
                        // If they have any enabled, assume they are subscribed and re-sync
                        const hasAnyEnabled = [
                            settings.supplementMorningEnabled,
                            settings.supplementNoonEnabled,
                            settings.supplementEveningEnabled,
                            settings.weightReminderEnabled,
                            settings.foodBreakfastEnabled,
                            settings.foodLunchEnabled,
                            settings.foodDinnerEnabled,
                            settings.workoutReminderEnabled
                        ].some(Boolean);

                        setIsSubscribed(hasAnyEnabled);

                        if (hasAnyEnabled && permStatus.display === 'granted') {
                            await syncLocalNotifications(settings);
                        }
                    } else {
                        setIsSubscribed(false);
                    }
                }
            } catch (err) {
                console.error('Failed to init mobile notifications', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus();
    }, [isSupported]);

    const subscribe = async () => {
        if (!isSupported) return;
        setIsLoading(true);

        try {
            // Request display permissions natively
            const status = await LocalNotifications.requestPermissions();
            setPermission(status.display as NotificationPermission);

            if (status.display === 'granted') {
                const response = await fetch('/api/reminders/settings');
                if (response.ok) {
                    const settings = await response.json();
                    await syncLocalNotifications(settings);
                    setIsSubscribed(true);
                }
            } else {
                throw new Error('Permission denied by user.');
            }
        } catch (error) {
            console.error('Error subscribing to mobile notifications', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribe = async () => {
        if (!isSupported) return;
        setIsLoading(true);

        try {
            await clearAllLocalNotifications();
            setIsSubscribed(false);
        } catch (error) {
            console.error('Error unsubscribing from mobile notifications', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    };
}
