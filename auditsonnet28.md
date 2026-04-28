# RunFlow Flutter App - Comprehensive Audit Report

**Date:** April 28, 2026  
**Scope:** Full Flutter mobile app analysis vs Web app parity, UI/UX quality, API integration, code architecture  
**Static Analysis:** `flutter analyze` — **0 issues**  
**Tests:** 507 tests — **All passing**  
**Dependencies:** 1 discontinued (`flutter_markdown`), 29 with newer incompatible versions

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature Parity Analysis](#2-feature-parity-analysis-flutter-vs-web)
3. [UI/UX Audit](#3-uiux-audit)
4. [API Integration Audit](#4-api-integration-audit)
5. [Code Quality & Architecture Audit](#5-code-quality--architecture-audit)
6. [Consolidated Findings Table](#6-consolidated-findings-table)
7. [Prioritized Fix Plan](#7-prioritized-fix-plan)

---

## 1. Executive Summary

The RunFlow Flutter app is a **feature-rich mobile client** for a running performance and health tracking platform. It covers dashboard, workout recording, activities, analytics, training plans, goals, race results, health hub (nutrition, supplements, body composition, fasting, vitals, sleep), AI coach chat, and profile/settings.

**Overall Score: 7.2/10**

| Category | Score | Status |
|----------|-------|--------|
| Feature Parity | 75% | Missing several web features |
| UI/UX Quality | 7.2/10 | Light mode broken, map missing |
| API Integration | 6.5/10 | Chat auth mismatch, file upload mismatch |
| Code Quality | 7.5/10 | Clean architecture violations, memory leaks |
| Test Coverage | 8/10 | 507 tests but no coverage measurement |

**Critical Issues Requiring Immediate Attention:**
1. Chat API uses web endpoints (NextAuth session auth) instead of mobile JWT endpoints — **all chat operations fail for mobile users**
2. AI food scan sends multipart FormData but backend expects base64 JSON — **food scanning broken**
3. Every health screen hardcodes dark-mode colors — **light mode completely broken**
4. Record screen shows "Map coming soon" placeholder — **core running feature missing**
5. Duplicate `OfflineException` class creates type confusion across the codebase

---

## 2. Feature Parity Analysis (Flutter vs Web)

### Web App Feature Inventory

The web app is built with Next.js 15.5, React 19, Prisma 7.5, TanStack React Query, Recharts, and Capacitor 8 for Android. It contains:
- **18 pages** (9 public/legal, 7 authenticated, 2 admin)
- **148 API route handlers** across 12 API domains
- **100+ React components** across 20+ directories
- **36 database models**

### Feature-by-Feature Comparison

| Feature | Web App | Flutter App | Gap | Priority |
|---------|---------|-------------|-----|----------|
| **Authentication** | | | | |
| Strava OAuth | Full OAuth with callback | Custom scheme redirect | Partial — works but fragile | Medium |
| Email/Password login | Full | Full | None | — |
| Email verification | 6-digit code flow | Not implemented | **Missing** | Medium |
| Password reset | Full flow | Screen exists, flow works | None | — |
| GDPR consent | Multi-checkbox tracking | Not implemented | **Missing** | Medium |
| Account deletion | Full with confirmation | Implemented | None | — |
| Data export | Full GDPR export | Not implemented | **Missing** | Medium |
| **Dashboard** | | | | |
| Training status (CTL/ATL/TSB) | Full with color coding | Full | None | — |
| Workout schedule | Weekly view | Today card + schedule | Partial | Low |
| Race countdown | Full with predictions | Implemented | None | — |
| Recent activities | Virtualized list | Implemented | None | — |
| Strava sync | Manual + webhook | Manual only | **Missing webhook** | Low |
| Pull-to-refresh | Full | Implemented | None | — |
| **Activities** | | | | |
| Activity list | Infinite scroll, type filters | Paginated, type filters | No date filter/search | Low |
| Manual entry | Full form | Bottom sheet form | None | — |
| Activity analysis | Streams charts, laps, splits | HR/pace/elevation charts | **Missing map/route** | High |
| Activity types | 12+ types | 12+ types | None | — |
| **Analytics** | | | | |
| VO2max trends | Full with raw/corrected | Implemented | None | — |
| Marathon shape | Composite score + trend | Circular gauge + chart | None | — |
| Fitness trend (CTL/ATL/TSB) | Full chart | Implemented | None | — |
| Race predictions | Interactive with shape slider | Implemented | No shape slider | Low |
| Training paces | Calculated with HR zones | Not implemented | **Missing** | Medium |
| HR zone distribution | Pie chart Z1-Z7 | Not implemented | **Missing** | Medium |
| Combined volume chart | Distance+time+VO2 | Not implemented | **Missing** | Low |
| Time range filters | 1M/3M/6M/1Y/ALL | 30D/60D/90D/1Y | Partial | Low |
| Shape calibration | Interactive slider | Not implemented | **Missing** | Medium |
| **Training Plans & Goals** | | | | |
| Goal creation | Full form (race type, time, date) | Implemented | None | — |
| Plan generation | Auto-generated with phases | Implemented | None | — |
| Drag & drop reorder | dnd-kit | Not implemented | **Missing** | Medium |
| Workout completion | Link to activity | Implemented | None | — |
| Plan export | Print/PDF | Not implemented | **Missing** | Low |
| Race results | Full with placements, weather | Implemented | None | — |
| **AI Coach / Chat** | | | | |
| Chat interface | Streaming with sidebar | Streaming with sessions | None | — |
| Prompt library | Pre-built templates | Suggested prompts | Partial | Low |
| AI providers | Multi-provider support | Uses server-side config | None | — |
| Activity feedback | Auto-generated analysis | Implemented | None | — |
| Proactive widgets | Run suggestion, calorie snap | Not implemented | **Missing** | Low |
| AI settings | Provider/model/data access | Settings screen | None | — |
| **Health Hub** | | | | |
| Food search (OFF + FatSecret) | Dual database search | Single search | Partial | Low |
| Barcode scanner | MLKit + html5-qrcode | Camera-based scanner | None | — |
| AI calorie snap (photo) | Gemini Flash | Screen exists | **Broken (format mismatch)** | Critical |
| Meal categorization | Breakfast/lunch/dinner/snacks | Implemented | None | — |
| Nutrition targets | Customizable macros | Hardcoded 2000 cal | **Missing personalization** | High |
| Copy yesterday's meals | Full | Not implemented | **Missing** | Low |
| Saved meal library | Full CRUD | Not implemented | **Missing** | Low |
| Nutrition analytics | Macro trends, adherence | Analytics screen | Partial | Low |
| AI meal suggestions | Based on remaining macros | Not implemented | **Missing** | Low |
| **Supplements** | | | | |
| CRUD + tracking | Full | Implemented | None | — |
| Supplement stacks | By time of day | Not implemented | **Missing** | Low |
| Supplement analytics | Adherence calendar, charts | Basic analytics | Partial | Low |
| Reminder notifications | Configurable times | Not implemented | **Missing** | Low |
| **Body Composition** | | | | |
| Weight, body fat, muscle mass | Full | Implemented | None | — |
| Circumference measurements | Waist, chest, hips, arms | Not implemented | **Missing** | Medium |
| Trend charts | Date range selection | Weight + body fat charts | Partial | Low |
| **Fasting** | | | | |
| Intermittent fasting timer | Full with presets | Implemented | Presets don't differentiate | Medium |
| Fasting state persistence | Server-side | In-memory timer | **Broken on restart** | High |
| **Sleep** | | | | |
| Sleep tracking via Health Connect | Full stages + trends | Stages + trends | None | — |
| Sleep goal setting | Configurable | Not implemented | **Missing** | Low |
| **Vitals** | | | | |
| Resting HR + HRV | Full trends | Resting HR only | **Missing HRV** | Medium |
| **Profile** | | | | |
| Edit profile | Full with avatar | Form fields | No photo upload | Low |
| HR zone editor | Full | Implemented | None | — |
| Unit preferences | Metric/imperial | Settings toggle | None | — |
| External API key | Generate/regenerate | Not implemented | **Missing** | Low |
| **Settings** | | | | |
| Theme toggle | Light/Dark/System | Implemented | Light mode broken | Critical |
| Notification settings | Full | Implemented | None | — |
| Reminder settings | Per-category configuration | Not implemented | **Missing** | Low |
| **Administration** | | | | |
| Admin dashboard | Full (users, AI, backups, etc.) | Not implemented | **Not applicable** | — |
| **Other** | | | | |
| Offline support | PWA service worker | Not implemented | **Missing** | Medium |
| Push notifications | Web push + FCM | FCM service exists | Partial | Low |
| Deep linking | Full | Implemented | None | — |
| Internationalization | German legal pages | None | **Missing** | Medium |

### Parity Summary

- **Fully implemented:** ~35 features
- **Partially implemented:** ~15 features (gaps noted above)
- **Missing from Flutter:** ~25 features (key ones marked High/Critical)
- **Not applicable (admin-only):** ~10 features

**Estimated parity: ~75%**

---

## 3. UI/UX Audit

### 3.1 Theme and Design System

**File:** `lib/core/theme/app_theme.dart`

**Strengths:**
- Material 3 (`useMaterial3: true`) throughout
- Excellent dark mode with OLED-true black (`#000000`)
- Google Fonts (Inter + Outfit) — clean typographic pairing
- Consistent `CardThemeData` with 12px rounded corners, no elevation
- Well-defined `ColorScheme` for dark and light themes

**Issues:**

| ID | Severity | Issue | Files Affected |
|----|----------|-------|----------------|
| UI-01 | **CRITICAL** | All health screens + record screen use hardcoded `AppColors.surfaceDarkVariant` (`#1E1E1E`) and `AppColors.cardDark` (`#1A1A1A`) for container backgrounds. In light mode these render as dark boxes on light background. | body_screen, nutrition_screen, sleep_screen, vitals_screen, supplements_screen, fasting_screen, health_screen, record_screen (~15 screens) |
| UI-02 | **MEDIUM** | No `BottomSheetThemeData` defined. Bottom sheets manually set dark backgrounds. | body_screen, nutrition_screen, supplements_screen |
| UI-03 | **MEDIUM** | No `DialogTheme` defined. Dialog styling is inconsistent. | — |
| UI-04 | **LOW** | Chart/gauge colors hardcoded as `Color(0xFF...)` literals instead of theme extensions. | plan_screen, training_status_card |
| UI-05 | **LOW** | No `ProgressIndicatorTheme` defined. Progress colors manually specified everywhere. | — |

### 3.2 Screen-by-Screen Scores

| Screen | Score | Key Issues |
|--------|-------|------------|
| Dashboard | 8/10 | Missing shimmer animation on skeleton |
| Record | **6/10** | **Map placeholder**, hardcoded dark colors, no landscape mode |
| Analytics | 8/10 | Missing training paces, HR zone distribution |
| Activity List | 8/10 | No search or date filtering |
| Activity Detail | 8/10 | No map/route visualization, nested Padding |
| Health Hub | **6/10** | Hardcoded dark colors, duplicated food-adding logic |
| Body Screen | **6/10** | Hardcoded dark colors, no delete measurement |
| Nutrition | 7/10 | Hardcoded 2000 cal goal, hardcoded macros |
| Sleep | 7/10 | Hardcoded quality thresholds, dark colors |
| Vitals | 7/10 | Missing HRV chart, dark colors |
| Fasting | 7/10 | Presets don't differentiate, timer lost on restart |
| Supplements | 7/10 | Dark colors, limited calendar history |
| Profile | 7/10 | Strava badge always shows connected |
| Edit Profile | 7/10 | `DropdownButtonFormField` uses `initialValue` instead of `value` (bug) |
| Settings | 8/10 | No cache management |
| Login | 8/10 | No "Forgot Password" link, no "Register" link |
| Register | 8/10 | No terms/privacy checkbox |
| Forgot Password | 9/10 | Clean |
| Chat | **9/10** | Most polished screen |
| Race Results | 8/10 | Very long file (1428 lines), no share |
| Plan | 7/10 | `DropdownButtonFormField` bug, no drag reorder |
| Startup | 7/10 | No animation |
| Onboarding | 7/10 | No illustrations |

### 3.3 Cross-Cutting UI Issues

| ID | Severity | Issue |
|----|----------|-------|
| UI-06 | **HIGH** | **No internationalization.** All strings hardcoded in English. Every screen. |
| UI-07 | **MEDIUM** | Only 2 animations in entire app (chat typing indicator, onboarding page dots). No Hero transitions, no micro-interactions. |
| UI-08 | **MEDIUM** | No semantic labels on custom gesture detectors (record screen). Accessibility limited. |
| UI-09 | **MEDIUM** | No tablet/landscape-specific layouts. Fixed 16px/32px horizontal padding. |
| UI-10 | **LOW** | 6-tab `NavigationBar` may clip labels on small phones. |

### 3.4 Specific UI Bugs

| ID | Severity | Bug | File:Line |
|----|----------|-----|-----------|
| UI-11 | **HIGH** | `DropdownButtonFormField` uses `initialValue` parameter (doesn't exist) instead of `value` | edit_profile_screen.dart:169, plan_screen.dart:694 |
| UI-12 | **MEDIUM** | "Strava Connected" badge always shows regardless of actual status | profile_screen.dart:108 |
| UI-13 | **MEDIUM** | Fasting presets (12:12, 16:8, 18:6, 20:4) all call same `onStart` callback without passing different durations | fasting_screen.dart |
| UI-14 | **MEDIUM** | Nutrition screen hardcodes 2000 cal goal and fixed macro maxes (150g protein, 300g carbs, 80g fat) instead of user-configured targets | nutrition_screen.dart:261,419 |
| UI-15 | **MEDIUM** | `_formatDistance`, `_formatPace`, `_formatDuration` duplicated in record_screen instead of using shared formatters | record_screen.dart |

---

## 4. API Integration Audit

### 4.1 Interceptor Pipeline

The app uses 6 Dio interceptors in order:

1. **ConnectivityInterceptor** — Checks network before requests
2. **DeduplicationInterceptor** — Coalesces duplicate in-flight requests
3. **AuthInterceptor** — Injects Bearer token
4. **RefreshInterceptor** — Refreshes expired tokens on 401
5. **RetryInterceptor** — Exponential backoff retry (max 3)
6. **ErrorInterceptor** — Maps Dio errors to domain exceptions

| ID | Severity | Issue | File:Line |
|----|----------|-------|-----------|
| API-01 | **CRITICAL** | **Chat API authentication mismatch.** Chat endpoints use full URLs pointing to `/api/ai/chat/...` (web routes using NextAuth `auth()`) instead of `/api/mobile/v1/ai/chat/...` (mobile JWT routes). Mobile JWT users get 401 on all chat operations. | api_constants.dart:36-38, chat_repository_impl.dart:22,45,69,102,152 |
| API-02 | **CRITICAL** | **AI food scan format mismatch.** Flutter sends multipart `FormData` with `MultipartFile`, but backend `/api/health/nutrition/scan-image` expects JSON with `imageBase64` as base64 string. Food scanning is broken. | health_api_repository_impl.dart:70-90 |
| API-03 | **HIGH** | Duplicate `OfflineException` class defined in both `core/errors/exceptions.dart` and `data/interceptors/connectivity_interceptor.dart`. Different classes with different fields. Import ambiguity causes incorrect catch blocks. | exceptions.dart:43 vs connectivity_interceptor.dart:5-13 |
| API-04 | **HIGH** | `RefreshInterceptor` extends `Interceptor` instead of `QueuedInterceptor`. Concurrent 401s may cause race conditions despite Completer deduplication. | refresh_interceptor.dart:8 |
| API-05 | **HIGH** | Background sync creates bare `Dio` without interceptors — no auth refresh, no retry, no error mapping. Returns `true` on 401. | background_sync.dart:40-44 |
| API-06 | **MEDIUM** | `DeduplicationInterceptor` treats POST requests with same URL but different body as duplicates (key = method + URI only). Memory leak — unbounded `_pendingRequests` map with no timeout cleanup. | deduplication_interceptor.dart:6,51-57 |
| API-07 | **MEDIUM** | No `CancelToken` used in any repository. SSE stream in chat continues after widget disposal. | chat_repository_impl.dart:99, all repositories |
| API-08 | **MEDIUM** | Legacy API fallback cascade — login tries 3 endpoint patterns, refresh tries 2. Adds latency on every auth operation. | auth_repository_impl.dart:80-127, refresh_session.dart:42-66 |
| API-09 | **MEDIUM** | Inconsistent response parsing: 3 different patterns (direct parse, `unwrapPayload`, manual field extraction). No client-side schema validation. | Multiple repositories |
| API-10 | **MEDIUM** | `DashboardRepositoryImpl` returns stale cache on error without informing caller. No cache timestamp or TTL. | dashboard_repository_impl.dart:27 |
| API-11 | **MEDIUM** | `ChatRepositoryImpl` has unbounded `_messagesCache` and `_sessionsCache` with no LRU eviction. | chat_repository_impl.dart:16-17 |
| API-12 | **LOW** | 404 responses mapped to `ServerException` instead of `NotFoundException`. | error_interceptor.dart:77-81 |
| API-13 | **LOW** | No proactive token refresh — always waits for 401 before refreshing. First call after expiry always fails. | auth_interceptor.dart |

### 4.2 Missing Client-Side Input Validation

| Repository | Method | Missing Validation |
|------------|--------|--------------------|
| activity_repository_impl | `createManualActivity` | No distance > 0, duration > 0 check |
| health_api_repository_impl | `aiScanImage` | No file size limit |
| auth_repository_impl | `register` | No email format validation |
| goal_repository_impl | `createGoal` | No date validation |

### 4.3 Timeout Configuration

| Timeout | Value | Assessment |
|---------|-------|------------|
| Connect | 10s | Adequate |
| Send | 30s | Adequate |
| Receive | 30s | May be tight for AI streaming responses |

---

## 5. Code Quality & Architecture Audit

### 5.1 Architecture Assessment

**Layer Structure:**
```
lib/
  core/        — Errors, constants, theme, utils
  data/        — Models (Freezed), repositories (impl), datasources, interceptors
  domain/      — Repository interfaces (abstract)
  presentation/ — Providers, screens, widgets, router
  services/    — Platform services (BLE, GPS, TTS, FCM, sync)
```

| ID | Severity | Issue | File:Line |
|----|----------|-------|-----------|
| ARCH-01 | **CRITICAL** | **Domain layer imports Data layer models directly.** All 9 repository interfaces import from `data/models/`. This breaks the Dependency Rule of clean architecture. | All files in domain/repositories/ |
| ARCH-02 | **HIGH** | Global mutable `GoRouter? globalRouter` assigned during `build()`. Violates unidirectional data flow. | main.dart:15, app.dart:37 |
| ARCH-03 | **HIGH** | Silent error swallowing in initialization — all 3 init functions (`_initDatabase`, `_initNotifications`, `_initBackgroundSync`) catch exceptions and only `debugPrint`. App proceeds in broken state on failure. | main.dart:46-69 |
| ARCH-04 | **HIGH** | `AppDatabase` singleton never closed. `close()` exists but is never invoked on logout or app termination. WAL journal files accumulate. | app_database.dart:65-68 |
| ARCH-05 | **HIGH** | `FcmService` uses static mutable state (`_dio`, `_initialized`, `_token`). Not Riverpod-managed. Prevents GC after logout. | fcm_service.dart:40-43 |
| ARCH-06 | **MEDIUM** | 53 `debugPrint()` calls across codebase instead of using the existing `core/utils/logger.dart` or Sentry. Errors silently lost in release mode. | Multiple files |
| ARCH-07 | **MEDIUM** | `drift: ^2.32.1` declared as dependency but never used. App uses raw `sqlite3`. Dead weight dependency. | pubspec.yaml:29 |
| ARCH-08 | **MEDIUM** | `NotificationServiceImpl` created directly in `main.dart` instead of registered with Riverpod. | main.dart:56 |
| ARCH-09 | **MEDIUM** | `WorkoutRecordingService` accepts GPS points without accuracy filtering. `_gpsAccuracy` is set but never used to reject bad readings. | workout_recording_service.dart:246-303 |
| ARCH-10 | **MEDIUM** | Sequential initialization of independent services. `_initDatabase`, `_initNotifications`, `_initBackgroundSync` could run in parallel with `Future.wait()`. | main.dart:40 |
| ARCH-11 | **MEDIUM** | `HealthSyncService._autoSyncTimer` not automatically stopped on provider invalidation. Relies on manual `stopAutoSync()` call during logout. | health_sync_service.dart:99-103 |
| ARCH-12 | **MEDIUM** | `SyncService._isSyncing` flag is not atomic. Concurrent `triggerSync()` calls could bypass the guard. | sync_service.dart:19-27 |
| ARCH-13 | **LOW** | Large screen files: chat_screen.dart (678 lines), race_result_screen.dart (1428 lines), plan_screen.dart could benefit from decomposition. | Multiple |
| ARCH-14 | **LOW** | `NutritionTargets` is hand-written while all other health models use Freezed. Inconsistent model patterns. | health_models.dart:212-302 |

### 5.2 Test Coverage Assessment

- **507 tests total** — all passing
- ~38 unit tests, ~20 widget tests, 4 integration tests
- **No code coverage measurement** — actual percentage unknown
- **Untested services:** VoiceCoachService, WorkoutRecordingService, HealthConnectService
- **No golden/image tests** for visual regression

### 5.3 Dependency Health

| Package | Status | Action |
|---------|--------|--------|
| `flutter_markdown` | **Discontinued** — replaced by `flutter_markdown_plus` | Migrate |
| `connectivity_plus` | 2 versions behind | Update |
| `google_fonts` | 2 major versions behind | Update cautiously |
| `drift` | Declared but unused | Remove or migrate DB layer |
| `jni` | Major version behind | Review compatibility |

---

## 6. Consolidated Findings Table

| ID | Category | Severity | Summary | Effort |
|----|----------|----------|---------|--------|
| API-01 | API | **CRITICAL** | Chat auth mismatch — mobile JWT users get 401 | 2h |
| API-02 | API | **CRITICAL** | AI food scan format mismatch — broken feature | 2h |
| UI-01 | UI | **CRITICAL** | Hardcoded dark colors break light mode (15+ screens) | 6h |
| UI-06 | UI | **HIGH** | No internationalization — all strings hardcoded | 40h |
| ARCH-01 | Arch | **CRITICAL** | Domain imports Data models — architecture violation | 8h |
| API-03 | API | **HIGH** | Duplicate OfflineException class | 1h |
| API-04 | API | **HIGH** | RefreshInterceptor not queued | 2h |
| API-05 | API | **HIGH** | Background sync has no interceptors | 2h |
| UI-11 | UI | **HIGH** | DropdownButtonFormField `initialValue` bug | 0.5h |
| ARCH-02 | Arch | **HIGH** | Global mutable GoRouter | 2h |
| ARCH-03 | Arch | **HIGH** | Silent init failures | 2h |
| ARCH-04 | Arch | **HIGH** | AppDatabase never closed | 1h |
| ARCH-05 | Arch | **HIGH** | FCM static mutable state | 2h |
| UI-07 | UI | **MEDIUM** | Minimal animations/transitions | 8h |
| UI-08 | UI | **MEDIUM** | Missing accessibility (semantic labels) | 4h |
| UI-09 | UI | **MEDIUM** | No tablet/landscape layouts | 6h |
| UI-12 | UI | **MEDIUM** | Strava badge always shows connected | 0.5h |
| UI-13 | UI | **MEDIUM** | Fasting presets don't differentiate | 1h |
| UI-14 | UI | **MEDIUM** | Hardcoded nutrition goals | 2h |
| UI-15 | UI | **MEDIUM** | Duplicated formatters in record screen | 1h |
| API-06 | API | **MEDIUM** | DeduplicationInterceptor POST key collision + memory leak | 2h |
| API-07 | API | **MEDIUM** | No CancelToken usage | 4h |
| API-08 | API | **MEDIUM** | Legacy API fallback cascade | 2h |
| API-09 | API | **MEDIUM** | Inconsistent response parsing | 4h |
| API-10 | API | **MEDIUM** | Stale dashboard cache without TTL | 1h |
| API-11 | API | **MEDIUM** | Unbounded chat caches | 1h |
| ARCH-06 | Arch | **MEDIUM** | 53 debugPrint calls instead of logger | 3h |
| ARCH-07 | Arch | **MEDIUM** | Unused `drift` dependency | 0.5h |
| ARCH-08 | Arch | **MEDIUM** | NotificationService not in DI | 1h |
| ARCH-09 | Arch | **MEDIUM** | No GPS accuracy filtering | 2h |
| ARCH-10 | Arch | **MEDIUM** | Sequential init of independent services | 0.5h |
| ARCH-11 | Arch | **MEDIUM** | Auto-sync timer lifecycle fragile | 1h |
| ARCH-12 | Arch | **MEDIUM** | Non-atomic sync flag | 0.5h |
| PARITY | Feature | **HIGH** | Record screen map missing | 16h |
| PARITY | Feature | **MEDIUM** | Missing training paces section | 4h |
| PARITY | Feature | **MEDIUM** | Missing HR zone distribution chart | 3h |
| PARITY | Feature | **MEDIUM** | Missing shape calibration slider | 3h |
| PARITY | Feature | **MEDIUM** | Missing circumference measurements | 3h |
| PARITY | Feature | **MEDIUM** | Missing HRV trend chart | 3h |
| PARITY | Feature | **MEDIUM** | Fasting state not persisted | 2h |
| PARITY | Feature | **LOW** | Missing drag-to-reorder workouts | 4h |
| PARITY | Feature | **LOW** | Missing nutrition personalization (targets from API) | 3h |

---

## 7. Prioritized Fix Plan (Improved)

This section is restructured for execution quality: confidence tagging, strict priority ordering (P0->P3), and measurable exit criteria.

### 7.1 Triage Rules

- `Confirmed`: reproduced locally or verified with logs/tests.
- `Likely`: high-confidence from static/code inspection but not reproduced.
- `Needs Repro`: plausible finding requiring a short repro task before scheduling.

### 7.2 Priority Buckets

| Bucket | Definition | Target Window |
|--------|------------|---------------|
| P0 | User-facing breakage in core flows (auth, chat, health logging, theme) | Immediate |
| P1 | Reliability and runtime safety risks | Next 1 sprint |
| P2 | Architecture and maintainability improvements | Next 1-2 sprints |
| P3 | Parity expansion and polish | Rolling roadmap |

### 7.3 Phase A - Validation Gate (Day 1)

**Goal:** Prevent false positives and lock a trusted backlog.

| # | Task | ID | Priority | Confidence | Est. |
|---|------|----|----------|------------|------|
| A1 | Build repro sheet for top 15 findings (steps, expected, actual, evidence) | Mixed | P0/P1 | Confirmed or tagged | 3h |
| A2 | Tag every High/Critical item as Confirmed/Likely/Needs Repro | Mixed | P0/P1 | Confirmed | 2h |
| A3 | Assign owner + release target for each P0/P1 item | Mixed | P0/P1 | Confirmed | 1h |

**Exit Criteria:** Top 15 findings are confidence-tagged and scheduled.

### 7.4 Phase B - P0 Breakage Fixes (Day 2-4)

**Goal:** Restore core user flows first.

| # | Task | ID | Priority | Confidence | Est. |
|---|------|----|----------|------------|------|
| B1 | Fix chat endpoints to mobile JWT-compatible routes (`/api/mobile/v1/ai/chat/...`) | API-01 | P0 | Confirmed | 2h |
| B2 | Fix AI food scan payload contract (base64 JSON vs multipart mismatch) | API-02 | P0 | Confirmed | 2h |
| B3 | Fix `DropdownButtonFormField` invalid `initialValue` usage | UI-11 | P0 | Confirmed | 0.5h |
| B4 | Fix light mode breakage in high-traffic screens (Dashboard, Health Hub, Nutrition, Record) | UI-01 | P0 | Confirmed | 4h |
| B5 | Consolidate duplicate `OfflineException` class | API-03 | P0 | Confirmed | 1h |

**Exit Criteria:** Login -> Dashboard -> Chat -> AI Scan -> Health flow all pass manual smoke in light/dark themes.

### 7.5 Phase C - P1 Reliability and Safety (Day 5-8)

**Goal:** Stabilize auth/session/network behavior.

| # | Task | ID | Priority | Confidence | Est. |
|---|------|----|----------|------------|------|
| C1 | Convert `RefreshInterceptor` to `QueuedInterceptor` | API-04 | P1 | Likely | 2h |
| C2 | Add interceptor parity to background sync client | API-05 | P1 | Confirmed | 2h |
| C3 | Add `CancelToken` support for streaming/long requests | API-07 | P1 | Likely | 2h |
| C4 | Fix deduplication key strategy (exclude non-idempotent POST), add pending map cleanup | API-06 | P1 | Likely | 2h |
| C5 | Improve startup init failure handling with user-visible fallback | ARCH-03 | P1 | Confirmed | 2h |
| C6 | Replace stale auth endpoint fallback cascade with v1-only pathing | API-08 | P1 | Confirmed | 2h |

**Exit Criteria:** No auth refresh race repro; no background sync false-success on 401; streaming cancellation verified.

### 7.6 Phase D - P2 Architecture Stabilization (Day 9-14)

**Goal:** Reduce long-term maintenance risk.

| # | Task | ID | Priority | Confidence | Est. |
|---|------|----|----------|------------|------|
| D1 | Remove global mutable router pattern | ARCH-02 | P2 | Confirmed | 2h |
| D2 | Define database lifecycle ownership and ensure close/dispose policy | ARCH-04 | P2 | Likely | 1h |
| D3 | Refactor FCM service lifecycle ownership (remove static state coupling) | ARCH-05 | P2 | Likely | 2h |
| D4 | Standardize response parsing strategy across repositories | API-09 | P2 | Confirmed | 4h |
| D5 | Add dashboard cache TTL + stale-data signaling | API-10 | P2 | Likely | 1h |
| D6 | Add bounded LRU policy for chat caches | API-11 | P2 | Confirmed | 1h |
| D7 | Replace `debugPrint` error paths with logger/Sentry integration | ARCH-06 | P2 | Confirmed | 3h |
| D8 | Resolve `drift` dependency decision (remove or migrate) | ARCH-07 | P2 | Confirmed | 0.5h |
| D9 | Move notification service to DI/provider ownership | ARCH-08 | P2 | Confirmed | 1h |

**Exit Criteria:** Architecture ADR approved, core lifecycle ownership documented, no unbounded cache structures remain.

### 7.7 Phase E - P3 Feature Parity Delta (Sprint-based)

**Goal:** Raise parity from ~75% toward 88%+.

| # | Task | ID | Priority | Confidence | Est. |
|---|------|----|----------|------------|------|
| E1 | Map SDK integration for recording + activity route visualization | PARITY | P3 | Confirmed | 16h |
| E2 | Add training paces section | PARITY | P3 | Confirmed | 4h |
| E3 | Add HR zone distribution chart | PARITY | P3 | Confirmed | 3h |
| E4 | Add shape calibration slider | PARITY | P3 | Confirmed | 3h |
| E5 | Add body circumference measurements | PARITY | P3 | Confirmed | 3h |
| E6 | Add HRV trend chart | PARITY | P3 | Confirmed | 3h |
| E7 | Persist fasting state across restarts/server | PARITY | P3 | Confirmed | 2h |
| E8 | Add nutrition personalization from API targets | PARITY | P3 | Confirmed | 3h |
| E9 | Add drag-to-reorder workouts | PARITY | P3 | Confirmed | 4h |

**Exit Criteria:** Parity KPI reaches target agreed by product (recommended: >=88%).

### 7.8 Phase F - UX, i18n, and Quality Gates

**Goal:** Improve product quality after core stability.

| Track | Scope | Est. |
|------|-------|------|
| UX/A11y | Theme consistency, semantics labels, key motion improvements | 12-16h |
| i18n | ARB extraction, German translation, locale selector | 28-36h |
| QA Gates | Coverage reporting, tests for recording/health-connect/voice-coach, dependency cleanup | 12-16h |

**Exit Criteria:**
- CI includes `flutter analyze`, tests, and coverage artifact.
- Light/dark and small/large device QA checklist passes.
- Discontinued package migration plan is complete.

---

## Total Estimated Effort (Revised)

| Segment | Duration | Focus |
|--------|----------|-------|
| Phase A | Day 1 | Validation gate |
| Phase B | Day 2-4 | P0 user breakages |
| Phase C | Day 5-8 | Reliability and runtime safety |
| Phase D | Day 9-14 | Architecture stabilization |
| Phase E | Sprint-based | Feature parity delta |
| Phase F | Parallel/rolling | UX, i18n, quality gates |

**Revised total:** ~120-160 hours for P0-P2 stabilization, plus ~40-70 hours for parity/polish tracks.

---

## Appendix: Positive Findings

Not everything is broken. The app has several noteworthy strengths:

1. **Error state handling is excellent** — Every `AsyncValue`-using screen consistently handles loading, error, and data states via `.when()`. Error widgets always show icon + message + retry button.

2. **State management is clean** — Consistent Riverpod with code generation. Proper provider lifecycle management in most places. `ref.onDispose()` used correctly for services.

3. **Chat screen is production-quality** (9/10) — Streaming SSE with typing indicator, session management, markdown rendering, haptic feedback, scroll-to-bottom animation.

4. **Interceptor pipeline is well-designed** — 6-layer pipeline with connectivity, dedup, auth, refresh, retry, and error mapping. The concept is sound, just needs fixes (QueuedInterceptor for refresh, CancelTokens).

5. **507 tests all passing** — Solid test foundation even if coverage measurement is missing.

6. **Static analysis clean** — `flutter analyze` reports 0 issues.

7. **Proper Material 3 adoption** — Theme system is well-structured, just needs to be actually used instead of hardcoded colors.

8. **Security-conscious** — Token storage in `flutter_secure_storage`, proper logout flow, Sentry integration for production error tracking.

---

## 8. Multi-Agent Orchestration Plan (@general only)

This orchestration plan converts the audit roadmap into an execution model using only `@general` agents, with a mandatory independent review checkpoint after every phase and a final independent review gate.

### 8.1 Executive Summary

- Execute a 6-phase program that resolves core breakages first (P0), then reliability (P1), architecture (P2), parity (P3), and finally UX/i18n/quality hardening.
- Use parallel `@general` workstreams where safe, and strict sequential gate checks where risk is high.
- Require an independent `@general Review Agent` pass at the end of every phase, plus one final independent release review.

### 8.2 Master Timeline

| Phase | Window | Priority | Core Outcome | Parallelization |
|---|---:|---|---|---|
| A Validation | Day 1 | Gate | Trusted backlog + confidence tags | High |
| B P0 Breakages | Day 2-4 | P0 | Core user flows restored | Medium-High |
| C P1 Reliability | Day 5-8 | P1 | Stable auth/network/session | High |
| D P2 Architecture | Day 9-14 | P2 | Reduced systemic maintenance risk | High |
| E P3 Parity | Sprint track | P3 | Parity uplift toward >=88% | High |
| F UX+i18n+Quality | Parallel/rolling | P3+ | Production readiness hardening | High |
| Final Independent Review | End | Release gate | RAG release decision | Sequential gate |

### 8.3 Phase-by-Phase Plan

#### Phase A - Validation

**Goal**
- Confirm top findings and lock a reliable execution backlog.

**Inputs**
- `auditsonnet28.md`, CI state, current repro logs, issue tracker.

**Workstreams**
- Parallel:
  - Build repro sheet for top 15 findings.
  - Confidence-tag all High/Critical (`Confirmed`, `Likely`, `Needs Repro`).
- Sequential:
  - Assign owner + target release after confidence tagging.

**Assigned `@general` Agents**
- `@general Triage Agent` (lead)
- `@general API Agent`
- `@general UI Agent`
- `@general QA Agent`
- `@general Review Agent` (independent)

**Deliverables**
- Confidence-tagged backlog and evidence pack.
- Owner/date matrix for all P0/P1 items.

**Verification / Exit Gates**
- Top 15 findings have reproducible evidence and confidence tags.
- Every P0/P1 item has owner + due date.

**Risks and Rollback**
- Risk: Misclassification of severity/confidence.
- Rollback: downgrade uncertain issues to `Needs Repro` and block phase carryover.

**Time Estimate**
- 6 hours.

**Review-Agent Checklist (independent)**
- Repro quality acceptable.
- Confidence tags consistent.
- No orphaned P0/P1 work.
- Dependencies identified.

#### Phase B - P0 Breakages

**Goal**
- Restore broken user-critical journeys.

**Inputs**
- Phase A validated backlog.
- API-01, API-02, API-03, UI-01, UI-11.

**Workstreams**
- Parallel:
  - Chat endpoint auth-path correction (API-01).
  - AI scan payload contract fix (API-02).
  - Dropdown runtime bug fix (UI-11).
  - `OfflineException` consolidation (API-03).
  - Light-mode fixes in high-traffic screens (UI-01 core subset).
- Sequential:
  - E2E smoke pass: login -> dashboard -> chat -> AI scan -> health in light/dark.

**Assigned `@general` Agents**
- `@general API Agent`
- `@general UI Agent`
- `@general Integration Agent`
- `@general QA Agent`
- `@general Review Agent` (independent)

**Deliverables**
- Merged P0 fix set.
- Smoke evidence (logs/screenshots/test outputs).

**Verification / Exit Gates**
- No mobile 401 on chat flow.
- AI scan payload accepted and processed.
- High-traffic screens are visually correct in light/dark.
- Dropdown regression closed.

**Risks and Rollback**
- Risk: API contract drift and auth regression.
- Rollback: guarded fallback route mapping/feature toggle while preserving JWT model.

**Time Estimate**
- 2.5 to 3 days.

**Review-Agent Checklist (independent)**
- JWT/mobile route correctness.
- Theme regressions checked.
- No new critical crash path.
- Core smoke path evidence complete.

#### Phase C - P1 Reliability

**Goal**
- Eliminate race conditions and runtime safety regressions.

**Inputs**
- API-04/05/06/07/08, ARCH-03.
- Stable baseline from Phase B.

**Workstreams**
- Parallel:
  - Refresh interceptor queueing hardening.
  - Background sync interceptor parity.
  - CancelToken support for long-lived/streaming requests.
  - Dedup key and cleanup policy fix.
  - Auth fallback path reduction to v1 endpoints.
- Sequential:
  - Concurrency stress + startup-failure fallback verification.

**Assigned `@general` Agents**
- `@general Reliability Agent` (lead)
- `@general API Agent`
- `@general Runtime Agent`
- `@general QA Agent`
- `@general Review Agent` (independent)

**Deliverables**
- Reliability patch set.
- Race/stress test evidence.

**Verification / Exit Gates**
- No concurrent 401 refresh race failures.
- Background sync does not false-pass auth failures.
- Request cancellation works during screen disposal.

**Risks and Rollback**
- Risk: queueing increases latency.
- Rollback: bounded queue policy and selective application by endpoint class.

**Time Estimate**
- 3 to 4 days.

**Review-Agent Checklist (independent)**
- Interceptor ordering integrity.
- Race tests reproducible.
- Startup fallback UX validated.
- Retry/dedup behavior safe for non-idempotent requests.

#### Phase D - P2 Architecture

**Goal**
- Reduce maintenance risk and clarify lifecycle ownership.

**Inputs**
- ARCH-02..08, API-09..11.

**Workstreams**
- Parallel:
  - Remove global mutable router pattern.
  - FCM/notification lifecycle ownership via DI.
  - Response parsing standardization.
  - Cache TTL/LRU and bounded memory behavior.
  - Logging standardization to logger/Sentry paths.
- Sequential:
  - ADR/doc signoff for architecture decisions.

**Assigned `@general` Agents**
- `@general Architecture Agent` (lead)
- `@general Platform Agent`
- `@general Observability Agent`
- `@general QA Agent`
- `@general Review Agent` (independent)

**Deliverables**
- Architecture refactor PR set.
- ADRs and lifecycle ownership docs.

**Verification / Exit Gates**
- No unbounded cache structures.
- Routing and service ownership documented and enforceable.
- Logging paths aligned with production observability.

**Risks and Rollback**
- Risk: cross-module regressions from refactors.
- Rollback: staged PR batches and module-level feature toggles.

**Time Estimate**
- 4 to 6 days.

**Review-Agent Checklist (independent)**
- ADR quality and completeness.
- DI ownership correctness.
- Cache bound verification.
- Observability evidence present.

#### Phase E - P3 Parity

**Goal**
- Raise parity from ~75% to target >=88%.

**Inputs**
- Parity backlog: map integration, analytics parity, health parity, workout reorder.

**Workstreams**
- Parallel Track 1:
  - Map SDK integration for recording/activity detail routes.
- Parallel Track 2:
  - Training paces, HR zone chart, shape calibration, HRV trend.
- Parallel Track 3:
  - Circumference metrics, fasting persistence, nutrition target personalization, drag reorder.
- Sequential:
  - Parity KPI measurement and regression sweep.

**Assigned `@general` Agents**
- `@general Feature Agent` (lead)
- `@general UI Agent`
- `@general API Agent`
- `@general QA Agent`
- `@general Review Agent` (independent)

**Deliverables**
- Incremental parity features with KPI updates.

**Verification / Exit Gates**
- Parity KPI reaches agreed threshold (recommended >=88%).
- No P0/P1 regression introduced.

**Risks and Rollback**
- Risk: scope inflation.
- Rollback: split into shippable slices behind toggles.

**Time Estimate**
- 1 to 2 sprints.

**Review-Agent Checklist (independent)**
- KPI evidence valid.
- Parity definition unchanged.
- Performance and permission checks for map/features.

#### Phase F - UX + i18n + Quality Gates

**Goal**
- Raise release quality after core stability.

**Inputs**
- UI-06..10, QA gate targets, dependency health actions.

**Workstreams**
- Parallel:
  - i18n extraction + locale support.
  - Accessibility semantics and responsive layout fixes.
  - CI quality-gate hardening and coverage artifact.
  - Dependency migration planning (`flutter_markdown` replacement).
- Sequential:
  - Device-matrix QA signoff.

**Assigned `@general` Agents**
- `@general UX Agent` (lead)
- `@general i18n Agent`
- `@general QA/CI Agent`
- `@general Review Agent` (independent)

**Deliverables**
- i18n framework and locale path.
- Accessibility/UX hardening pack.
- Enforced CI quality gates.

**Verification / Exit Gates**
- CI includes analyze + test + coverage artifact.
- Light/dark and small/large device checklists pass.
- Dependency migration plan approved.

**Risks and Rollback**
- Risk: string freeze churn and late text regressions.
- Rollback: locale fallback + staged translation rollout.

**Time Estimate**
- ~1 sprint (parallelizable).

**Review-Agent Checklist (independent)**
- Localization completeness baseline met.
- Accessibility checks passed.
- Quality gate enforcement verified.

### 8.4 Review Framework (Mandatory)

- Every phase has one **independent** `@general Review Agent` (never self-approval).
- Required artifacts per phase review:
  - Scope diff
  - Evidence links
  - Risk delta
  - Gate result (`Pass`, `Conditional`, `Fail`)
  - Follow-up tickets for unresolved items
- Conditional pass requires dated remediation owners before next phase starts.

### 8.5 Cross-Phase Governance

#### RACI-Style Ownership

| Function | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Phase execution | Phase lead `@general` agent | `@general Program Coordinator` | API/UI/Arch/QA agents | Product + release stakeholders |
| Review gates | `@general Review Agent` | `@general Program Coordinator` | Implementer agents | Stakeholders |
| Final release decision | `@general Final Review Agent` | `@general Program Coordinator` | All phase leads | Stakeholders |

#### Dependency Graph

- A -> B/C/D/E/F (mandatory entry gate)
- B -> C (required)
- B -> E/F (required baseline)
- C -> D (recommended)
- C -> E/F (required reliability baseline)
- D -> E/F (recommended hardening dependency)
- E/F -> Final Review (required)

#### Change-Control Rules (Force Re-Review)

Any of the following automatically triggers phase re-review:
- Auth route/token behavior changes
- API request/response contract changes
- Interceptor order/lifecycle changes
- Global theme token changes
- Navigation/lifecycle ownership changes

#### Branch/PR Strategy and Merge Gates

- Branch naming: `phase/<A-F>-<topic>`
- Short-lived PRs per workstream
- Merge gates:
  - Tests/analyze pass
  - Required independent review-agent signoff
  - No open Critical regressions in modified scope
- Promotion rule: current phase gate must pass before high-risk work from next phase merges.

#### Test Strategy by Phase

- Phase A: repro validation and evidence capture
- Phase B: core flow smoke (auth/chat/scan/health, light/dark)
- Phase C: race/concurrency/startup fallback tests
- Phase D: architecture/lifecycle regression tests
- Phase E: parity acceptance + regression matrix
- Phase F: i18n/a11y/device matrix + CI gate verification

### 8.6 Final Independent Review Agent

**Scope**
- Validate all phase gate artifacts, unresolved risk register, and release readiness evidence.

**Acceptance Criteria**
- All P0/P1 items closed or explicitly waived with approved risk acceptance.
- Phase gates A-F are documented with evidence.
- No critical regressions in auth/chat/scan/theme paths.
- CI gates are green and reproducible.

**RAG Decision Rubric**
- `Green`: all critical gates passed, no blocking risks.
- `Amber`: non-blocking gaps with approved mitigation and due dates.
- `Red`: failed P0/P1 gate, missing evidence, or unresolved critical regression.

### 8.7 Top 10 Risk Register

1. Mobile/web auth path drift is reintroduced.
2. AI scan payload contract mismatch reappears.
3. Theme regressions persist in low-traffic screens.
4. Interceptor queue/dedup side effects under load.
5. Architecture refactors create lifecycle regressions.
6. Map feature introduces performance/permission issues.
7. i18n extraction causes key/string regressions.
8. Parallel workstream merge conflicts increase lead time.
9. New parity features lack regression depth.
10. Dependency upgrades introduce runtime instability.

### 8.8 Kickoff Checklist (First 48 Hours)

- Appoint `@general Program Coordinator` and phase leads.
- Run Phase A triage and publish confidence-tagged top-15 list.
- Lock Phase B strictly to API-01/02/03 + UI-01/11.
- Create PR templates with mandatory independent review-agent gate.
- Define and run smoke path: login -> dashboard -> chat -> AI scan -> health (light/dark).
- Publish daily checkpoint cadence: gate status + risk burn-down.
