import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const REFRESH_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
export const AUTH_CODE_TTL_SECONDS = 10 * 60; // 10 minutes

/**
 * Hash a sensitive token (code, access token, refresh token) using SHA-256
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify an OAuth client secret against the stored SHA-256 hash (RFC 7591/6749
 * confidential clients), using a timing-safe comparison.
 */
export function verifyClientSecret(clientSecret: string, storedHash: string): boolean {
    if (!clientSecret || !storedHash) return false;
    const providedHash = Buffer.from(hashToken(clientSecret), 'hex');
    const expectedHash = Buffer.from(storedHash, 'hex');
    if (providedHash.length === 0 || providedHash.length !== expectedHash.length) return false;
    return timingSafeEqual(providedHash, expectedHash);
}

/**
 * Verify PKCE S256 code_verifier against code_challenge using timing-safe comparison (RFC 7636)
 */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
    if (!codeVerifier || !codeChallenge) return false;
    if (typeof codeVerifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
        return false;
    }
    const computedChallenge = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
    const compBuf = Buffer.from(computedChallenge);
    const recBuf = Buffer.from(codeChallenge);
    if (compBuf.length !== recBuf.length) return false;
    return timingSafeEqual(compBuf, recBuf);
}

/**
 * Determines the public canonical origin of an incoming request taking reverse-proxy headers into account
 */
export function getPublicOrigin(request: Request): string {
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('0.0.0.0')) {
        try { return new URL(process.env.NEXTAUTH_URL).origin; } catch {}
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('0.0.0.0')) {
        try { return new URL(process.env.NEXT_PUBLIC_APP_URL).origin; } catch {}
    }
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim();
    if (host) {
        const proto = forwardedProto || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
        return `${proto}://${host}`;
    }
    return new URL(request.url).origin;
}

/**
 * Universal Redirect URI Validator for MCP OAuth 2.1 (RFC 6749 / RFC 7591 / RFC 8252).
 * Parses with `new URL(uri)`:
 * - Rejects any URI with username, password, or URL fragment (#)
 * - Rejects path traversal (.. or %2e%2e)
 * - Rejects dangerous schemes (javascript:, data:, vbscript:, file:, blob:, about:, ws:, wss:)
 * - If http:: ONLY allows loopback (localhost, 127.0.0.1, [::1]) per RFC 8252 §7.3
 * - If https:: allows any public hostname containing a dot (no embedded credentials)
 * - Allows any valid RFC 8252 custom app URI scheme
 *   (cursor:, vscode:, claude:, windsurf:, raycast:, perplexity:, chatgpt:, zed:, etc.)
 */
const BLOCKED_REDIRECT_SCHEMES = new Set([
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'blob:',
    'about:',
    'ws:',
    'wss:',
]);

export function isAllowedMcpRedirectUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') return false;
    // Reject path traversal attempts in raw URI
    if (uri.includes('..') || uri.toLowerCase().includes('%2e%2e')) {
        return false;
    }
    try {
        const parsed = new URL(uri);
        // Reject userinfo or fragments
        if (parsed.username || parsed.password || parsed.hash) {
            return false;
        }
        // Reject path traversal attacks
        if (parsed.pathname.includes('..') || decodeURIComponent(parsed.pathname).includes('..')) {
            return false;
        }

        const protocol = parsed.protocol.toLowerCase();

        if (BLOCKED_REDIRECT_SCHEMES.has(protocol)) {
            return false;
        }

        if (protocol === 'http:') {
            const host = parsed.hostname.toLowerCase();
            return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
        }

        if (protocol === 'https:') {
            // Universal policy: any valid HTTPS callback host (dot-required to keep
            // bare-IP/odd registrable hosts out); credentials & fragments rejected above.
            // This is what lets arbitrary remote MCP clients (their own callback
            // hosts) complete dynamic client registration.
            return Boolean(parsed.hostname && parsed.hostname.includes('.'));
        }

        // RFC 8252 custom app URI scheme (e.g. cursor:, vscode:, claude:, windsurf:, raycast:)
        // — the blocked dangerous schemes were rejected above.
        return /^[a-z][a-z0-9+.-]*:$/i.test(protocol);
    } catch {
        return false;
    }
}

export const isValidRedirectUri = isAllowedMcpRedirectUri;

/**
 * Resolves the provider or domain group for an MCP OAuth redirect URI
 */
export function getUriProvider(uri: string): string | null {
    try {
        const parsed = new URL(uri);
        const protocol = parsed.protocol;
        const host = parsed.hostname.toLowerCase();

        const ALLOWED_NATIVE_SCHEMES = ['cursor:', 'vscode:', 'claude:', 'windsurf:'];
        if (ALLOWED_NATIVE_SCHEMES.includes(protocol)) {
            return protocol.replace(':', '');
        }

        if (protocol === 'http:' && (host === '127.0.0.1' || host === 'localhost' || host === '[::1]')) {
            return 'loopback';
        }

        if (protocol === 'https:') {
            if (
                host === 'claude.ai' ||
                host.endsWith('.claude.ai') ||
                host === 'anthropic.com' ||
                host.endsWith('.anthropic.com')
            ) {
                return 'anthropic';
            }
            if (
                host === 'google.com' ||
                host.endsWith('.google.com') ||
                host === 'googleusercontent.com' ||
                host.endsWith('.googleusercontent.com') ||
                host === 'gstatic.com' ||
                host.endsWith('.gstatic.com')
            ) {
                return 'google';
            }
            if (
                host === 'chatgpt.com' ||
                host.endsWith('.chatgpt.com') ||
                host === 'openai.com' ||
                host.endsWith('.openai.com')
            ) {
                return 'openai';
            }

            const extraHostsEnv = process.env.MCP_ALLOWED_REDIRECT_HOSTS;
            if (extraHostsEnv) {
                const extraHosts = extraHostsEnv
                    .split(',')
                    .map((h) => h.trim().toLowerCase())
                    .filter(Boolean);
                for (const h of extraHosts) {
                    if (host === h || host.endsWith('.' + h)) {
                        return h;
                    }
                }
            }
        }
    } catch {}
    return null;
}

/**
 * Checks if two redirect URIs share the same provider, loopback group, or registered base domain
 */
export function isSameProviderOrLoopback(uriA: string, uriB: string): boolean {
    const provA = getUriProvider(uriA);
    const provB = getUriProvider(uriB);
    return provA !== null && provA === provB;
}

/**
 * Generates an HMAC-SHA256 bound consent CSRF token for the OAuth 2.1 authorization step.
 */
function getConsentCsrfSecret(): string {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: NEXTAUTH_SECRET or AUTH_SECRET must be set in production for MCP OAuth consent CSRF signing.');
        }
        return 'runflow-mcp-consent-dev-secret';
    }
    return secret;
}

function buildConsentCsrfPayload(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    expiresAtMs: number;
}): string {
    return JSON.stringify([
        params.userId,
        params.clientId,
        params.redirectUri,
        params.codeChallenge,
        params.state,
        params.expiresAtMs,
    ]);
}

export function createConsentCsrfToken(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    expiresAtMs?: number;
}): string {
    const secret = getConsentCsrfSecret();
    const expiresAtMs = params.expiresAtMs ?? (Date.now() + 10 * 60 * 1000); // 10 minutes default
    const payload = buildConsentCsrfPayload({ ...params, expiresAtMs });
    const hmac = createHmac('sha256', secret).update(payload).digest('hex');
    return `${expiresAtMs}.${hmac}`;
}

/**
 * Verifies the HMAC-SHA256 bound consent CSRF token using timingSafeEqual.
 */
export function verifyConsentCsrfToken(
    token: string | null | undefined,
    params: {
        userId: string;
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        state: string;
    }
): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [expiresAtMsStr, hmacHex] = parts;
    const expiresAtMs = parseInt(expiresAtMsStr, 10);
    if (isNaN(expiresAtMs) || Date.now() > expiresAtMs) return false;

    const secret = getConsentCsrfSecret();
    const payload = buildConsentCsrfPayload({ ...params, expiresAtMs });
    const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');

    const hmacBuf = Buffer.from(hmacHex, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');
    if (hmacBuf.length !== expBuf.length || hmacBuf.length === 0) return false;
    return timingSafeEqual(hmacBuf, expBuf);
}

/**
 * Check whether a user has active Paid Premium status (Tier 2/3 or Admin)
 */
export function isUserPaidPremium(user: {
    isAdmin?: boolean | null;
    aiSettings?: { usageTier?: string | null } | null;
} | null | undefined): boolean {
    if (!user) return false;
    if (user.isAdmin === true) return true;
    const tier = user.aiSettings?.usageTier;
    return tier === 'tier2' || tier === 'tier3';
}

/**
 * Generate cryptographically secure tokens with standard prefixes
 */
export function generateMcpAccessToken(): string {
    return `rf_mcp_${randomBytes(32).toString('hex')}`;
}

export function generateMcpRefreshToken(): string {
    return `rf_mcpr_${randomBytes(32).toString('hex')}`;
}

export function generateMcpAuthCode(): string {
    return `rf_code_${randomBytes(24).toString('hex')}`;
}

/**
 * Validates an MCP OAuth 2.1 access token (rf_mcp_...)
 */
export async function validateMcpOAuthToken(token: string | null | undefined): Promise<{
    valid: boolean;
    userId: string;
    user: any;
    isPaidPremium: boolean;
    clientId: string;
} | null> {
    if (!token || !token.startsWith('rf_mcp_')) {
        return null;
    }

    const accessTokenHash = hashToken(token);

    const tokenRecord = await prisma.mcpOAuthToken.findUnique({
        where: { accessTokenHash },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isAdmin: true,
                    aiSettings: {
                        select: {
                            usageTier: true,
                            aiEnabled: true,
                        },
                    },
                },
            },
            client: {
                select: {
                    clientId: true,
                    clientName: true,
                },
            },
        },
    });

    if (!tokenRecord) {
        return null;
    }

    // Check revocation
    if (tokenRecord.revokedAt) {
        return null;
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
        return null;
    }

    // Update last used timestamp asynchronously
    try {
        const p = prisma.mcpOAuthToken.update({
            where: { id: tokenRecord.id },
            data: { lastUsedAt: new Date() },
        });
        if (p && typeof p.catch === 'function') {
            p.catch(() => {});
        }
    } catch {}

    const isPaid = isUserPaidPremium(tokenRecord.user);

    return {
        valid: true,
        userId: tokenRecord.userId,
        user: tokenRecord.user,
        isPaidPremium: isPaid,
        clientId: tokenRecord.clientId,
    };
}

export const validateMcpAccessToken = validateMcpOAuthToken;

/**
 * Issue a new access token + refresh token pair for a client and user
 */
export async function issueOAuthTokenPair(params: {
    clientId: string;
    userId: string;
    scope?: string;
}): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
}> {
    const accessToken = generateMcpAccessToken();
    const refreshToken = generateMcpRefreshToken();
    const scope = params.scope || 'mcp:full';

    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const accessTokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.mcpOAuthToken.create({
        data: {
            accessTokenHash,
            refreshTokenHash,
            clientId: params.clientId,
            userId: params.userId,
            scope,
            expiresAt,
            refreshExpiresAt,
        },
    });

    return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        scope,
    };
}

/**
 * Rotate an existing refresh token for a new token pair
 */
export async function refreshOAuthTokenPair(
    refreshToken: string,
    clientId: string
): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
}> {
    if (!refreshToken || !refreshToken.startsWith('rf_mcpr_')) {
        throw new Error('Invalid refresh token format');
    }

    const refreshTokenHash = hashToken(refreshToken);

    const existingToken = await prisma.mcpOAuthToken.findUnique({
        where: { refreshTokenHash },
        include: {
            user: {
                select: {
                    id: true,
                    isAdmin: true,
                    aiSettings: {
                        select: {
                            usageTier: true,
                        },
                    },
                },
            },
        },
    });

    if (!existingToken) {
        throw new Error('Refresh token not found');
    }

    if (existingToken.clientId !== clientId) {
        throw new Error('Client mismatch');
    }

    if (existingToken.revokedAt) {
        throw new Error('Refresh token has been revoked');
    }

    if (existingToken.refreshExpiresAt && existingToken.refreshExpiresAt < new Date()) {
        throw new Error('Refresh token has expired');
    }

    if (!isUserPaidPremium(existingToken.user)) {
        throw new Error('User does not have active Paid Premium status');
    }

    // Atomically revoke old token to prevent concurrent reuse/race conditions
    const revoked = await prisma.mcpOAuthToken.updateMany({
        where: { id: existingToken.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) {
        throw new Error('Refresh token already used or revoked');
    }

    // Issue new pair
    return issueOAuthTokenPair({
        clientId: existingToken.clientId,
        userId: existingToken.userId,
        scope: existingToken.scope,
    });
}
