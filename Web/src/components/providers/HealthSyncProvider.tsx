'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { syncDailyHealth, isHealthConnectAvailable } from '@/lib/mobile/healthConnect';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';

export function HealthSyncProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Only run on native mobile platforms
        if (!Capacitor.isNativePlatform()) return;

        let syncInterval: NodeJS.Timeout;

        const setupSync = async () => {
            const hasHealthConnect = await isHealthConnectAvailable();
            if (!hasHealthConnect) return;

            // Function to perform the sync and invalidate queries
            const performSync = async () => {
                console.log('HealthSyncProvider: Running automatic health sync...');
                try {
                    await syncDailyHealth();
                    // Invalidate queries so the UI updates
                    queryClient.invalidateQueries({ queryKey: ['daily-health'] });
                } catch (error) {
                    console.error('HealthSyncProvider: Sync failed', error);
                }
            };

            // 1. Initial sync on mount
            performSync();

            // 2. Set up periodic sync while app is open (every 15 minutes)
            syncInterval = setInterval(performSync, 15 * 60 * 1000);

            // 3. Listen for app state changes (resume from background)
            const handleAppStateChange = async (state: { isActive: boolean }) => {
                if (state.isActive) {
                    console.log('App resumed, triggering health sync...');
                    performSync();
                }
            };

            const appStateListener = App.addListener('appStateChange', handleAppStateChange);

            return () => {
                clearInterval(syncInterval);
                appStateListener.then(listener => listener.remove());
            };
        };

        const cleanupPromise = setupSync();

        return () => {
            cleanupPromise.then(cleanup => {
                if (cleanup) cleanup();
            });
        };
    }, [queryClient]);

    return <>{children}</>;
}
