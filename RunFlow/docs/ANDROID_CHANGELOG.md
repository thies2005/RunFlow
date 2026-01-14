# Android Integration Changelog
**Date:** 2026-01-13

This document outlines recent server-side changes that affect the Android application integration.

## 1. Authentication Flow Improvements (Chrome Custom Tabs)

**Change:** The OAuth callback at `/api/auth/strava/callback` now returns an HTML page with JavaScript redirection instead of a 302 HTTP redirect for Android requests (`state=android_*`).

**Reason:** Solves the issue where Chrome Custom Tabs would show a blank page or fail to trigger the deep link.

**Impact:**
- The `runflow://auth` deep link should now reliably trigger on all Android devices/browsers.
- A "manual" button is also provided on the redirect page as a fallback.
- **No app code change required**, but the integration should be more stable.

## 2. Default Redirect URI for Login

**Change:** The `POST /api/mobile/auth/login` endpoint now accepts `redirectUri` as **optional**.

**New Behavior:**
- If `redirectUri` is omitted, the server defaults to: `https://runflow.schuelken.uk/api/auth/strava/callback`.
- If provided, it must match the one used during the Strava OAuth step.

**Impact:**
- simplifies the `/login` request body.
- Ensures compatibility if the app was sending a different or missing redirect URI.

## 3. User Parsing & Full Profile Sync

**Change:** The authentication endpoint (`/api/mobile/auth/login`) now returns **complete user profile data** on every login.

**New Fields Returned:**
- `sex`
- `birthDate`
- `weight`, `height`
- `hrMax`, `hrRest`
- `hrZone1Max` - `hrZone4Max`
- `vdotCorrectionFactor`
- `lastSyncAt`

**Reason:** Previously, only basic info (name/email) was returned. This caused mobile apps to miss critical training settings (like Heart Rate zones) for existing web users.

**Impact:**
- The app should update its local user storage with these fields upon login.
- Users don't need to re-enter their health data in the app.

## 4. Sync Endpoint Error Handling (500 Fix)

**Change:** `POST /api/mobile/v1/sync` now handles token refresh failures gracefully.

**Reason:** If a user's Strava token was invalid, the server was throwing an unhandled exception resulting in a `500 Internal Server Error`.

**Impact:**
- Client will now receive `401 Unauthorized` with a specific error message if the Strava token is invalid, allowing the app to prompt for re-authentication.

---

## 5. API Endpoint Alias

**Change:** Added `/api/mobile/v1/auth/login` as an alias to `/api/mobile/auth/login`.

**Reason:** To support the Android app's path conventions.

**Impact:**
- Both paths are valid and point to the same handler.

---

## Reference: Environment Configuration (For App Developer's Local Server)

If running the backend locally, ensure your `.env` has:

```bash
# Mobile Auth
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=24h
JWT_REFRESH_EXPIRY=30d

# Strava
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://your-local-ip:3000
```
