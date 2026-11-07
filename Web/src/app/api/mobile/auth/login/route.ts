import { serverOrigin } from '@/lib/server-origin';
/**
 * Mobile Auth Login Endpoint
 * 
 * POST /api/mobile/auth/login
 * 
 * Exchanges a Strava OAuth authorization code for RunFlow JWT tokens.
 * Used by the mobile app after user completes Strava OAuth in browser/webview.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeStravaCodeForTokens } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting - use stricter settings for auth endpoints
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, {
            limit: 10,
            windowSeconds: 60,
            prefix: 'mobile-auth-login'
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const rawBody = await readBodyWithLimit(request);
        if (rawBody === null) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }
        const body = JSON.parse(rawBody);
        const { code, redirectUri: providedRedirectUri } = body;

        // Validate required fields
        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid authorization code' },
                { status: 400 }
            );
        }

        const redirectUri = `${serverOrigin()}/api/auth/strava/callback`;
        if (providedRedirectUri !== undefined && providedRedirectUri !== redirectUri) {
            return NextResponse.json({ error: 'Invalid redirect URI' }, { status: 400 });
        }

        // Exchange the Strava code for our tokens
        const result = await exchangeStravaCodeForTokens(code, redirectUri);

        if ('error' in result) {
            return NextResponse.json(
                { error: result.error },
                { status: 401 }
            );
        }

        return NextResponse.json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            tokenType: 'Bearer',
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                image: result.user.image,
                emailVerified: result.user.emailVerified
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        console.error('[Mobile Auth] Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
