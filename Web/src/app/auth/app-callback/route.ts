import { NextRequest } from 'next/server';
import { appCallbackTrampoline } from '@/lib/strava/trampoline';

function getAppBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL
        || process.env.NEXTAUTH_URL
        || 'https://runflow.schuelken.uk';
}

/**
 * Mobile OAuth landing page. When the app's App Link
 * (https://runflow.schuelken.uk/auth/app-callback) is verified on the device,
 * Android opens the app instead of loading this page. Browsers that ignored
 * the link land here and get the trampoline: a tapped "Open the app" button
 * (custom scheme, safe everywhere) plus a website fallback.
 */
export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams;
    const code = sp.get('code');
    const error = sp.get('error');

    if (error) {
        return appCallbackTrampoline(
            `error=${encodeURIComponent(error)}`,
            'Strava sign-in failed',
            'The sign-in was cancelled or rejected.',
            `/login?error=${encodeURIComponent(error)}`,
            getAppBaseUrl(),
        );
    }

    if (!code) {
        return appCallbackTrampoline(
            'error=missing_code',
            'Strava sign-in failed',
            'No authorization code was received.',
            '/login?error=missing_code',
            getAppBaseUrl(),
        );
    }

    return appCallbackTrampoline(
        sp.toString(),
        'Opening RunFlow',
        'Tap the button to finish signing in.',
        '/login',
        getAppBaseUrl(),
    );
}
