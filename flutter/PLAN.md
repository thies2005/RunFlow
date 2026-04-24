# RunFlow Flutter — Phased Build Plan

> **For use with OpenCode agents.** Each phase is a self-contained prompt. Run them sequentially.
> Agents must read `AGENT.md` before every phase.

---

## How to Execute in OpenCode

### Setup
1. Open OpenCode in the RunFlow project: `cd "c:\Users\thies\Antigravity\Full RunFlow" && opencode`
2. The `flutter/AGENT.md` file will be auto-read by the agent
3. Copy each phase prompt below into OpenCode as a new task

### Agent Workflow Per Phase
Each phase follows a **3-step pipeline**:
1. **Build** — Implement the feature
2. **Review** — Self-audit against AGENT.md standards
3. **Test** — Run `flutter analyze`, `flutter test`, `flutter build apk --debug`

### Rules for Agents
- Before coding, search **Brave** and **Context7 MCP** for latest docs on every package
- Use the exact versions from `AGENT.md`
- After each phase, commit with a descriptive message
- Never proceed to the next phase if tests fail

---

## Phase 0: Project Scaffold

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Create a new Flutter project in the `flutter/` directory:
1. Run `flutter create --org com.runflow --project-name runflow_flutter --platforms android ./flutter`
2. Set minSdk=29, targetSdk=35, compileSdk=35 in android/app/build.gradle.kts
3. Set applicationId to "com.runflow.app"
4. Add ALL dependencies from AGENT.md to pubspec.yaml — search Context7 and Brave for the latest stable versions of each package before adding
5. Create the full directory structure from AGENT.md section 3
6. Set up Material 3 theming in core/theme/:
   - Primary color: #FF6B35 (RunFlow orange)
   - Dark theme with OLED black background
   - Use Google Fonts (Inter for body, Outfit for headings)
7. Set up go_router skeleton with routes: /login, /dashboard, /activities, /analytics, /goals, /chat, /health, /profile
8. Set up Riverpod with code generation (riverpod_annotation + riverpod_generator)
9. Create a basic app shell with bottom navigation bar (Dashboard, Activities, Analytics, Goals, Profile)
10. Set up analysis_options.yaml with strict linting
11. Run `dart run build_runner build --delete-conflicting-outputs`
12. Verify: `flutter analyze` passes, `flutter build apk --debug` succeeds

REVIEW: Check all AGENT.md standards are met. Fix any issues.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 1: Authentication

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Implement authentication in the flutter/ project:
1. Search Context7 for flutter_secure_storage and flutter_web_auth_2 latest docs
2. Create freezed models: LoginRequest, LoginResponse, User, TokenPair (match OpenAPI spec in ../Web/openapi-mobile-v1.yaml)
3. Create AuthService:
   - storeTokens/getTokens/clearTokens using flutter_secure_storage
   - isLoggedIn check
   - Auto-login on app start from stored tokens
4. Create Dio client with interceptors:
   - AuthInterceptor: auto-attach Bearer token to all requests
   - RefreshInterceptor: on 401, refresh token and retry (queue concurrent requests)
   - ErrorInterceptor: map API errors to AppException
5. Create AuthRepository with login(stravaCode), loginEmail(email, password), refreshToken(), logout()
6. Create Riverpod providers: authStateProvider, currentUserProvider
7. Build screens:
   - LoginScreen: Strava OAuth button + email/password form
   - Strava OAuth flow using flutter_web_auth_2 (redirect URI: runflow://auth/callback)
8. Add auth guard to go_router: redirect to /login if not authenticated
9. Write tests: token storage, refresh logic, interceptor behavior, login screen renders

REVIEW: Verify tokens are NEVER logged. Refresh handles race conditions. All error states shown.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 2: Dashboard

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build the Dashboard screen in flutter/:
1. Search Context7 for flutter_riverpod AsyncNotifier patterns and fl_chart latest docs
2. Create freezed models from OpenAPI: DashboardResponse, AnalyticsStats, SyncStatus, SyncResult
3. Create DashboardRepository: fetchDashboard(), triggerSync(), getSyncStatus()
4. Create dashboardProvider as AsyncNotifier — handles loading/error/data
5. Build DashboardScreen with RefreshIndicator (pull-to-refresh):
   - Stats card: weekly mileage, total activities count
   - Today's workout card: type, description, target pace (tap to see details)
   - Recent activities: last 5 with type icon, name, distance, pace, date
   - Active goals: race name, countdown timer, progress indicator
   - Sync status: last sync time, manual sync button with loading spinner
6. Add shimmer/skeleton loading placeholders while data loads
7. Support dark mode correctly
8. Cache dashboard response in Drift for offline display
9. Write tests: provider states, all cards render with mock data

REVIEW: Check loading < 2s feel, dark mode correct, cards match web app info hierarchy.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 3: Activities

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build the Activities module in flutter/:
1. Search Context7 for fl_chart line chart and go_router navigation docs
2. Create freezed models from OpenAPI: Activity, ActivitiesResponse, Lap, Split (match exact fields)
3. Create ActivitiesRepository: listActivities(limit, offset, type), getActivity(id), createManual(data)
4. Create activitiesProvider with pagination (infinite scroll using AsyncNotifier maintaining cursor)
5. Build screens:
   - ActivityListScreen: infinite scroll list, type filter chips (RUN, RIDE, SWIM, etc.), activity type icons
   - ActivityDetailScreen: header with key metrics (distance, pace, HR, elevation, duration), splits table, laps section, HR zone horizontal bar chart, training type badge
   - Stream charts using fl_chart: heart rate over time, pace over time, elevation profile
6. Manual activity creation form
7. Cache last 50 activities in Drift
8. Write tests: pagination logic, filter state, detail screen sections render

REVIEW: Infinite scroll doesn't re-fetch pages. Charts handle 1000+ points. Detail matches web feature parity.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 4: Analytics & Charts

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build Analytics module in flutter/:
1. Search Context7 for fl_chart interactive charts and gestures
2. Create freezed models: AnalyticsStats, FitnessHistory
3. Create AnalyticsRepository: getStats(), getHistory(startDate, endDate)
4. Port VDOT calculator from AGENT.md domain formulas — put in core/utils/vdot.dart
5. Port TSB status logic
6. Build AnalyticsScreen:
   - Summary cards: current VDOT, CTL, ATL, TSB (with color-coded status), form indicator
   - Fitness chart: CTL/ATL/TSB lines over time (fl_chart with touch tooltip)
   - Date range selector: 30/60/90/365 day buttons
   - Race prediction widget: predicted times for 5K/10K/HM/Marathon from current VDOT
   - Marathon shape score: circular gauge 0-100
   - Weekly mileage bar chart
7. Write tests: VDOT calculation (cross-reference 10 test cases), chart renders, provider states

REVIEW: Charts performant with 365 points. VDOT matches web output. Colors consistent.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 5: Training Plans & Goals

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build Goals module in flutter/:
1. Search Context7 for table_calendar and Flutter Stepper/multi-step form patterns
2. Create freezed models from OpenAPI: Goal, GoalsResponse, CreateGoalRequest, UpdateGoalRequest, Workout, WorkoutsResponse, RaceResult
3. Create GoalsRepository: listGoals(), createGoal(), getGoal(id), updateGoal(), deleteGoal()
4. Create WorkoutsRepository: listWorkouts(goalId, weekStart, weekEnd)
5. Build screens:
   - GoalListScreen: active and completed goals with race countdown
   - GoalSetupWizard: multi-step form (race type → date → target time → plan config → review)
   - WeeklyCalendarScreen: table_calendar showing workouts per day with color-coded types
   - WorkoutDetailScreen: description, targets, completion toggle, linked activity
   - RaceCountdownWidget: days remaining with visual progress ring
6. Optimistic UI updates for workout completion toggle
7. Write tests: wizard navigation, goal creation validation, calendar renders workouts

REVIEW: Wizard preserves data on back/forward. Calendar correct. Completion toggle responsive.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 6: AI Coach Chat

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build AI Chat module in flutter/:
1. Search Context7 for Dio streaming responses and flutter_markdown latest docs
2. Create chat models: ChatSession, ChatMessage
3. Create ChatRepository: sendMessage(sessionId, content) with SSE streaming, listSessions(), createSession()
4. Build screens:
   - ChatScreen: message bubbles (user right, AI left), markdown rendering for AI responses
   - Streaming: use Dio responseType: ResponseType.stream for token-by-token rendering
   - Chat input bar with send button
   - Session drawer: list/switch/create chat sessions
   - Typing indicator animation while AI responds
   - Prompt library: quick-access suggested prompts
5. Cache recent messages in Drift
6. Write tests: message parsing, markdown rendering, session management

REVIEW: Streaming smooth (no jank). Markdown tables/code/lists render. Chat persists across backgrounding.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 7: Health Tracking

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build Health Tracking module in flutter/:
1. Search Context7/Brave for the health package and nutrition tracking patterns
2. Create models for: NutritionLog, FoodItem, Supplement, SupplementStack, DailyHealthLog, FastingSession, BodyMeasurement
3. Build screens:
   - NutritionDashboard: daily calorie/macro progress rings (CustomPainter), water intake
   - FoodSearchScreen: search + barcode scan (mobile_scanner)
   - SupplementTrackerScreen: stack management, daily check-off list
   - FastingScreen: start/stop timer, history
   - BodyMeasurementsScreen: weight/body fat/etc with trend line chart
4. Background reminders via flutter_local_notifications
5. Write tests: calorie calculations, macro percentages, progress ring renders

REVIEW: Barcode scanner works. Macro rings animate. Supplements work offline.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 8: Native Integrations

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Add native integrations to flutter/:
1. Search Context7/Brave for health package Health Connect setup, firebase_messaging, workmanager
2. Health Connect integration:
   - HealthConnectService: readActivities(), readHeartRate(), readSteps(), requestPermissions()
   - Sync health data to backend via POST /activities
   - Handle permissions denied/revoked gracefully
3. Push notifications via Firebase Cloud Messaging:
   - FCM setup in android/
   - Handle foreground, background, and terminated state messages
4. Local notifications: workout reminders, supplement reminders
5. Background sync via workmanager: periodic Strava sync every 30 min
6. Deep linking: register runflow:// scheme for Strava OAuth callback
7. Share: share activity summaries using share_plus
8. Write tests: health data transformation, notification scheduling

REVIEW: Permissions handled gracefully. Push works when killed. Background sync doesn't drain battery.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 9: Profile & Settings

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Build Profile & Settings in flutter/:
1. Create ProfileRepository: getProfile(), updateProfile()
2. Build screens:
   - ProfileScreen: avatar, name, email, Strava connection status
   - HRZoneEditorScreen: slider-based zone config with validation (each zone > previous)
   - SettingsScreen: unit toggle (metric/imperial), theme selection (light/dark/system), notification preferences
   - AI settings: data access toggles
   - AccountScreen: logout (clears all local data), delete account, about/version
3. Persist settings in SharedPreferences
4. Unit switch immediately reflects everywhere (use Riverpod provider)
5. Write tests: settings persistence, validation, all screens render

REVIEW: Settings persist across restart. HR zones validate. Logout clears ALL data.
TEST: Run flutter analyze && flutter test && flutter build apk --debug
```

---

## Phase 10: Polish & Release

### Prompt for OpenCode
```
Read flutter/AGENT.md first.

Polish the flutter/ app for release:
1. Search Context7/Brave for flutter_native_splash and sentry_flutter setup
2. App icon: generate from RunFlow branding (orange on dark)
3. Splash screen via flutter_native_splash
4. Onboarding flow: 3-page walkthrough for first launch
5. Error boundaries: Sentry integration for crash reporting
6. Offline mode: show cached data with "offline" banner when no network
7. Performance: profile with DevTools, fix any jank, ensure 60fps
8. Accessibility: semantic labels, font scaling support, contrast check
9. Release build:
   - Create keystore for signing
   - Configure ProGuard rules
   - `flutter build apk --release` and verify APK size < 30MB
10. Full E2E manual test: login → dashboard → activity detail → analytics → create goal → chat → profile

REVIEW: Cold start < 3s. No jank on mid-range device. APK < 30MB.
TEST: flutter analyze && flutter test && flutter build apk --release
```

---

## Quick Reference: OpenCode Execution

### Starting a Phase
```
opencode
> Read flutter/AGENT.md, then execute Phase N from flutter/PLAN.md
```

### If Agent Gets Stuck
```
> Search Brave for: [specific error or package question]
> Search Context7 for: [package name] [specific topic]
```

### Verifying Between Phases
```bash
cd flutter
flutter analyze
flutter test
flutter build apk --debug
```

### Running on Local Device
```bash
# Connect Android 10+ device via USB with developer mode enabled
flutter devices                    # verify device appears
flutter run --debug                # run on device
flutter run --release              # test release performance
```

### Code Generation (run after model changes)
```bash
cd flutter
dart run build_runner build --delete-conflicting-outputs
```
