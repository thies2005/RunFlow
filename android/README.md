# RunFlow — Native Kotlin Rewrite (Material 3 Expressive)

Native Android (Kotlin + Jetpack Compose) rewrite of the RunFlow Flutter app, focused on
**training, planning, analytics, account sync and an AI coach**. Health & nutrition features
(food logging, supplements, fasting, sleep, readiness) are intentionally deferred to a later
phase. Server sync is offline-first: everything works without a connection and reconciles with
`https://runflow.schuelken.uk` whenever one is available.

- **Package / applicationId:** `com.runflow2.app` (same identity as the Flutter app)
- **minSdk 29 · target/compile SDK 36 · JDK 17 · Kotlin 2.2.20 · AGP 8.11.1**

## Build & run

```bash
cd android
./gradlew assembleDebug          # debug APK  → app/build/outputs/apk/debug/
./gradlew assembleRelease        # R8-minified + signed (needs android/key.properties) → app/build/outputs/apk/release/
./gradlew testDebugUnitTest      # 46 unit tests (math, plan, sync mappers, SSE parser, Strava OAuth, API contract)
```

No API keys or backend required — the app is **fully local-first** (Room + DataStore) and seeds
~6 months of realistic demo data (progressive fitness ramp, completed half-marathon goal,
active marathon plan) on first launch.

## Feature set

**Training**
- GPS recording via platform `LocationManager` (no Google Play Services dependency — works on
  emulators and de-Googled devices), foreground service with live notification
- Live pace (30 s smoothed window), distance, elevation gain, auto-lap per km, auto-pause
- Pace-zone indicator (±10 % of target) + TTS voice coach (km splits, pace warnings, step cues)
- Structured workout steps engine (warm-up / main / cool-down with progress + next preview)
- Post-run summary with route canvas, splits, and automatic TRIMP / VDOT estimation

**Planning**
- 6-step plan wizard: goal & race type (17 types incl. ultra/tri), race date, calibration race,
  target-time slider with VDOT projection, volume (runs/week, weekly km, long run), weekly schedule
  (long-run day, quality day, rest days)
- Local plan generator: base/build/peak/taper phases, 4-week cycle with recovery weeks, long-run
  progression with time-on-feet cap, quality-session rotation by phase, pace targets from VDOT
- Plan board grouped by week with phase chips; workout actions: start / complete / edit targets /
  shift day / delete; race-result flow that recalibrates the VDOT correction factor

**Analytics**
- CTL / ATL / TSB (Banister impulse-response, 42/7-day time constants) with drag-scrubber chart
  and 30/60/90/365-day ranges
- Daniels–Gilbert VDOT: effective VO₂ max from best recent performance, race predictions
  (5K/10K/HM/Marathon), training-pace table (E/M/T/I/R)
- Weekly volume (26 weeks), 7-zone HR distribution, marathon-shape ring + VDOT trend

**Athlete**
- Profile, body & threshold metrics, editable 7-zone HR model with validation
- Settings: metric/imperial, light/dark/system theme + dynamic color, voice coach, auto-pause
- **AI Coach** (v2.1): streamed chat against the server's AI backend (`/api/ai/chat`, SSE token
  stream), conversation cached in Room so it can be reread offline, new-chat sessions,
  graceful errors (offline, expired session, admin-gated AI access)

**Account & sync (v2.1)**
- Email sign-in against `/api/mobile/v1/auth/email-login` with single-flight token refresh
  (one automatic retry on 401); tokens in a private DataStore
- **Strava OAuth sign-in (v2.2)**: "Continue with Strava" opens the Strava consent page
  (client id 193995, scope `read,activity:read_all`) in a **Custom Tab** (like the Flutter
  app's flutter_web_auth_2; falls back to the default browser when none is available), with
  `approval_prompt=force` so the Authorize click gives the browser the user activation it
  needs to follow the server's 302 back to `runflow2://auth/callback?code=…`. The app
  receives the deep link (cold start + warm restart) and exchanges the code via
  `POST /auth/login`. Errors (cancelled consent, expired state, rejected code) surface as
  readable messages
- Server URL defaults to `https://runflow.schuelken.uk` and is changeable **only** in
  Settings → Advanced (e.g. for staging); switching servers re-syncs immediately
- **Offline-first outbox sync**: local writes land in Room + `sync_queue` in one transaction;
  a SyncManager drains the outbox (push) then applies server deltas (server wins), reconciles
  local↔server ids, and prunes rows deleted on the server. Dead-letters after 8 retries or on
  permanent 4xx — nothing is silently dropped
- WorkManager periodic sync every 30 min (network-constrained) + immediate sync after saving a
  run and at app start; server-side Strava import triggered at most every 6 h via `POST /sync`
- Demo data is flagged `isDemo` and cleared automatically on first login
- Plans/goals remain local for now (the server plan model at `/api/plans` has a different
  contract than the local generator — porting it is a documented next step)

**UI**
- Material 3 **Expressive**: `MaterialExpressiveTheme`, `Large/MediumFlexibleTopAppBar`,
  cookie-shaped record button, expressive motion, brand orange (#FF6B35) on OLED-black dark theme
- Custom Canvas charts (fitness lines, volume bars, zone bars, route, rings) — no chart library

## Architecture

```
core/math        VdotMath, TrainingLoad (TRIMP/CTL/ATL/TSB), TrainingPaces   (pure Kotlin, tested)
domain/model     enums + pace-zone evaluator
domain/plan      PlanGenerator, RaceDefaults                                (pure Kotlin, tested)
domain/analytics AnalyticsEngine                                            (pure Kotlin)
data/db          Room: activities / goals / workouts / profile / sync_queue (outbox) /
                 chat_messages; schema v2 with a tested v1→v2 migration
data/net         Retrofit API mirroring the Flutter wire contract, AuthStore (tokens +
                 OAuth hand-off), NetworkClient (bearer header + single-flight 401 refresh),
                 StravaAuth (authorize URL / deep-link parser, pure + tested)
data/sync        SyncManager (push→pull reconciliation), SyncMappers (pure, tested),
                 SyncWorker (WorkManager periodic + on-demand)
data/ai          AiCoachRepository (SSE streaming), SseParser (pure, tested)
data/repo        RunFlowRepository (analytics aggregation, plan creation, outbox enqueue),
                 SettingsRepository (DataStore)
data/seed        DemoSeeder (26 weeks of history + goals, flagged isDemo)
recording        RecordingController (state machine, single-thread confinement),
                 RecordingService (foreground, LocationManager, TTS voice coach)
ui               theme / components / screens (dashboard, plan, wizard, record,
                 analytics, athlete + subscreens, onboarding)
```

All recording state mutations are confined to the main thread (GPS callback + service ticker)
to keep the read-modify-write state updates race-free.

## Signing the release build

Signing is already wired up: `app/build.gradle.kts` reads `android/key.properties`
(gitignored) when present and signs the release build. A dedicated keystore lives at
`android/keystore/runflow2-release.jks` (gitignored).

`key.properties` format:

```properties
storeFile=keystore/runflow2-release.jks
storePassword=<password>
keyAlias=runflow2
keyPassword=<password>
```

A ready-to-install signed APK is at `android/RunFlow2-v2.2.1-release.apk`.

## Deferred (next phases)

- Health & nutrition (food/macro logging, barcode & AI scan, supplements, fasting, sleep,
  readiness scoring) — the Flutter implementation in `flutter/lib/presentation/screens/health/`
  is the reference
- Strava OAuth + server sync against `https://runflow.schuelen.uk/api/mobile/v1`
- AI coach chat, workout template library, strength recorder, route heatmap
