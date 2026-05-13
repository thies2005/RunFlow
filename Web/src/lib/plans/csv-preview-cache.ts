const previewCache = new Map<string, { data: unknown; expiresAt: number }>();

export function storePreview(id: string, data: unknown, ttlMs = 15 * 60 * 1000): void {
    previewCache.set(id, { data, expiresAt: Date.now() + ttlMs });
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

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of previewCache) {
        if (value.expiresAt < now) previewCache.delete(key);
    }
}, 5 * 60 * 1000);
