import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
    hashToken,
    verifyPkce,
    verifyClientSecret,
    issueOAuthTokenPair,
    refreshOAuthTokenPair,
    isUserPaidPremium,
} from '@/lib/mcp/oauth';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function POST(request: NextRequest) {
    try {
        let params: Record<string, string> = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            try {
                const json = await request.json();
                for (const [k, v] of Object.entries(json)) {
                    if (v !== undefined && v !== null) params[k] = String(v);
                }
            } catch {
                return NextResponse.json(
                    { error: 'invalid_request', error_description: 'Malformed JSON payload' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }
        } else {
            // Safe form parsing: URLSearchParams over raw text never throws on
            // odd client payloads, unlike request.formData()
            const rawBody = await request.text();
            for (const [key, value] of new URLSearchParams(rawBody).entries()) {
                params[key] = value;
            }
        }

        // RFC 6749 §2.3.1 (client_secret_basic): decode client_id/client_secret
        // from the HTTP Basic authorization header when not present in the body
        const authHeader = request.headers.get('authorization');
        if (authHeader && /^Basic\s+\S+/i.test(authHeader)) {
            try {
                const decoded = Buffer.from(authHeader.replace(/^Basic\s+/i, ''), 'base64').toString('utf-8');
                const separatorIndex = decoded.indexOf(':');
                if (separatorIndex >= 0) {
                    const basicClientId = decoded.slice(0, separatorIndex);
                    const basicClientSecret = decoded.slice(separatorIndex + 1);
                    if (!params.client_id && basicClientId) {
                        params.client_id = decodeURIComponent(basicClientId);
                    }
                    if (!params.client_secret && basicClientSecret) {
                        params.client_secret = decodeURIComponent(basicClientSecret);
                    }
                }
            } catch {
                // Malformed Basic header: fall through to body-provided credentials
            }
        }

        const grantType = params.grant_type;
        const clientId = params.client_id;

        if (!clientId) {
            return NextResponse.json(
                { error: 'invalid_client', error_description: 'client_id is required' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // RFC 6749 §2.3: confidential clients must authenticate with the secret
        // issued at registration (Basic header or body, both parsed above)
        const oauthClient = await prisma.mcpOAuthClient.findUnique({ where: { clientId } });
        if (oauthClient?.clientSecretHash) {
            const providedSecret = params.client_secret;
            if (!providedSecret || !verifyClientSecret(providedSecret, oauthClient.clientSecretHash)) {
                return NextResponse.json(
                    { error: 'invalid_client', error_description: 'Client authentication failed' },
                    {
                        status: 401,
                        headers: {
                            ...CORS_HEADERS,
                            'Cache-Control': 'no-store',
                            ...(authHeader ? { 'WWW-Authenticate': 'Basic realm="mcp"' } : {}),
                        },
                    }
                );
            }
        }

        if (grantType === 'authorization_code') {
            const code = params.code;
            const redirectUri = params.redirect_uri;
            const codeVerifier = params.code_verifier;

            if (!code || !redirectUri || !codeVerifier) {
                return NextResponse.json(
                    {
                        error: 'invalid_request',
                        error_description: 'code, redirect_uri, and code_verifier are required for authorization_code grant',
                    },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            if (typeof codeVerifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'Invalid code_verifier format' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            const codeHash = hashToken(code);
            const now = new Date();

            // Atomically claim the authorization code to prevent replay attacks / TOCTOU races
            const claimed = await prisma.mcpOAuthCode.updateMany({
                where: {
                    codeHash,
                    clientId,
                    redirectUri,
                    usedAt: null,
                    expiresAt: { gt: now },
                },
                data: { usedAt: now },
            });

            if (claimed.count !== 1) {
                return NextResponse.json(
                    {
                        error: 'invalid_grant',
                        error_description: 'Authorization code is invalid, expired, or already used',
                    },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            const codeRecord = await prisma.mcpOAuthCode.findUnique({
                where: { codeHash },
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

            if (!codeRecord) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'Authorization code record not found' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            if (codeRecord.codeChallengeMethod && codeRecord.codeChallengeMethod !== 'S256') {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'Only S256 code_challenge_method is supported' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            // Verify PKCE S256 using timing-safe comparison
            const isPkceValid = verifyPkce(codeVerifier, codeRecord.codeChallenge);
            if (!isPkceValid) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'PKCE code_verifier verification failed' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            // Verify user still has Paid Premium access
            if (!isUserPaidPremium(codeRecord.user)) {
                return NextResponse.json(
                    {
                        error: 'unauthorized_client',
                        error_description: 'RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3).',
                    },
                    { status: 403, headers: CORS_HEADERS }
                );
            }

            // Issue token pair
            const tokens = await issueOAuthTokenPair({
                clientId: codeRecord.clientId,
                userId: codeRecord.userId,
                scope: codeRecord.scope,
            });

            return NextResponse.json(
                {
                    access_token: tokens.accessToken,
                    token_type: 'Bearer',
                    expires_in: tokens.expiresIn,
                    refresh_token: tokens.refreshToken,
                    scope: tokens.scope,
                },
                { status: 200, headers: CORS_HEADERS }
            );
        }

        if (grantType === 'refresh_token') {
            const refreshToken = params.refresh_token;
            if (!refreshToken) {
                return NextResponse.json(
                    { error: 'invalid_request', error_description: 'refresh_token is required' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            const tokens = await refreshOAuthTokenPair(refreshToken, clientId);

            return NextResponse.json(
                {
                    access_token: tokens.accessToken,
                    token_type: 'Bearer',
                    expires_in: tokens.expiresIn,
                    refresh_token: tokens.refreshToken,
                    scope: tokens.scope,
                },
                { status: 200, headers: CORS_HEADERS }
            );
        }

        return NextResponse.json(
            { error: 'unsupported_grant_type', error_description: `Grant type "${grantType}" is not supported` },
            { status: 400, headers: CORS_HEADERS }
        );
    } catch (error: any) {
        console.error('OAuth token endpoint error:', error);
        return NextResponse.json(
            { error: 'invalid_grant', error_description: error?.message || 'Token exchange failed' },
            { status: 400, headers: CORS_HEADERS }
        );
    }
}
