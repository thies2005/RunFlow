import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';

function getAppBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL
        || process.env.NEXTAUTH_URL
        || 'https://runflow.schuelken.uk';
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Mobile return path. Browsers do not reliably follow a bare 302 to a custom
 * scheme (Chrome needs a recent user activation; Samsung Internet refuses
 * entirely and can resolve the URL against the site, producing a 404). So the
 * callback returns a minimal trampoline page instead: it tries to open the
 * deep link automatically and, if the browser blocked that, the user taps
 * "Open the app" — a tapped custom-scheme link launches the app everywhere.
 * If the redirect fails entirely (or the app is not installed), a small
 * website link appears so the page is never a dead end.
 */
function mobileTrampoline(
    scheme: string,
    params: string,
    title: string,
    message: string,
    fallbackPath = '/login',
): NextResponse {
    const deepLink = `${scheme}://auth/callback?${params}`;
    const hrefEncoded = escapeHtml(deepLink);
    const jsEncoded = JSON.stringify(deepLink).replace(/</g, '\\u003c');
    const fallbackUrl = new URL(fallbackPath, getAppBaseUrl()).toString();
    const fallbackEncoded = escapeHtml(fallbackUrl);

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0a0a0a; color: #f5f5f5; padding: 24px;
  }
  @media (prefers-color-scheme: light) {
    body { background: #fafafa; color: #1a1a1a; }
    .card { background: #fff; }
  }
  .card {
    width: 100%; max-width: 400px; text-align: center;
    background: #141414; border-radius: 20px; padding: 32px 24px;
    box-shadow: 0 8px 30px rgba(0,0,0,.25);
  }
  .logo { font-size: 40px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin-bottom: 8px; }
  p { font-size: 14px; opacity: .7; margin-bottom: 20px; line-height: 1.5; }
  a.btn {
    display: block; padding: 14px 24px; border-radius: 999px;
    background: #FF6B35; color: #fff; font-weight: 600; font-size: 16px;
    text-decoration: none;
  }
  a.web {
    display: none; margin-top: 18px; font-size: 13px;
    color: inherit; opacity: .6; text-decoration: underline;
  }
  a.web.visible { display: inline-block; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">🏃</div>
    <h1>${escapeHtml(title)}</h1>
    <p id="hint">${escapeHtml(message)}</p>
    <a class="btn" id="open" href="${hrefEncoded}">Open the app</a>
    <a class="web" id="web" href="${fallbackEncoded}">Continue on the website instead</a>
  </div>
<script>
  (function () {
    var link = document.getElementById('open');
    var hint = document.getElementById('hint');
    var web = document.getElementById('web');
    try { location.replace(${jsEncoded}); } catch (e) { /* fall through to the button */ }
    setTimeout(function () {
      if (hint) hint.textContent = 'Nothing happened? Tap the button to continue into the app.';
      if (web) web.classList.add('visible');
    }, 1200);
    setTimeout(function () { try { window.close(); } catch (e) { /* not a custom tab */ } }, 6000);
    link.addEventListener('click', function () {
      setTimeout(function () { try { window.close(); } catch (e) {} }, 400);
    });
  })();
</script>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store, max-age=0',
        },
    });
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
            return mobileTrampoline('runflow', `error=${encodeURIComponent(error)}`, 'Strava sign-in failed', 'The sign-in was cancelled or rejected. Returning to the app…', `/login?error=${encodeURIComponent(error)}`);
        }
        if (state?.startsWith('flutter_')) {
            return mobileTrampoline('runflow2', `error=${encodeURIComponent(error)}`, 'Strava sign-in failed', 'The sign-in was cancelled or rejected. Returning to the app…', `/login?error=${encodeURIComponent(error)}`);
        }

        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code) {
        logger.error('Strava Callback Missing Code', { state: state || 'unknown', url: request.url });

        if (state?.startsWith('android_')) {
            return mobileTrampoline('runflow', 'error=missing_code', 'Strava sign-in failed', 'No authorization code was returned. Returning to the app…', '/login?error=missing_code');
        }
        if (state?.startsWith('flutter_')) {
            return mobileTrampoline('runflow2', 'error=missing_code', 'Strava sign-in failed', 'No authorization code was returned. Returning to the app…', '/login?error=missing_code');
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
            return mobileTrampoline(mobileScheme, 'error=invalid_state', 'Sign-in expired', 'This sign-in link has expired. Please start again from the app.', '/login?error=invalid_state');
        }

        logger.info('Strava Callback Mobile Flow (trampoline)', { state, scheme: mobileScheme });

        const deepLink = new URL(`${mobileScheme}://auth/callback`);
        deepLink.searchParams.set('code', code);
        if (state) deepLink.searchParams.set('state', state);
        if (scope) deepLink.searchParams.set('scope', scope);

        return mobileTrampoline(
            mobileScheme,
            deepLink.searchParams.toString(),
            'Signing you in',
            'Returning to the RunFlow app…',
        );
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
