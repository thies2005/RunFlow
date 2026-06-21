# RunFlow Flutter — Full Audit & Long-Term Roadmap (Google Health Parity)

> **Date:** 2026-06-20
> **Scope:** `flutter/` (package `runflow_flutter`) — architecture, services, data layer, security, tests, Web↔Flutter parity, Google Fit / Health Connect parity.
> **Method:** Four parallel deep-dive agents + line-by-line verification of every CRITICAL/HIGH finding. ~74k LOC, 245 source files, 89 test files analysed.
> **Prior audit:** `flutter/AUDIT_REPORT.md` (2026-04-26). Its Phase 1–3 blockers (compile errors, empty background sync, empty FCM handler, deep-link leak, `app.dart` null crash) are **all fixed**. This report supersedes it.

---

## 0. Executive Summary

The Flutter app has matured significantly since the April audit. It is no longer broken at the seams — it launches, syncs, records runs, and most core flows work. However, a fresh audit surfaced **3 critical security/privacy defects, 12 high-severity bugs, a broken test suite (the single biggest process risk), and substantial feature gaps** vs. both the Web app and Google Health/Health Connect.

**The three things to fix first:**
1. **Session teardown is incomplete** — logout / forced logout leaks the previous user's data (SQLite rows, in-memory caches, FCM token, BLE sensor) to the next user. *Privacy defect.*
2. **The test suite does not compile** — 89 test files reference APIs that no longer exist (`cacheDao`, `database` named param, `deleteAccount`, `syncAll`, `toggleWorkoutCompletion`, `deduplicateActivities`...). `flutter test` is red. Every "passing CI" is hiding regressions.
3. **RunFlow only reads from Health Connect; it never writes.** Recorded runs, routes, nutrition, hydration stay inside RunFlow and never reach the user's Health Connect store — the single highest-ROI move toward Google Health parity.

**The strategic opportunity:** RunFlow already *exceeds* Google Fit in depth (readiness/TRIMP engine, live GPS recording, nutrition tooling, AI coaching). The path to leadership, not just parity, is: **close the Health Connect write loop → cover the long tail of vitals/body records → ship iOS/HealthKit → lean into readiness + HC Training Plans (v1.1)**.

---

## 1. What's Already Fixed (vs. April audit) ✓

| Item | Status | Evidence |
|---|---|---|
| `_showAiScanSheet` compile error | ✅ Fixed | health_screen.dart wired |
| `DropdownButtonFormField.initialValue` → `value` | ✅ Fixed | |
| `app.dart` `Expanded(child: child!)` crash | ✅ Fixed | `app.dart:66` `child ?? SizedBox.shrink()` |
| Duplicate `healthConnectServiceProvider` | ✅ Fixed | |
| Background sync empty stub | ✅ Implemented | `background_sync.dart:33-223` full sync (activities, readiness, weekly reconciliation) |
| FCM background handler empty | ✅ Implemented | `fcm_service.dart:120-157` |
| FCM token never sent to server | ✅ Fixed | `fcm_service.dart:69-76` + `registerPushToken` |
| Deep-link subscription leak | ✅ Fixed | `app.dart:33-35` cancels `_deepLinkSubscription` |
| `refresh_session` null deref | ✅ Fixed | |
| SQLite time-unit mismatch | ✅ Fixed | all timestamps now millis |
| DB migrations | ✅ Added | `app_database.dart:23-185` PRAGMA user_version + 4 migrations |
| WAL + foreign_keys | ✅ Added | `app_database.dart:158-159` |
| Hardcoded dark backgrounds (UI-1/2) | ✅ Mostly fixed | light theme now supported |
| `context.go` → `push` (activity list) | ✅ Fixed | |
| Token refresh thundering-herd | ✅ Correctly deduped | `refresh_interceptor.dart:68-87` Completer |
| Token storage in secure storage | ✅ Correct | `auth_service_impl.dart:11` |
| VO2max / VDOT / TRIMP math | ✅ Correct (textbook Daniels/Banister) | `core/utils/vdot.dart`, `trimp_service.dart` |

---

## 2. Critical Issues (3)

### C1. Incomplete session teardown — user data leaks between accounts
**Files:** `lib/presentation/providers/auth_providers.dart:133-156`
`logout()` invalidates only `fcmServiceProvider`, `healthSyncServiceProvider`, `chatSessionsProvider`. It does **not** invalidate the many `keepAlive: true` repository/cache providers that hold previous-user state — `chatRepositoryProvider` (caches `_sessionsCache`/`_messagesCache`), `dashboardRepositoryProvider`, `activityRepositoryProvider`, `profileRepositoryProvider`, `goalRepositoryProvider`, `cacheDatasourceProvider` (API cache table), `healthApiRepositoryProvider`, `readinessRepositoryProvider`.
**Impact:** User A logs out → User B logs in on the same device → B sees A's dashboard JSON, chat sessions, food favourites, supplement lists. **Privacy violation.**
**Fix:** Extract a single `_tearDownSession()` that invalidates every keepAlive provider, clears SQLite user tables, and stops services. Call from both `logout()` and `forceLogout()`.

### C2. Local SQLite has no per-user isolation
**Files:** `lib/data/datasources/local/app_database.dart` (no `user_id` column anywhere); `auth_providers.dart:146` only `close()`s the handle.
**Impact:** Fasting sessions, body measurements, supplement logs, readiness records, pending-sync payloads, and `api_cache` rows from the previous user are visible/writable to the next user. `close()` doesn't drop rows; the same `runflow.db` file is reused on re-login.
**Fix:** On logout, `DELETE FROM ...` on every user-scoped table (or scope every table by `user_id` and wipe on user change). `close()` alone is insufficient.

### C3. `forceLogout()` skips all cleanup
**Files:** `auth_providers.dart:152-156`; triggered by `refresh_interceptor.dart:47` (`onSessionExpired`) on 401.
**Impact:** When a 401 forces logout, background sync, BLE HR monitor, recording state, and FCM token registration keep running under the now-anonymous session. Recording data may be lost or attributed to nobody.
**Fix:** Route `forceLogout()` through the same `_tearDownSession()` as `logout()`.

> C1–C3 share one root cause: the logout path was grown incrementally and never made into a single exhaustive session-tear-down. Fixing all three together closes the privacy hole.

---

## 3. High-Severity Issues (12)

| # | File:Line | Issue | Impact |
|---|---|---|---|
| H1 | `retry_interceptor.dart:5,52-57` | `RetryInterceptor` retries **non-idempotent POST/PUT** on network timeouts regardless of HTTP method. No idempotency key is sent. | **Duplicate activities, weight logs, supplement logs, double AI charges** when a request times out after server already processed it. |
| H2 | `notification_service.dart:54-66` | Timezone synthesized as `Etc/GMT±N` — only valid for integer offsets. India (+5:30), Iran, Nepal, Myanmar, Lord Howe, etc. fall back to **UTC**. `Etc/GMT-00` is also invalid. | ~25 countries get notifications at the wrong time (e.g. 7 AM readiness fires at 1:30 PM in India). |
| H3 | `calibration_providers.dart:80-84` | Marathon distance (42195 m) maps to `CalibrationRaceType.fiveK` instead of `marathon`. *(verified)* | A marathon finish corrupts the user's VDOT correction as a 5K. |
| H4 | `auth_repository_impl.dart:276-300` | `restoreSession()` falls back to cached `User` on **any** refresh failure, including a 401 (revoked refresh token). | Revoked users stay "logged in" with stale profile until every API call 401s. |
| H5 | `race_providers.dart:180` | `client.dio.get('/api/goals/$goalId/suggest-race')` — relative path with leading `/api` appended to baseUrl `…/api/mobile/v1` → `…/api/mobile/v1/api/goals/…` *(verified)* | Race suggestions always 404. |
| H6 | `retry_interceptor.dart:5` + `refresh_interceptor.dart:8` | Both interceptors are `QueuedInterceptor`s → **every** HTTP call is globally serialized, not just refresh/retry candidates. | Dashboard + activity list + chat can't run in parallel; visible cold-start latency; defeats `Future.wait` parallelism. |
| H7 | `offline_sync_service.dart:24-27`, `readiness_sync_service.dart:21-24` | Failed pending-sync items silently deleted after 5 retries; underlying local row left `is_synced=0` with no queue entry. | Permanently unsynced local-only data; no UI surfacing. |
| H8 | `workout_recording_service.dart:65,73,74` | `_gpsPoints`/`_hrSamples`/`_paceSamples` grow unbounded for the whole recording; copied on every 500 ms metrics tick. Smoothed-pace list mutated inside a *getter* (`:117-124`). | OOM risk on long ultras; jank. |
| H9 | `app_database.dart:153-162` | `database` getter has a check-then-await race — two concurrent callers open two handles. Background isolate opens its own uncoordinated handle. | Resource leak; migration races. |
| H10 | `health_sync_service.dart:110-122` | `writeWeight` constructs an unconfigured `Health()` inline (no `configure()` call) and swallows the exception. | User weights never written to Health Connect; feature silently no-ops. |
| H11 | `calibration_providers.dart:130-166` | `submitShapeFactor` and `submitManualFactor` are **byte-identical** (same `/goals/calibration` POST, same payload). | Dead/misbehaving code; one flow silently overwrites the other. |
| H12 | `local_activity_datasource.dart:200-213` | `updateActivityLocally` interpolates map keys into SQL (`'$key = ?'`). Safe today (hardcoded callers) but signature accepts arbitrary maps with no whitelist. | SQL-injection-shaped code; one bad future caller = full injection. |

---

## 4. Medium / Low Issues (condensed)

**Medium (11):** Router redirect traps auth routes behind onboarding (`app_router.dart:79-90`); cold-start deep links dropped — no `getInitialAppLink()` (`main.dart:89-97`); ~80 sites use `debugPrint` for errors instead of the `AppLogger`/Sentry (`health_providers.dart`, `readiness_orchestrator.dart`, `readiness_models.dart`…) → **production errors invisible**; `Settings` persists enums by `.index` not `.name` (silent corruption on reorder); cache-or-fetch pattern duplicated across 4 repos (DRY); GPS distance accrues on jitter (`distance > 0` instead of `>= 2 m`); notification IDs collide across ranges; `exactAllowWhileIdle` needs `SCHEDULE_EXACT_ALARM` on Android 12+; missing SQLite indexes on `activities(start_date)`, `is_synced`, `pending_sync(entity_type)`; endpoint-prefix inconsistency (3 conventions: `/api/*`, `/api/mobile/v1/*`, `/api/mobile/v1/api/*`); `api_cache` has no eviction policy.

**Low (10):** Top-level global `ProviderContainer` (`main.dart:18`); prod URL baked as compile default; `DioClient.dio` public getter undermines repository encapsulation; `ref.read` instead of `ref.watch` for repo dependencies (latent bug); `ChatNotifier._repo!` non-null assertion; `RetryInterceptor` ignores `Retry-After` on 429; BLE HR accepts out-of-range values (no 30–220 clamp); auto-pause dead-band `[0.5,1.0) m/s` traps slow joggers; background readiness compute passes `maxHr:null,restingHr:null` (heavy approximation); cadence is **fabricated** from speed (`speed*2.5`) and stored as if measured — no running-cadence BLE profile.

---

## 5. Test Suite Crisis (highest process risk)

`flutter analyze` reports **192 issues, ~40 of them ERRORS concentrated in `test/`**. The tests are stale — they reference APIs that were refactored away:

| Broken reference | Files |
|---|---|
| `.cacheDao` getter (removed) | 8+ test files |
| `database:` / `apiRepository:` named params (removed) | 9+ test files |
| `extra_positional_arguments` (ctor changed) | chat/dashboard/activity/repository tests |
| `deleteAccount`, `syncAll`, `toggleWorkoutCompletion`, `deduplicateActivities`, `getWeeklyMileage`, `copyWith` on `NutritionTargets` (removed/renamed) | corresponding tests |
| `overrideWithValue` on generated providers (Riverpod 3 changed API) | barcode, login, profile, water tests |

**Consequence:** `flutter test` cannot pass. CI is effectively blind. Every refactor ships without a safety net. **This must be the first thing repaired** — fix the tests, then keep them green with a `build_runner` + `flutter test` CI gate.

---

## 6. Web ↔ Flutter Feature-Parity Gaps

### CRITICAL gaps
1. **Plan-Advanced editor (entire module)** — Web `plan-advanced/**` (540+ LOC, 30+ components: mass-edit, multi-goal/sub-goals, AI plan analysis/score, progression, pace profile, calendar, structured workout editor, CSV import/export). Flutter only consumes `/api/plan-advanced/[goalId]/sub-goals` for basic CRUD. *(Likely an intentional "keep mobile simple" decision — document it.)*
2. **Account deletion** — `profile_screen.dart:260-290` is a **stub** ("contact support" snackbar); web calls `/api/user/delete`. GDPR blocker.
3. **GDPR consent capture on register** — `register_screen.dart` does not log TERMS/PRIVACY/HEALTH_DATA/AGE_REQUIREMENT consents (web `register/page.tsx:83-91` does). Compliance gap.

### HIGH gaps
4. **Data export UI** — `data_export_providers.dart` is fully implemented but **wired to no screen** (dead code). Web downloads in ProfileModal.
5. **Consent withdrawal per-type** — `consent_management_screen.dart` is view-only + "accept all". Web can withdraw HEALTH_DATA and trigger server-side data wipe.
6. **Login screen has no "Forgot password?" or "Register" links** — the routes exist (`/forgot-password`, `/register`) but are unreachable from `login_screen.dart`. Users can't reach them.
7. **Activity deep-analysis page** — web `/activity/[id]/analysis` + `InteractiveStreamsChart.tsx` has no Flutter equivalent.
8. **AI Settings server sync** — `ai_settings_providers.dart` writes only to SharedPreferences; web persists to `/api/ai/settings`. Settings never cross devices.
9. **TRIMP / rTSS UI** — data is in the entity but `activity_detail_screen.dart` and activity tiles never render it. Web shows it in list + modal.
10. **Day-to-day drag-drop plan reorder** — Flutter has `ReorderableListView` within a day only; web allows moving workouts between days.
11. **Strava status endpoint** — `strava_status_providers.dart:54` calls `/user/strava/status` which **does not exist on the server**; silently fails.

### MEDIUM gaps (12)
Race result 3 modes (only pick in Flutter) · PDF/CSV plan export · Strava disconnect · plan-generator public page · supplement stacks CRUD · meal library · recalculate-VDOT button · server-synced reminder settings · `/api/mobile/v1/user/strava/status` missing on server · `/api/mobile/v1/user/export` missing on server · `/api/mobile/v1/user/delete` missing on server · show unlinked activities on plan.

### Flutter-only strengths (differentiators, keep on mobile)
Live workout recording (GPS + BLE HR + voice coach, 1568 LOC) · activity heatmap calendar · recipe integration (Mealie/Tandoor) · granular notification settings · 13-step onboarding wizard · per-screen health navigation · in-app logs viewer.

---

## 7. Google Fit / Health Connect Parity

### Landscape (important)
Google's health ecosystem is **two layers**, deliberately separating:
- **Health Connect** (Android system store + unified permissions) — the **strategic future**, expanding fast (v1.1.0 Nov 2025 added Skin Temp, Exercise Routes, **Training Plans/PlannedExercise**, Personal Health Records; Mar 2025 added Medical Records/FHIR).
- **Google Fit app + REST API** — feature-frozen / on a deprecation path. Google is migrating developers **away** from Fit APIs toward Health Connect.

> **Strategy:** Health Connect is the correct target (RunFlow already uses it). **Do not invest in the Google Fit REST API.** Benchmark Fit's UX (Heart Points, Move Minutes, Journal) but integrate only via Health Connect.

### Where RunFlow already EXCEEDS Google
- **Readiness score** — Google has **none**. RunFlow's `readiness_orchestrator` combines RHR delta, sleep efficiency/deep%/REM%, and TRIMP → CTL/ATL/TSB. *Defensible differentiator.*
- **Live GPS recording** — full auto-lap, auto-pause, elevation, BLE HR. Fit's is weaker.
- **Nutrition tooling** — barcode + AI scan + micronutrients; deeper than Fit.
- **AI coaching** layered on readiness + training plans.
- **Sleep consistency score** — no Google equivalent.

### Parity gaps (verified against `health_connect_service.dart`)

| Domain | Google offers | RunFlow today | Gap |
|---|---|---|---|
| **HC write-back** | n/a (source) | **Read-only** (except broken `writeWeight` H10) | **MAJOR** — runs, routes, nutrition, hydration never written back |
| HRV (`HeartRateVariabilityRmssd`) | ✅ | Field exists in model, **always null** | Add type to permissions + read |
| Respiratory rate, Blood pressure, Blood glucose, Body temp, Skin temp (v1.1) | ✅ | ❌ | Add types |
| Height, Bone mass, Lean/body-water mass, Waist | ✅ | ❌ (height in profile, not synced) | Add types |
| Floors, Elevation gains, TotalEnergy/BMR, Speed, Distance (read) | ✅ | ❌ (Distance permission requested but **not read**) | Add reads to daily sync |
| **iOS / HealthKit** | ✅ (Fit legacy) | ❌ (`ios: false`) — but `health` pkg supports HK | **Largest market gap** |
| True background sync | `READ_HEALTH_DATA_IN_BACKGROUND` | Foreground `Timer` only | Migrate to WorkManager + bg permission |
| Multi-sport live record | ~100 exercise types | RUN only | Add ride/swim/walk/hike |
| Manual workout entry | ✅ | ❌ | Add screen |
| Garmin/COROS/Polar/Suunto connectors | — | UI stubs `available:false` | Largely free once HC read works (they write to HC) |
| GPX/TCX/CSV export | Fit export removed | ❌ | `share_plus` already in deps |

### Health Connect record constants to add (to `health_connect_service.dart:46`)
- **Activity:** `ExerciseRouteRecord`, `DistanceRecord`, `ElevationGainsRecord`, `FloorsClimbedRecord`, `SpeedRecord`, `Vo2MaxRecord`, `TotalCaloriesBurned`/`TotalEnergyBurned`, `CyclingPedalingCadence`
- **Vitals:** `HeartRateVariabilityRmssd`, `RespiratoryRate`, `BodyTemperature`, `BloodPressure`, `BloodGlucose`, `SkinTemperature` (v1.1)
- **Body:** `Height`, `BoneMass`, `LeanBodyMass`, `BodyWaterMass`, `WaistCircumference`, `BasalMetabolicRate`

---

## 8. Prioritized Remediation Roadmap

### Phase 0 — Repair the safety net (3–5 days) 🔴
1. **Fix the broken test suite** — update all stale references (`cacheDao`, `database:` params, removed methods, Riverpod 3 `overrideWithValue` → new override API). Get `flutter test` green.
2. Add CI gate: `flutter analyze` (0 errors) + `flutter test` + `dart run build_runner build --delete-conflicting-outputs` (fail on diff).
3. Replace ~80 `debugPrint` error sites with `logger.error/warning` → restore production observability.

### Phase 1 — Close privacy/security holes (3–5 days) 🔴
4. Implement single `_tearDownSession()` → invalidate all keepAlive providers, clear SQLite user tables (or scope by `user_id`), stop services. Wire into both `logout()` and `forceLogout()`. **(C1, C2, C3)**
5. Restrict `RetryInterceptor` to idempotent methods; emit `Idempotency-Key` for POSTs. **(H1)**
6. `restoreSession()` — treat 401 from refresh as definitive, only fall back to cache on transient network errors. **(H4)**
7. Move failed sync items to a dead-letter table + UI badge; never silently delete. **(H7)**

### Phase 2 — Fix concrete bugs (3–5 days) 🟠
8. Marathon calibration → `marathon` race type. **(H3)**
9. Race suggestions path — drop the doubled `/api`. **(H5)** Centralize all endpoints in `ApiConstants` (one prefix convention).
10. Notification timezone — use `flutter_timezone` + IANA lookup. **(H2)**
11. Replace `QueuedInterceptor` with `Interceptor` + scoped critical sections. **(H6)**
12. Fix `writeWeight` to use configured `Health` singleton. **(H10)**
13. Delete/merge the duplicate `submitManualFactor`. **(H11)**
14. Bound workout-recording arrays (rolling window/downsample); stop mutating state in getters. **(H8)**
15. Fix `AppDatabase.database` race (cache `Future<Database>`). **(H9)**
16. Whitelist columns in `updateActivityLocally`. **(H12)**
17. Add SQLite indexes; persist `Settings` enums by `.name`.

### Phase 3 — Web parity (compliance + quick wins) (1 week) 🟠
18. Account deletion → call `/api/user/delete` (or add mobile route). **(Web gap #2)**
19. GDPR consent logging on register + per-type withdrawal in consent screen. **(#3, #5)**
20. Wire `data_export_providers` to a Profile screen button + add server routes `/api/mobile/v1/user/{export,delete,strava/status}`. **(#4, #11)**
21. Add Forgot-password + Register links to `login_screen.dart`. **(#6)**
22. Render TRIMP/rTSS in activity detail + tiles. **(#9)**

### Phase 4 — Health Connect parity (highest strategic ROI) (2–3 sprints) 🟢
23. **Write `ExerciseSessionRecord` + `ExerciseRouteRecord`** on every recorded run stop. *(Closes the loop — RunFlow becomes a HC data source.)*
24. Add **WRITE permissions** + the new READ types (HRV, respiratory, BP, glucose, height, bone/lean mass, temp, floors, elevation, speed, distance).
25. Wire HRV into the existing-but-null `VitalsData.hrv` field.
26. Write `NutritionRecord` + `HydrationRecord` back to HC.
27. Migrate the 15-min foreground `Timer` → real `workmanager` background task + `READ_HEALTH_DATA_IN_BACKGROUND`.
28. Manual workout entry screen + multi-sport live record (ride/swim/walk/hike).

### Phase 5 — iOS / HealthKit (biggest market unlock) (2–3 sprints) 🟢
29. Enable iOS target; abstract `HealthConnectService` → `HealthDataService` (the `health` pkg is already cross-platform and maps ~1:1). HealthKit unlocks the entire iOS running market.

### Phase 6 — Lead, don't match (ongoing) 🟣
30. **HC Training Plans (`PlannedExerciseBlock`, v1.1)** read/write — pair RunFlow's plan engine + readiness with on-device training plans. *Nothing from Google competes here.*
31. GPX/TCX/CSV export via `share_plus`.
32. Running-cadence BLE profile (replace fabricated cadence).
33. Wear OS companion.

---

## 9. Top 10 Quick Wins (ranked by impact ÷ effort)

| # | Action | Effort | Why first |
|---|---|---|---|
| 1 | Fix the test suite | Med | Restores all safety nets; unblocks every future change |
| 2 | `_tearDownSession()` unified | Small | Closes a real privacy hole |
| 3 | Restrict POST retry + idempotency key | Small | Stops duplicate writes |
| 4 | Marathon calibration race type | Trivial | One-line correctness fix |
| 5 | Race suggestions path | Trivial | One-line; unblocks a feature |
| 6 | Write runs to Health Connect | Small-Med | Single biggest Google-parity move |
| 7 | Login screen nav links + GDPR consent | Small | Compliance + onboarding completion |
| 8 | Wire account deletion | Small | GDPR compliance |
| 9 | Replace `debugPrint` with logger | Mechanical | Restores prod observability |
| 10 | Add HRV/BP/glucose reads | Small | Narrows vitals gap fast |

---

## 10. Positive Observations (keep doing)

- VO2max/VDOT/TRIMP math is textbook-correct (Daniels + Banister EWMA) and gracefully bounded.
- Token refresh correctly dedupes via Completer (no thundering herd).
- Tokens in `flutter_secure_storage` (Keystore); no hardcoded secrets; `STRAVA_CLIENT_ID`/`SENTRY_DSN` via `String.fromEnvironment`.
- All hot SQL uses parameterized `?` placeholders (only H12 is the column-name edge).
- SQLite migrations via `PRAGMA user_version` is the right pattern; WAL + FK on.
- Riverpod 3 + freezed + json_serializable codegen discipline is consistent; generated files in sync.
- Readiness engine, live GPS recording, nutrition depth, and AI coaching already **exceed** Google Fit.

---

*End of report. Source: 4 parallel deep-dive agents + spot-verification of every CRITICAL/HIGH claim against current source.*
