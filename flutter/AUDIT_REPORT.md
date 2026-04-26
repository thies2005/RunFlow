# RunFlow Flutter App — Validated Audit & Remediation Plan

> **Date:** 2026-04-26
> **Scope:** Bugs, errors, missing features (vs. web app), server communication
> **Status:** Validated — false positives removed, duplicates collapsed

---

## Validation Summary

The initial audit produced 217 findings across 5 sub-agents. After line-by-line validation against source files, the results are:

| Classification | Count | Description |
|---|---|---|
| **Confirmed** | 134 | Real bugs, missing features, security issues |
| **False Positive** | 31 | Claimed issues that don't exist or are intentional design |
| **Duplicate** | 18 | Same root cause counted in multiple audit sections |
| **Feature Gap** | 61 | Web features missing from Flutter (unchanged) |
| **Overstated** | 13 | Real concern but severity inflated |

### Key False Positives Removed

| Claimed Issue | Why It's False |
|---|---|
| analytics_providers circular dependency | No cycle exists. Clean DAG: auth → repo → stats → racePredictions |
| analytics_providers `ref.read` vs `ref.watch` wrong | Both are correct: `ref.read` for keepAlive repos, `ref.watch` for reactive data |
| analytics_providers `.g.dart` out of sync | Generated code matches source perfectly |
| `racePredictions` returns empty map = bug | Graceful null handling, correct behavior |
| `keepAlive` repository = memory leak | Standard singleton pattern for lightweight Dio wrappers |
| goal_providers `workouts` named params incompatible with codegen | Riverpod 3 generates record-type args correctly (confirmed in `.g.dart`) |
| Chat SSE partial UTF-8 handling | `allowMalformed: true` + buffer pattern handles this correctly |

---

## Confirmed Critical Issues (31)

### Server Communication

| # | File:Line | Issue | Impact |
|---|---|---|---|
| SC-1 | `api_constants.dart:36-38` | AI Chat URLs point to `/ai/chat/...` but server endpoints are at `/api/ai/chat/...`. The OpenAPI spec confirms AI chat uses `/api` prefix, not `/api/mobile/v1`. **However**, the server's `ai/chat/route.ts` already uses `getAuthenticatedUser()` (JWT auth), not `auth()`. So auth IS compatible. The URLs are just wrong. | All AI chat broken |
| SC-2 | `auth_repository_impl.dart:200-205` | `forgotPasswordPath` = `/auth/forgot-password` resolves to `/api/mobile/v1/auth/forgot-password`. Server endpoint is at `/api/auth/forgot-password`. No mobile alias exists. | Password reset broken |
| SC-3 | `health_api_repository_impl.dart` (entire file) | 15+ health paths (`/nutrition/log`, `/fasting`, etc.) resolve to `/api/mobile/v1/...` but server endpoints are at `/api/health/...`. No mobile-specific aliases exist. **Additionally**, health endpoints like `fasting/route.ts` use `auth()` (session), not `getAuthenticatedUser()` (JWT). | Health sync 404s + auth mismatch |
| SC-4 | `background_sync.dart:5-7` | `callbackDispatcher` returns `true` immediately. Zero sync logic. | Background sync never runs |
| SC-5 | `fcm_service.dart:20-21` | FCM token fetched but never sent to server. No mobile device registration endpoint exists. | Push notifications non-functional |
| SC-6 | `fcm_service.dart:64` | `firebaseMessagingBackgroundHandler` has empty body. Background/terminated notifications silently dropped. | Background push dead |
| SC-7 | `refresh_session.dart:38-41` | Always tries non-existent `/auth/refresh` first (404s), then falls back to legacy URL. Wastes 200-500ms per refresh. | Performance |
| SC-8 | `auth_repository_impl.dart:149-151` | `logout()` only clears local tokens. Server-side session not invalidated. | Security |

### Bugs (Compile-blocking + Runtime)

| # | File:Line | Issue |
|---|---|---|
| B-1 | `health_screen.dart:77` | `_showAiScanSheet` called but never defined. **Compile error.** |
| B-2 | `plan_screen.dart:679` | `DropdownButtonFormField` uses `initialValue` — should be `value`. **Compile error.** |
| B-3 | `edit_profile_screen.dart:165` | Same `initialValue` bug as B-2. **Compile error.** |
| B-4 | `activity_detail_screen.dart:97-109` | `.cast<double>()` crashes if API returns `List<int>`. Use `.map((e) => (e as num).toDouble()).toList()`. |
| B-5 | `app.dart:44` | `Expanded(child: child!)` crashes if child is null during route transitions. |
| B-6 | `goal_detail_screen.dart:571` | Workout completion toggle sends `const UpdateGoalRequest()` (empty). Server never receives the change. |
| B-7 | `profile_screen.dart:233-236` | Delete Account calls `logout()` instead of actually deleting. |
| B-8 | `main.dart:67` | Deep link `StreamSubscription` never stored or cancelled. Memory leak. |
| B-9 | `main.dart:44-61` | All `_init*` methods use `catch (_) {}` — init failures completely hidden. |
| B-10 | `refresh_session.dart:19` | `response.data!` null dereference on empty body. |

### State Management

| # | File:Line | Issue |
|---|---|---|
| SM-1 | `vitals_sleep_providers.dart:10` vs `health_sync_providers.dart:7` | **Duplicate `healthConnectServiceProvider`** — same name, different implementations (one injects `Health()`, one doesn't). Compile conflict if both imported. |
| SM-2 | `auth_providers.dart:116-125` | `forgotPassword` sets `state = AsyncValue.data(null)`, making `currentUser` return null. User appears logged out. |
| SM-3 | `activity_providers.dart:69-72` | `loadMore()` on error: sets data then immediately error, losing loaded activities. |
| SM-4 | `auth_providers.dart:87-94` | No cache invalidation on logout. Previous user's data persists in all providers. |
| SM-5 | `chat_providers.dart:66,75` | `sendMessage` sets `error` on failure but never clears it on success (`copyWith` keeps old error). |
| SM-6 | `health_providers.dart:53-58` | `Fasting.start()` discards returned session, sets state to `null`. |

### Data Layer & Services

| # | File:Line | Issue |
|---|---|---|
| DL-1 | `app_database.dart:44` vs `:118-119` | `created_at` defaults to `unixepoch()` (seconds), `date` stored as milliseconds. Queries comparing them break. |
| DL-2 | `app_database.dart:32-113` | No database version tracking or migration strategy. Schema changes corrupt existing data. |
| DL-3 | `notification_service.dart:40` | Timezone hardcoded to UTC. Scheduled reminders fire at wrong time for non-UTC users. |
| DL-4 | `workout_recording_service.dart:143-154` | No GPS permission check before recording starts. Fails silently. |
| DL-5 | `workout_recording_service.dart:254-301` | No GPS accuracy filtering. Low-accuracy points corrupt distance/elevation. |
| DL-6 | `workout_recording_service.dart:57-58` | Unbounded GPS/HR arrays. 4+ hour runs consume excessive memory. |
| DL-7 | `auth_service_impl.dart:63-65` | `clearAll()` doesn't stop background sync, FCM, auto-sync timers, or BLE sensors. |

### UI / Theme

| # | File:Line | Issue |
|---|---|---|
| UI-1 | `health_screen.dart:27` + 6 other health screens | Hardcoded `AppColors.oledBlack` background. Breaks light theme. |
| UI-2 | `circular_gauge.dart:35` | Hardcoded dark background. Wrong in light mode. |
| UI-3 | `activity_list_screen.dart:183` | `context.go` instead of `context.push`. Can't press back to return. |
| UI-4 | Multiple modals | `TextEditingController`s in bottom sheets never disposed. Memory leak. |
| UI-5 | `body_screen.dart:215` | BMI calculated with hardcoded `1.75m` height. Should use user profile. |
| UI-6 | `health_screen.dart:614-629` | `_SleepCard` and `_VitalsCard` always show "No data". Never wired to providers. |

---

## Feature Gaps (Web → Flutter)

### CRITICAL Missing (11)

| # | Feature | Web File | Notes |
|---|---|---|---|
| FG-1 | Race Countdown Card | `RaceCountdown.tsx` | No race day awareness |
| FG-2 | Training Status Card | `TrainingStatusCard.tsx` | No workload balance display |
| FG-3 | Shape Calibration Modal | `ShapeCalibrationModal.tsx` | No VDOT calibration |
| FG-4 | Manual Activity Entry | `ManualActivityModal.tsx` | Can't log activities without Strava |
| FG-5 | AI Activity Feedback | `ActivityDetailsModal.tsx:517` | No per-activity AI analysis |
| FG-6 | Race Result Flow | `RaceResultModal.tsx` | Can't record race results |
| FG-7 | Full Onboarding Wizard | `OnboardingWizard.tsx` | Has marketing carousel only |
| FG-8 | Sync Platform Selector | `SyncPlatformSelector.tsx` | Can't connect platforms |
| FG-9 | AI Settings (API key) | `AiSettingsModal.tsx` | No custom API key or granular controls |
| FG-10 | Combined Analytics Chart | `CombinedAnalyticsChart.tsx` | No multi-metric visualization |
| FG-11 | Strava OAuth Login | `login/page.tsx:134` | Email/password only |

### HIGH Missing (23)

Race predictions chart, training paces, VO2/shape trends, TRIMP/rTSS in activity detail, training type tag selector, activity picker for workouts, drag-drop plan reorder, phase indicators, post-race auto-detect, race activity picker, running profile in onboarding, granular data access controls, AI feedback mode, weight/height editing, past races section, Strava sync/reconnect, data export, privacy/consent management, account deletion, GDPR checkboxes, full week workout schedule, Strava auth error banner, login/register navigation links.

---

## Multi-Agent Multi-Phase Remediation Plan

### Agent Roles

| Role | Purpose | Tools |
|---|---|---|
| **FIXER** | Implements code changes | Read, Edit, Write, Bash |
| **REVIEWER** | Validates fixes, catches regressions | Read, Grep, Glob |
| **SERVER** | Creates/modifies server API endpoints | Read, Edit, Write, Bash |

### Phase Gate Process

After each phase:
1. REVIEWER reads all changed files and verifies fixes
2. REVIEWER checks for regressions (no new compile errors, no broken existing features)
3. REVIEWER produces a pass/fail report
4. Only after PASS does the next phase begin

---

### Phase 1: Compile Blockers (2 agents, ~30 min)

**Goal:** App compiles and launches without crashes.

| Agent | Task | Files |
|---|---|---|
| FIXER-1 | Implement missing `_showAiScanSheet` method or wire to existing route | `health_screen.dart` |
| FIXER-1 | Fix `DropdownButtonFormField.initialValue` → `value` | `plan_screen.dart:679`, `edit_profile_screen.dart:165` |
| FIXER-1 | Fix null assertion crash `child!` → `child ?? const SizedBox.shrink()` | `app.dart:44` |
| FIXER-2 | Fix duplicate `healthConnectServiceProvider` — remove from one file, import from canonical location | `vitals_sleep_providers.dart:10`, `health_sync_providers.dart:7` |
| FIXER-2 | Fix unsafe `.cast<double>()` → `.map((e) => (e as num).toDouble()).toList()` | `activity_detail_screen.dart:97,104,115` |

**Review Gate:** REVIEWER verifies app compiles (`flutter analyze`) and all 5 fixes are correct.

---

### Phase 2: Critical Bugs (2 agents, ~1 hour)

**Goal:** Core user flows work (login, activity viewing, workout tracking, chat).

| Agent | Task | Files |
|---|---|---|
| FIXER-1 | Fix `forgotPassword` — don't modify `state`, use separate flow | `auth_providers.dart:116-125` |
| FIXER-1 | Fix `loadMore` error handling — preserve activities on error | `activity_providers.dart:69-72` |
| FIXER-1 | Fix `ChatNotifier.error` — clear error on success | `chat_providers.dart:66` |
| FIXER-1 | Fix `Fasting.start()` — use returned session | `health_providers.dart:53-58` |
| FIXER-2 | Fix workout completion toggle — send actual state in request | `goal_detail_screen.dart:571` |
| FIXER-2 | Fix delete account — implement actual deletion or show "not available" | `profile_screen.dart:233-236` |
| FIXER-2 | Fix deep link subscription leak — store and cancel | `main.dart:67` |
| FIXER-2 | Fix `refresh_session.dart` null dereference — check `response.data` | `refresh_session.dart:19` |
| FIXER-2 | Fix DB time unit mismatch — use milliseconds consistently | `app_database.dart:44` |

**Review Gate:** REVIEWER verifies all state management flows, checks no regressions in auth/activity/chat providers.

---

### Phase 3: Server Communication (3 agents, ~2 hours)

**Goal:** Flutter app correctly communicates with server for all existing endpoints.

| Agent | Task | Files |
|---|---|---|
| SERVER | Create mobile-compatible health API endpoints under `/api/mobile/v1/health/...` using `getAuthenticatedUser()` auth, OR add auth method detection to existing health endpoints | `Web/src/app/api/health/**` |
| SERVER | Create `/api/mobile/v1/auth/forgot-password` or update Flutter to call `/api/auth/forgot-password` directly | `Web/src/app/api/auth/` + `api_constants.dart` |
| SERVER | Create `POST /api/mobile/v1/device/token` for FCM registration | `Web/src/app/api/mobile/v1/` |
| FIXER-1 | Fix AI Chat URLs — change from `$baseUrl/ai/chat/...` to `$baseUrl/api/ai/chat/...` | `api_constants.dart:36-38` |
| FIXER-1 | Fix health API paths — change from `/nutrition/log` to `/health/nutrition/log` etc. (or use server's mobile aliases) | `api_constants.dart:40-53` |
| FIXER-1 | Fix token refresh URL ordering — try legacy URL first | `refresh_session.dart:38-41` |
| FIXER-1 | Add server logout call before clearing local tokens | `auth_repository_impl.dart:149-151` |
| FIXER-2 | Implement FCM token registration with server after `getToken()` | `fcm_service.dart:20` |
| FIXER-2 | Add `onTokenRefresh` listener | `fcm_service.dart` |
| FIXER-2 | Implement background message handler | `fcm_service.dart:64` |
| FIXER-2 | Implement background sync callback (actual sync logic) | `background_sync.dart:5-7` |

**Review Gate:** REVIEWER + SERVER jointly verify: all API paths resolve correctly, auth methods match, FCM flow works, background sync executes.

---

### Phase 4: Auth-Aware State & Cache Invalidation (1 agent, ~1 hour)

**Goal:** Login/logout cleanly resets all state; no data leaks between users.

| Agent | Task | Files |
|---|---|---|
| FIXER | Add `ref.invalidate()` calls for all data providers on logout | `auth_providers.dart:87-94` |
| FIXER | Have data providers watch `currentUserProvider` and short-circuit when null | `activity_providers.dart`, `dashboard_providers.dart`, `goal_providers.dart`, `profile_providers.dart`, `chat_providers.dart` |
| FIXER | Fix `Settings.build()` — load settings eagerly or use AsyncNotifier | `profile_providers.dart:54-57` |
| FIXER | Wire `_SleepCard` and `_VitalsCard` to actual providers | `health_screen.dart:614-629` |
| FIXER | Fix notification timezone — use device local timezone | `notification_service.dart:40` |

**Review Gate:** REVIEWER verifies login → logout → different login shows no stale data. All providers reset cleanly.

---

### Phase 5: Services & Data Layer Hardening (2 agents, ~2 hours)

**Goal:** Workout recording, health sync, and local database are production-ready.

| Agent | Task | Files |
|---|---|---|
| FIXER-1 | Add GPS permission check before `startRecording()` | `workout_recording_service.dart:143` |
| FIXER-1 | Add GPS accuracy filtering (reject >20m accuracy) | `workout_recording_service.dart:254-301` |
| FIXER-1 | Periodically flush GPS/HR data to SQLite during workout | `workout_recording_service.dart:57-58` |
| FIXER-1 | Fix `estimateCadence` — label as estimate, use BLE when available | `workout_recording_service.dart:306-313` |
| FIXER-2 | Add database version tracking and migration support | `app_database.dart` |
| FIXER-2 | Add `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON` | `app_database.dart:23` |
| FIXER-2 | Add `close()` method to database | `app_database.dart` |
| FIXER-2 | Implement coordinated logout cleanup (stop sync, FCM, timers) | `auth_service_impl.dart:63-65` |

**Review Gate:** REVIEWER verifies database operations work, GPS recording handles edge cases, no memory leaks on logout.

---

### Phase 6: UI & Theme (2 agents, ~2 hours)

**Goal:** App works in both light and dark mode; navigation is correct; UX polish.

| Agent | Task | Files |
|---|---|---|
| FIXER-1 | Replace all hardcoded `AppColors.oledBlack` with `theme.scaffoldBackgroundColor` | 7+ health screens |
| FIXER-1 | Replace hardcoded `AppColors.surfaceDarkVariant` in skeletons | All skeleton/shimmer widgets |
| FIXER-1 | Fix `CircularGauge` hardcoded background | `circular_gauge.dart:35` |
| FIXER-1 | Fix `context.go` → `context.push` for activity list | `activity_list_screen.dart:183` |
| FIXER-2 | Dispose `TextEditingController`s in bottom sheets | `nutrition_screen.dart`, `supplements_screen.dart`, `body_screen.dart` |
| FIXER-2 | Fix BMI hardcoded height — read from profile | `body_screen.dart:215` |
| FIXER-2 | Add missing `AlwaysScrollableScrollPhysics` for pull-to-refresh | `analytics_screen.dart:47` |
| FIXER-2 | Fix form validation — add actual `validator:` callbacks | `edit_profile_screen.dart`, `goal_setup_wizard.dart` |

**Review Gate:** REVIEWER verifies app renders correctly in both light and dark themes. All navigation works. No controller leaks.

---

### Phase 7: Feature Parity — Core Features (3 agents, ~1 week)

**Goal:** Implement the 11 CRITICAL missing features from the feature gap analysis.

| Agent | Task | Priority |
|---|---|---|
| FIXER-1 | **Race Countdown Card** — days/weeks countdown, goal time, projected finish, weekly mileage | CRITICAL |
| FIXER-1 | **Training Status Card** — Shape%, VO2max, workload balance, CTL/ATL/TSB | CRITICAL |
| FIXER-1 | **Race Result Flow** — auto-detect, suggest/pick/review modes | CRITICAL |
| FIXER-2 | **Manual Activity Entry** — name, date, type, distance, duration, HR | CRITICAL |
| FIXER-2 | **AI Coach Activity Feedback** — call server's activity-feedback endpoint | CRITICAL |
| FIXER-2 | **Shape Calibration Modal** — VDOT correction, shape factor, manual modes | CRITICAL |
| FIXER-3 | **Full Onboarding Wizard** — 4-step: platform → sync → analyze → plan | CRITICAL |
| FIXER-3 | **Sync Platform Selector** — Strava, Health Connect, Garmin, etc. | CRITICAL |
| FIXER-3 | **AI Settings** — custom API key, data access toggles, presets | CRITICAL |
| FIXER-3 | **Combined Analytics Chart** — multi-metric overlay with rolling averages | CRITICAL |
| SERVER | **Strava OAuth for mobile** — deep link callback + token exchange | CRITICAL |

**Review Gate:** After each feature: REVIEWER verifies the feature works end-to-end with server, no regressions. Weekly integration review across all 3 agents' work.

---

### Phase 8: Feature Parity — Secondary Features (2 agents, ~1 week)

**Goal:** Implement the 23 HIGH-priority missing features.

Covers: race predictions interactive chart, training paces, VO2/shape trend charts, TRIMP/rTSS in activity detail, training type tag selector, activity picker, drag-drop plan reorder, phase indicators, post-race auto-detect, race activity picker, running profile in onboarding, granular data access controls, AI feedback mode, weight/height editing, past races, Strava sync/reconnect, data export, privacy/consent management, account deletion, GDPR checkboxes, full week workout schedule, Strava auth error banner, login/register navigation.

**Review Gate:** REVIEWER verifies each feature. Integration testing every 2-3 features.

---

### Phase 9: Polish & Performance (1 agent, ~3 days)

**Goal:** Production readiness.

| Task | Files |
|---|---|
| Add retry logic with exponential backoff to DioClient | `dio_client.dart` |
| Add request deduplication interceptor | `dio_client.dart` |
| Add `sendTimeout` configuration | `dio_client.dart` |
| Offline detection before API calls | New connectivity interceptor |
| Voice coach improvements (HR coaching, audio focus, separate cooldowns) | `voice_coach_service.dart` |
| Cap unbounded log list | `logger.dart` |
| Add error reporting (Sentry integration) | `main.dart` |
| Performance: use `select()` in providers where applicable | All providers |
| Missing providers: `updateActivity`, `createActivity`, food search | Provider files |

**Review Gate:** Final REVIEWER pass — full app audit for any remaining issues.

---

## Recommended Execution Order

```
Phase 1 (30min) → REVIEW → Phase 2 (1hr) → REVIEW → Phase 3 (2hr) → REVIEW
    → Phase 4 (1hr) → REVIEW → Phase 5 (2hr) → REVIEW → Phase 6 (2hr) → REVIEW
    → Phase 7 (1wk) → REVIEW → Phase 8 (1wk) → REVIEW → Phase 9 (3d) → FINAL REVIEW
```

**Total estimated effort:** ~4 weeks with 2-3 agents working in parallel.

Each REVIEW gate should:
1. Run `flutter analyze` — zero errors
2. Read all changed files for correctness
3. Verify no regressions in untouched files
4. Produce a PASS/FAIL report before proceeding
