import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';

function getAppBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL
        || process.env.NEXTAUTH_URL
        || 'https://runflow.schuelken.uk';
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Mobile state format: `<prefix>_<epochMillis>_<nonce>` (e.g.
 * `flutter_1760000000000_3fa9b2c1d4e5f60718293a4b5c6d7e8f`). The nonce is a
 * per-flow random secret only the app knows and verifies when the deep link
 * lands (StravaAuth.validateAndConsumeCallbackState binds the code to the
 * login attempt that started it); the server cannot verify it and must not
 * reject it — here we only validate the prefix and the timestamp. Legacy
 * states without a nonce (`<prefix>_<epochMillis>`, from app versions
 * predating the binding) are still routed; they carry no protection of their
 * own but the old apps' behavior is unchanged.
 */
function parseMobileStateTimestamp(state: string): number | null {
    const parts = state.split('_');
    if (parts.length < 2) return null;
    const timestamp = parseInt(parts[1], 10);
    return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Mobile flow: redirect to the app's App Link URL
 * (https://<host>/auth/app-callback). On devices where the link is verified
 * Android opens the app directly at this navigation — no custom scheme, no
 * user-activation restrictions, works from plain 302s in every browser.
 * When the app is not installed / verification is pending, the URL loads the
 * trampoline page (src/app/auth/app-callback/route.ts) with a tapped
 * "Open the app" button and a website fallback.
 */
function mobileAppCallback(baseUrl: string, params: Record<string, string>): NextResponse {
    const url = new URL('/auth/app-callback', baseUrl);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, { status: 302 });
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');
    const baseUrl = getAppBaseUrl();

    if (error) {
        logger.error('Strava Callback Error', { error, state: state || 'unknown' });

        if (state?.startsWith('android_') || state?.startsWith('flutter_')) {
            return mobileAppCallback(baseUrl, { error });
        }

        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code) {
        logger.error('Strava Callback Missing Code', { state: state || 'unknown', url: request.url });

        if (state?.startsWith('android_') || state?.startsWith('flutter_')) {
            return mobileAppCallback(baseUrl, { error: 'missing_code' });
        }

        return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
    }

    const isFlutter = state?.startsWith('flutter_');
    const isAndroid = state?.startsWith('android_');
    const isMobile = isFlutter || isAndroid;

    if (isMobile) {
        const timestamp = parseMobileStateTimestamp(state!);
        const now = Date.now();

        if (timestamp === null || (now - timestamp) > STATE_MAX_AGE_MS) {
            logger.warn('Strava Callback: stale or invalid state timestamp', {
                state,
                age: timestamp === null ? undefined : now - timestamp,
            });
            return mobileAppCallback(baseUrl, { error: 'invalid_state' });
        }

        logger.info('Strava Callback Mobile Flow (app link)', { state });

        const params: Record<string, string> = { code };
        if (state) params.state = state;
        if (scope) params.scope = scope;
        return mobileAppCallback(baseUrl, params);
    }

    logger.info('Strava Callback Web Flow', { state: state || 'unknown' });

    const nextAuthCallbackUrl = new URL('/api/auth/callback/strava', baseUrl);
    nextAuthCallbackUrl.searchParams.set('code', code);
    if (state) {
        nextAuthCallbackUrl.searchParams.set('state', state);
    }
    if (scope) {
        nextAuthCallbackUrl.searchParams.set('scope', scope);
    }

    return NextResponse.redirect(nextAuthCallbackUrl);
}
