# Flutter App — Full Feature Parity & Functionality Audit

> **Date:** 25 April 2026  
> **Scope:** `flutter/` vs `Web/` + `openapi-mobile-v1.yaml`  
> **Method:** Static code review of all source files in both codebases

---

## Executive Summary

The Flutter app has a **solid architectural foundation** — clean layering (data/domain/presentation), Freezed models, Riverpod state management, GoRouter navigation, and Dio networking are all properly wired. However, several features are **partially implemented stubs**, key web features are **completely missing**, and the health module operates **entirely offline** without server sync. Test coverage exists but is surface-level.

### Overall Completion: ~65%

| Area | Status | Score |
|------|--------|-------|
| Architecture & Scaffold | ✅ Complete | 95% |
| Authentication | ✅ Functional | 85% |
| Dashboard | ✅ Functional | 80% |
| Activities | ⚠️ Partial | 65% |
| Analytics & Charts | ⚠️ Partial | 70% |
| Goals & Training Plans | ✅ Mostly Complete | 80% |
| AI Coach Chat | ✅ Functional | 85% |
| Health Tracking | ⚠️ Local-only | 40% |
| Native Integrations | ⚠️ Stubs | 35% |
| Profile & Settings | ✅ Functional | 80% |
| Polish & Release | ⚠️ Partial | 50% |
| Testing | ⚠️ Partial | 55% |

---

## 1. Architecture & Scaffold

### ✅ Implemented
- Clean architecture layers: `core/`, `data/`, `domain/`, `presentation/`, `services/`
- Freezed models with code generation for all modules (auth, dashboard, activity, analytics, chat, goal, health, profile)
- Riverpod with `riverpod_annotation` + `riverpod_generator` code gen
- GoRouter with `StatefulShellRoute.indexedStack` for bottom nav persistence
- Material 3 theming with dark/light/system modes
- Dio client with interceptors (auth, refresh, error)
- SQLite local database via `sqlite3` (not Drift as planned)
- All 39 dependencies declared in `pubspec.yaml`

### ⚠️ Issues
- **Local DB uses raw `sqlite3` instead of Drift** — PLAN.md specified Drift for type-safe queries and migrations. Current `AppDatabase` uses raw SQL strings, which is fragile and lacks migration support.
- **No Drift code generation** — Despite `drift: ^2.32.1` being in `pubspec.yaml`, it's unused. The entire local DB is hand-rolled raw SQL.
- **`json_compat.dart`** handles enum compatibility manually — works but is brittle.

---

## 2. Authentication

### ✅ Implemented
- Strava OAuth login via `flutter_web_auth_2`
- Email/password login with multi-endpoint fallback (`emailLoginPath` → `loginPath` → `loginPath` with `code` field)
- JWT token storage via `flutter_secure_storage`
- Token refresh with `RefreshInterceptor` (queues concurrent 401 requests)
- Auto-restore session on app start with offline fallback
- Auth guard in GoRouter (redirects to `/login` if unauthenticated)
- `AuthInterceptor` attaches Bearer token to all requests
- `ErrorInterceptor` maps Dio errors to typed `AppException` subclasses

### ⚠️ Issues
- **No registration flow** — Web has `/register` with email/password signup. Flutter only supports login.
- **No forgot password flow** — Web has `/api/auth/forgot-password`. Flutter has no password reset.
- **Deep link scheme mismatch** — `main.dart` checks `uri.scheme != 'runflow2'` but `AppConstants.stravaCallbackScheme = 'runflow2'`. The PLAN.md specifies `runflow://auth/callback`. This may cause OAuth callback failures.
- **Email login fallback is over-engineered** — `_postEmailLogin` tries 3 different endpoint/payload combinations, catching 404s. This suggests API endpoint uncertainty that should be resolved server-side.
- **Tokens never logged** — ✅ Confirmed safe. No `print(token)` anywhere.

---

## 3. Dashboard

### ✅ Implemented
- `DashboardResponse` model with stats, recent activities, goals, sync status, user
- Pull-to-refresh via `RefreshIndicator`
- Stats card: weekly mileage, total activities, VO2max, TSB, CTL, ATL
- Recent activities: last 5 with type icon, name, distance, pace, date
- Active goals: race name, countdown, workout progress bar
- Sync status card with manual sync button and loading spinner
- Skeleton/shimmer loading placeholders
- Error state with retry button

### ❌ Missing vs Web
- **No "Today's Workout" card** — PLAN.md Phase 2 specifies it; web shows today's workout with type/description/target pace. Flutter doesn't.
- **No dashboard caching in local DB** — PLAN.md requires caching dashboard response in Drift for offline display. Not implemented.
- **Activity tiles not tappable** — No navigation to activity detail from dashboard. Missing `onTap → context.push('/activities/${activity.id}')`.
- **Goal cards not tappable** — No navigation to goal detail from dashboard.

---

## 4. Activities

### ✅ Implemented
- `ActivitiesResponse` with pagination (total, limit, offset, hasMore)
- `ActivityListScreen` with infinite scroll
- Activity type filter chips (RUN, RIDE, SWIM, etc.)
- `ActivityDetailScreen` with header, metrics grid (distance, pace, duration, elevation, HR, cadence)
- Training type badge and estimated VDOT display
- Activity type icons and labels via `activity_type_helper.dart`

### ❌ Missing vs Web & PLAN.md
- **No splits table** — Web shows per-km/per-mile splits. Activity model doesn't have splits data. Not fetched from API.
- **No laps section** — Web shows lap data. Not in model or UI.
- **No HR zone bar chart** — PLAN.md Phase 3 requires horizontal bar chart of time-in-zone. Missing.
- **No stream charts** — PLAN.md requires fl_chart line charts for heart rate, pace, and elevation over time. Missing entirely.
- **No manual activity creation** — PLAN.md Phase 3 requires a creation form. `ActivityRepositoryImpl` has no `createManual()` method.
- **No activity caching** — PLAN.md requires caching last 50 activities in Drift/local DB. Not implemented.
- **No share button** — `share_button.dart` widget exists but is not used in `ActivityDetailScreen`.
- **Activity detail data is thin** — The API's `GET /activities/{id}` likely returns more fields (splits, laps, streams) than the basic `Activity` model captures.

---

## 5. Analytics & Charts

### ✅ Implemented
- Summary cards: VDOT, CTL, ATL, TSB with color-coded status
- Form indicator with TSB status label (Peaked/Fresh/Neutral/Fatigued/Very Fatigued)
- Date range selector: 30/60/90/365 day buttons
- Fitness trend chart: CTL/ATL/TSB lines via fl_chart with touch tooltips
- Chart legend
- Race predictions card (5K/10K/HM/Marathon) from current VDOT
- Marathon shape circular gauge (0-100)
- Weekly mileage display
- VDOT calculator ported (`core/utils/vdot.dart`) with Daniels' formulas

### ⚠️ Issues
- **VDOT `racePrediction()` has a recursive/circular dependency** — It calls `estimateTime()` inside its own formula, and `estimateTime()` uses a fixed 30-minute approximation. This produces inaccurate predictions for distances far from 30 minutes of running.
- **No weekly mileage BAR chart** — PLAN.md requires a bar chart. Current implementation is just a `MetricCard` showing a single number.
- **`_WeeklyMileageCard` shows current week only** — No historical weekly volume chart.
- **`FitnessHistoryMetrics` missing `ctlRunning` in UI** — Field exists in model but isn't displayed.

---

## 6. Goals & Training Plans

### ✅ Implemented
- Goal list screen with active/completed tabs
- Goal detail screen with race countdown, workout calendar via `table_calendar`
- Goal setup wizard: multi-step form (race type → date → target time → plan config → review)
- Goal CRUD: create, read, update, delete via `GoalRepositoryImpl`
- Workouts list with filtering by goalId, weekStart, weekEnd
- Workout completion toggle
- Race countdown widget

### ⚠️ Issues
- **No optimistic UI updates** — PLAN.md Phase 5 requires optimistic toggle for workout completion. Current implementation awaits server response.
- **`CreateGoalRequest` missing `longRunDay` and `workoutDay`** — OpenAPI spec defines these fields on `Goal` but `CreateGoalRequest` doesn't include them. Server may use defaults, but user can't configure.

---

## 7. AI Coach Chat

### ✅ Implemented
- SSE streaming via `Dio responseType: ResponseType.stream`
- Token-by-token rendering with `MarkdownBody` (flutter_markdown)
- Chat sessions: list, create, delete (swipe-to-dismiss)
- Session history bottom sheet
- Suggested prompt chips (4 prompts)
- Typing indicator animation (3-dot bounce)
- Message bubbles: user (right, primary color) / AI (left, surface color)
- Haptic feedback on send
- Disabled input during streaming

### ⚠️ Issues
- **No local message caching** — PLAN.md Phase 6 requires caching recent messages in Drift. Not implemented. All messages fetched from server.
- **Chat not accessible from bottom nav** — Chat is a standalone route (`/chat`), not in the `StatefulShellRoute`. Requires explicit navigation.
- **API paths use absolute URLs** — `aiChatSessionsUrl`, `aiChatHistoryUrl`, `aiChatStreamUrl` are `$baseUrl/ai/chat/...` instead of relative paths through the Dio base URL. This bypasses the mobile API prefix (`/api/mobile/v1`), which is correct per the OpenAPI spec but inconsistent with other endpoints.

---

## 8. Health Tracking — ⚠️ MAJOR GAP

### ✅ Implemented (Local Only)
- Nutrition tab: daily calorie/macro tracking with progress rings (CustomPainter)
- Food search (local SQLite only)
- Supplement tracker: add/toggle/list
- Fasting timer: start/stop with history
- Body measurements: weight/body fat with trend chart
- All data persisted in local SQLite

### ❌ Critical Missing Features
- **NO SERVER SYNC** — `HealthRepositoryImpl` only talks to `AppDatabase` (local SQLite). The web app has extensive server-side health APIs:
  - `POST /api/health/nutrition/log` — nutrition logging
  - `GET /api/health/nutrition/search` — food database search (FatSecret, OpenFoodFacts)
  - `POST /api/health/nutrition/scan-image` — AI food image scanner
  - `GET /api/health/nutrition/analytics` — nutrition analytics
  - `GET/POST /api/health/supplements` — supplement CRUD with server persistence
  - `GET/POST /api/health/fasting` — fasting sessions
  - `GET/POST /api/health/body-composition` — body composition
  - `GET /api/health/daily` — daily health logs
  - `POST /api/health/sync-batch` — batch sync endpoint
  - `GET /api/health/history` — health history
  - `GET /api/health/insights` — AI health insights
- **No barcode scanner** — PLAN.md Phase 7 requires `mobile_scanner` for barcode scanning. Package not in `pubspec.yaml`, not implemented.
- **No food database search API** — Flutter searches local SQLite only. Web searches FatSecret + OpenFoodFacts APIs.
- **No AI food image scanning** — Web has `scan-image` endpoint with Google AI. Not available in Flutter.
- **No nutrition targets** — Web has `GET/PUT /api/health/nutrition/target` for daily calorie/macro goals.
- **No water intake tracking UI** — `NutritionLog` model has `water` field but the nutrition tab doesn't show a water tracking widget.
- **No background reminders** — PLAN.md Phase 7 requires `flutter_local_notifications` for supplement/meal reminders. Package is installed but no reminder scheduling for health.

---

## 9. Native Integrations

### ⚠️ Partially Implemented

| Feature | Status | Details |
|---------|--------|---------|
| Health Connect | ⚠️ Reads only | `HealthConnectServiceImpl` reads workouts, HR, steps. No sync to backend. No write support. |
| FCM Push | ⚠️ Stub | `FcmService` initializes, gets token, shows foreground notifications. Token NOT sent to server. No deep-link handling from push. |
| Background Sync | ⚠️ Stub | `BackgroundSyncService` registers periodic task but `callbackDispatcher` returns `true` immediately — **does nothing**. No actual Strava sync logic. |
| Deep Linking | ⚠️ Partial | `app_links` registered, handles `runflow2://auth/callback` and `runflow2://activities/{id}`. No other deep link routes. |
| Share | ⚠️ Unused | `share_plus` in pubspec, `share_formatter.dart` and `share_button.dart` exist but aren't used in any screen. |
| Local Notifications | ⚠️ Basic | `NotificationServiceImpl` initialized but only used for FCM foreground relay. No scheduled reminders. |

### ❌ Critical Issues
- **Background sync is a no-op** — The entire `callbackDispatcher` just returns `true`. No Strava sync, no data refresh, nothing happens.
- **FCM token not registered with server** — Token is obtained but never POSTed to the backend's `POST /api/push/register` endpoint.
- **Health Connect data not synced to backend** — Activities read from Health Connect are never sent to the server.

---

## 10. Profile & Settings

### ✅ Implemented
- Profile screen: avatar, name, email, Strava connection status, key stats
- Edit profile screen: name, sex, birth date, weight, height, HR max/rest
- HR zone editor: slider-based zone config
- Settings screen: theme toggle (light/dark/system), unit toggle (metric/imperial)
- Logout with data clear
- SharedPreferences for local settings persistence

### ❌ Missing vs Web
- **No AI data access toggles** — Web has toggles for what data the AI coach can access. Not in Flutter settings.
- **No account deletion** — PLAN.md Phase 9 requires "delete account" option. Not implemented.
- **No "About/Version" screen** — PLAN.md requires version info. Missing.
- **No Strava disconnect/reconnect** — Web allows managing Strava connection. Flutter only shows status.
- **No notification preferences** — PLAN.md requires notification preference settings. Missing.

---

## 11. Polish & Release Readiness

### ✅ Implemented
- Sentry integration (release mode only, DSN via env var)
- Native splash screen via `flutter_native_splash` (OLED black)
- App icon config via `flutter_launcher_icons` (orange adaptive icon)
- Onboarding flow: 3-page walkthrough with SharedPreferences completion flag
- Offline banner (`connectivity_plus` monitors network state)
- Dark/light/system theme switching

### ❌ Missing
- **No error boundaries** — No global `FlutterError.onError` or `PlatformDispatcher.onError` handler beyond Sentry. App may show raw error screens.
- **No ProGuard/R8 rules** — PLAN.md Phase 10 requires ProGuard config. Not verified in `android/` build files.
- **No performance profiling evidence** — No optimization work documented.
- **No accessibility audit** — No semantic labels, no font scaling support verified.
- **No E2E manual test documented** — PLAN.md requires full flow verification.

---

## 12. Testing

### Current Coverage

**20 unit tests:**
- Model serialization (auth, dashboard, activity, analytics, chat, goal, health, profile)
- Provider state management (activities, chat)
- Interceptors (error, refresh)
- Utilities (formatters, VDOT, connectivity, share formatter, API payload)

**12 widget tests:**
- All major screens render with mock data
- Includes: login, dashboard, activity list/detail, analytics, chat, goals, health, onboarding, settings, offline banner

### ❌ Missing Tests
- **No integration tests** — `test/integration/` directory exists but is empty.
- **No golden tests** — `test/golden/` directory exists but is empty.
- **No auth flow tests** — Token storage, refresh race conditions, session restore not tested.
- **No repository tests** — All 8 repositories have zero test coverage.
- **No database tests** — `AppDatabase` with its 383 lines of raw SQL has no tests.
- **No Strava OAuth flow test** — Critical auth path untested.
- **No streaming chat test** — SSE parsing logic untested.

---

## 13. API Parity — Endpoint Coverage

| OpenAPI Endpoint | Flutter Impl | Status |
|-----------------|--------------|--------|
| `POST /auth/login` | `AuthRepositoryImpl.loginWithStravaCode()` | ✅ |
| `POST /auth/email-login` | `AuthRepositoryImpl.loginWithEmail()` | ✅ |
| `POST /auth/refresh` | `refreshSession()` | ✅ |
| `GET /dashboard` | `DashboardRepositoryImpl.fetchDashboard()` | ✅ |
| `GET /activities` | `ActivityRepositoryImpl.listActivities()` | ✅ |
| `GET /activities/{id}` | `ActivityRepositoryImpl.getActivity()` | ✅ |
| `GET /goals` | `GoalRepositoryImpl.listGoals()` | ✅ |
| `POST /goals` | `GoalRepositoryImpl.createGoal()` | ✅ |
| `GET /goals/{id}` | `GoalRepositoryImpl.getGoal()` | ✅ |
| `PUT /goals/{id}` | `GoalRepositoryImpl.updateGoal()` | ✅ |
| `DELETE /goals/{id}` | `GoalRepositoryImpl.deleteGoal()` | ✅ |
| `GET /workouts` | `GoalRepositoryImpl.listWorkouts()` | ✅ |
| `GET /sync` | `DashboardRepositoryImpl.getSyncStatus()` | ✅ |
| `POST /sync` | `DashboardRepositoryImpl.triggerSync()` | ✅ |
| `GET /analytics/stats` | `AnalyticsRepositoryImpl.getStats()` | ✅ |
| `GET /analytics/history` | `AnalyticsRepositoryImpl.getHistory()` | ✅ |
| `GET /user/profile` | `ProfileRepositoryImpl.getProfile()` | ✅ |
| `PUT /user/profile` | `ProfileRepositoryImpl.updateProfile()` | ✅ |
| `POST /ai/chat` | `ChatRepositoryImpl.sendMessage()` (SSE) | ✅ |
| `GET /ai/chat/sessions` | `ChatRepositoryImpl.listSessions()` | ✅ |
| `POST /ai/chat/sessions` | `ChatRepositoryImpl.createSession()` | ✅ |
| `DELETE /ai/chat/sessions` | `ChatRepositoryImpl.deleteSession()` | ✅ |
| `GET /ai/chat/history` | `ChatRepositoryImpl.getMessages()` | ✅ |
| `POST /auth/register` | — | ❌ Missing |
| `POST /auth/forgot-password` | — | ❌ Missing |
| `POST /push/register` | — | ❌ Missing |
| `GET/POST /health/*` (all) | — | ❌ Missing (local-only) |

**API coverage: 23/27 core endpoints (85%)**  
**Health API coverage: 0/11 endpoints (0%)**

---

## 14. Priority Fix List

### 🔴 Critical (Must-fix before release)

1. **Background sync is a no-op** — `callbackDispatcher` does nothing. Must implement actual Strava sync logic or remove the feature.
2. **Health module has zero server sync** — All health data is local-only. Users lose data on reinstall. Must implement server sync or clearly label as "local only".
3. **FCM token not registered** — Push notifications will never be received. Must POST token to server.

### 🟠 High Priority

4. **Add registration flow** — Users can't create accounts from the app.
5. **Add forgot password flow** — Users locked out can't recover.
6. **Make dashboard items tappable** — Activity tiles and goal cards should navigate to detail screens.
7. **Implement actual background sync** — Either sync Strava data or remove the workmanager dependency.
8. **Add activity splits/laps/stream data** — Activity detail is missing key data vs web.
9. **Add barcode scanner** — `mobile_scanner` package missing from pubspec. Required for food logging.

### 🟡 Medium Priority

10. **Migrate from raw sqlite3 to Drift** — Current raw SQL is unmaintainable and has no migration support.
11. **Add offline caching** — Dashboard and activities should cache for offline access.
12. **Fix VDOT race prediction accuracy** — Current implementation uses circular approximation.
13. **Add weekly mileage bar chart** — Currently just a number card.
14. **Add share functionality** — Widget exists but isn't wired to any screen.
15. **Add account deletion** — Required for app store compliance.
16. **Add integration & golden tests** — Empty test directories.

### 🟢 Low Priority

17. Add AI data access toggles to settings
18. Add notification preferences to settings
19. Add About/Version screen
20. Add Strava disconnect/reconnect
21. Performance profiling & optimization
22. Accessibility audit (semantic labels, contrast)
23. ProGuard/R8 configuration for release build

---

## 15. Dependency Audit

| Package | Version | Used? | Notes |
|---------|---------|-------|-------|
| `flutter_riverpod` | ^3.3.1 | ✅ | Core state management |
| `go_router` | ^17.2.2 | ✅ | Routing |
| `dio` | ^5.9.2 | ✅ | HTTP client |
| `freezed_annotation` | ^3.1.0 | ✅ | Model code gen |
| `fl_chart` | ^1.2.0 | ✅ | Charts |
| `drift` | ^2.32.1 | ❌ **UNUSED** | In pubspec but not imported anywhere |
| `sqlite3_flutter_libs` | ^0.5.0 | ✅ | SQLite native libs |
| `flutter_secure_storage` | ^10.0.0 | ✅ | Token storage |
| `health` | ^13.3.1 | ✅ | Health Connect |
| `flutter_local_notifications` | ^21.0.0 | ✅ | Notifications (basic) |
| `firebase_messaging` | ^16.2.0 | ✅ | FCM (token only) |
| `workmanager` | ^0.9.0 | ⚠️ | Registered but callback is no-op |
| `app_links` | ^7.0.0 | ✅ | Deep linking |
| `share_plus` | ^12.0.0 | ⚠️ | Imported but unused in screens |
| `flutter_web_auth_2` | ^5.0.2 | ✅ | Strava OAuth |
| `flutter_markdown` | ^0.7.7+1 | ✅ | Chat rendering |
| `table_calendar` | ^3.2.0 | ✅ | Goal workout calendar |
| `flutter_native_splash` | ^2.4.7 | ✅ | Splash screen |
| `sentry_flutter` | ^9.19.0 | ✅ | Error reporting |
| `shared_preferences` | ^2.5.3 | ✅ | Settings persistence |
| `connectivity_plus` | ^6.1.5 | ✅ | Network monitoring |
| `google_fonts` | ^6.2.1 | ✅ | Typography |

**Unused packages: 1 (drift)**  
**Under-utilized: 2 (workmanager, share_plus)**

---

## 16. File Inventory

```
flutter/lib/
├── main.dart                              (76 lines)
├── app.dart                               (51 lines)
├── core/
│   ├── constants/api_constants.dart        (70 lines)
│   ├── errors/exceptions.dart
│   ├── extensions/
│   ├── theme/app_theme.dart               (4686 bytes)
│   └── utils/
│       ├── activity_type_helper.dart
│       ├── api_payload.dart
│       ├── connectivity_helper.dart
│       ├── formatters.dart
│       ├── share_formatter.dart
│       └── vdot.dart                      (50 lines)
├── data/
│   ├── auth/refresh_session.dart          (70 lines)
│   ├── datasources/
│   │   ├── local/app_database.dart        (383 lines)
│   │   └── remote/dio_client.dart         (503 bytes)
│   ├── interceptors/
│   │   ├── auth_interceptor.dart
│   │   ├── error_interceptor.dart
│   │   └── refresh_interceptor.dart
│   ├── models/ (25 files incl. generated)
│   └── repositories/ (8 files)
├── domain/
│   ├── entities/
│   └── repositories/ (interface files)
├── presentation/
│   ├── providers/ (16 files incl. generated)
│   ├── router/app_router.dart             (179 lines)
│   ├── screens/ (10 modules, 19 screen files)
│   └── widgets/ (5 files)
└── services/ (7 files)

Total: ~95 source files (excluding generated)
Tests: 32 test files (20 unit + 12 widget)
```
