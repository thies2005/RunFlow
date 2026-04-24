# RunFlow Flutter — Agent Instructions

> **Purpose:** Master reference for AI agents building the RunFlow Flutter Android app. Every agent MUST read this file before writing any code.

---

## 1. Project Overview

RunFlow is a running performance dashboard. This Flutter app replaces the existing Capacitor WebView wrapper with a truly native Android experience, consuming the existing RunFlow backend REST API.

**Backend:** Next.js 15 at `https://runflow.schuelken.uk`
**Mobile API:** REST at `/api/mobile/v1/*` with JWT Bearer auth
**OpenAPI Spec:** `../Web/openapi-mobile-v1.yaml` (source of truth for all DTOs)

---

## 2. Tech Stack (Use These Exact Versions)

| Layer | Package | Version |
|-------|---------|---------|
| **Framework** | Flutter | 3.41.x (latest stable) |
| **Language** | Dart | 3.11.x |
| **State Management** | flutter_riverpod | ^3.3.1 |
| **Code Gen** | riverpod_generator | latest |
| **Navigation** | go_router | ^17.1.0 |
| **HTTP** | dio | ^5.9.2 |
| **Models** | freezed + json_serializable | ^3.2.5 |
| **Charts** | fl_chart | ^1.2.0 |
| **Local DB** | drift | ^2.32.1 |
| **Secure Storage** | flutter_secure_storage | ^10.0.0 |
| **Health** | health | ^11.0.0 |
| **Notifications** | flutter_local_notifications | latest |
| **Push** | firebase_messaging | ^16.2.0 |
| **Background** | workmanager | ^0.9.0 |
| **Deep Links** | app_links | latest |
| **Share** | share_plus | latest |
| **OAuth** | flutter_web_auth_2 | latest |
| **Markdown** | flutter_markdown | latest |
| **Calendar** | table_calendar | latest |
| **Splash** | flutter_native_splash | latest |
| **Crash Reports** | sentry_flutter | latest |

**Android:** minSdk = 29 (Android 10), targetSdk = 35, compileSdk = 35

---

## 3. Architecture (Clean Architecture + Riverpod)

```
lib/
├── main.dart
├── app.dart                    # MaterialApp.router + ProviderScope
├── core/
│   ├── theme/                  # Material 3 theme data, colors, typography
│   ├── constants/              # API base URL, app config
│   ├── extensions/             # DateTime, String, num extensions
│   ├── errors/                 # AppException, Failure classes
│   └── utils/                  # Pace/distance/duration formatters
├── data/
│   ├── models/                 # freezed data classes (from OpenAPI)
│   ├── repositories/           # Repository implementations
│   ├── datasources/
│   │   ├── remote/             # Dio API client per feature
│   │   └── local/              # Drift DAOs, Hive boxes
│   └── interceptors/           # Auth interceptor, error interceptor
├── domain/
│   ├── entities/               # Core business objects (if different from DTOs)
│   └── repositories/           # Abstract repository interfaces
├── presentation/
│   ├── screens/                # Full screens (one dir per feature)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── activities/
│   │   ├── analytics/
│   │   ├── goals/
│   │   ├── chat/
│   │   ├── health/
│   │   ├── profile/
│   │   └── onboarding/
│   ├── widgets/                # Shared reusable widgets
│   ├── providers/              # Riverpod providers (per feature)
│   └── router/                 # go_router config + guards
└── services/
    ├── auth_service.dart       # JWT token management
    ├── health_connect_service.dart
    ├── notification_service.dart
    └── sync_service.dart
```

---

## 4. Coding Standards

### Dart Rules
- Analysis: use `flutter_lints` with `strict: true` equivalent
- NEVER use `dynamic` or `any` — always explicit types
- All public APIs must have dartdoc comments
- Use `final` by default, `var` only when mutation is needed
- Prefer `const` constructors everywhere possible
- Null safety: use `?.` and `??`, never `!` unless provably non-null

### Riverpod Patterns
- Use `@riverpod` code generation (not manual providers)
- Use `AsyncNotifier` for all API-backed state
- Use `Notifier` for local-only state
- Always handle loading/error/data states in UI with `.when()`
- Keep providers in `presentation/providers/` grouped by feature

### Naming
| Target | Convention | Example |
|--------|-----------|---------|
| Files | `snake_case.dart` | `activity_list_screen.dart` |
| Classes | `PascalCase` | `ActivityListScreen` |
| Functions/variables | `camelCase` | `fetchActivities` |
| Constants | `camelCase` or `UPPER_SNAKE` | `apiBaseUrl` |
| Providers | `camelCase + Provider` suffix | `dashboardProvider` |
| Freezed models | `PascalCase` | `Activity`, `DashboardResponse` |

### Error Handling
- All API calls wrapped in try/catch
- Use `AsyncValue.guard()` in providers
- Show user-friendly snackbars for errors
- Log errors to Sentry in release mode

---

## 5. API Contract

All endpoints require `Authorization: Bearer <jwt_token>` header.
Base URL: `https://runflow.schuelken.uk/api/mobile/v1`

### Key Endpoints
```
POST /auth/login              — { code: string } → { accessToken, refreshToken, user }
POST /auth/refresh            — { refreshToken } → { accessToken, refreshToken }
GET  /dashboard               — → DashboardResponse
GET  /activities              — ?limit=50&offset=0&type=RUN → ActivitiesResponse
GET  /activities/{id}         — → Activity (with streams)
POST /activities              — Manual activity creation
GET  /goals                   — → GoalsResponse
POST /goals                   — Create goal
GET  /goals/{id}              — → Goal with workouts
PUT  /goals/{id}              — Update goal
DELETE /goals/{id}            — Delete goal
GET  /workouts                — ?goalId=&weekStart=&weekEnd= → WorkoutsResponse
POST /sync                    — { range } → SyncResult
GET  /sync                    — → SyncStatus
GET  /analytics/stats         — → AnalyticsStats
GET  /analytics/history       — ?startDate=&endDate= → FitnessHistory[]
GET  /user/profile            — → UserProfile
PUT  /user/profile            — Update profile
```

---

## 6. Domain Formulas (Port from Web)

### VDOT Calculator (Jack Daniels)
```dart
double calculateVdot(double distanceMeters, double timeMinutes) {
  final velocity = distanceMeters / timeMinutes;
  final vo2 = -4.60 + 0.182258 * velocity + 0.000104 * pow(velocity, 2);
  final pctVo2max = 0.8 +
    0.1894393 * exp(-0.012778 * timeMinutes) +
    0.2989558 * exp(-0.1932605 * timeMinutes);
  return vo2 / pctVo2max;
}
```

### TSB Status
```dart
String tsbStatus(double tsb) {
  if (tsb >= 25) return 'Peaked';
  if (tsb >= 5) return 'Fresh';
  if (tsb >= -10) return 'Neutral';
  if (tsb >= -30) return 'Fatigued';
  return 'Very Fatigued';
}
```

---

## 7. Research Requirements

Before implementing ANY feature, agents MUST:
1. **Search Brave** for latest best practices and breaking changes
2. **Query Context7 MCP** for up-to-date documentation of every package used
3. **Check pub.dev** for the latest stable version before adding dependencies
4. **Read the OpenAPI spec** (`../Web/openapi-mobile-v1.yaml`) for exact request/response shapes

---

## 8. Testing Requirements

### After Every Feature
- `flutter analyze` — ZERO issues
- `flutter test` — ALL tests pass
- `flutter build apk --debug` — succeeds

### Test Structure
```
test/
├── unit/           # Models, services, business logic
├── widget/         # Screen and component rendering
├── integration/    # API round-trips with mocks
└── golden/         # Visual regression screenshots
```

### Minimum Coverage
- All freezed models: serialization round-trip tests
- All providers: loading/success/error state tests
- All screens: basic render + interaction widget tests
- All metric calculations: cross-reference with web app values

---

## 9. Workflow

### Session Start
```bash
cd "c:\Users\thies\Antigravity\Full RunFlow"
git pull origin master
```

### Pre-Push Validation
```bash
cd flutter
flutter analyze
flutter test
flutter build apk --debug
```

### Code Generation
```bash
dart run build_runner build --delete-conflicting-outputs
```

All three checks MUST pass before any commit/push.
