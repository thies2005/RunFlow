/**
 * Auth-bound cache guard for the RunFlow service worker.
 *
 * Imported by the generated sw.js via the importScripts list in
 * next.config.mjs (workboxOptions.importScripts), so this executes BEFORE
 * any workbox route is registered and its listeners run first.
 *
 * Closes the cross-account replay issue for the 'apis' runtime cache
 * (NetworkFirst on same-origin GET /api/**, keyed by URL only):
 *
 *  1. RUNFLOW_EVICT_AUTH_CACHES message -> delete the 'apis' bucket. Sent by
 *     evictAuthBoundCaches() (src/lib/pwa/authCacheEviction.ts) from every
 *     signOut() call site, covering logout AND account switches.
 *
 *  2. Defense in depth for the post-logout window: a same-origin GET /api/
 *     request that carries no NextAuth session cookie never touches the
 *     runtime cache at all (network-only). A cached authenticated response
 *     therefore cannot be served to an unauthenticated browser even if the
 *     eviction message was missed (e.g. a crash between sign-out and the
 *     delete, or an old page still open during a sign-out in another tab).
 *     This listener claims such requests before the workbox router's fetch
 *     listener (registration order: importScripts run first) via
 *     stopImmediatePropagation(), so the NetworkFirst('apis') strategy never
 *     serves or stores them.
 */

/* eslint-disable no-restricted-globals */

var AUTH_BOUND_CACHE_NAMES = ['apis'];

// NextAuth session cookie names (this app uses the next-auth.* prefix;
// the authjs.* prefix is accepted for robustness) for dev and production.
var SESSION_COOKIE_RE = /(^|;\s*)(__Secure-)?(next-auth|authjs)\.session-token=/;

self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'RUNFLOW_EVICT_AUTH_CACHES') {
        event.waitUntil(
            Promise.all(
                AUTH_BOUND_CACHE_NAMES.map(function (name) {
                    return caches.delete(name);
                })
            )
        );
    }
});

self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET') return;

    var url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return;
    }
    if (url.origin !== self.origin) return;
    if (!url.pathname.startsWith('/api/')) return;

    var cookieHeader = request.headers.get('cookie') || '';
    if (SESSION_COOKIE_RE.test(cookieHeader)) return; // authenticated: workbox route applies (eviction handles account switches)

    // Unauthenticated API request: bypass the runtime cache entirely.
    event.stopImmediatePropagation();
    event.respondWith(
        fetch(request).catch(function () {
            return new Response(JSON.stringify({ error: 'Offline' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        })
    );
});
