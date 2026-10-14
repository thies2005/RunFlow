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

var AUTH_BOUND_CACHE_NAMES = ['apis', 'pages', 'next-data'];

// Paths that must never be cached by the service worker (network-only).
// Per the WHATWG Fetch Standard, request.headers.get('cookie') is always null in
// service worker fetch events (forbidden header name), so we explicitly bypass
// runtime caching for sensitive auth, admin, settings, mobile, and MCP routes.
var SENSITIVE_PATHS = [
    '/api/auth/',
    '/api/admin/',
    '/api/ai/settings',
    '/api/health/nutrition/target',
    '/api/mobile/',
    '/mcp'
];

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

    var isSensitive = SENSITIVE_PATHS.some(function (prefix) {
        return url.pathname.startsWith(prefix);
    });

    if (!isSensitive) return;

    // Sensitive / auth / admin / token endpoint: bypass runtime caching entirely (network-only).
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
