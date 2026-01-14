# 🐛 Bug Report: 500 Internal Server Error on `/sync`

## Incident Summary
The Android mobile client is receiving a `500 Internal Server Error` when attempting to trigger a data sync via `POST /api/mobile/v1/sync`.

**Timestamp:** `2026-01-13T13:48:56.907Z`
**Path:** `/api/mobile/v1/sync`
**Error Code:** `INTERNAL_ERROR`
**User ID:** (Derived from Strava Auth, Name: "Thies Schuelken")

## Request Details
```http
POST /api/mobile/v1/sync HTTP/1.1
Host: runflow.schuelken.uk
Authorization: Bearer <valid_token>
Content-Length: 0
```

## Response Details
```json
{
  "error": "An error occurred",
  "code": "INTERNAL_ERROR",
  "timestamp": "2026-01-13T13:48:56.907Z",
  "path": "/api/mobile/v1/sync"
}
```

## Context & Observations
1.  **Missing Email:** The user's `email` field in the `/dashboard` response is `null`, even though the Android client is now requesting the `read_all` scope during Strava OAuth.
2.  **Auth Flow:** The user re-authenticated successfully.
3.  **Data State:** The user has 0 activities in the mobile response (`totalActivities: 0`).

## Questions for Server Team

1.  **Null Email Handling:** Does the `/sync` logic (or any downstream service like Plan generation or Notification) strictly require the user's `email` to be present?
    *   *Hypothesis:* The code might be attempting to access `user.email` without a null check, causing a NullPointerException.

2.  **User Profile Update:** Does the backend update the User's profile (specifically pulling the email from Strava) *every time* they log in, or only on initial registration?
    *   *Context:* If the user registered before we added the `read_all` scope, their DB record might currently have `email: null`. If the login handler doesn't update this from the new token's data, they are stuck in this state.

3.  **Zero-State Sync:** Is there a known issue syncing an account that has 0 activities or is in a "fresh" state?

4.  **Log Check:** Can you check the server-side logs for the timestamp `2026-01-13T13:48:56.907Z`? The error ID/Trace would confirm if this is a database constraint, a missing field, or an external API failure.
