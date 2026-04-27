import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';

function getAppBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL
        || process.env.NEXTAUTH_URL
        || 'https://runflow.schuelken.uk';
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

        if (state?.startsWith('android_')) {
            return NextResponse.redirect(`runflow://auth/callback?error=${encodeURIComponent(error)}`);
        }
        if (state?.startsWith('flutter_')) {
            return NextResponse.redirect(`runflow2://auth/callback?error=${encodeURIComponent(error)}`);
        }

        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code) {
        logger.error('Strava Callback Missing Code', { state: state || 'unknown', url: request.url });

        if (state?.startsWith('android_')) {
            return NextResponse.redirect('runflow://auth/callback?error=missing_code');
        }
        if (state?.startsWith('flutter_')) {
            return NextResponse.redirect('runflow2://auth/callback?error=missing_code');
        }

        return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
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
            const errorUrl = `${mobileScheme}://auth/callback?error=invalid_state`;
            return NextResponse.redirect(errorUrl);
        }

        logger.info('Strava Callback Mobile Flow (pass-through)', { state, scheme: mobileScheme });

        const deepLink = new URL(`${mobileScheme}://auth/callback`);
        deepLink.searchParams.set('code', code);
        if (state) deepLink.searchParams.set('state', state);
        if (scope) deepLink.searchParams.set('scope', scope);

        return NextResponse.redirect(deepLink.toString());
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
