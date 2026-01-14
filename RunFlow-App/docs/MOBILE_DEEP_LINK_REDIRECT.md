# Updated Server-Side Implementation for Mobile Deep Link

## The Problem
Chrome Custom Tabs (used by the Android app) don't automatically handle redirects to custom URI schemes like `runflow://auth`. A simple HTTP redirect to `runflow://...` will show a blank page.

## Solution: Use an HTML Page with JavaScript

Instead of an HTTP 302 redirect, return an HTML page that uses JavaScript to open the deep link:

### Updated Callback Handler

```typescript
// In /api/auth/strava/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle Android mobile app
    if (state?.startsWith('android_')) {
        const deepLink = error 
            ? `runflow://auth?error=${encodeURIComponent(error)}`
            : `runflow://auth?code=${encodeURIComponent(code || '')}&state=${encodeURIComponent(state)}`;
        
        // Return HTML page that opens the deep link
        return new NextResponse(
            `<!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting to RunFlow...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .container { text-align: center; padding: 20px; }
                    h1 { color: #333; font-size: 24px; }
                    p { color: #666; margin: 20px 0; }
                    .button {
                        display: inline-block;
                        background: #FC4C02;
                        color: white;
                        padding: 15px 30px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: bold;
                        margin-top: 10px;
                    }
                    .spinner {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #FC4C02;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="spinner"></div>
                    <h1>Opening RunFlow App...</h1>
                    <p>If the app doesn't open automatically, tap the button below:</p>
                    <a href="${deepLink}" class="button">Open RunFlow</a>
                </div>
                <script>
                    // Try to open the app immediately
                    window.location.href = "${deepLink}";
                    
                    // Fallback: try again after a short delay
                    setTimeout(function() {
                        window.location.href = "${deepLink}";
                    }, 100);
                </script>
            </body>
            </html>`,
            {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
            }
        );
    }

    // Handle errors for web
    if (error) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
    }

    // Continue normal web flow...
    // Exchange code for tokens and redirect to dashboard
}
```

## How It Works

1. Server detects `state=android_*`
2. Instead of HTTP redirect, returns an HTML page
3. HTML page uses JavaScript `window.location.href` to open `runflow://auth?code=...`
4. Chrome Custom Tabs execute the JavaScript
5. Android system intercepts the `runflow://` URL and opens the app
6. Fallback button is provided if auto-redirect doesn't work

## Why This Works

- Chrome Custom Tabs execute JavaScript (unlike HTTP redirects to custom schemes)
- The `window.location.href` assignment triggers Android's URL handling
- Android sees `runflow://` and looks for an app registered to handle it
- Your AndroidManifest.xml has the intent-filter for `runflow://auth`

## Alternative: Intent URL Scheme

For even better compatibility, you can use Android's `intent://` scheme:

```javascript
// In the HTML page:
const intentUrl = "intent://auth?code=" + encodeURIComponent(code) + 
                  "#Intent;scheme=runflow;package=com.runflow.app;end";
window.location.href = intentUrl;
```

This explicitly targets your app package and provides more reliable deep linking.
