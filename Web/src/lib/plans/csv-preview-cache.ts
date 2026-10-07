const previewCache = new Map<string, { userId: string | null; data: unknown; expiresAt: number }>();

/**
 * Per-user cap on live previews retained in this process-global Map (p3:
 * uncapped-upload-parse-preview-retention). Without it, repeated uploads
 * keep full parsed-workout arrays strongly referenced for the 15-minute TTL
 * with no bound, so the shared app process can be memory-exhausted. Five
 * live previews per user (each already capped at 500 workouts upstream) is
 * far beyond any real retry/confirm flow.
 */
const MAX_PREVIEWS_PER_USER = 5;

function pruneExpired(): void {
    const now = Date.now();
    for (const [key, value] of previewCache) {
        if (value.expiresAt < now) previewCache.delete(key);
    }
}

export function storePreview(id: string, userId: string | null, data: unknown, ttlMs = 15 * 60 * 1000): void {
    pruneExpired();
    previewCache.set(id, { userId, data, expiresAt: Date.now() + ttlMs });

    if (userId === null) return;

    // Map preserves insertion order, so the oldest entries of this user come
    // first; evict beyond the per-user cap.
    const userEntryIds = [...previewCache.entries()]
        .filter(([, value]) => value.userId === userId)
        .map(([key]) => key);
    while (userEntryIds.length > MAX_PREVIEWS_PER_USER) {
        previewCache.delete(userEntryIds.shift() as string);
    }
}

export function getPreview<T = unknown>(id: string): T | null {
    const entry = previewCache.get(id);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        previewCache.delete(id);
        return null;
    }
    return entry.data as T;
}

export function deletePreview(id: string): void {
    previewCache.delete(id);
}

const sweeper = setInterval(() => {
    pruneExpired();
}, 5 * 60 * 1000);
// Never hold the event loop open on its own (tests, scripts, graceful
// shutdown); the interval still runs while the server process lives.
if (typeof sweeper === 'object' && typeof sweeper.unref === 'function') {
    sweeper.unref();
}
