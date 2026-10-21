import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
    generateMcpAuthCode,
    hashToken,
    isUserPaidPremium,
    isAllowedMcpRedirectUri,
    getPublicOrigin,
    verifyConsentCsrfToken,
    AUTH_CODE_TTL_SECONDS,
} from '@/lib/mcp/oauth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');

    if (!clientId) {
        return NextResponse.json(
            { error: 'invalid_request', error_description: 'client_id is required' },
            { status: 400 }
        );
    }

    if (!redirectUri) {
        return NextResponse.json(
            { error: 'invalid_request', error_description: 'redirect_uri is required' },
            { status: 400 }
        );
    }

    if (!isAllowedMcpRedirectUri(redirectUri)) {
        return NextResponse.json(
            { error: 'invalid_redirect_uri', error_description: 'Redirect URI is not allowed' },
            { status: 400 }
        );
    }

    const client = await prisma.mcpOAuthClient.findUnique({
        where: { clientId },
    });

    if (!client) {
        return NextResponse.json(
            { error: 'invalid_client', error_description: 'OAuth client not found' },
            { status: 400 }
        );
    }

    if (!Array.isArray(client.redirectUris) || !(client.redirectUris as string[]).includes(redirectUri)) {
        return NextResponse.json(
            { error: 'invalid_redirect_uri', error_description: 'Redirect URI does not match client registration' },
            { status: 400 }
        );
    }

    const publicOrigin = getPublicOrigin(request);
    const authorizePageUrl = new URL('/mcp/authorize', publicOrigin);
    searchParams.forEach((value, key) => {
        authorizePageUrl.searchParams.set(key, value);
    });

    return NextResponse.redirect(authorizePageUrl);
}

export async function POST(request: NextRequest) {
    try {
        const originHeader = request.headers.get('origin');
        if (originHeader) {
            let nextAuthOrigin = '';
            try {
                if (process.env.NEXTAUTH_URL) nextAuthOrigin = new URL(process.env.NEXTAUTH_URL).origin;
            } catch {}
            let appUrlOrigin = '';
            try {
                if (process.env.NEXT_PUBLIC_APP_URL) appUrlOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
            } catch {}

            const canonicalConfigured = Boolean(
                (nextAuthOrigin && !nextAuthOrigin.includes('0.0.0.0')) ||
                (appUrlOrigin && !appUrlOrigin.includes('0.0.0.0'))
            );
            const forwardedOrigin = canonicalConfigured
                ? ''
                : `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`;

            const allowedOrigins = new Set(
                [request.nextUrl.origin, getPublicOrigin(request), forwardedOrigin, nextAuthOrigin, appUrlOrigin].filter(Boolean)
            );
            if (!allowedOrigins.has(originHeader)) {
                return NextResponse.json(
                    { error: 'invalid_request', error_description: 'Cross-origin authorization approval is forbidden' },
                    { status: 403 }
                );
            }
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'unauthorized', error_description: 'You must be signed in to authorize MCP clients' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                isAdmin: true,
                aiSettings: {
                    select: {
                        usageTier: true,
                    },
                },
            },
        });

        if (!user || !isUserPaidPremium(user)) {
            return NextResponse.json(
                {
                    error: 'forbidden',
                    error_description: 'RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3).',
                },
                { status: 403 }
            );
        }

        let body: any = {};
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                body = await request.json();
            } catch {
                body = {};
            }
        } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            formData.forEach((val, key) => {
                body[key] = val.toString();
            });
        }

        const clientId = body.client_id || request.nextUrl.searchParams.get('client_id');
        const redirectUri = body.redirect_uri || request.nextUrl.searchParams.get('redirect_uri');
        const codeChallenge = body.code_challenge || request.nextUrl.searchParams.get('code_challenge');
        const codeChallengeMethod = body.code_challenge_method || request.nextUrl.searchParams.get('code_challenge_method') || 'S256';
        const state = body.state || request.nextUrl.searchParams.get('state') || '';
        const scope = body.scope || request.nextUrl.searchParams.get('scope') || 'mcp:full';
        const consentCsrfToken = body.consentCsrfToken || body.consent_csrf_token || request.headers.get('x-consent-csrf-token');

        if (!clientId || !redirectUri || !codeChallenge) {
            return NextResponse.json(
                { error: 'invalid_request', error_description: 'client_id, redirect_uri, and code_challenge are required' },
                { status: 400 }
            );
        }

        if (!isAllowedMcpRedirectUri(redirectUri)) {
            return NextResponse.json(
                { error: 'invalid_redirect_uri', error_description: 'The requested redirect URI is not allowed' },
                { status: 400 }
            );
        }

        const client = await prisma.mcpOAuthClient.findUnique({
            where: { clientId },
        });

        if (!client) {
            return NextResponse.json(
                { error: 'invalid_client', error_description: 'OAuth client not found' },
                { status: 400 }
            );
        }

        if (!Array.isArray(client.redirectUris) || !(client.redirectUris as string[]).includes(redirectUri)) {
            return NextResponse.json(
                { error: 'invalid_redirect_uri', error_description: 'The requested redirect URI does not match client registration' },
                { status: 400 }
            );
        }

        // Verify cryptographic consent CSRF token
        if (!consentCsrfToken || !verifyConsentCsrfToken(consentCsrfToken, {
            userId: user.id,
            clientId: client.clientId,
            redirectUri,
            codeChallenge,
            state,
        })) {
            return NextResponse.json(
                { error: 'invalid_request', error_description: 'Invalid or expired consent CSRF token' },
                { status: 403 }
            );
        }

        const code = generateMcpAuthCode();
        const codeHash = hashToken(code);
        const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000);

        await prisma.mcpOAuthCode.create({
            data: {
                codeHash,
                clientId: client.clientId,
                userId: user.id,
                redirectUri,
                codeChallenge,
                codeChallengeMethod,
                scope,
                expiresAt,
            },
        });

        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set('code', code);
        if (state) {
            targetUrl.searchParams.set('state', state);
        }

        return NextResponse.json({
            redirect_uri: targetUrl.toString(),
        });
    } catch (error: any) {
        console.error('OAuth authorization endpoint error:', error);
        return NextResponse.json(
            { error: 'server_error', error_description: error?.message || 'Authorization failed' },
            { status: 500 }
        );
    }
}
