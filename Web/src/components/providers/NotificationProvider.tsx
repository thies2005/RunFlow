'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast, Toaster } from 'sonner';

// Polling configuration
const POLL_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 5000; // Start with 5 seconds

export function useNotifications() {
    // Hook is now a no-op since context is not needed
    // Notifications are handled via polling in the provider
    return {};
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [isMounted, setIsMounted] = useState(false);
    const retryCountRef = useRef(0);
    const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const pollNotifications = useCallback(async () => {
        if (!session?.user?.id) return;

        try {
            const res = await fetch('/api/notifications');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const notifications = await res.json();

            if (Array.isArray(notifications) && notifications.length > 0) {
                const idsToMarkRead: string[] = [];

                notifications.forEach((n: any) => {
                    toast.success(n.message, {
                        duration: 5000,
                    });
                    idsToMarkRead.push(n.id);
                });

                // Mark as read immediately after showing
                if (idsToMarkRead.length > 0) {
                    await fetch('/api/notifications', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: idsToMarkRead }),
                    });
                }
            }

            // Reset retry count on success
            retryCountRef.current = 0;
        } catch (error) {
            console.warn('Polling notifications failed', error);

            // Exponential backoff on consecutive errors
            retryCountRef.current++;

            if (retryCountRef.current <= MAX_RETRY_ATTEMPTS) {
                const backoffDelay = BASE_BACKOFF_MS * Math.pow(2, retryCountRef.current - 1);

                retryTimeoutRef.current = setTimeout(() => {
                    pollNotifications();
                }, backoffDelay);
                return; // Don't schedule regular poll
            }
        }

        // Schedule next poll only if we haven't hit max retries
        if (retryCountRef.current === 0) {
            pollTimeoutRef.current = setTimeout(pollNotifications, POLL_INTERVAL);
        }
    }, [session?.user?.id]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return;

        // Initial check
        pollNotifications();

        // Cleanup
        return () => {
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [session?.user?.id, pollNotifications]);

    return (
        <>
            {children}
            {isMounted ? <Toaster position="top-right" richColors theme="dark" /> : null}
        </>
    );
}
