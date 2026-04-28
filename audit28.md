# RunFlow Flutter Audit 28 — Verified Issue Report & Fix Plan

**Date:** 2026-04-28  
**Commit:** `b6b1058` (origin/master)  
**Method:** 6 parallel verification agents, each reading actual source files with line-level precision  

---

## Verification Summary

| Category | Checked | Confirmed | False | Partial |
|----------|---------|-----------|-------|---------|
| Critical API/Data | 8 | 7 | 1 | 0 |
| High Severity | 11 | 9 | 2 | 1 |
| UI/UX | 8 | 8 | 0 | 0 |
| Provider/State | 7 | 7 | 0 | 0 |
| **Total** | **34** | **31** | **3** | **1** |

### Disproved Claims
- ~~Chat API uses session auth~~ — **FALSE.** All chat routes use `getAuthenticatedUser()` (JWT).
- ~~NutritionTargets.fromJson double-to-int crash~~ — **FALSE.** Uses safe `as num` casts.
- ~~Background sync creates Dio without auth~~ — **FALSE.** Auth injected manually via headers (but lacks token refresh).

### Partially Confirmed
- Offline cache fallback: Dashboard works correctly; Chat `getMessages` works; other chat operations have no fallback.

---

## CONFIRMED CRITICAL BUGS (7)

### C1. Logout URL Double-Prefixed — Server Session Never Invalidated
**File:** `flutter/lib/data/repositories/auth_repository_impl.dart:151`  
**Code:** `dio.post('/api/mobile/v1/auth/logout')`  
**baseUrl** is `https://runflow.schuelken.uk/api/mobile/v1`  
**Result:** `https://runflow.schuelken.uk/api/mobile/v1/api/mobile/v1/auth/logout` (double-prefixed, 404)  
**Fix:** Change to `dio.post('/auth/logout')` or use a constant `logoutPath = '/auth/logout'`

### C2. Forgot Password Endpoint Missing on Mobile Path
**File:** `flutter/lib/data/repositories/auth_repository_impl.dart:209-213`  
**Resolves to:** `/api/mobile/v1/auth/forgot-password` — no such route exists  
**Server only has:** `/api/auth/forgot-password/`  
**Fix:** Either add a mobile alias on the server or use the absolute path `/api/auth/forgot-password`

### C3. `estimateTime()` Hardcodes t=30min — Race Predictions Wrong
**File:** `flutter/lib/core/utils/vdot.dart:27-38`  
**Code:** `0.1894393 * exp(-0.012778 * 30)` — literal `30` instead of iterative solving  
**Impact:** ~12% optimistic for marathons, wrong for all distances far from 30-min effort  
**Fix:** Implement iterative Newton-Raphson solver: estimate time → recalculate %VO2max → re-estimate → converge

### C4. Supplement.id int/String Mismatch
**File:** `flutter/lib/data/models/health_models.dart:48` (`String id`) vs `app_database.dart:92` (`INTEGER PRIMARY KEY`)  
**Impact:** `int.tryParse(supplement.id) ?? supplement.id` at line 251 passes string CUIDs to SQL WHERE — fails silently  
**Fix:** Unify on `int` for local IDs; handle server CUIDs separately or add a `serverId` field

### C5. NutritionNotifier.save() Never Syncs to Server
**File:** `flutter/lib/presentation/providers/health_providers.dart:166-170`  
**Code:** Only calls `healthRepositoryProvider` (local SQLite), never `healthApiRepositoryProvider`  
**Impact:** All nutrition data lost on reinstall/device switch  
**Fix:** Add API sync call (same pattern as `SupplementList.add()`)

### C6. Daily Health Response Parsing Will Crash
**File:** `flutter/lib/data/repositories/health_api_repository_impl.dart:242-253`  
**Server returns:** `{dailyHealth: {...}, exerciseCalories, supplementLogs, foodLogs, meta}`  
**Flutter expects:** Flat `{id, date, steps, weight, ...}` via `DailyHealthLog.fromJson()`  
**Impact:** Runtime crash — `id` absent from response, `date` nested inside `dailyHealth`  
**Fix:** Extract `response.data['dailyHealth']` before passing to `fromJson`

### C7. 6 API Endpoints Don't Exist on Server (404)
| Flutter Path | Server Status |
|---|---|
| `/health/nutrition/ai-scan` | Does not exist |
| `/health/history` | Does not exist |
| `/health/supplements/analytics` | Does not exist |
| `/health/daily/water` | Wrong URL — server expects POST to `/health/daily` with `action: 'updateWater'` |
| `/health/supplements/log` | Wrong URL — server expects POST to `/health/daily` with `action: 'toggleSupplement'` |
| `/auth/forgot-password` | Only at `/api/auth/forgot-password`, not mobile path |

---

## CONFIRMED HIGH SEVERITY BUGS (9)

### H1. DropdownButtonFormField Uses `initialValue` Instead of `value` (5 locations)
Dropdowns don't visually update when state changes programmatically.
| File | Line |
|---|---|
| `plan_screen.dart` | 682 |
| `onboarding_wizard_screen.dart` | 283 |
| `training_schedule_step.dart` | 136 |
| `training_schedule_step.dart` | 161 |
| `edit_profile_screen.dart` | 168 |
**Fix:** Replace `initialValue:` with `value:` in all 5 instances

### H2. TextEditingController Created Inside build() (3 widgets)
Memory leak + cursor position loss + lost text on parent rebuild.
| Widget | File | Line |
|---|---|---|
| `_NumberField` | `race_result_screen.dart` | 1021 |
| `_TextField` | `race_result_screen.dart` | 1053 |
| `_NotesField` | `race_result_screen.dart` | 1130 |
**Fix:** Convert to StatefulWidget with controller in initState/dispose

### H3. AI Settings Sets controller.text Inside build()
**File:** `ai_settings_screen.dart:37-43`  
Overwrites user input on every rebuild, destroys cursor position.  
**Fix:** Set initial values in `initState()` only, use a flag to avoid re-setting

### H4. body_tab.dart Saves Body Measurements Locally Only
**File:** `body_tab.dart:254` — only calls local repo  
**Compare:** `body_screen.dart:136-139` — saves locally AND syncs to API  
**Fix:** Add `healthApiRepositoryProvider.syncBodyMeasurement()` call

### H5. Dashboard Refresh Sets Loading State → UI Flicker
**File:** `dashboard_providers.dart:23-27`  
`state = const AsyncValue.loading()` causes race countdown and training status to blank out during refresh.  
**Fix:** Keep previous data during refresh, only update on completion

### H6. Register Expects 409 But Server Returns 400
**File:** `auth_repository_impl.dart:192-198`  
Server returns 400 for duplicate emails. Client only catches 409. Users see generic error.  
**Fix:** Add `|| e.response?.statusCode == 400` and check response body for "already exists"

### H7. 24 Empty `catch (_) {}` Blocks Silently Swallow Errors
| File | Count | Lines |
|---|---|---|
| `main.dart` | 4 | 49, 56, 63, 70 |
| `health_providers.dart` | 2 | 119, 187 |
| `background_sync.dart` | 3 | 61, 77, 85 |
| `fcm_service.dart` | 2 | 71, 101 |
| `notification_service.dart` | 2 | 96, 136 |
| `workout_recording_service.dart` | 2 | 373, 433 |
| `plan_screen.dart` | 2 | 406, 430 |
| Other files | 7 | Various |
**Fix:** Add `debugPrint()` or `SentryCaptureException()` to each

### H8. No Database Migration Support
**File:** `app_database.dart:25` — `_migrations = {}` (empty)  
Schema changes in future versions will lose user data or crash.  
**Fix:** Define migration functions for each version increment

### H9. Offline Chat Operations Have No Fallback
`getMessages()` falls back to cache correctly. `listSessions()`, `createSession()`, `sendMessage()`, `deleteSession()` throw on network failure with no resilience.  
**Fix:** Add local caching for sessions and queue for pending messages

---

## CONFIRMED UI/UX BUGS (8)

### U1. Fasting Screen Starts Timer Inside build()
**File:** `fasting_screen.dart:58` — `_startTimer()` called in build path  
**Fix:** Move to `initState()` or use `ref.listen()`

### U2. Record Screen Swallows Errors (Blank Screen)
**File:** `record_screen.dart:47, 411-416` — error callback returns normal idle/recording view  
**Fix:** Show error banner or retry indicator

### U3. Sleep/Vitals Cards Always Show "No Data"
**File:** `health_screen.dart:638-674` — `_SleepCard` and `_VitalsCard` are static, watch no providers  
**Fix:** Wire up to sleep/vitals data providers

### U4. Plan Screen Has No Pull-to-Refresh
**File:** `plan_screen.dart` — no `RefreshIndicator` in 731 lines  
**Fix:** Wrap `ListView` in `RefreshIndicator`

### U5. Activities List in Wrong Tab Branch
**File:** `app_router.dart:256-267` — `/activities` shares branch with `/profile`  
**Fix:** Create separate branch or restructure routing

### U6. Onboarding Wizard Has No PopScope
**File:** `onboarding_wizard_screen.dart` — Android system back exits app during onboarding  
**Fix:** Add `PopScope(canPop: false, onPopInvokedWithResult: ...)`

### U7. Zero Localization
No `.arb` files, no `intl` imports, all strings hardcoded English.  
**Fix:** Extract strings to `.arb` files, add `flutter_localizations`

### U8. Dead Code (5 files, ~800 lines)
| File | Status |
|---|---|
| `onboarding_screen.dart` | Not referenced in router |
| `supplements_tab.dart` | Not imported anywhere |
| `nutrition_tab.dart` | Not imported anywhere |
| `fasting_tab.dart` | Not imported anywhere |
| `body_tab.dart` | Not imported anywhere |
**Fix:** Delete all 5 files

---

## CONFIRMED PROVIDER/STATE BUGS (7)

### P1. Health Sync Service Not Invalidated on Logout
**File:** `auth_providers.dart:101` — calls `stopAutoSync()` but never `ref.invalidate(healthSyncServiceProvider)`  
**Fix:** Add `ref.invalidate(healthSyncServiceProvider)` in logout

### P2. Auto-Dispose Health Providers Trigger Redundant API Calls
**File:** `health_providers.dart` — `dailyHealthProvider`, `supplementListProvider`, `bodyMeasurementsProvider` all auto-dispose  
**Impact:** Every health tab re-visit triggers 5+ API calls  
**Fix:** Add `@Riverpod(keepAlive: true)` or use `keepAliveUntil` pattern

### P3. Duplicate Providers for Supplements
**File:** `health_providers.dart` — `supplementsProvider` (line 24, local-only) and `SupplementList` notifier (line 96, API-first)  
**Impact:** Different screens may show different data  
**Fix:** Remove `supplementsProvider`, use `supplementListProvider` everywhere

### P4. raceCountdown Only Shows First Active Goal
**File:** `race_providers.dart:21` — `activeGoals.first` silently ignores other goals  
**Fix:** Show a goal selector or merge countdowns

### P5. Uncapped Linear VDOT Projection (+0.3/week)
**File:** `race_providers.dart:44-45` — no ceiling, no diminishing returns  
**Fix:** Add `projectedVdot = min(projectedVdot, currentVdot + 5.0)` or use logarithmic curve

### P6. Cascading Rebuilds from dailyHealthProvider
**File:** `health_providers.dart` — `takenSupplementIds` (line 62) and `NutritionNotifier` (line 139) both watch it  
**Impact:** Toggling one supplement triggers 3+ widget rebuilds  
**Fix:** Use `ref.watch(...).future` selectively or debounce invalidation

### P7. calibration_providers.dart Unsafe Cast
**File:** `calibration_providers.dart:109, 136, 155` — `(repo as ActivityRepositoryImpl).dio`  
**Fix:** Expose a `dio` getter on the `ActivityRepository` interface or add a dedicated API method

---

# Multi-Agent Async Fix Plan (Adapted and Execution-Safe)

This revised plan keeps parallelism where files do not overlap, adds hard validation gates, and isolates high-risk data model changes.

## Working Rules

- Run agents in parallel only when they modify non-overlapping files.
- After any Riverpod annotation/provider signature change, run codegen:
  - `dart run build_runner build --delete-conflicting-outputs`
- Do not delete dead code until all functional fixes and tests pass.
- Keep fixes in small PR-sized batches with rollback-safe scope.

## Phase 0 - Contract Freeze (1 agent)

### Agent A0 - API Contract Matrix
**Goal:** Freeze exact client/server contracts before code edits.

Tasks:
1. Build endpoint matrix for each impacted route: path, method, auth mode, request shape, response shape.
2. Decide ownership per issue: client fix vs server alias route.
3. Mark temporary compatibility shims and final target state.

Gate:
- Contract table finalized in this file and used as source of truth.

## Phase 1 - Critical Runtime Fixes (3 agents, limited parallel)

### Agent A1 - Auth and Request Path Fixes
**Fixes:** C1, C2, H6, part of C7

Tasks:
1. Fix logout call path (`/auth/logout`, no double prefix).
2. Resolve forgot-password mismatch using chosen contract decision from Phase 0.
3. Handle duplicate-email response mapping (400/409 and message handling).
4. Repoint water and supplement toggle to server-supported action payload on `/health/daily`.

### Agent B1 - Daily Health Parse + Nutrition Sync
**Fixes:** C5, C6

Tasks:
1. Parse daily health response envelope safely (`dailyHealth`, `foodLogs`, `supplementLogs`, `meta`).
2. Update `NutritionNotifier.save()` to sync remote after local save with robust fallback and user-visible error logging.

### Agent C1 - VDOT/Race Math
**Fixes:** C3, P5

Tasks:
1. Replace hardcoded-time estimate with iterative solver.
2. Add bounds to projected VDOT growth to avoid unrealistic long-horizon output.
3. Add/adjust unit tests for prediction math stability.

Phase 1 Gate:
- Project compiles.
- Targeted tests pass for auth, health parsing, and VDOT math.

## Phase 2 - Endpoint Coverage Alignment (2 agents, parallel)

### Agent A2 - Flutter Call-Site Alignment
**Fixes:** remaining C7 client-side usage

Tasks:
1. Update Flutter callers to match finalized endpoint contracts.
2. Add graceful fallback/feature flags if server route is intentionally deferred.

### Agent B2 - Web Mobile Route Additions
**Fixes:** remaining C7 server-side gaps

Tasks:
1. Add missing mobile routes only where contract requires them:
   - `/api/mobile/v1/health/nutrition/ai-scan` (if retained)
   - `/api/mobile/v1/health/history`
   - `/api/mobile/v1/health/supplements/analytics`
2. Ensure JWT auth with `getAuthenticatedUser()`.

Phase 2 Gate:
- Endpoint smoke checks pass (path + auth + payload + response shape).

## Phase 3 - Model and Storage Integrity (1 agent, isolated)

### Agent D3 - Supplement ID and Migration Track
**Fixes:** C4, H8

Tasks:
1. Implement stable ID strategy (recommended: local numeric PK + remote `serverId` string).
2. Update model mapping and repository conversions.
3. Add DB version bump and explicit migration(s).
4. Update tests covering serialization and local DB updates.

Phase 3 Gate:
- Migration test passes.
- No ID type-cast/runtime conversion failures.

## Phase 4 - UI and Provider Reliability (2 agents, file-safe sequencing)

### Agent E4 - Form and Controller Lifecycle Fixes
**Fixes:** H1, H2, H3, U1

Tasks:
1. Replace Dropdown `initialValue` misuse with `value` where applicable.
2. Move controller creation out of build for race result widgets.
3. Initialize AI settings controllers once (init lifecycle, not per build).
4. Move fasting timer start side effect out of build path.

### Agent F4 - Provider and Navigation Stability
**Fixes:** P1, P2, P3, P6, H5, U2, U3, U4, U5, U6, P4, P7

Tasks:
1. Invalidate health sync service on logout lifecycle.
2. Resolve duplicate supplement provider usage and standardize source.
3. Tune provider disposal strategy (`keepAlive` where justified) to reduce redundant calls.
4. Remove dashboard refresh hard-loading flicker behavior.
5. Add explicit error UI in record screen.
6. Wire sleep/vitals cards to real providers.
7. Add plan pull-to-refresh.
8. Fix routing branch placement for activities.
9. Add onboarding back-handling guard (`PopScope`).
10. Remove unsafe repository downcasts in calibration provider.
11. Handle multiple active goals explicitly in race countdown logic.

Phase 4 Gate:
- Widget/regression smoke tests pass for onboarding, plan, record, health, dashboard, and routing.

## Phase 5 - Cleanup and Observability (1 agent)

### Agent G5 - Logging, Dead Code, Final Cleanup
**Fixes:** H7, U8, H9

Tasks:
1. Replace empty catches with structured logging/error capture.
2. Add chat offline resilience improvements beyond `getMessages()`.
3. Remove dead code files only after full green tests and grep verification.

Phase 5 Gate:
- Full test suite green.
- No orphan imports/references.

## Recommended Execution Graph

1. Phase 0
2. Phase 1 (A1/B1/C1 in parallel only if files do not overlap)
3. Phase 2 (A2 and B2 parallel)
4. Phase 3 (isolated)
5. Phase 4 (E4 then F4 where overlap exists)
6. Phase 5
7. Final validation:
   - `flutter analyze`
   - `flutter test`

## Expected Outcome (Revised)

| Phase | Primary Focus | Risks Controlled | Expected Result |
|---|---|---|---|
| 0 | Contract freeze | Path/auth mismatch | Clear implementation target |
| 1 | Runtime-critical bugs | Crash/auth failures | Core flows stable |
| 2 | Endpoint alignment | 404s and payload drift | Client-server parity |
| 3 | ID + migration | Data corruption/type mismatch | Safe persistence model |
| 4 | UI/provider stability | Rebuild/flicker/nav regressions | UX and state reliability |
| 5 | Cleanup | Silent failures/dead code | Maintainable final state |

This adapted plan is designed to resolve all confirmed issues while minimizing merge conflicts and regression risk.
