# RunFlow Release Notes

Versioning note: the web app (`Web/package.json`) and the Android app
(`android/app/build.gradle.kts`, `versionName`) version independently. Current as of
**2026-10-20**: web `1.2.9`, Android `2.8.0` (versionCode 21). For fine-grained history see
`git log` / git tags.

---

## Android 2.8.0 / Web 1.2.9 (October 2026)

### Dual MCP (Model Context Protocol)
- **Private MCP at `/mcp`** for Paid-Premium users: 16 coaching tools (fitness, cycling
  analytics, readiness/health, plan & structured-workout mutations) behind **OAuth 2.1 with
  PKCE + dynamic client registration** — works as a Custom MCP in Claude and Gemini.
- **Public stateless MCP at `/mcp/public`**: `generate_running_plan`, `calculate_vdot_paces`,
  `export_plan_url` — no account required, rate-limited 10 req/hour.
- Hardening rounds: redirect-URI allowlist, code-replay protection, CSRF, cross-tenant IDOR,
  token refresh bounding (only SHA-256 hashes stored).

### Structured Workouts v2 + studio
- v2 schema: nested repeat groups (depth ≤ 3), per-step pace/HR/power/RPE/cadence targets with
  ranges, `lap_press` durations, planned TSS (flattened-step cap 500).
- **`/calendar`** replaces the old `/plan` week list (drag-reschedule, detail drawer);
  **`/plan-advanced`** studio upgraded: v2 editor, engine generator, phase blocks, week
  copy/paste, live planned-TSS/PMC projection.
- **`.zwo` export** (Zwift/MyWhoosh-compatible) + MyWhoosh catalog matching
  (`User.matchToMyWhoosh`), backed by the scraped MyWhoosh seed catalog.

### MyWhoosh workout file import (web)
- **Import `.zwo` / MyWhoosh workout-JSON files** into any plan from the `/plan-advanced` editor
  (next to CSV import): structured steps are preserved and workouts are scheduled one per day
  from a chosen start date (up to 100 files / 5 MB per import).
- **Auto-classification**: rides become `RIDE` / `RIDE_INTERVALS` / `LONG_RIDE` based on
  intensity and duration; run files import as RUN workouts — all editable in the v2 editor.
- **File-based import only — no MyWhoosh account connection.** Files are parsed in the app and
  never sent anywhere; the unofficial MyWhoosh API is intentionally not used.

### Cycling power engine
- Strava watts-stream sync; **eFTP**, MMP power curves, NP/IF/VI, bike TSS, efficiency factor
  & aerobic decoupling; split run/ride/combined PMC; backfill of power/TSS on existing rides.
- Web: analytics sport switcher + ride power modal; Android: dedicated **Cycling tab**, ride
  power card, FTP settings.

### Two-metric VO2max calibration
- **Effective VO2max** (best-effort from activities, 90-day lookback) and the **Swain
  HR-based** estimate are tracked and calibrated independently, with unified labels on web and
  Android.

### Android 2.5–2.8 line
- **Health & readiness** (2.5.0): Health Connect daily metrics (RHR/HRV/sleep), on-device
  readiness scoring & sync, data-source setup.
- **Recovery rounds** (2.6.0–2.7.3): HRV scoring, sleep analysis, auto body/zones (Room v12),
  split RHR/HRV recovery charts.
- **Guided player v2 + Room v13** (2.4.x): per-step range enforcement, manual lap button,
  structured v2 editor on device.

### Security hardening (web)
- Tenant-ownership enforcement across progression/week-copy/stacks/push endpoints; ReactMarkdown
  sanitization; BYOK quota-bypass fix + full AI route metering; bounded analytics ranges &
  plan horizons; admin CSRF/lockout fixes; service-worker cache eviction on sign-out.

---

## Earlier (Beta v1.x era — historical)

- Capacitor-based Android app (since replaced by the native Kotlin app; Flutter removed at
  v2.3.0), Health Connect integration, 7-zone heart-rate model.
- Email/password + magic-code login; JWT admin authentication, CSRF on admin mutations,
  strict rate limiting on verification endpoints, `SameSite=Strict` admin cookies.
- Effective VO2max introduction, unified app icons, dark-mode and onboarding polish.

---

> Please report any issues on [GitHub](https://github.com/thies2005/RunFlow/issues).
