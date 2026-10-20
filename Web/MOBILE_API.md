# RunFlow Mobile API

The server-side contract for the **native Android app** (`android/`, `com.runflow2.app`).
All endpoints live under `/api/mobile/…`, authenticate with **JWT bearer tokens**, and are
consumed by the app's Retrofit client (`android/.../data/net/Api.kt`).

> Note: the old Capacitor hybrid app (session-cookie based, documented here previously) is
> legacy and no longer the mobile client. The Capacitor project under `Web/android/` is unused.

---

## Authentication

### Email login

```
POST /api/mobile/v1/auth/email-login
{ "email": "…", "password": "…" }
```

Returns JWT access + refresh tokens (signing key: `JWT_SECRET`; access token default 24 h,
refresh token default 30 d). Rate-limited per client (5 attempts / 60 s). The Android client
stores tokens in a private DataStore and performs single-flight refresh — one automatic retry
on a `401`.

Other auth endpoints under `/api/mobile/v1/auth/`: `login` (Strava code exchange), `register`,
`verify-email`, `resend-verification`, `forgot-password`, `refresh`, `logout`.
Legacy aliases for `login` / `logout` / `refresh` also exist at `/api/mobile/auth/*`.

**Revocation:** each user has a `tokenVersion`; bumping it (e.g. on password change) invalidates
all outstanding JWTs.

### Strava sign-in

The app opens the Strava consent page in a Custom Tab; the server exchanges the code
server-side (the Strava client secret never reaches the device) and 302s to the app's
**verified App Link**:

```
https://runflow.schuelken.uk/auth/app-callback?code=…
```

(`assetlinks.json` on the server domain, release cert). The legacy `runflow2://auth/callback`
custom scheme remains as an unverified fallback. The code is exchanged via
`POST /api/mobile/v1/auth/login`.

All subsequent requests use `Authorization: Bearer <accessToken>`.

---

## Endpoint Catalog

Base: `/api/mobile/v1` (JWT unless noted)

| Group | Endpoints | Purpose |
|---|---|---|
| `auth` | `email-login`, `login`, `register`, `verify-email`, `resend-verification`, `forgot-password`, `refresh`, `logout` | Account & token lifecycle |
| `dashboard` | `GET /dashboard` | Dashboard payload for the app home screen |
| `activities` | `GET /activities`, `GET /activities/{id}` (detail incl. stored streams), create/update/delete | Activity access; phone-recorded streams are uploaded here so the web can chart them |
| `analytics` | `GET /analytics/stats`, `GET /analytics/history`, `GET /analytics/cycling` | Running analytics snapshot, PMC history, cycling analytics |
| `goals` | `GET /goals`, `POST /goals`, `GET/PUT/DELETE /goals/{id}`, `GET /goals/{id}/export` | Plan CRUD. `POST /api/plans` / `POST /api/plans/import` (web routes, mobile-JWT capable) upload locally generated plans verbatim |
| `workouts` | `GET /workouts`, `PUT /workouts/{id}`, `POST /workouts/{id}/complete`, `POST /workouts/reorder` | Workout edits, completion, day shifts |
| `sync` | `POST /sync`, `GET /sync` | Outbox drain + server delta pull; `POST` also triggers server-side Strava import |
| `health` | `GET /health/daily`, `/health/history`, `/health/body-composition`, `/health/fasting`, `/health/insights`, `/health/supplements` (+ `/analytics`), `/health/sync-batch`, `/health/nutrition/*` (log, meals, target, suggest, search, scan, ai-scan, analytics, favorites) | Health metrics ingestion & nutrition/supplement tracking |
| `readiness` | `GET /readiness/daily` (+ `/{date}`), `/readiness/weekly` (+ `/{weekStart}`), `/readiness/history`, `/readiness/baseline` | The Android app scores readiness **on-device** and syncs the resulting records up |
| `ai` | `POST /ai/activity-feedback` | On-demand AI overview for a run (same generation as the web's AI Coach Feedback card); queued fallback when the LLM run exceeds the 30 s client read timeout. AI chat streams from the web route `/api/ai/chat` (SSE) |
| `settings` | `GET/PUT /settings/api-key` | Server API key for MCP/external use |
| `user` | `GET/PUT /user/profile`, `/user/consent` (+ `/check`) | Profile & consent management |
| `device` | `POST /device/token` | Push notification device registration |

---

## Sync Model (offline-first)

1. Local writes land in Room + the `sync_queue` outbox in one transaction.
2. A `SyncManager` drains the outbox (push), then applies server deltas (server wins for
   non-dirty data), reconciles local↔server ids, and prunes rows deleted server-side.
3. Failures dead-letter after 8 retries or on permanent 4xx — nothing is silently dropped.
4. WorkManager runs a periodic sync every 30 minutes (network-constrained); explicit user
   actions (pull-to-refresh, "Sync now") force a sync past the Strava import throttle.

Plans are bridged between web and app via pure mappers (`PlanMappers`): units, JS weekdays
0–6, ISO dates and `restDays` arrays are converted, and raw web workout types/phases (BRICK,
TRANSITION_PRACTICE, …) survive the round trip in dedicated columns.

---

## Health Connect

The app reads runs and health metrics (resting HR, HRV, sleep) from the device's Health Connect
store with read-only permissions. Imported runs are deduplicated two ways — Health Connect
record id plus fuzzy start-time/distance match — so a workout recorded in both RunFlow and
another app lands only once. Data leaves the device only through the opt-in account sync.
