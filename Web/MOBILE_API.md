# RunFlow Mobile API Documentation

This document describes the API interactions for the **RunFlow Hybrid Mobile App** (Capacitor). Since the mobile app is a wrapper around the web application, it primarily uses the same internal API routes as the frontend, with some specific handling for native features like Health Connect.

## Base URL

Relative to the web application root: `/api`

## Authentication

The app uses **NextAuth.js** sessions.
- **Web View**: Standard cookie-based session.
- **Native Requests**: The app shares the session cookie with native requests (Capacitor Http/Fetch).

---

## Endpoints

### 1. Health Connect / Manual Activity Sync

Used to sync activities from the device's Health Connect store or create manual entries.

**POST** `/activities`

**Request Body:**
```typescript
{
  name: string;           // Activity name
  date: string;           // ISO 8601 date string
  type: string;           // "RUN", "RIDE", etc.
  distance: number;       // Kilometers (will be converted to meters)
  duration: number;       // Minutes (will be converted to seconds)
  hr?: number;            // Average Heart Rate (bpm)
  hrZones?: {             // Time in zones (seconds)
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
    z6: number;
    z7: number;
  }
}
```

**Response (200 OK):**
```json
{
  "id": "clm...",
  "stravaId": "-12345...",
  "duplicate": false
}
```

**Response (Duplicate):**
```json
{
  "id": "clm...",
  "duplicate": true,
  "message": "Activity already exists"
}
```

### 2. Standard Data Access

The mobile app accesses the same data endpoints as the web frontend:

- **Dashboard**: `GET /dashboard`
- **Activities**: `GET /activities`
- **Analytics**: `GET /analytics/stats`
- **Goals**: `GET /goals`

Refer to the [Main Documentation](DOCUMENTATION.md) for details on these endpoints.

---

## Authentication Flow (Mobile)

1. **Login**: User logs in via the Web View (Strava/Email).
2. **Session**: NextAuth session cookie is set.
3. **Native Calls**: Capacitor captures the cookie usage or the app manually passes headers if configured (currently cookie-based).

### OAuth Deep Linking (Strava)

For simpler mobile login, the app supports deep linking:
- **Scheme**: `runflow://`
- **Callback**: `runflow://auth/callback`

This ensures that when Strava redirects back after auth, the Android app opens instead of the browser.
