'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    isSubscribed: boolean;
    isLoading: boolean;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
}

/**
 * Hook for managing Web Push notification subscriptions.
 * Handles permission requests, subscription creation, and server sync.
 */
export function usePushNotifications(): PushNotificationState {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check support and current state
    useEffect(() => {
        const checkSupport = async () => {
            const supported = typeof window !== 'undefined'
                && 'serviceWorker' in navigator
                && 'PushManager' in window
                && 'Notification' in window;

            setIsSupported(supported);

            if (!supported) {
                setPermission('unsupported');
                setIsLoading(false);
                return;
            }

            setPermission(Notification.permission);

            // Check if already subscribed
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                console.warn('Error checking push subscription:', error);
            }

            setIsLoading(false);
        };

        checkSupport();
    }, []);

    /**
     * Request notification permission and create a push subscription.
     */
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        setIsLoading(true);

        try {
            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setIsLoading(false);
                return false;
            }

            // Get VAPID public key from server
            const keyRes = await fetch('/api/push/subscribe');
            const { publicKey } = await keyRes.json();

            if (!publicKey) {
                console.error('No VAPID public key configured on server');
                setIsLoading(false);
                return false;
            }

            // Wait for service worker
            const registration = await navigator.serviceWorker.ready;

            // Create push subscription
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
            });

            // Send subscription to server
            const subJson = subscription.toJSON();
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                }),
            });

            if (res.ok) {
                setIsSubscribed(true);
                setIsLoading(false);
                return true;
            } else {
                console.error('Failed to save subscription on server');
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error('Push subscription error:', error);
            setIsLoading(false);
            return false;
        }
    }, [isSupported]);

    /**
     * Unsubscribe from push notifications.
     */
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Remove from server
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });

                // Unsubscribe from browser
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error('Push unsubscribe error:', error);
            setIsLoading(false);
            return false;
        }
    }, []);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    };
}

/**
 * Convert a URL-safe base64 string to a Uint8Array for applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
