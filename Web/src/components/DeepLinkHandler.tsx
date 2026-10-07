'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App, URLOpenListenerEvent } from '@capacitor/app';

const APP_HOSTNAME = 'runflow.schuelken.uk';

/**
 * Top-level app routes (the page segments that exist under src/app) that a
 * custom-scheme deep link may target. Anything else — including /api/* paths,
 * protocol-relative forms and unknown segments — is ignored.
 */
const CUSTOM_SCHEME_ROUTE_ALLOWLIST = new Set([
    '', // bare "runflow:/" -> app root
    'activities',
    'activity',
    'admin',
    'analytics',
    'api-docs',
    'calendar',
    'calendar-preview',
    'chat',
    'health',
    'impressum',
    'login',
    'onboarding',
    'plan',
    'plan-advanced',
    'plan-generator',
    'privacy',
    'register',
    'support',
    'terms',
    '~offline',
]);

/**
 * A path we are willing to hand to router.push()/window.location must be
 * root-relative ("/…"), never protocol-relative ("//host/…") or a
 * backslash form ("/\host") — those resolve to a foreign origin.
 */
function isSafeAppRelativePath(path: string): boolean {
    return (
        path.startsWith('/') &&
        !path.startsWith('//') &&
        !path.includes('\\')
    );
}

/**
 * Validate a runflow:/runflow2: URI and return the safe in-app path it maps
 * to, or null when the link must be ignored.
 *
 * Threat (p4: runflow-scheme-hostname-bypass): the scheme used to bypass the
 * https hostname check entirely, so "runflow:////evil.com/phish" (empty
 * authority + protocol-relative pathname) made router.push resolve a full
 * external navigation inside the chromeless wrapper WebView, and
 * "runflow://evil.com/api/…" forced window.location to an arbitrary
 * same-origin API path. A custom-scheme link may now only carry a plain
 * relative app path with NO authority, no "@", no backslash, no
 * scheme-relative form, and a top-level segment from the page allowlist.
 */
export function customSchemeDeepLinkPath(url: URL): string | null {
    // Any authority (host or userinfo) disqualifies the link outright.
    if (url.host !== '' || url.username !== '' || url.password !== '') {
        return null;
    }
    const path = url.pathname + url.search;
    if (!isSafeAppRelativePath(path)) {
        return null;
    }
    // Userinfo/scheme-confusion payloads smuggled anywhere in the target.
    if (path.includes('@')) {
        return null;
    }
    const topSegment = url.pathname.replace(/^\/+/, '').split('/')[0] ?? '';
    if (!CUSTOM_SCHEME_ROUTE_ALLOWLIST.has(topSegment)) {
        return null;
    }
    return path;
}

/** Resolve any appUrlOpen URL to a safe in-app path, or null to ignore it. */
export function resolveDeepLink(rawUrl: string): string | null {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return null;
    }

    if (url.protocol === 'https:') {
        // Exact-hostname match only (a suffix host like
        // runflow.schuelken.uk.evil.com must not pass).
        if (url.hostname !== APP_HOSTNAME) {
            return null;
        }
        const path = url.pathname + url.search;
        // Same root-relative sanity as the scheme branch: an https app link
        // with a protocol-relative-looking path ("...uk//evil.com/x") must
        // not become an external navigation either.
        if (!isSafeAppRelativePath(path)) {
            return null;
        }
        return path;
    }

    if (url.protocol === 'runflow:' || url.protocol === 'runflow2:') {
        return customSchemeDeepLinkPath(url);
    }

    // Every other scheme is untrusted: ignore.
    return null;
}

export default function DeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const handleDeepLink = (event: URLOpenListenerEvent) => {
            const path = resolveDeepLink(event.url);
            if (path === null) {
                return;
            }

            // For API routes (like Auth Callbacks), we MUST force a hard navigation
            // so the browser makes a proper request and handles Set-Cookie headers.
            // Client-side router.push() usually fails for API routes.
            // (Reachable only via the exact-hostname https branch — the custom
            // scheme allowlist contains no /api/ segments.)
            if (path.startsWith('/api/')) {
                window.location.href = path;
            } else {
                router.push(path);
            }
        };

        const listener = App.addListener('appUrlOpen', handleDeepLink);

        return () => {
            listener.then(handle => handle.remove());
        };
    }, [router]);

    return null;
}
