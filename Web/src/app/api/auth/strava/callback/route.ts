import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';
import { exchangeStravaCodeForTokens } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');

    if (error) {
        logger.error('Strava Callback Error', { error, state: state || 'unknown' });

        if (state?.startsWith('android_')) {
            return NextResponse.redirect(`runflow://auth/callback?error=${encodeURIComponent(error)}`);
        }
        if (state?.startsWith('flutter_')) {
            return NextResponse.redirect(`runflow2://auth/callback?error=${encodeURIComponent(error)}`);
        }

        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
        logger.error('Strava Callback Missing Code', { state: state || 'unknown' });

        if (state?.startsWith('android_')) {
            return NextResponse.redirect('runflow://auth/callback?error=missing_code');
        }
        if (state?.startsWith('flutter_')) {
            return NextResponse.redirect('runflow2://auth/callback?error=missing_code');
        }

        return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
    }

    const isFlutter = state?.startsWith('flutter_');
    const isAndroid = state?.startsWith('android_');
    const isMobile = isFlutter || isAndroid;
    const mobileScheme = isFlutter ? 'runflow2' : 'runflow';

    if (isMobile) {
        const parts = state!.split('_');
        const timestamp = parseInt(parts[1], 10);
        const now = Date.now();
        const MAX_AGE_MS = 10 * 60 * 1000;

        if (isNaN(timestamp) || (now - timestamp) > MAX_AGE_MS) {
            logger.warn('Strava Callback: stale or invalid state timestamp', { state, age: now - timestamp });
            return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
        }

        logger.info('Strava Callback Mobile Flow', { state, scheme: mobileScheme });

        const redirectUri = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`
            : 'https://runflow.schuelken.uk/api/auth/strava/callback';

        const result = await exchangeStravaCodeForTokens(code, redirectUri);

        if ('error' in result) {
            logger.error('Strava Callback: mobile token exchange failed', { error: result.error });
            const errorRedirectUrl = new URL(`${mobileScheme}://auth/callback`);
            errorRedirectUrl.searchParams.set('error', result.error);
            return buildMobileRedirectPage(errorRedirectUrl.toString());
        }

        const deepLink = new URL(`${mobileScheme}://auth/callback`);
        deepLink.searchParams.set('accessToken', result.accessToken);
        deepLink.searchParams.set('refreshToken', result.refreshToken);
        deepLink.searchParams.set('expiresIn', String(result.expiresIn));
        deepLink.searchParams.set('tokenType', 'Bearer');
        deepLink.searchParams.set('userId', result.user.id);
        if (result.user.name) deepLink.searchParams.set('userName', result.user.name);
        if (result.user.email) deepLink.searchParams.set('userEmail', result.user.email);
        if (result.user.image) deepLink.searchParams.set('userImage', result.user.image);
        if (state) deepLink.searchParams.set('state', state);
        if (scope) deepLink.searchParams.set('scope', scope);

        return buildMobileRedirectPage(deepLink.toString());
    }

    logger.info('Strava Callback Web Flow', { state: state || 'unknown' });

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

function buildMobileRedirectPage(deepLink: string): NextResponse {
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
                window.location.href = ${JSON.stringify(deepLink)};

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
