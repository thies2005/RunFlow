# RunFlow Flutter — Remediation Plan

> **Date:** 2026-04-26
> **Source:** AUDIT_REPORT.md (validated)
> **Status:** Ready for execution

---

## Overview

134 confirmed bugs + 61 feature gaps against the web app. This plan fixes them in 9 phases with review gates between each.

---

## Agent Roles

| Role | Purpose |
|---|---|
| **FIXER-1** | Primary code implementer |
| **FIXER-2** | Secondary code implementer (parallel to FIXER-1) |
| **FIXER-3** | Tertiary code implementer (Phase 7 only) |
| **SERVER** | Server-side API endpoint creation/modification |
| **REVIEWER** | Validates fixes after each phase, catches regressions |

---

## Phase 1: Compile Blockers

**Goal:** App compiles and launches.
**Agents:** FIXER-1, FIXER-2
**Time:** ~30 minutes

### FIXER-1 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 1.1 | `_showAiScanSheet` undefined | `health_screen.dart:77` | Add method body: `context.push('/health/ai-scan')` |
| 1.2 | `DropdownButtonFormField.initialValue` | `plan_screen.dart:679` | Change `initialValue:` to `value:` |
| 1.3 | `DropdownButtonFormField.initialValue` | `edit_profile_screen.dart:165` | Change `initialValue:` to `value:` |
| 1.4 | Null assertion crash | `app.dart:44` | `Expanded(child: child ?? const SizedBox.shrink())` |

### FIXER-2 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 1.5 | Duplicate `healthConnectServiceProvider` | `vitals_sleep_providers.dart:10` + `health_sync_providers.dart:7` | Remove from `health_sync_providers.dart`, import the `vitals_sleep` version (which injects `Health()`) everywhere |
| 1.6 | Unsafe `.cast<double>()` | `activity_detail_screen.dart:97,104,115` | Replace with `.map((e) => (e as num).toDouble()).toList()` |

### Review Gate 1
- Run `flutter analyze` — must pass with zero errors
- REVIEWER reads all 6 changed files
- Verify no regressions

---

## Phase 2: Critical State Bugs

**Goal:** Core user flows work correctly.
**Agents:** FIXER-1, FIXER-2
**Time:** ~1 hour

### FIXER-1 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 2.1 | `forgotPassword` sets user to null | `auth_providers.dart:116-125` | Don't modify `state`. Return a separate result. Use a dedicated `AsyncValue<bool>` field or don't touch state at all. |
| 2.2 | `loadMore` loses activities on error | `activity_providers.dart:69-72` | On error, keep `AsyncValue.data(current.copyWith(isLoadingMore: false))` instead of overwriting with `AsyncValue.error`. Store error in state or just keep data. |
| 2.3 | `ChatNotifier.error` never clears | `chat_providers.dart:66` | In `sendMessage` success path: `state = state.copyWith(isStreaming: true, streamingContent: '', error: '')` |
| 2.4 | `Fasting.start()` discards session | `health_providers.dart:53-58` | Use returned session: `state = AsyncValue.data(session)` |

### FIXER-2 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 2.5 | Workout toggle sends empty request | `goal_detail_screen.dart:571` | Call `repo.updateWorkout(workoutId, UpdateWorkoutRequest(isCompleted: !previousState))` instead of empty `UpdateGoalRequest()` |
| 2.6 | Delete Account = logout | `profile_screen.dart:233-236` | Implement `deleteAccount()` in auth notifier that calls server DELETE endpoint, then clears local state. Until server endpoint exists, show "Contact support" message. |
| 2.7 | Deep link subscription leak | `main.dart:67` | Store subscription in a variable, cancel in `dispose()` or use `appLinks.stringLinkStream` with a scoped listener |
| 2.8 | `response.data!` null dereference | `refresh_session.dart:19` | Add `if (response.data == null) throw ...` before `RefreshResponse.fromJson` |
| 2.9 | DB time unit mismatch | `app_database.dart:44` | Change `DEFAULT (unixepoch())` to store milliseconds, or explicitly set `created_at` on insert (line 124 already does — remove the default) |

### Review Gate 2
- REVIEWER reads all changed provider files
- Verify: forgot password doesn't log out, chat error clears, workout toggle persists, deep link subscription is managed
- Check no regressions in auth flow

---

## Phase 3: Server Communication

**Goal:** Flutter talks to server correctly for all existing endpoints.
**Agents:** FIXER-1, FIXER-2, SERVER
**Time:** ~2 hours

### SERVER Tasks

| # | Task | Details |
|---|---|---|
| 3.S1 | Mobile-compatible health endpoints | Create `/api/mobile/v1/health/...` routes that mirror `/api/health/...` but use `getAuthenticatedUser()` (JWT) instead of `auth()` (session). Covers: nutrition/log, nutrition/search, nutrition/scan, nutrition/target, nutrition/analytics, fasting, supplements, body-composition, health/sync-batch, health/insights, health/daily. |
| 3.S2 | Forgot-password for mobile | Either create `/api/mobile/v1/auth/forgot-password` or ensure the existing `/api/auth/forgot-password` accepts requests without session (it already does — just needs the Flutter path fix). |
| 3.S3 | FCM device token endpoint | Create `POST /api/mobile/v1/device/token` accepting `{ token: string, platform: string }` with JWT auth. Store in `DeviceToken` table. |
| 3.S4 | Mobile logout endpoint | Create or verify `POST /api/mobile/v1/auth/logout` for server-side token blacklisting. |

### FIXER-1 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 3.1 | AI Chat URLs wrong | `api_constants.dart:36-38` | Change to `$baseUrl/api/ai/chat/sessions`, `$baseUrl/api/ai/chat/history`, `$baseUrl/api/ai/chat` |
| 3.2 | Health API paths wrong | `api_constants.dart:40-53` | Change paths to match server: `/health/nutrition/log`, `/health/fasting`, `/health/supplements`, etc. Or keep as-is if SERVER creates mobile aliases at `/api/mobile/v1/...` |
| 3.3 | Token refresh wastes 404 | `refresh_session.dart:38-41` | Swap order: try `legacyRefreshUrl` first, then `refreshPath` |
| 3.4 | Logout doesn't call server | `auth_repository_impl.dart:149-151` | Add `try { await dio.post('/auth/logout'); } catch (_) {}` before `authService.clearAll()` |

### FIXER-2 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 3.5 | FCM token never sent to server | `fcm_service.dart:20` | After `getToken()`, POST token to server's device token endpoint |
| 3.6 | No `onTokenRefresh` listener | `fcm_service.dart` | Add `messaging.onTokenRefresh.listen((token) => _sendTokenToServer(token))` |
| 3.7 | Empty background notification handler | `fcm_service.dart:64` | Implement: initialize Firebase, parse `RemoteMessage`, show local notification via `flutter_local_notifications` |
| 3.8 | Empty background sync callback | `background_sync.dart:5-7` | Implement actual sync: reinitialize services, call sync endpoints, return success/failure |

### Review Gate 3
- REVIEWER verifies all API paths resolve to correct server endpoints
- REVIEWER checks auth methods match (JWT for mobile, session for web)
- SERVER agent confirms new endpoints work with JWT auth
- Test: FCM token registration flow, background sync execution, chat messaging end-to-end

---

## Phase 4: Auth-Aware State & Cache Invalidation

**Goal:** Login/logout cleanly resets all state.
**Agents:** FIXER
**Time:** ~1 hour

| # | Task | File | Fix |
|---|---|---|---|
| 4.1 | No cache invalidation on logout | `auth_providers.dart:87-94` | In `logout()`, after clearing state, invalidate all data providers: `ref.invalidate(dashboardProvider)`, `ref.invalidate(goalsProvider)`, `ref.invalidate(profileProvider)`, `ref.invalidate(activitiesProvider)`, `ref.invalidate(chatSessionsProvider)`, etc. |
| 4.2 | Providers call APIs when unauthenticated | All data providers | Add `ref.watch(currentUserProvider)` check — return empty/default when null |
| 4.3 | `Settings.build()` returns defaults first frame | `profile_providers.dart:54-57` | Accept the async pattern or use `FutureBuilder` in UI. Document that first frame shows defaults. |
| 4.4 | Sleep/Vitals cards show "No data" | `health_screen.dart:614-629` | Wire `_SleepCard` to `sleepProvider` and `_VitalsCard` to `vitalsProvider` from `vitals_sleep_providers.dart` |
| 4.5 | Notification timezone hardcoded UTC | `notification_service.dart:40` | Replace `tz.setLocalLocation(tz.UTC)` with device timezone detection |

### Review Gate 4
- Test: login → use app → logout → login as different user → verify no stale data
- Test: sleep/vitals cards show real data when Health Connect available
- Test: scheduled notifications fire at correct local time

---

## Phase 5: Services & Data Layer Hardening

**Goal:** Workout recording, database, and cleanup are production-ready.
**Agents:** FIXER-1, FIXER-2
**Time:** ~2 hours

### FIXER-1 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 5.1 | No GPS permission check | `workout_recording_service.dart:143` | Call `requestPermissions()` at start of `startRecording()`, return early if denied |
| 5.2 | No GPS accuracy filtering | `workout_recording_service.dart:254-301` | Reject points where `position.accuracy > 20`. Apply altitude smoothing. |
| 5.3 | Unbounded GPS/HR arrays | `workout_recording_service.dart:57-58` | Periodically flush to SQLite during workout. Keep only last 100 points in memory for live display. |
| 5.4 | Cadence estimate misleading | `workout_recording_service.dart:306-313` | Label as estimate. Try BLE running cadence service (0x1814) first, fall back to estimate. |

### FIXER-2 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 5.5 | No database migrations | `app_database.dart` | Add `user_version` pragma check. Create migration map `{1: _migrateV1toV2, ...}`. Run `ALTER TABLE` statements for each version. |
| 5.6 | No WAL mode / foreign keys | `app_database.dart:23` | Execute `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` after opening |
| 5.7 | Database never closed | `app_database.dart` | Add `close()` method calling `_db?.dispose()`. Call from app shutdown. |
| 5.8 | No coordinated logout cleanup | `auth_service_impl.dart:63-65` | Create `LogoutManager` or call: `BackgroundSyncService.cancel()`, `FcmService.dispose()`, `HealthSyncService.stopAutoSync()`, cancel BLE scans |

### Review Gate 5
- Test: start/stop workout recording — verify GPS filtering, memory usage stable
- Test: database upgrade from old schema — verify migration runs
- Test: logout stops all background services

---

## Phase 6: UI & Theme

**Goal:** App works in light and dark mode. Navigation correct. No memory leaks.
**Agents:** FIXER-1, FIXER-2
**Time:** ~2 hours

### FIXER-1 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 6.1 | Hardcoded OLED black on health screens | `health_screen.dart:27` + `nutrition_screen.dart`, `body_screen.dart`, `supplements_screen.dart`, `vitals_screen.dart`, `sleep_screen.dart`, `fasting_screen.dart` | Replace `AppColors.oledBlack` with `Theme.of(context).scaffoldBackgroundColor` |
| 6.2 | Hardcoded dark skeleton colors | All skeleton/shimmer widgets | Use `theme.colorScheme.surfaceContainerHighest` |
| 6.3 | CircularGauge dark background | `circular_gauge.dart:35` | Use `Theme.of(context).colorScheme.surfaceContainerHighest` |
| 6.4 | Back button broken on activity list | `activity_list_screen.dart:183` | `context.go` → `context.push` |

### FIXER-2 Tasks

| # | Task | File | Fix |
|---|---|---|---|
| 6.5 | Controller leak in bottom sheets | `nutrition_screen.dart`, `supplements_screen.dart`, `body_screen.dart` | Use `StatefulBuilder` with dispose, or extract into proper `StatefulWidget` dialogs |
| 6.6 | BMI hardcoded height | `body_screen.dart:215` | Read user height from `profileProvider` |
| 6.7 | Pull-to-refresh fails when content fits | `analytics_screen.dart:47` | Add `physics: const AlwaysScrollableScrollPhysics()` to ListView |
| 6.8 | Form validation is no-op | `edit_profile_screen.dart`, `goal_setup_wizard.dart` | Add `validator:` callbacks to `TextFormField` widgets |

### Review Gate 6
- Test: switch between light and dark theme — all screens render correctly
- Test: activity list → tap activity → back button returns to list
- Test: open/close bottom sheets multiple times — no controller leak warnings

---

## Phase 7: Feature Parity — Core (CRITICAL)

**Goal:** Implement 11 critical missing features.
**Agents:** FIXER-1, FIXER-2, FIXER-3, SERVER
**Time:** ~1 week

### FIXER-1: Race & Training Features

| # | Feature | Web Reference | Key Components |
|---|---|---|---|
| 7.1 | Race Countdown Card | `RaceCountdown.tsx` | Days/weeks to race, progress bar, goal time, projected finish, weekly mileage tracker |
| 7.2 | Training Status Card | `TrainingStatusCard.tsx` | Shape%, VO2max, workload balance diagram (0.8-1.3 sweet spot), CTL/ATL/TSB/TRIMP progress bars |
| 7.3 | Race Result Flow | `RaceResultModal.tsx` | Post-race auto-detection, suggest/pick/review modes, chip time, placements, weather, RPE, training completion summary |

### FIXER-2: Activity & Analytics Features

| # | Feature | Web Reference | Key Components |
|---|---|---|---|
| 7.4 | Manual Activity Entry | `ManualActivityModal.tsx` | Form: name, date, type, distance, duration, avg HR. POST to activities endpoint. |
| 7.5 | AI Activity Feedback | `ActivityDetailsModal.tsx:517` | Button to generate AI analysis per activity. Display: plannedComparison, progressAnalysis, goalTrajectory. Call `/api/ai/activity-feedback`. |
| 7.6 | Shape Calibration Modal | `ShapeCalibrationModal.tsx` | 3 modes: VDOT correction factor, shape factor, manual. Activity auto-fill, custom distances, real-time preview. |

### FIXER-3: Onboarding & Settings Features

| # | Feature | Web Reference | Key Components |
|---|---|---|---|
| 7.7 | Full Onboarding Wizard | `OnboardingWizard.tsx` | 4 steps: platform select → sync data → analyze profile → plan setup. Progress bar. |
| 7.8 | Sync Platform Selector | `SyncPlatformSelector.tsx` | Strava OAuth, Health Connect, Garmin, Polar, COROS, Suunto, Huawei |
| 7.9 | AI Settings | `AiSettingsModal.tsx` | Custom API key (OpenAI/NVIDIA/Zhipu/OpenRouter presets), 10 data access toggles, feedback mode, custom prompt |
| 7.10 | Combined Analytics Chart | `CombinedAnalyticsChart.tsx` | Multi-metric overlay: volume, training time, VO2max, CTL/ATL/TSB with rolling averages |

### SERVER Tasks

| # | Task |
|---|---|
| 7.S1 | Strava OAuth for mobile: deep link callback at `/api/auth/strava/callback` that exchanges code for JWT tokens and redirects to app |
| 7.S2 | Mobile-compatible `/api/ai/activity-feedback` endpoint using `getAuthenticatedUser()` |

### Review Gate 7
- After each feature: REVIEWER verifies end-to-end flow with server
- Weekly integration review: all 3 agents' work tested together
- Verify: race countdown updates, manual activity creates, AI feedback generates, onboarding completes

---

## Phase 8: Feature Parity — Secondary (HIGH)

**Goal:** Implement 23 high-priority missing features.
**Agents:** FIXER-1, FIXER-2
**Time:** ~1 week

| # | Feature | Category |
|---|---|---|
| 8.1 | Race Predictions Interactive Chart | Analytics |
| 8.2 | Training Paces Section | Analytics |
| 8.3 | VO2/Shape Trend Charts | Analytics |
| 8.4 | TRIMP/rTSS in Activity Details | Activities |
| 8.5 | Training Type Tag Selector | Activities |
| 8.6 | Activity Picker (workout linking) | Plan |
| 8.7 | Drag-and-Drop Plan Reorder | Plan |
| 8.8 | Phase Indicators (Base/Build/Peak/Taper) | Plan |
| 8.9 | Post-Race Auto-Detection | Race |
| 8.10 | Race Activity Picker | Race |
| 8.11 | Running Profile in Onboarding | Onboarding |
| 8.12 | Granular Data Access Controls (10 toggles) | AI Settings |
| 8.13 | AI Feedback Mode | AI Settings |
| 8.14 | Weight/Height Editing | Profile |
| 8.15 | Past Races Section | Profile |
| 8.16 | Strava Sync/Reconnect | Profile |
| 8.17 | Data Export (JSON) | Profile |
| 8.18 | Privacy & Consent Management | Profile |
| 8.19 | Account Deletion (real) | Profile |
| 8.20 | GDPR Consent Checkboxes | Auth |
| 8.21 | Full Week Workout Schedule | Dashboard |
| 8.22 | Strava Auth Error Banner | Dashboard |
| 8.23 | Login/Register Navigation Links | Auth |

### Review Gate 8
- REVIEWER verifies each feature works
- Integration testing every 2-3 features
- No regressions in features from Phase 7

---

## Phase 9: Polish & Performance

**Goal:** Production readiness.
**Agents:** FIXER
**Time:** ~3 days

| # | Task | File |
|---|---|---|
| 9.1 | Add retry logic with exponential backoff | `dio_client.dart` |
| 9.2 | Add request deduplication interceptor | `dio_client.dart` |
| 9.3 | Add `sendTimeout: Duration(seconds: 30)` | `dio_client.dart` |
| 9.4 | Offline detection before API calls | New connectivity interceptor |
| 9.5 | Voice coach: HR-based coaching, audio focus, separate cooldowns per message type | `voice_coach_service.dart` |
| 9.6 | Cap unbounded log list (keep last 1000) | `logger.dart` |
| 9.7 | Verify Sentry integration works (already wired in `main.dart`) | `main.dart` |
| 9.8 | Use `select()` in providers for granular rebuilds | All provider files |
| 9.9 | Add missing providers: `updateActivity`, `createActivity`, food search | Provider files |
| 9.10 | Add `alwaysScrollableScrollPhysics` to all RefreshIndicator ListViews | Multiple screens |

### Final Review Gate
- Run `flutter analyze` — zero errors
- Full app walkthrough in both light and dark themes
- Test: login, dashboard, activities, analytics, plan, chat, health, profile, settings, recording
- Test: offline → online transition
- Test: background sync and push notifications
- Produce final PASS/FAIL report

---

## Execution Timeline

```
Week 1: Phases 1-6 (bug fixes + hardening)
  Day 1: Phase 1 (compile) + Phase 2 (state bugs)     [FIXER-1, FIXER-2]
  Day 1-2: Phase 3 (server comm)                       [FIXER-1, FIXER-2, SERVER]
  Day 2: Phase 4 (auth cache)                           [FIXER]
  Day 2-3: Phase 5 (services/DB)                        [FIXER-1, FIXER-2]
  Day 3: Phase 6 (UI/theme)                             [FIXER-1, FIXER-2]

Week 2-3: Phase 7 (critical features)                   [FIXER-1, FIXER-2, FIXER-3, SERVER]
Week 3-4: Phase 8 (secondary features)                  [FIXER-1, FIXER-2]
Week 4:   Phase 9 (polish)                              [FIXER]
```

**Total: ~4 weeks with 2-3 agents in parallel.**
