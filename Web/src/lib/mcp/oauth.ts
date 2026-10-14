import { createHash, randomBytes } from 'crypto';
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
 * Verify PKCE S256 code_verifier against code_challenge (RFC 7636)
 */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
    if (!codeVerifier || !codeChallenge) return false;
    const computedChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    return computedChallenge === codeChallenge;
}

/**
 * Validate redirect URI against allowed hosts:
 * - https://claude.ai/* and subdomains
 * - https://*.anthropic.com/*
 * - https://*.google.com/*
 * - http://localhost:* / http://127.0.0.1:*
 */
export function isValidRedirectUri(uri: string): boolean {
    try {
        const parsed = new URL(uri);
        const host = parsed.hostname.toLowerCase();
        const protocol = parsed.protocol;

        if (protocol === 'http:' || protocol === 'https:') {
            if (host === 'localhost' || host === '127.0.0.1') {
                return true;
            }
        }

        if (protocol === 'https:') {
            if (host === 'claude.ai' || host.endsWith('.claude.ai')) {
                return true;
            }
            if (host === 'anthropic.com' || host.endsWith('.anthropic.com')) {
                return true;
            }
            if (host === 'google.com' || host.endsWith('.google.com')) {
                return true;
            }
        }

        return false;
    } catch {
        return false;
    }
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

    // Revoke old token
    await prisma.mcpOAuthToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
    });

    // Issue new pair
    return issueOAuthTokenPair({
        clientId: existingToken.clientId,
        userId: existingToken.userId,
        scope: existingToken.scope,
    });
}
