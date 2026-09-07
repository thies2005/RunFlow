import { NextResponse } from 'next/server';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Trampoline page for the mobile Strava OAuth return path.
 *
 * The app's verified App Link (https://<host>/auth/app-callback) normally
 * opens the app before any page renders. This page covers everything else:
 * verification pending, the app not installed, or a browser that ignores
 * app links. It deliberately does NOT auto-navigate to the custom scheme —
 * some WebView-based browsers resolve runflow2://… as a relative URL and
 * land on a website 404. Only an explicit tap on the button (which is safe
 * in every browser) triggers the custom scheme, with a website fallback.
 */
export function appCallbackTrampoline(
    query: string,
    title: string,
    message: string,
    fallbackPath = '/login',
    baseUrl: string,
): NextResponse {
    const deepLink = `runflow2://auth/callback?${query}`;
    const hrefEncoded = escapeHtml(deepLink);
    const fallbackUrl = new URL(fallbackPath, baseUrl).toString();
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
    display: inline-block; margin-top: 18px; font-size: 13px;
    color: inherit; opacity: .6; text-decoration: underline;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">🏃</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <a class="btn" href="${hrefEncoded}">Open the app</a>
    <a class="web" href="${fallbackEncoded}">Continue on the website instead</a>
  </div>
<script>
  document.getElementById('open').addEventListener('click', function () {
    setTimeout(function () { try { window.close(); } catch (e) {} }, 400);
  });
  setTimeout(function () { try { window.close(); } catch (e) {} }, 8000);
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
