'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { shouldAutoSync, type AutoSyncStatus } from '@/lib/strava/autoSync';

// Auto-sync at most once per browser page-load session, even if the hook
// mounts in multiple layouts (desktop page + mobile layout).
let autoSyncTriggered = false;

/**
 * Triggers a silent background Strava sync when the dashboard loads with a
 * stale lastSyncAt. Errors are swallowed by design — the manual Sync button
 * remains the user-facing path for feedback and reconnection prompts.
 */
export function useAutoStravaSync(syncStatus: AutoSyncStatus | undefined | null): void {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (autoSyncTriggered || !shouldAutoSync(syncStatus)) return;
        autoSyncTriggered = true;

        let cancelled = false;
        const refetchDashboard = () =>
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });

        (async () => {
            try {
                const res = await fetch('/api/sync', { method: 'POST' });
                if (!res.ok || cancelled) return;
                // Refetch immediately, then again after 2s. The POST returns
                // before the background task flips syncInProgress and bumps
                // the cache version, so the immediate refetch alone can still
                // read the pre-sync cached response and never start the 2s
                // polling. The delayed refetch closes that race.
                await refetchDashboard();
                setTimeout(() => { if (!cancelled) void refetchDashboard(); }, 2000);
            } catch {
                // Silent by design.
            }
        })();

        return () => { cancelled = true; };
    }, [syncStatus, queryClient]);
}
