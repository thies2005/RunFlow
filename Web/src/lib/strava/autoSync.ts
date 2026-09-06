/** Minimum age of the last sync before we auto-sync when the dashboard opens. */
export const AUTO_SYNC_THRESHOLD_MS = 15 * 60 * 1000;

export interface AutoSyncStatus {
    syncInProgress?: boolean;
    lastSyncAt?: string | Date | null;
}

/**
 * Decides whether a Strava auto-sync should be triggered for this dashboard
 * load. False when the user has never synced (Strava likely not connected),
 * when a sync is already running, or when the last sync is recent enough.
 */
export function shouldAutoSync(
    status: AutoSyncStatus | undefined | null,
    now: number = Date.now()
): boolean {
    if (!status || status.syncInProgress) return false;
    if (!status.lastSyncAt) return false;
    const last = new Date(status.lastSyncAt).getTime();
    if (Number.isNaN(last)) return false;
    return now - last >= AUTO_SYNC_THRESHOLD_MS;
}
