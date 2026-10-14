import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
    hashToken,
    verifyPkce,
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
            const formData = await request.formData();
            formData.forEach((value, key) => {
                params[key] = value.toString();
            });
        }

        const grantType = params.grant_type;
        const clientId = params.client_id;

        if (!clientId) {
            return NextResponse.json(
                { error: 'invalid_client', error_description: 'client_id is required' },
                { status: 400, headers: CORS_HEADERS }
            );
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

            const codeHash = hashToken(code);
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
                    { error: 'invalid_grant', error_description: 'Authorization code is invalid' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            if (codeRecord.usedAt) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'Authorization code has already been used' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            if (codeRecord.expiresAt < new Date()) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'Authorization code has expired' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            if (codeRecord.clientId !== clientId) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'client_id does not match code issuance' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            if (codeRecord.redirectUri !== redirectUri) {
                return NextResponse.json(
                    { error: 'invalid_grant', error_description: 'redirect_uri does not match code issuance' },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            // Verify PKCE S256
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

            // Mark code as used
            await prisma.mcpOAuthCode.update({
                where: { id: codeRecord.id },
                data: { usedAt: new Date() },
            });

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
