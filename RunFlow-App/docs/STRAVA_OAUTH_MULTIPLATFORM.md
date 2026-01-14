# Strava OAuth Multi-Platform Implementation Guide

This document describes how to implement Strava OAuth authentication that works for **both the web application and the Android app** using a single callback domain.

## Overview

Since Strava only allows **one callback domain** per application, we use a **server-side redirect proxy** pattern:

1. **Both platforms** use the same callback URL: `https://runflow.schuelken.uk/api/auth/strava/callback`
2. The **Android app** includes `state=android_<timestamp>` in the OAuth request
3. The **server** checks the `state` parameter to determine the originating platform
4. For Android requests, the server redirects to `runflow://auth?code=<code>`
5. For web requests, the server continues the normal web flow

---

## Architecture Diagram

```
┌─────────────────┐                  ┌─────────────────┐                  ┌─────────────────┐
│   Android App   │                  │   Web App       │                  │   Strava API    │
└────────┬────────┘                  └────────┬────────┘                  └────────┬────────┘
         │                                    │                                    │
         │  state=android_123                 │  state=web_abc                     │
         │  redirect_uri=.../callback         │  redirect_uri=.../callback         │
         ├────────────────────────────────────┼────────────────────────────────────►
         │                                    │                                    │
         │                                    │          Authorization Page        │
         │                                    │◄───────────────────────────────────┤
         │                                    │                                    │
         │                        ┌───────────┴───────────┐                        │
         │                        │  Server Callback      │                        │
         │                        │  /api/auth/strava/    │                        │
         │                        │  callback             │◄───────────────────────┤
         │                        └───────────┬───────────┘                        │
         │                                    │                                    │
         │     if state.startsWith('android')│                                    │
         │◄───────────────────────────────────┤                                    │
         │  Redirect to runflow://auth?code=  │                                    │
         │                                    │                                    │
         │                                    │  else: continue web flow           │
         │                                    ├────────────────────────────────────►
         │                                    │                                    │
```

---

## Server-Side Implementation

### 1. Update the Strava Callback Route

Modify your existing Strava OAuth callback handler to detect the platform and redirect accordingly.

**File**: `src/app/api/auth/strava/callback/route.ts` (or equivalent)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Strava
    if (error) {
        // Check if this is a mobile request
        if (state?.startsWith('android_')) {
            // Redirect error to Android app
            return NextResponse.redirect(`runflow://auth?error=${encodeURIComponent(error)}`);
        }
        // Handle web error
        return NextResponse.redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    // Validate code exists
    if (!code) {
        if (state?.startsWith('android_')) {
            return NextResponse.redirect('runflow://auth?error=missing_code');
        }
        return NextResponse.redirect('/login?error=missing_code');
    }

    // ============================================================
    // MOBILE APP FLOW
    // ============================================================
    if (state?.startsWith('android_')) {
        // For mobile: redirect directly to the app with the authorization code
        // The app will exchange the code for tokens itself via the API
        const redirectUrl = `runflow://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        return NextResponse.redirect(redirectUrl);
    }

    // ============================================================
    // WEB FLOW (existing logic)
    // ============================================================
    // Exchange code for tokens on the server
    try {
        const tokenResponse = await exchangeCodeForTokens(code);
        
        // Set session/cookies and redirect to dashboard
        const response = NextResponse.redirect(new URL('/dashboard', request.url));
        // ... set cookies/session ...
        return response;
    } catch (error) {
        return NextResponse.redirect('/login?error=token_exchange_failed');
    }
}

async function exchangeCodeForTokens(code: string) {
    // Your existing token exchange logic
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
        }),
    });
    return response.json();
}
```

### 2. Key Implementation Notes

| Aspect | Details |
|--------|---------|
| **State Prefix** | Android app uses `android_<timestamp>` format |
| **Mobile Redirect** | `runflow://auth?code=<code>&state=<state>` |
| **Web Redirect** | Continue existing flow (exchange tokens, set session) |
| **Error Handling** | Mobile errors go to `runflow://auth?error=<message>` |

### 3. Security Considerations

1. **Validate the state parameter** - The state should match what was originally sent
2. **Short-lived codes** - Strava authorization codes expire quickly
3. **HTTPS only** - Always use HTTPS for the callback URL

---

## Android App Changes (Already Implemented)

The following changes have been made to `StravaOAuthManager.kt`:

1. **Redirect URI**: Changed from `runflow://auth` to `https://runflow.schuelken.uk/api/auth/strava/callback`
2. **State Parameter**: Added `state=android_<timestamp>` to identify mobile requests
3. **OAuth Endpoint**: Changed from `/oauth/mobile/authorize` to `/oauth/authorize` (standard web flow)
4. **Error Handling**: Added handling for `error` query parameter in deep link callback

The app still receives the callback via the `runflow://auth` deep link, but now it comes **from your server** instead of directly from Strava.

---

## Testing

### Test the Mobile Flow:
1. Open the Android app
2. Tap "Connect Strava"
3. Authorize in the browser
4. Verify the app receives the callback and logs in successfully

### Test the Web Flow:
1. Go to the web app
2. Click "Connect Strava"
3. Authorize in the browser
4. Verify you're redirected to the dashboard

### Debug Checklist:
- [ ] Server receives callback with `state=android_*`
- [ ] Server redirects to `runflow://auth?code=...`
- [ ] Android app intercepts the deep link
- [ ] App successfully exchanges code for tokens

---

## Strava API Settings

Ensure your Strava API application is configured:

| Field | Value |
|-------|-------|
| **Authorization Callback Domain** | `runflow.schuelken.uk` |

No changes needed - the callback domain stays the same!

---

## Summary

| Platform | OAuth Request | Server Action |
|----------|---------------|---------------|
| **Web** | `state=web_*` or no prefix | Exchange tokens, set session, redirect to `/dashboard` |
| **Android** | `state=android_*` | Redirect to `runflow://auth?code=...` |

The beauty of this approach is that **Strava only sees one callback domain**, and your server intelligently routes to the appropriate destination.
