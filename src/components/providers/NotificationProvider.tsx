'use client';

import { createContext, useContext, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast, Toaster } from 'sonner';

const NotificationContext = createContext({});

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    useEffect(() => {
        if (!session?.user?.id) return;

        const pollNotifications = async () => {
            try {
                const res = await fetch('/api/notifications');
                if (!res.ok) return;
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
            } catch (error) {
                console.error('Polling notifications failed', error);
            }
        };

        // Initial check
        pollNotifications();

        // Poll every 30 seconds
        const interval = setInterval(pollNotifications, 30000);

        return () => clearInterval(interval);
    }, [session?.user?.id]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
            <Toaster position="top-right" richColors theme="dark" />
        </NotificationContext.Provider>
    );
}
