import { resolveHostAddresses } from '@/lib/net/dnsResolve';

const WELL_KNOWN_BASE_URLS = [
    'https://api.openai.com/v1',
    'https://api.anthropic.com',
    'https://generativelanguage.googleapis.com',
    'https://openrouter.ai/api/v1',
    'https://integrate.api.nvidia.com/v1',
    'https://open.bigmodel.cn/api/paas/v4',
];

const DEFAULT_ALLOWED_BASE_URLS = WELL_KNOWN_BASE_URLS;

function getAllowedHostnames(allowedUrls: readonly string[]): Set<string> {
    const hostnames = new Set<string>();
    for (const urlStr of allowedUrls) {
        try {
            const parsed = new URL(urlStr);
            hostnames.add(parsed.hostname.toLowerCase());
        } catch { /* skip invalid URLs */ }
    }
    return hostnames;
}

function isHostnameAllowed(hostname: string, allowedHostnames: Set<string>): boolean {
    const lower = hostname.toLowerCase();
    if (allowedHostnames.has(lower)) return true;
    const parts = lower.split('.');
    for (let i = 1; i < parts.length; i++) {
        if (allowedHostnames.has(parts.slice(i).join('.'))) return true;
    }
    return false;
}

function isPrivateIP(hostname: string): boolean {
    const privatePatterns = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^::1$/,
        /^localhost$/,
        /^0\.0\.0\.0$/,
        /^::$/,
        /^fc00:/i,
        /^fe80:/i,
        /^169\.254\./,       // Link-local / AWS metadata service
        /^100\.64\./,        // Shared Address Space (RFC 6598)
        /^198\.51\.100\./,   // TEST-NET-2
        /^203\.0\.113\./,    // TEST-NET-3
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
}

export function validateUrl(url: string, allowedUrls: readonly string[] = DEFAULT_ALLOWED_BASE_URLS): boolean {
    try {
        const parsed = new URL(url);

        if (parsed.protocol !== 'https:') {
            return false;
        }

        if (isPrivateIP(parsed.hostname)) {
            return false;
        }

        if (parsed.hostname === '0.0.0.0' || parsed.hostname === '[::]' || parsed.hostname === 'localhost') {
            return false;
        }

        if (!parsed.hostname.includes('.')) {
            return false;
        }

        const allowedHostnames = getAllowedHostnames(allowedUrls);
        if (!isHostnameAllowed(parsed.hostname, allowedHostnames)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * SSRF DNS-resolution guard.
 *
 * validateUrl/validateBaseUrl only inspect the hostname STRING: a
 * caller-controlled DNS name (an attacker's A record, or a multi-label
 * internal-only name such as metadata.google.internal) passes those checks,
 * and the raw fetch would then connect to whatever the name resolves to.
 * assertResolvesToPublicHost() closes that gap by resolving the hostname the
 * same way the subsequent fetch will (getaddrinfo) and refusing
 * private / loopback / link-local / reserved targets for IPv4 and IPv6
 * BEFORE any connection is made.
 */
function isPrivateResolvedAddress(address: string): boolean {
    const ip = address.trim().toLowerCase().replace(/^\[|\]$/g, '');

    if (!ip.includes(':')) {
        // IPv4
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
            return true; // unparseable -> fail closed
        }
        const [a, b, c] = parts;
        if (a === 0 || a === 10 || a === 127) return true;                 // this-network, private, loopback
        if (a === 169 && b === 254) return true;                           // link-local (incl. cloud metadata 169.254.169.254)
        if (a === 172 && b >= 16 && b <= 31) return true;                  // private
        if (a === 192 && b === 168) return true;                           // private
        if (a === 100 && b >= 64 && b <= 127) return true;                 // CGNAT shared range (RFC 6598)
        if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;     // protocol assignments / TEST-NET-1
        if (a === 198 && (b === 18 || b === 19)) return true;              // benchmarking (RFC 2544)
        if (a === 198 && b === 51 && c === 100) return true;               // TEST-NET-2
        if (a === 203 && b === 0 && c === 113) return true;                // TEST-NET-3
        if (a >= 224) return true;                                         // multicast / reserved / limited broadcast
        return false;
    }

    // IPv6 (scope/zone ids stripped)
    const v6 = ip.split('%')[0];
    if (v6 === '::' || v6 === '::1') return true;                          // unspecified / loopback
    if (v6.startsWith('::ffff:')) {
        // IPv4-mapped address, dotted or hex form
        const rest = v6.slice('::ffff:'.length);
        if (rest.includes('.')) return isPrivateResolvedAddress(rest);
        const hex = rest.replace(/:/g, '');
        if (hex.length === 8 && /^[0-9a-f]+$/.test(hex)) {
            const bytes = hex.match(/.{2}/g)!.map((h) => parseInt(h, 16));
            return isPrivateResolvedAddress(bytes.join('.'));
        }
        return true; // unparseable mapped form -> fail closed
    }
    if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true;                        // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/.test(v6)) return true;                        // link-local fe80::/10
    if (/^ff[0-9a-f]{2}:/.test(v6)) return true;                           // multicast ff00::/8
    if (/^2001:db8:/.test(v6)) return true;                                // documentation 2001:db8::/32
    if (/^64:ff9b:/.test(v6)) return true;                                 // NAT64 well-known prefix (embeds IPv4 space)
    if (/^100::/.test(v6)) return true;                                    // discard-only 100::/64
    return false;
}

async function assertResolvesToPublicHost(hostname: string): Promise<void> {
    let addresses: string[];
    try {
        addresses = await resolveHostAddresses(hostname);
    } catch {
        throw new Error(`SSRF Protection: DNS resolution failed for host: ${hostname}`);
    }
    if (addresses.length === 0) {
        throw new Error(`SSRF Protection: host did not resolve to any address: ${hostname}`);
    }
    for (const address of addresses) {
        if (isPrivateResolvedAddress(address)) {
            throw new Error(
                `SSRF Protection: Blocked request to host resolving to a private/reserved address: ${hostname} (${address})`
            );
        }
    }
}

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit & { allowedUrls?: string[] }): Promise<Response> {
    const initialUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const allowedList = init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS;
    const MAX_REDIRECT_HOPS = 3;

    let currentUrl = initialUrl;
    let currentInit: RequestInit = { ...init, redirect: 'manual' };
    const initialOrigin = new URL(initialUrl).origin;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
        const parsedCurrent = new URL(currentUrl);
        await assertResolvesToPublicHost(parsedCurrent.hostname);

        if (!validateUrl(currentUrl, allowedList)) {
            throw new Error(`SSRF Protection: Blocked request to disallowed URL: ${currentUrl}`);
        }

        const response = await fetch(hop === 0 ? input : currentUrl, currentInit);

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            response.body?.cancel();
            if (!location) {
                return response;
            }
            if (hop === MAX_REDIRECT_HOPS) {
                throw new Error('SSRF Protection: Too many redirects from AI provider endpoint');
            }
            const nextUrl = new URL(location, currentUrl).toString();
            if (!validateUrl(nextUrl, allowedList)) {
                throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${nextUrl}`);
            }
            await assertResolvesToPublicHost(new URL(nextUrl).hostname);

            if (new URL(nextUrl).origin !== initialOrigin && currentInit.headers) {
                const sanitizedHeaders = new Headers(currentInit.headers);
                sanitizedHeaders.delete('authorization');
                sanitizedHeaders.delete('x-api-key');
                currentInit = { ...currentInit, headers: sanitizedHeaders };
            }
            if (response.status === 301 || response.status === 302 || response.status === 303) {
                currentInit = { ...currentInit, method: 'GET', body: undefined };
            }
            currentUrl = nextUrl;
            continue;
        }

        const finalUrl = response.url;
        if (finalUrl && finalUrl !== currentUrl) {
            if (!validateUrl(finalUrl, allowedList)) {
                response.body?.cancel();
                throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${finalUrl}`);
            }
            await assertResolvesToPublicHost(new URL(finalUrl).hostname);
        }

        return response;
    }

    throw new Error('SSRF Protection: Redirect limit exceeded');
}

export function validateBaseUrl(baseUrl: string, extraAllowedUrls: string[] = []): boolean {
    try {
        const url = new URL(baseUrl);

        if (url.protocol !== 'https:') {
            return false;
        }

        if (isPrivateIP(url.hostname)) {
            return false;
        }

        if (url.hostname === '0.0.0.0' || url.hostname === '[::]' || url.hostname === 'localhost' || !url.hostname.includes('.')) {
            return false;
        }

        const allAllowed = [...WELL_KNOWN_BASE_URLS, ...extraAllowedUrls];
        const allowedHostnames = getAllowedHostnames(allAllowed);
        if (!isHostnameAllowed(url.hostname, allowedHostnames)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}
