# Mobile Deep Link Redirection Issue

## The Problem
When using **Chrome Custom Tabs** (or certain other in-app browsers) on Android for OAuth, the browser restricts automatic HTTP 302/301 redirects to custom URI schemes (like `runflow://`). 

Instead of opening the app, the browser often shows a blank page or an error because it considers the redirect to a non-HTTP scheme as a potential security risk or a broken link if not triggered by a user action.

## The Solution
Instead of performing a server-side HTTP redirect, the server should return a small HTML page with a JavaScript "auto-redirect" and a manual fallback link.

### Implementation Pattern

```typescript
// Detect mobile request (e.g., via state parameter or User-Agent)
if (state?.startsWith('android_')) {
    const deepLink = `runflow://auth?code=${code}&state=${state}`;
    
    return new NextResponse(`
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
                    background: #111; 
                    color: white; 
                    text-align: center;
                }
                .loader {
                    border: 3px solid #333;
                    border-top: 3px solid #f06;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                a { 
                    color: #fff; 
                    text-decoration: none; 
                    margin-top: 30px; 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background: #f06;
                    border-radius: 8px;
                    font-weight: bold;
                }
                p { color: #888; font-size: 0.9rem; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <h1>Opening RunFlow App...</h1>
            <p>If the app doesn't open automatically, click the button below.</p>
            <a href="${deepLink}">Open RunFlow App</a>
            
            <script>
                // Immediate redirect attempt
                window.location.href = "${deepLink}";
                
                // Fallback attempt after a short delay
                setTimeout(function() {
                    window.location.href = "${deepLink}";
                }, 1000);
            </script>
        </body>
        </html>
    `, { headers: { 'Content-Type': 'text/html' } });
}
```

## Why this works
1. **JavaScript Injection**: Many mobile browsers that block 302 redirects will allow a navigation triggered by `window.location.href` especially if there's a user agent interaction or if the page is rendered first.
2. **User Intent**: By providing a visible link/button, the user can manually trigger the deep link if the automatic redirection fails. A direct user click on a custom scheme link is almost always allowed by the OS/Browser.
3. **Better UX**: Instead of a "hanging" redirect or a blank page, the user sees a loading state and has a clear "back out" or "try again" path.
