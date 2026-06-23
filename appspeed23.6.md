# RunFlow App Performance & Speed Audit Report (23.6)

## Executive Summary

A comprehensive re-audit of the RunFlow Flutter application, verifying the prior report against the actual codebase and extending coverage into areas not previously examined (real-time recording, chat streaming, map rendering, image handling, isolate usage, provider granularity).

**Verified findings confirm the app has real bottlenecks**, but several original claims were inaccurate. Most importantly:

- **R8/ProGuard is already enabled** (`isMinifyEnabled = true`, `isShrinkResources = true`) — the original ST-06 is obsolete.
- **Sentry, deep links, connectivity, Firebase, and timezone do NOT block `runApp()`** as previously stated — they are `unawaited` or run post-frame.
- **The token-refresh race is already fixed for the single-Dio path** (`QueuedInterceptor` + `Completer`); a residual multi-Dio race and non-atomic token storage remain.
- **Repository caching is inconsistent, not absent** — `DashboardRepositoryImpl` uses stale-while-revalidate; `ActivityRepositoryImpl` is network-first and bypasses the cache entirely.

**New high-impact findings not in the original report:**

1. **O(n²) Markdown re-parsing per SSE token** in chat — every streamed token re-parses the entire accumulated content.
2. **`RunFlowMap` rebuilds polyline + markers + haversine kilometer markers every second during recording** — jank grows linearly with workout length.
3. **Zero `compute()` / `Isolate.run` usage anywhere** — Douglas-Peucker route simplification, athlete-defaults stats, strength analytics, and per-row `streams_json` decode all run on the UI thread.
4. **Only 2 `.select()` calls in the entire presentation layer** — nearly every `ref.watch` rebuilds whole subtrees.
5. **`recordingServiceProvider` is `keepAlive` and holds unbounded GPS/HR arrays** until app restart — a memory leak proportional to workout length.
6. **Google Fonts themes are rebuilt on every `settingsProvider` emission** (both light + dark), and fonts are fetched at runtime (no bundling, no `config.allowRuntimeFetching = false`).
7. **`IntrinsicHeight` ×3 in the Health grid + a 60s `setState` timer** — constant two-pass layout and full-screen rebuilds every minute on the Health tab.
8. **Bulk DB upserts are non-transactional** (per-row SELECT+INSERT/UPDATE) and **`activities` has zero secondary indexes** despite being the hottest table.

The multi-agent, multi-phase plan in Section 4 assigns each track to a dedicated worker agent and marks dependencies so independent tracks can execute in parallel.

---

## 1. Startup & Build Configuration

Current cold start blocks on `SharedPreferences.getInstance()` then a `Future.wait` of (database, notifications, background-sync). The background-sync branch has two sequential awaits. Estimated blocking time before `runApp()`: 400-800ms.

### Verified findings

*   **Services block before first frame (ST-02 — CONFIRMED).** `_initializeServices()` (`main.dart:51-57`) awaits `Future.wait([_initDatabase(), _initNotifications(), _initBackgroundSync()])`. The background-sync branch runs `BackgroundSyncService.initialize()` then `registerPeriodicSync()` **sequentially** (`main.dart:87-88`).
    *   *Fix:* Only block on the database (UI needs it). Move notifications + background sync into a `WidgetsBinding.instance.addPostFrameCallback` after `runApp`.
*   **SharedPreferences blocks startup (ST-01 — CONFIRMED).** `SharedPreferences.getInstance()` is awaited at `main.dart:25` before the container is built.
    *   *Fix:* Migrate to `SharedPreferencesAsync` and/or parallelize; the instance is only used to seed `sharedPreferencesProvider`.
*   **R8/ProGuard NOT enabled (ST-06 — FALSE, already done).** `build.gradle.kts:57-58` already sets `isMinifyEnabled = true` and `isShrinkResources = true`. ProGuard rules exist in `proguard-rules.pro`. **No action required.** Note: rules reference stale `retrofit2` and `io.fabric` keep rules that can be removed.
*   **No ABI splits (ST-10 — CONFIRMED).** No `splits { abi { ... } }` block and the build command is `flutter build apk --release` (fat APK).
    *   *Fix:* Add `--split-per-abi` to the build command (~40% size reduction) or configure ABI splits in `build.gradle.kts`.

### Corrected findings (original was wrong)

*   **Deep link & connectivity init in initState (ST-03 — MISDESCRIBED).** These do NOT run in `main()`. `initDeepLinks` runs from `RunFlowApp.initState` (`app.dart:33`) and connectivity listener from `app.dart:34` — both **after** `runApp`. No startup impact. The real post-frame concern is that both run inside `initState` of the root widget rather than a deferred callback; low priority.
*   **Sentry blocks startup — FALSE.** `SentryFlutter.init` is wrapped in `unawaited(...)` and triple-gated (`kReleaseMode && sentryDsn && analyticsConsent`) at `main.dart:37-46`.
*   **Firebase blocks startup — FALSE.** `Firebase.initializeApp` only appears in the FCM background isolate handler (`fcm_service.dart:120`); never on the startup path.
*   **Timezone init as a separate blocking step in main() — MISDESCRIBED.** `tz_data.initializeTimeZones()` is folded into `NotificationServiceImpl.initialize()` (`notification_service.dart:52`), inside the notifications branch. It is still synchronous and still blocks, but it is not a separate main() step. *Fix:* defer until the first notification is scheduled.

### Medium & low findings

*   **Google Fonts runtime fetching + per-rebuild theme rebuild (ST-09 — CONFIRMED & WORSE).** `app_theme.dart:62-90` calls `GoogleFonts.interTextTheme`, `GoogleFonts.outfitTextTheme`, and `GoogleFonts.outfit` inside `_buildTheme`. `app.dart:67-68` invokes `buildLightTheme()` AND `buildDarkTheme()` on **every** `RunFlowApp.build()` (i.e., every `settingsProvider` emission). No `GoogleFonts.config.allowRuntimeFetching = false`, no bundled fonts.
    *   *Fix:* Set `allowRuntimeFetching = false`, bundle Inter + Outfit as assets, and cache the two `ThemeData` objects in top-level `final`s (they only depend on `ColorScheme`).
*   **Redundant dependencies (ST-04, NW-01 — CONFIRMED).** Both `dio` and `http` are deps; `http` is used in exactly one file (`recipe_integration_service.dart`, 4 call sites) and bypasses all interceptors. `cupertino_icons` and `table_calendar` are candidates for removal (verify usage first).
*   **Missing migration 7 (NEW).** `_currentVersion = 7` (`app_database.dart:21`) but `_migrations` only has keys 1-6. Not a crash (loop skips missing key) but indicates an incomplete/stale migration. Audit before relying on it.

---

## 2. Widget Performance & State Management

The presentation layer uses almost no `select()`, watches whole `AsyncValue`s, and rebuilds large subtrees on every provider emission. Several screens run heavy compute inline in `build()`.

### Critical & high findings

*   **Only 2 `.select()` calls in the entire app** (`activity_list_screen.dart:105`, `dashboard_screen.dart:726`). Every other `ref.watch` subscribes to the full state. This is the single biggest lever for reducing rebuilds.
    *   *Fix:* Sweep all `ref.watch` sites and add `.select(...)` for the specific field consumed.
*   **Monolithic `AiSettings` state (WP-12 — CONFIRMED & WORSE).** `ai_settings_providers.dart` exposes a single state with **16 fields** and 11+ individual `setAccessXxx` setters; each setter does `state = state.copyWith(...)` emitting the entire 16-field object to every subscriber.
    *   *Fix:* Split into `aiConfigProvider` (enabled/baseUrl/model/prompt) + `aiAccessProvider` (the 11 permission flags), and/or use `.select`.
*   **Health screen watches ~12 providers (WP-01, WP-02 — CONFIRMED).** `_HealthScreenState.build` watches 3 top-level AsyncValues (`health_screen.dart:31-33`); child cards watch 9 more. No `select` anywhere. Helper methods (`_buildDashboardGrid`, `_buildSliverAppBar`, `_buildQuickActions`) are methods on the State, not isolated widgets.
    *   *Fix:* Make each card a `ConsumerWidget` that watches its own provider with `select`, and remove the top-level watches.
*   **Dashboard merges two providers via `copyWith` (WP-03 — CONFIRMED).** `_DashboardContent.build` (`dashboard_screen.dart:77-82`) watches `dashboardProvider` + `analyticsStatsProvider` and merges them; a change to either rebuilds all 7 cards. `RaceCountdownCard`, `TrainingStatusCard`, and `_RecentActivitiesSection` all rebuild together.
    *   *Fix:* Extract each card into a `ConsumerWidget`; use `select` for `ctl/atl/tsb` and `syncStatus`.
*   **Dashboard 5-second sync poll timer (`dashboard_providers.dart:59-69`).** While `syncInProgress` is true, `refresh()` fires every 5s, emitting new state and rebuilding the whole content. No max-poll guard (a stuck flag polls forever).
    *   *Fix:* Gate the poll, and isolate the sync-status indicator via `select`.

### Medium & low findings

*   **`IntrinsicHeight` ×3 in Health grid (NEW).** `health_screen.dart:119,131,145` wrap rows of cards — forces two-pass layout per rebuild. Combined with the 60s `setState` timer this is constant CPU on the Health tab.
*   **`_FastingCard` 60s `setState` timer (NEW).** `health_screen.dart:803-806` calls `setState(() {})` every minute, rebuilding the entire card (and, via `IntrinsicHeight`, the grid). Also `_checkAutoStartStop` calls `SharedPreferences.getInstance()` (returns a Future, chained with `.then`) every tick.
    *   *Fix:* Isolate the countdown text into its own widget; cache the prefs instance via the provider.
*   **Charts missing `RepaintBoundary` (WP-16 — CONFIRMED).** 12 files import `fl_chart`; only 3 `RepaintBoundary` usages exist (all in `analytics_screen.dart`, and even there only 3 of 6 chart sections). `body_screen.dart` (3 charts), `vitals_screen.dart` (2), `readiness_detail_screen.dart` (1), and chart widget files (`combined_analytics_chart`, `elevation_chart`, `pace_chart`, `hr_time_chart`, `hr_zone_distribution_chart`, `vo2_shape_trend_chart`, `race_prediction_chart`) all repaint with parents.
*   **Plan screen triple-nested eager `map()` in a plain `ListView` (WP-13 — CONFIRMED & WORSE).** `plan_screen.dart:147` does `weeks.map` → `days.map` → `workouts.map`, eagerly building the entire plan. No `ListView.builder`, no `itemExtent`, no keys. Plus `build()` runs filter/group/sort/reduce over all workouts (`plan_screen.dart:56-91`).
    *   *Fix:* Sliver-based lazy build; precompute grouping in a derived provider.
*   **Missing `ValueKey` + `itemExtent` on lists (WP-13, WP-21 — CONFIRMED).** `activity_list_screen.dart:181` items lack keys/extent despite pagination; no screen uses `itemExtent` or `prototypeItem`.
*   **Non-`const` widgets (WP-05, WP-07 — CONFIRMED).** `_QuickTakeCard` (`health_screen.dart:1014`) and `_NoGoalCard` (`race_countdown_card.dart:394`) lack const constructors, defeating caching. `shape_calibration_sheet.dart` (953 lines, 9 private classes) watches 4 providers at the top level — any emission rebuilds the whole sheet.
*   **Repeated `Theme.of(context)` lookups** (3-4× per build) in `dashboard_screen.dart`, `body_screen.dart`, `race_countdown_card.dart` — hoist to a local.

---

## 3. Network Layer & Memory Management

The data layer uses raw `sqlite3` FFI with **all queries on the UI isolate** (no `BackgroundIsolateBinaryLocator`, no `compute`). Caching and sync are inconsistent.

### Critical & high findings

*   **Missing database indexes (NW-02 — CONFIRMED).** The `activities` table — the most queried — has **zero** secondary indexes. Hot unindexed columns: `start_date` (ORDER BY DESC + pagination), `is_synced` (filter), `is_linked_to_strength` (filter). Also missing: `body_measurements(date)`, `fasting_sessions(is_active, start_time)`, `pending_sync.created_at`/`local_id`. Only 4 indexes exist in the whole schema.
    *   *Fix:* Add indexes on all filtered/sorted/joined columns; ship as a migration.
*   **JSON deserialization on main thread (NW-04 — CONFIRMED & WORSE).** Zero `compute()` / `Isolate.run` usage anywhere. Worst hot spot: `_rowToActivity` (`local_activity_datasource.dart:376-379`) calls `jsonDecode(streams_json)` **per row** — streams contain full lat/lng/alt/time arrays (potentially MBs each). `getLocalActivitiesWithRoutes` decodes every matched activity even when only route counts are needed.
    *   *Fix:* Offload bulk decodes to `Isolate.run`; add a projection that skips `streams_json` when unused.
*   **Activity repository is network-first, no cache (NW-05 — PARTIALLY WRONG).** `DashboardRepositoryImpl` DOES use a proper cache-first/SWR pattern (`dashboard_repository_impl.dart:118-140`, 15-min TTL). But `ActivityRepositoryImpl.listActivities` (`activity_repository_impl.dart:32-87`) is network-first, only falls back to local on `OfflineException`, and never touches `api_cache`.
    *   *Fix:* Apply the dashboard's `_cacheFirst` pattern to the activity list/detail endpoints.
*   **Bulk upserts non-transactional (NEW).** `upsertServerActivities` (`local_activity_datasource.dart:264-342`) and the sync pagination loop do per-row SELECT+INSERT/UPDATE with no `BEGIN`/`COMMIT` — hundreds of round trips, non-atomic, slow.
    *   *Fix:* Wrap in a single transaction; consider `INSERT ... ON CONFLICT`.

### Token refresh & background sync

*   **Token refresh race (NW-08 — MOSTLY FIXED).** `RefreshInterceptor` extends `QueuedInterceptor` and uses a `Completer` to dedupe concurrent 401s on a single Dio (`refresh_interceptor.dart:20,70-89`). The classic race is solved.
    *   **Residual multi-Dio race (NEW):** `background_sync.dart:230,243` builds its own `Dio` with its own `RefreshInterceptor`; if foreground and background Dios hit 401 simultaneously, each fires its own `refreshSession()`. `refresh_session.dart` has no global lock.
    *   **Non-atomic token storage (NEW):** `AuthServiceImpl.storeTokens` (`auth_service_impl.dart:18-24`) does two separate `flutter_secure_storage` writes; a crash between them leaves mismatched access/refresh tokens.
*   **Background sync is full, not delta (NW-10 — CONFIRMED).** `BackgroundSyncService` loops `while (hasMore && pageCount < 100)` with `limit=100` → up to 10,000 activities re-fetched, gated only by a 6-hour TTL (`activity_cache_sync_service.dart:78-82`). No `since`/`updated_after` cursor, no `If-Modified-Since`/`ETag`. Workmanager runs every 30 min. The task also closes no resources — `callbackDispatcher`'s Dio is never `dio.close()`d (connection leak).
    *   *Fix:* Delta sync with a server-side `updated_after` cursor; close Dio per task; wrap bulk work in a transaction.

### Workout recording memory

*   **Unbounded in-memory GPS/HR growth (NW-17 — CONFIRMED & QUANTIFIED).** `_gpsPoints` and `_hrSamples` (`workout_recording_service.dart:73-74`) grow without bound and are only persisted on `stopRecording()` (lines 228-229). A marathon ≈ 8,400 points; a 6h ultra ≈ 21,600 points held as Dart objects. On stop, `_buildStreamsMap`/`_buildCreatePayload` make **5 full passes** over `_gpsPoints` synchronously (`activity_repository_impl.dart:382-492`) — jank at the "Stop" tap.
    *   *Fix:* Periodically flush batches to the DB during recording; offload stream-map construction to an isolate at stop time.
*   **`recordingServiceProvider` + `StrengthRecording` are `keepAlive` (NEW).** After a workout ends, the unbounded arrays and full workout state live until app restart.
    *   *Fix:* Convert to `autoDispose` or explicitly `_reset()`/clear on stop.

---

## 4. New High-Impact Findings (Beyond the Original Report)

These were not covered in the prior audit and include the worst sources of perceived jank.

### 4.1 Real-time recording & map rendering (highest UX impact)

*   **`RunFlowMap` rebuilds every second during recording.** `runflow_map.dart:228-291` reconstructs `polylinePoints` (`.map().toList()` over all GPS points) and `markers` (`_buildMarkers()` + `_buildKmMarkers()`) on every build. During recording the metrics timer fires every second → 3,600 rebuilds/hour. No `RepaintBoundary` around `FlutterMap` (`runflow_map.dart:261`).
*   **`_buildKmMarkers` runs O(n) haversine trig per build** (`runflow_map.dart:174-217`) — `sin`/`cos`/`sqrt`/`asin` for every GPS pair, recomputed on every rebuild. Should be cached and only updated when a new kilometer is crossed.
*   **GPS callback does redundant work per fix** (`workout_recording_service.dart:286-372`): three separate `DateTime.now()` calls, haversine, list mutations, and auto-pause checks — all on the UI thread, on every 5m fix. Cache one `now`; consider `LocationAccuracy.bestForTradeoff` to save battery.

### 4.2 Chat streaming (O(n²) parsing)

*   **Markdown re-parsed per SSE token.** `chat_providers.dart:99-101` appends each chunk to `streamingContent`, triggering a full `_ChatScreenState` rebuild. `_buildStreamingBubble` (`chat_screen.dart:266-311`) runs a regex clean (`_cleanChatContent`), constructs a new `MarkdownStyleSheet.fromTheme(theme)`, and forces `MarkdownBody` to re-parse the entire accumulated content. For a 2,000-token response: ~2,000 full re-parses, each O(n) in content length → **O(n²) total**. Visible stutter on long responses.
    *   *Fix:* Throttle streaming-state updates to ~every 100ms (not per token); isolate the streaming bubble in its own `Consumer` with `select`; reuse a cached `MarkdownStyleSheet`.
*   **SSE buffer is O(n²).** `chat_repository_impl.dart:152-173` does `buffer += utf8.decode(chunk)` per chunk then `buffer.split('\n')` — string concatenation grows quadratically. Use a growable list/`StringBuffer`.

### 4.3 Heavy compute on UI thread (zero isolate usage)

Confirmed: no `compute`, `Isolate.run`, or `Isolate.spawn` anywhere in `lib/`. Hot spots:
*   `simplifyRoute` (Douglas-Peucker, recursive, re-run until under `maxPoints`) per activity in `heatmap_providers.dart:14-18` — hundreds of activities × thousands of points each on the UI thread when opening the heatmap.
*   `computeAthleteDefaults` (`athlete_defaults.dart:33-103`) — multiple `.where().toList()`, `.sort()`, `.clamp()` over thousands of activities; used in race countdown.
*   `strengthAnalytics` provider (`strength_providers.dart:480-538`) — nested loops over sessions × exercises × sets, then `.sort()` per exercise.
*   `combined_analytics_chart.dart:240-296` — rolling-average nested loop (O(n×window)) + two `reduce`s for min/max, computed per build instead of in the provider.

### 4.4 Image handling

*   No `cached_network_image`. The single network image (avatar at `profile_screen.dart:62-63`) uses raw `NetworkImage` with no precache, no `cacheWidth`/`cacheHeight` downsampling, no eviction tuning.

### 4.5 Other

*   **80+ direct `SharedPreferences.getInstance()` calls** bypass `sharedPreferencesProvider` (`ai_settings_providers.dart`, `profile_providers.dart`, `privacy_providers.dart`, etc.), forcing unnecessary `async` and a Future lookup each time.
*   **Three `Opacity` (not `FadeTransition`)** in animations (`nutrition_screen.dart:545,939`, `plan_screen.dart:489`) — `Opacity` triggers a Skia `saveLayer`; use `FadeTransition`/`AnimatedOpacity`.
*   **`_TypingIndicator`** (`chat_screen.dart:966-986`) builds 3 new `Container` widgets per animation frame inside the `AnimatedBuilder` (no `child:` reuse).
*   **`activity_picker.dart:60-83`** search has no debounce — `setState` + `.where().where().toList()` on every keystroke.
*   **BLE scan/HR subscriptions** (`workout_recording_service.dart:424-489`) have no `cancelOnError` and can leak if an exception interrupts the cancel path.
*   **No `cached_network_image`, no `flutter_svg`**, no image-related deps beyond `image_picker`.

---

## 5. Multi-Agent, Multi-Phase Execution Plan

The plan is split into **5 parallel-capable worker agents**, each owning a track. Phases within a track are sequential; tracks marked `[PARALLEL]` have no cross-dependency and can run concurrently. Each task lists exact files so the owning agent can work autonomously.

### Agent A — Startup & Build Engineer

**Phase A1 [PARALLEL] — Unblock first frame**
- A1.1: `main.dart:51-57` — keep only `_initDatabase()` awaited; move `_initNotifications()` + `_initBackgroundSync()` into `WidgetsBinding.instance.addPostFrameCallback` after `runApp`.
- A1.2: `main.dart:87-88` — parallelize `BackgroundSyncService.initialize()` and `registerPeriodicSync()` (currently sequential) or defer entirely.
- A1.3: `main.dart:25` — migrate `SharedPreferences.getInstance()` to `SharedPreferencesAsync`, or move into the post-frame init.
- A1.4: `notification_service.dart:52` — defer `tz_data.initializeTimeZones()` until the first notification is scheduled (lazy init guard).

**Phase A2 [PARALLEL] — Fonts & theme caching**
- A2.1: Add `GoogleFonts.config.allowRuntimeFetching = false;` in `main()`; bundle Inter + Outfit TTFs under `assets/fonts/` with a `fonts:` block in `pubspec.yaml`.
- A2.2: `app_theme.dart` + `app.dart:67-68` — cache `buildLightTheme()` / `buildDarkTheme()` in top-level `final`s so they are built once, not per `RunFlowApp.build()`.

**Phase A3 [after A2] — Build config**
- A3.1: Switch build command to `flutter build apk --release --split-per-abi --dart-define=STRAVA_CLIENT_ID=193995` (update `AGENTS.md`).
- A3.2: `proguard-rules.pro` — remove stale `retrofit2` and `io.fabric` keep rules.
- A3.3: Verify `cupertino_icons` / `table_calendar` usage; remove if unused.

### Agent B — Widget & State Engineer

**Phase B1 [PARALLEL] — `.select()` sweep (highest ROI, low risk)**
- B1.1: Sweep all `ref.watch` in `presentation/` and add `.select(...)` for the consumed field. Priority screens: `dashboard_screen.dart`, `health_screen.dart`, `chat_screen.dart`, `analytics_screen.dart`, `activity_list_screen.dart`.
- B1.2: `dashboard_screen.dart:77-82` — split the `dashboardProvider` + `analyticsStatsProvider` merge; each card watches its own slice.

**Phase B2 [after B1] — Decompose monolithic screens**
- B2.1: `health_screen.dart` — convert `_buildDashboardGrid`/`_buildSliverAppBar`/`_buildQuickActions` and each card (`_SleepCard`, `_VitalsCard`, `_FastingCard`, `_QuickTakeCard`, `_NutritionCard`, `_BodyCard`) to standalone `ConsumerWidget`s; remove the 3 top-level watches.
- B2.2: `health_screen.dart:119,131,145` — replace `IntrinsicHeight` rows with fixed `SizedBox`/`AspectRatio` or an explicit `IntrinsicWidth` only where required.
- B2.3: `health_screen.dart:803-806` — isolate the `_FastingCard` countdown into its own widget; stop the unconditional `setState`; use `SharedPreferences` via the provider.

**Phase B3 [PARALLEL with B2] — Split monolithic state**
- B3.1: `ai_settings_providers.dart` — split the 16-field `AiSettings` into `aiConfigProvider` + `aiAccessProvider`.
- B3.2: Audit `FastingScheduleNotifier`, `StackRenameMap`, and `settingsProvider` for the same split.

**Phase B4 [after B1] — Lists, charts, const**
- B4.1: Add `RepaintBoundary` around all `fl_chart` widgets: `body_screen.dart` (3), `vitals_screen.dart` (2), `readiness_detail_screen.dart` (1), remaining 3 sections in `analytics_screen.dart`, and inside each `widgets/charts/*.dart` file.
- B4.2: `plan_screen.dart:147` — replace plain `ListView` + triple-nested `map()` with `SliverList.builder`; precompute `workoutsByDate`/`sortedWeeks` in a derived provider (`plan_screen.dart:56-91`).
- B4.3: Add `ValueKey`s + `itemExtent`/`prototypeItem` to `activity_list_screen.dart`, `nutrition_library_screen.dart`, `food_search_screen.dart`.
- B4.4: Add `const` constructors to `_QuickTakeCard`, `_NoGoalCard`; remove unused `WidgetRef` from `_PostRacePendingCard`.

### Agent C — Data & Isolate Engineer

**Phase C1 [PARALLEL] — Database indexes & transactions**
- C1.1: `app_database.dart` — ship a migration adding indexes on `activities(start_date)`, `activities(is_synced)`, `activities(is_linked_to_strength)`, `body_measurements(date)`, `fasting_sessions(is_active, start_time)`, `pending_sync(created_at)`, `pending_sync(local_id)`. (Also resolve the missing migration-7 entry.)
- C1.2: `local_activity_datasource.dart:264-342` — wrap `upsertServerActivities` in a single transaction using `INSERT ... ON CONFLICT`.
- C1.3: `local_activity_datasource.dart:357-368` — batch `pruneSyncedActivitiesMissingFromServer` deletes into one `DELETE ... WHERE id IN (...)`.

**Phase C2 [after C1] — Isolate offload (introduce `Isolate.run`)**
- C2.1: `local_activity_datasource.dart:376-379` — offload per-row `streams_json` decode to an isolate; add a projection that skips `streams_json` when the caller needs only metadata (`getLocalActivitiesWithRoutes`).
- C2.2: `route_streams.dart:63` `simplifyRoute` — wrap in `Isolate.run`; `heatmap_providers.dart:14-18` should map over activities inside the isolate.
- C2.3: `athlete_defaults.dart:33-103` `computeAthleteDefaults` — `Isolate.run`.
- C2.4: `strength_providers.dart:480-538` `strengthAnalytics` — `Isolate.run`.
- C2.5: `activity_repository_impl.dart:382-492` `_buildStreamsMap`/`_buildCreatePayload` — offload the 5-pass construction to an isolate at stop time.

**Phase C3 [PARALLEL] — Caching & sync**
- C3.1: Apply `DashboardRepositoryImpl._cacheFirst` pattern to `ActivityRepositoryImpl.listActivities` / `getActivity`.
- C3.2: `activity_cache_sync_service.dart:27-76` — implement delta sync with a server `updated_after` cursor and `If-Modified-Since`/`ETag`; lower the 30-min Workmanager cadence accordingly.
- C3.3: `background_sync.dart:230,243` — `dio.close()` at end of each task; share a global refresh lock with the foreground Dio to eliminate the multi-Dio refresh race.
- C3.4: `auth_service_impl.dart:18-24` — make `storeTokens` atomic (single write or transactional).

### Agent D — Real-time & Recording Engineer

**Phase D1 [PARALLEL] — Map rendering**
- D1.1: `runflow_map.dart:228-291` — memoize `polylinePoints` and `markers` in State; recompute only in `didUpdateWidget` when the GPS list length changes; wrap `FlutterMap` in `RepaintBoundary` (`runflow_map.dart:261`).
- D1.2: `runflow_map.dart:174-217` `_buildKmMarkers` — cache the last-computed km index; only recompute haversine from the last cached point forward.

**Phase D2 [after D1] — Recording service**
- D2.1: `workout_recording_service.dart:73-74` — flush `_gpsPoints`/`_hrSamples` to the DB in batches (e.g., every N points or every M seconds); keep only a sliding window in memory.
- D2.2: `workout_recording_service.dart:286-372` — cache a single `DateTime.now()` at the top of the GPS callback; evaluate `LocationAccuracy.bestForTradeoff`.
- D2.3: `recording_providers.dart:5-12` + `strength_providers.dart:123-137` — convert `recordingServiceProvider` and `StrengthRecording` to `autoDispose` (or `_reset()` on stop) to release the unbounded arrays.

**Phase D3 [PARALLEL] — Chat streaming**
- D3.1: `chat_providers.dart:99-101` — throttle `streamingContent` emissions to ~every 100ms (time-based, not per-token).
- D3.2: `chat_screen.dart:266-311` — isolate the streaming bubble in its own `Consumer` with `select` on `streamingContent`; cache the `MarkdownStyleSheet`.
- D3.3: `chat_repository_impl.dart:152-173` — replace `buffer += ...` with a `StringBuffer` / line-buffered list to fix O(n²) SSE buffering.
- D3.4: `chat_screen.dart:966-986` — move the 3 typing dots into the `child:` parameter of `AnimatedBuilder` so they are not reallocated per frame.

### Agent E — Misc, Animations & Dependencies [PARALLEL]

- E1: `recipe_integration_service.dart` — replace `http` with `dio` (4 call sites) so all network calls share interceptors; then remove `http` from `pubspec.yaml`.
- E2: `activity_picker.dart:60-83` — debounce search; compute the filter list once.
- E3: `food_search_screen.dart:157` — replace per-keystroke `setState` with `ValueListenableBuilder` on the text controller.
- E4: `nutrition_screen.dart:545,939` and `plan_screen.dart:489` — replace `Opacity` with `FadeTransition`/`AnimatedOpacity`.
- E5: `profile_screen.dart:62-63` — add `cached_network_image`; `precacheImage` after login; tune `PaintingBinding.imageCache.maximumSize/bytes`.
- E6: Sweep the 80+ `SharedPreferences.getInstance()` calls to use `sharedPreferencesProvider` (remove unnecessary `async`).
- E7: `workout_recording_service.dart:424-489` — add `cancelOnError: true` to BLE scan + HR subscriptions; guarantee cancel in a `finally`.
- E8: `app_router.dart:65-111` — memoize the redirect's booleans into a derived provider instead of recomputing on every navigation.

### Cross-cutting verification (after all agents)

- V1: `flutter analyze` — zero errors.
- V2: `flutter test` — zero failures.
- V3: `flutter build apk --release --split-per-abi --dart-define=STRAVA_CLIENT_ID=193995` — succeeds.
- V4: Manual perf check — cold start, Health/Dashboard scroll, workout recording (1h+), chat long response, heatmap open.

---

## Dependency Graph (what can run in parallel)

```
A1 ─┐
A2 ─┼─ A3                  (Agent A: startup/build)
B1 ─┼─ B2 ─┐
B3 ─┤      └─ B4           (Agent B: widgets/state)
C1 ─┼─ C2 ─┐
C3 ─┘      └─ (verify)     (Agent C: data/isolates)
D1 ─┼─ D2 ─┐
D3 ─┘      └─ (verify)     (Agent D: real-time)
E (fully parallel)         (Agent E: misc)

A1, A2, B1, B3, C1, C3, D1, D3, E   ← start immediately, no cross-deps
B2 needs B1; C2 needs C1; D2 needs D1
A3 after A2; B4 after B1
Final V1-V4 after all agents complete
```

## Expected Impact

| Area | Before | After (target) |
|---|---|---|
| Cold start (blocked before `runApp`) | 400-800ms | <150ms |
| Health tab rebuild on metric change | ~12 providers / full screen | single card |
| Dashboard during sync | full content every 5s | sync chip only |
| Workout recording jank | grows with length (haversine/rebuild per second) | flat |
| Chat long response | O(n²) markdown re-parse | O(n) |
| Heatmap open | UI-thread DP over all routes | isolate |
| Activities list query | table scan + sort | indexed |
| APK size | fat APK | per-ABI (~40% smaller) |
| Memory after workout | unbounded arrays retained | released on stop |
