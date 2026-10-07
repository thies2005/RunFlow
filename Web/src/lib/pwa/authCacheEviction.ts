/**
 * Client-side eviction of auth-bound service-worker runtime caches.
 *
 * The PWA service worker (generated from the runtimeCaching entries in
 * next.config.mjs) persists same-origin GET /api/** responses in the Cache
 * Storage bucket named 'apis' (NetworkFirst with an offline fallback). Those
 * responses are cookie-authenticated per-user data keyed by URL only, so the
 * bucket must never survive a sign-out or account switch: without eviction,
 * user A's dashboard/activities/plan payloads can be replayed into user B's
 * session through the offline fallback path.
 *
 * Call this from every signOut() call site (logout AND account switches)
 * BEFORE the sign-out navigation begins.
 */

/**
 * Cache Storage buckets that can hold personalized (auth-bound) content.
 * Must stay in sync with the runtimeCaching cacheName entries in
 * next.config.mjs (only 'apis' is auth-bound today; static asset caches are
 * account-independent).
 */
export const AUTH_BOUND_RUNTIME_CACHES = ['apis'];

/** Message type understood by the sw-auth-guard.js service-worker script. */
export const EVICT_AUTH_CACHES_MESSAGE = 'RUNFLOW_EVICT_AUTH_CACHES';

export async function evictAuthBoundCaches(): Promise<void> {
    if (typeof window === 'undefined' || typeof caches === 'undefined') {
        return;
    }
    try {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => AUTH_BOUND_RUNTIME_CACHES.includes(key))
                .map((key) => caches.delete(key))
        );
        // Belt and braces: ask the controlling service worker to evict from
        // its own context too (covers browsers where the document lost
        // controller state mid-logout). Handled by Web/public/sw-auth-guard.js.
        navigator.serviceWorker?.controller?.postMessage({
            type: EVICT_AUTH_CACHES_MESSAGE,
        });
    } catch {
        // Best effort: cache eviction must never block sign-out.
    }
}
