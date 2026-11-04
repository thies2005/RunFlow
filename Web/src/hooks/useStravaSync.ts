'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shouldAutoSync, type AutoSyncStatus } from '@/lib/strava/autoSync';

const POLL_MS = 2000;
const START_GRACE_MS = 20_000;
const MAX_WATCH_MS = 11 * 60_000;

// The adaptive layouts can remount while the server is still importing.
type SyncWatch = { started: number; lastSyncAt: string | null };
const watches = new Map<string, SyncWatch>();
const listeners = new Set<() => void>();
const autoStarted = new Set<string>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function setWatch(userId: string, watch?: SyncWatch) {
    if (watch) watches.set(userId, watch);
    else watches.delete(userId);
    listeners.forEach(listener => listener());
}

async function requestSync(automatic = false) {
    const response = await fetch('/api/sync', {
        method: 'POST',
        ...(automatic ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ automatic: true }),
        } : {}),
    });
    if (response.status === 409) return true; // Follow the import already running.
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.details ? `${body.error}: ${body.details}` : body.error || 'Failed to start sync');
    }
    const body = await response.json();
    return body.status !== 'skipped';
}

type DashboardSyncStatus = AutoSyncStatus & { totalActivities?: number };

export function useStravaSync(status: DashboardSyncStatus | undefined, userId: string | undefined) {
    const queryClient = useQueryClient();
    const watchForUser = useSyncExternalStore(subscribe,
        () => userId ? watches.get(userId) : undefined, () => undefined);
    const [finished, setFinished] = useState<{ userId: string | undefined; baseline: string | null; status: DashboardSyncStatus }>();
    const timestamp = status?.lastSyncAt ? new Date(status.lastSyncAt).getTime() : NaN;
    const lastSyncAt = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
    const serverRunning = status?.syncInProgress === true;
    const completion = finished && finished.userId === userId && finished.baseline === lastSyncAt ? finished.status : undefined;
    const watching = Boolean(userId && (watchForUser || (serverRunning && !completion)));

    const syncMutation = useMutation({
        mutationFn: () => requestSync(),
        onSuccess: (accepted) => {
            if (accepted && userId) {
                setFinished(undefined);
                setWatch(userId, { started: Date.now(), lastSyncAt });
            }
        },
    });

    useEffect(() => {
        if (!userId || watchForUser || autoStarted.has(userId) ||
            !shouldAutoSync({ syncInProgress: serverRunning, lastSyncAt })) return;
        autoStarted.add(userId);
        void requestSync(true).then(accepted => {
            if (accepted && !watches.has(userId)) setWatch(userId, { started: Date.now(), lastSyncAt });
        }).catch(() => { /* Manual sync still reports errors. */ });
    }, [userId, watchForUser, serverRunning, lastSyncAt]);

    useEffect(() => {
        if (!watching) return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const started = watchForUser?.started ?? Date.now();
        const baseline = watchForUser?.lastSyncAt ?? lastSyncAt;
        let sawRunning = serverRunning;
        const finish = (next?: DashboardSyncStatus) => {
            setFinished({ userId, baseline: lastSyncAt, status: next ?? { syncInProgress: false } });
            if (userId && watches.get(userId) === watchForUser) setWatch(userId);
            void queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        };
        const poll = async () => {
            if (Date.now() - started >= MAX_WATCH_MS) {
                finish();
                return;
            }
            if (document.visibilityState === 'visible') {
                try {
                    const response = await fetch('/api/sync?progress=1', { cache: 'no-store', signal: controller.signal });
                    if (response.status === 401 || response.status === 403) {
                        if (!controller.signal.aborted) finish();
                        return;
                    }
                    if (response.ok) {
                        const next: DashboardSyncStatus = await response.json();
                        if (controller.signal.aborted) return;
                        sawRunning ||= next.syncInProgress === true;
                        const advanced = Boolean(next.lastSyncAt && next.lastSyncAt !== baseline);
                        if (!next.syncInProgress && (sawRunning || advanced || Date.now() - started >= START_GRACE_MS)) {
                            finish(next);
                            return;
                        }
                    }
                } catch { /* Retry transient failures until the watch expires. */ }
            }
            if (!controller.signal.aborted) timer = setTimeout(poll, POLL_MS);
        };
        timer = setTimeout(poll, POLL_MS);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [watching, watchForUser, lastSyncAt, serverRunning, userId, queryClient]);

    return {
        syncMutation,
        syncStatus: status || watching ? {
            ...status,
            ...completion,
            syncInProgress: Boolean(watchForUser || (serverRunning && !completion)),
        } : null,
    };
}
