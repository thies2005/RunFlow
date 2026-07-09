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

// Allowlist of valid Strava OAuth callback redirect URIs.
// The redirectUri is sent to Strava during the code exchange and must be
// registered there, so we restrict it to known values rather than accepting
// any caller-supplied URI.
const ALLOWED_REDIRECT_URIS = [
    'https://runflow.schuelken.uk/api/auth/strava/callback',
    ...(process.env.NEXT_PUBLIC_APP_URL ? [`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`] : []),
    // localhost dev
    'http://localhost:3000/api/auth/strava/callback',
];

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

        const body = await request.json();
        const { code, redirectUri: providedRedirectUri } = body;

        // Validate required fields
        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid authorization code' },
                { status: 400 }
            );
        }

        const redirectUri = providedRedirectUri
            ? providedRedirectUri
            : (process.env.NEXT_PUBLIC_APP_URL
                ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`
                : 'https://runflow.schuelken.uk/api/auth/strava/callback');

        // Validate caller-supplied redirectUri against an allowlist to prevent
        // open-redirect / token-redirect attacks via arbitrary callback URIs.
        if (providedRedirectUri && !ALLOWED_REDIRECT_URIS.includes(providedRedirectUri)) {
            return NextResponse.json(
                { error: 'Invalid redirect URI' },
                { status: 400 }
            );
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
