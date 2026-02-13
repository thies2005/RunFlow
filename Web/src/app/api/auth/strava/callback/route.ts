/**
 * Strava OAuth Callback Handler - Multi-Platform Support
 * 
 * GET /api/auth/strava/callback
 * 
 * This callback URL is used by BOTH web and Android apps.
 * Since Strava only allows one callback domain, we use the `state` parameter
 * to determine which platform initiated the request:
 * 
 * - state=android_<timestamp>: Redirect to runflow://auth?code=...
 * - state=<anything else>: Continue normal web OAuth flow via NextAuth
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');

    // ============================================================
    // ERROR HANDLING
    // ============================================================
    if (error) {
        console.error('[Strava Callback] Error from Strava:', error);

        // Check if this is a mobile request
        if (state?.startsWith('android_')) {
            // Redirect error to Android app via deep link
            return NextResponse.redirect(`runflow://auth?error=${encodeURIComponent(error)}`);
        }

        // Web error - redirect to login page with error
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
    }

    // Validate code exists
    if (!code) {
        console.error('[Strava Callback] Missing authorization code');

        if (state?.startsWith('android_')) {
            return NextResponse.redirect('runflow://auth?error=missing_code');
        }

        return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
    }

    // ============================================================
    // MOBILE APP FLOW (Android)
    // ============================================================
    if (state?.startsWith('android_')) {
        console.log('[Strava Callback] Android flow detected, returning JS redirect page');

        // For mobile: return an HTML page with JS redirect.
        // Chrome Custom Tabs don't always handle 302 redirects to custom URI schemes.
        const redirectUrl = new URL('runflow://auth');
        redirectUrl.searchParams.set('code', code);
        if (state) {
            redirectUrl.searchParams.set('state', state);
        }
        if (scope) {
            redirectUrl.searchParams.set('scope', scope);
        }

        const deepLink = redirectUrl.toString();

        // Escape for HTML attribute context (defense-in-depth)
        const safeDeepLinkForHtml = deepLink
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return new NextResponse(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting to RunFlow...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        height: 100vh; 
                        margin: 0; 
                        background: #000; 
                        color: white; 
                        text-align: center;
                    }
                    .loader {
                        border: 3px solid #222;
                        border-top: 3px solid #f06;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin-bottom: 24px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    h1 { font-size: 1.5rem; margin: 0 0 8px 0; }
                    p { color: #888; font-size: 0.9rem; margin: 0 0 32px 0; max-width: 280px; line-height: 1.4; }
                    .btn { 
                        color: #fff; 
                        text-decoration: none; 
                        padding: 14px 28px; 
                        background: #f06;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 1rem;
                        transition: transform 0.2s;
                    }
                    .btn:active { transform: scale(0.95); }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <h1>Opening RunFlow...</h1>
                <p>If the app doesn't open automatically, please tap the button below.</p>
                <a href="${safeDeepLinkForHtml}" class="btn">Open RunFlow App</a>
                
                <script>
                    // Immediate redirect using JSON.stringify for safe JS context
                    window.location.href = ${JSON.stringify(deepLink)};
                    
                    // Fallback after a delay for some browser variants
                    setTimeout(function() {
                        window.location.href = ${JSON.stringify(deepLink)};
                    }, 1500);
                </script>
            </body>
            </html>
        `, {
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    }

    // ============================================================
    // WEB FLOW - Redirect to NextAuth
    // ============================================================
    // NextAuth handles the OAuth flow at /api/auth/callback/strava
    // We redirect to NextAuth's callback endpoint with the code
    console.log('[Strava Callback] Web flow detected, redirecting to NextAuth');

    const nextAuthCallbackUrl = new URL('/api/auth/callback/strava', request.url);
    nextAuthCallbackUrl.searchParams.set('code', code);
    if (state) {
        nextAuthCallbackUrl.searchParams.set('state', state);
    }
    if (scope) {
        nextAuthCallbackUrl.searchParams.set('scope', scope);
    }

    return NextResponse.redirect(nextAuthCallbackUrl);
}
