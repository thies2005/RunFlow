# RunFlow Plan Generation Logic — Full Audit Report

**Date:** 2026-05-17  
**Scope:** All plan generation-related code in `/workspace/RunFlow/flutter/`  
**Methodology:** 5 parallel subagent audits covering models, algorithms, UI, persistence/API, and testing/error-handling  
**Directive:** No fixes implemented — audit only  

---

## Executive Summary

Plan generation in RunFlow is **server-side**. The Flutter client collects user inputs via a 9-step wizard or onboarding flow, sends a `CreateGoalRequest` to `POST /plans`, and receives a fully-populated `Goal` with scheduled `Workout` objects. The client contains extensive algorithmic logic for goal time prediction, race defaults, training pace computation, readiness scoring, workout adaptation, TRIMP/CTL/ATL computation, and triathlon estimation.

**Critical areas of concern:**
- Algorithm duplication (VDOT/projection logic exists in 2-3 copies)
- Unit confusion on `weeklyMileageGoal` (km vs meters)
- Cache invalidation gaps causing stale UI data
- No offline support for plan operations
- Significant test coverage gaps
- 3356-line wizard file with no draft saving
- Fragile enum mapping via `.values[index]`

---

## Table of Contents

1. [Data Models & Structures](#1-data-models--structures)
2. [Plan Generation Algorithms](#2-plan-generation-algorithms)
3. [UI Layer & User Flow](#3-ui-layer--user-flow)
4. [Persistence & API Layer](#4-persistence--api-layer)
5. [Test Coverage & Error Handling](#5-test-coverage--error-handling)
6. [Consolidated Findings by Severity](#6-consolidated-findings-by-severity)

---

## 1. Data Models & Structures

### 1.1 Architecture

Three-layer architecture:
- **Domain layer**: Manual immutable classes in `lib/domain/entities/`
- **Data layer**: Freezed + json_serializable models in `lib/data/models/`
- **Mapper layer**: Extension methods in `lib/data/mappers/` converting between the two

### 1.2 Key Enums — Duplication

| Enum | Domain Location | Data Location | Mapping Method |
|------|----------------|---------------|----------------|
| `RaceType` (17 values) | `dashboard_entities.dart:6-24` | `dashboard_models.dart:60-95` | `.values[index]` — fragile |
| `WorkoutType` (21 values) | `dashboard_entities.dart:26-48` | `dashboard_models.dart:97-119` | `.values[index]` — fragile |
| `ActivityType` | `dashboard_entities.dart:4` | `dashboard_models.dart:41-58` | `.values[index]` — fragile |
| `TrainingPhase` (6 values) | `phase_indicator.dart:4-11` | Not in data layer | String-based on Workout entity |

**Finding (MEDIUM):** All enum conversions use `.values[index]` in `dashboard_mappers.dart:5-27`. If enum values are reordered in one layer but not the other, mappings silently break with no compile-time error.

### 1.3 WorkoutType — Triple Serialization

- Domain enum: 21 values, no annotations (`dashboard_entities.dart:26-48`)
- Data enum: 21 values, no `@JsonValue` (`dashboard_models.dart:97-119`)
- Compatibility enum: `CompatibilityWorkoutType` in `json_compat.dart:63-85` with alias support (`'LONG'` → `longRun`, `'THRESHOLD'` → `tempo`)

**Finding (MEDIUM):** Two different JSON serialization conventions:
- Dashboard/Workout models: SCREAMING_SNAKE_CASE via `CompatibilityWorkoutType` (e.g., `'LONG_RUN'`)
- Goal models: lowerCamelCase via generated `$enumDecodeNullable` (e.g., `'longRun'`)
- Round-trip `JSON → WorkoutType → JSON` may produce different keys than input

### 1.4 Core Entity: `Goal` (the "Plan")

**Location:** `dashboard_entities.dart:596-806`

| Field | Type | Issue |
|-------|------|-------|
| `sport` | `String` (default `'RUN'`) | Raw String, no type safety |
| `planSource` | `String` (default `'standard'`) | Raw String, no type safety |
| `raceType` | `RaceType?` (required nullable) | Semantically confusing |
| `targetTime` | `int?` | No unit documentation (seconds) |
| `weeklyMileageGoal` | `double?` | No unit documentation (meters?) |
| `taperWeeks`/`peakWeeks`/`buildWeeks` | `int` | No validation or constraint vs `planWeeks` |

**Finding (LOW):** `required` keyword on nullable types (`RaceType?`, `DateTime?`, etc.) is semantically confusing.

**Finding (MEDIUM):** No input validation on any model field — `planWeeks`, `runsPerWeek`, `taperWeeks` etc. can be zero or negative with no error.

### 1.5 Core Entity: `Workout`

**Location:** `dashboard_entities.dart:390-506`

| Field | Type | Issue |
|-------|------|-------|
| `phase` | `String?` | `TrainingPhase` enum exists but not used |
| `intensityZone` | `String?` | No enum for intensity zones |
| `sport` | `String` | Raw String |
| `targetDistance` | `double` (default `0.0`) | 0.0 = no target set? Ambiguous |
| `targetPace` | `double` (default `0.0`) | 0.0 is semantically invalid pace |
| `targetDuration` | `int` (default `0`) | 0 = no target set? Ambiguous |

### 1.6 CreateGoalRequest — Duplicated & Inconsistent

**Domain:** `goal_entities.dart:44-244`  
**Data (Freezed):** `goal_models.dart:29-67`

**Finding (HIGH):** `customSwimDistM`, `customBikeDistM`, `customRunDistM` exist in the freezed data model but are **missing from the domain entity**. The mapper (`goal_mappers.dart:90-92`) passes them through for serialization, but they cannot be set from the domain layer.

**Finding (MEDIUM):** Naming inconsistencies across layers:
- `qualityDay` (OnboardingState) → `workoutDay` (CreateGoalRequest/Goal)
- `weeklyMileage` (OnboardingState) → `weeklyMileageGoal` (CreateGoalRequest/Goal)
- `goalTimeSeconds` (OnboardingState) → `targetTime` (CreateGoalRequest/Goal)

### 1.7 Structured Workout Models — Disconnected

**Location:** `workout_step.dart` (full file, 110 lines)

`StructuredWorkout`, `WorkoutStep`, `StepGroup`, `StepNode` are entirely separate from the `Workout` entity. No field bridges them.

**Finding (LOW):** `StepGroup`, `StepNode`, `StructuredWorkout` lack `hashCode`/`operator ==` overrides.

### 1.8 Stringly-Typed Fields

The following fields use raw `String` instead of typed enums:
- `sport` (Goal, Workout, SubGoal, AdaptedWorkout)
- `planSource` (Goal)
- `phase` (Workout)
- `intensityZone` (Workout)
- `experienceLevel` (OnboardingState)
- `calibrationMode` (OnboardingState)
- `calibrationDistance` (OnboardingState)
- `originalType`/`adaptedType` (AdaptedWorkout)

### 1.9 OnboardingState

**Location:** `onboarding_providers.dart:239-402`

30+ fields driving plan creation through the onboarding wizard.

**Finding (MEDIUM):** `computedPlanWeeks` (line 321) does not account for `buildWeeks + peakWeeks + taperWeeks` configuration — these are independent.

### 1.10 Custom JSON Parsing — Silent Failures

**Location:** `dashboard_models.dart:8-39`

`_parseDouble`, `_parseIntSafe` silently return `0`/`0.0` on malformed data instead of throwing.

**Finding (LOW):** Could mask API contract violations.

---

## 2. Plan Generation Algorithms

### 2.1 Goal Time Prediction

**`calculateProjectedGoalTime()`** — `goal_projection.dart:112-208`

Algorithm:
1. Progression coefficient from duration/frequency/volume (capped at 1.15)
2. Applied to current VO2max
3. Newton-Raphson VDOT time estimator for optimal time
4. Shape penalty based on current fitness vs. race demands
5. Conservative estimate at 50% of projected improvement

**Findings:**

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| A-01 | MEDIUM | All magic numbers undocumented: `1.15`, `0.008`, `0.02`, `0.015`, `2.0`, `1.0` | `goal_projection.dart:86-104` |
| A-02 | LOW | Linear progression model — may overestimate for beginners, underestimate for advanced | `goal_projection.dart:86-104` |
| A-03 | LOW | Shape penalty formula breaks if `currentShapePercent` is negative (no validation) | `goal_projection.dart:108-109` |
| A-04 | MEDIUM | Fallback `currentWeeklyKm` assumes `weeklyMileageGoal * 0.5` — hardcoded 50% assumption | `goal_projection.dart:152` |
| A-05 | MEDIUM | Returns all-zero `ProjectedGoalResult` for timed events, triathlons, custom distances — silent no-op | `goal_projection.dart:48` |

### 2.2 Algorithm Duplication — VDOT/Projection

**`calculateProjectedGoalTime()`** is duplicated with different signatures in:
- `goal_projection.dart:112-208` (enum-based `RaceType`)
- `vdot_calculator.dart:132-265` (string-based race key)

**Finding (HIGH):** Complete algorithm duplication with subtle differences. Risk of divergence. The shape calculation in `vdot_calculator.dart` always uses `effectiveCurrentKm = weeklyMileageGoal * 0.5`, never accepting actual current km.

### 2.3 VDOT Calculation Duplication

`calculateVdot()` exists identically in:
- `vdot.dart:3-12`
- `vdot_calculator.dart:19-28`

Two different time estimation algorithms:
- `estimateTime()` in `vdot.dart:27-58` — Newton-Raphson (max 20 iterations, 0.1s threshold)
- `predictRaceTime()` in `vdot_calculator.dart:36-56` — Binary search (50 iterations, 0.01 VDOT threshold)

**Finding (MEDIUM):** Two different algorithms may produce slightly different results for same inputs. `predictRaceTime` has range limit [600s, 18000s] — cannot predict <10min or >5hrs.

### 2.4 Training Pace Calculation Duplication

`calculateTrainingPaces()` in `vdot_calculator.dart:76-92` is duplicated inline in `TrainingPacesCard` widget at `training_paces_card.dart:156-169`.

**Finding (MEDIUM):** `_velocityAtPercentVO2max()` and `_velocityToPace()` are inline copies of shared utilities. Should use shared utility.

### 2.5 Training Paces — Naming Inversion

**Location:** `vdot_calculator.dart:76-92`

`easyMin` uses higher %VO2max (79%), producing faster pace — so `easyMin` is actually the fast end of easy. Same in `TrainingPacesCard`.

**Finding (LOW):** Naming suggests the opposite of actual behavior.

### 2.6 Repetition Pace at 105% VO2max

**Location:** `vdot_calculator.dart:82`

The quadratic velocity equation may produce unrealistic velocities for some VDOT values at 105%.

**Finding (LOW):** Edge case for extreme VDOT values.

### 2.7 Race Defaults

**`getRaceDefaults()` / `adjustDefaultsForVdot()`** — `race_defaults.dart:103-132`

- Hardcoded lookup table (lines 31-101) with undocumented source
- VDOT adjustment is simplistic: 4-tier volume factor (0.85/1.0/1.10/1.15) with no rationale for thresholds
- Only adjusts `runsPerWeek` and `weeklyVolumeKm`, not `maxLongRunKm`, phase durations, or strength

**Finding (LOW):** Undocumented magic numbers; simplistic personalization.

### 2.8 Phase Clamping

**`_clampedPhases()`** — `goal_setup_wizard.dart:72-83`

If total phase weeks exceed plan weeks, each is scaled proportionally. Build gets the remainder.

**Finding (LOW):** Build absorbs rounding errors; could result in zero-length build phase for short plans.

### 2.9 Plan Duration Capping

**`_maxPlanWeeks`** — `goal_setup_wizard.dart:68-70`

Uses `~/ 7` (integer division). A 6-day gap gives 0 max weeks. The `_planWeeksCap` clamps to `max(4, ...)`.

**Finding (LOW):** 4-week forced plan for races only days away may be unrealistic.

### 2.10 Weekly Mileage Unit Confusion

**CRITICAL FINDING:**

- **Wizard** (`goal_setup_wizard.dart:1327`): `(_weeklyMileageGoal * 1000).roundToDouble()` — converts km → meters for API
- **Onboarding** (`review_step.dart:200`): `weeklyMileage * 1000` — same km → meters conversion
- **Goal projection** (`goal_projection.dart:112-208`): Divides by 50 in progression formula, treating value as **km**
- **API field name**: `weeklyMileageGoal` — ambiguous (mileage but value is meters?)

**If the API stores meters and `goal_projection.dart` receives meters but treats them as km, the progression coefficient would be wildly inflated.** This needs verification against the server contract.

### 2.11 Readiness Scoring

**`ReadinessScoringService.score()`** — `readiness_scoring_service.dart:8-44`

Weighted composite: HRR 35%, Sleep 30%, Load 25%, Subjective 10%. Components with missing data are excluded and weights renormalized. Minimum 2 components required.

**Finding (LOW):** With only 2 components, renormalized weights could be misleading (e.g., HRR becomes 77.8%).

### 2.12 Workout Adaptation Engine

**`WorkoutAdaptationEngine.adapt()`** — `workout_adaptation_engine.dart:7-184`

Rule-based adaptation based on readiness state. Magic numbers throughout: 0.80, 0.85, 45min, 3km, 30min, 0.5.

**Findings:**

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| A-06 | LOW | Adaptation percentages fixed regardless of how far below threshold readiness falls | `workout_adaptation_engine.dart` |
| A-07 | LOW | No adaptation for `fartlek`, `repetitions`, `crossTrain`, `ride`, `swim`, `strength` — all become "other" | `workout_adaptation_engine.dart` |
| A-08 | LOW | Strength workouts can be swapped to easy runs — may not be appropriate | `workout_adaptation_engine.dart:117-154` |
| A-09 | LOW | `adaptedType` says `swapToEasy` for already-easy workouts — misleading | `workout_adaptation_engine.dart:117-154` |
| A-10 | LOW | `DateTime.now()` for timestamps — not injectable/testable | `workout_adaptation_engine.dart` |

**Good coverage:** 518 lines of thorough tests for this engine.

### 2.13 TRIMP/CTL/ATL

**`TrimpService`** — `trimp_service.dart:19-131`

Session TRIMP with sex-based exponent (1.92 male, 1.67 female). CTL with 42-day decay, ATL with 7-day decay.

**Findings:**

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| A-11 | LOW | EWMA starts at 0 — understated for first few entries | `trimp_service.dart:107-125` |
| A-12 | LOW | Sex defaults to `'male'` — no user-configurable parameter in orchestrator | `readiness_orchestrator.dart:88` |
| A-13 | LOW | Fallback HR: 190 max, 60 resting — population averages, not personalized | `readiness_orchestrator.dart:62-63` |

### 2.14 Readiness Orchestrator

**`ReadinessOrchestrator.collectInputs()`** — `readiness_orchestrator.dart:20-96`

**Finding (MEDIUM):** All `catch (_)` blocks silently discard errors. If Health Connect permission is denied, user gets `ReadinessState.unavailable` with no explanation.

**Finding (MEDIUM):** `collectInputs()` ignores `maxHr`, `restingHr`, `age` parameters (always passes null) while `collectInputsForDate()` properly uses them. The provider `refresh()` calls with all nulls.

### 2.15 Triathlon Estimation

**`estimateTriathlonTime()`** — `triathlon_estimator.dart:138-205`

- Swim CSS: `180 - vdot*1.5` — crude linear regression
- Bike FTP: `(vdot-10)*6 + 120` — rough linear regression
- Bike speed: `(watts/0.38)^(1/3)` — simplified aero model, no terrain/wind/rider weight

**Finding (LOW):** Backyard ultra projection returns identical optimal/projected/conservative results — stub/placeholder.

### 2.16 Heart Rate Zone Calculation

**`calculateHRZonesFromLTHR()`** — `vdot_calculator.dart:299-328`

Joe Friel 7-zone model. Gap at exactly LTHR between Z4/Z5 boundaries.

**Finding (LOW):** Z1 min = 0 is not practically useful for display.

---

## 3. UI Layer & User Flow

### 3.1 Screen Inventory

| Screen | File | Lines | Role |
|--------|------|-------|------|
| PlanScreen | `plan_screen.dart` | 1081 | Main plan view with workouts |
| GoalSetupWizard | `goal_setup_wizard.dart` | 3356 | 9-step plan creation wizard |
| GoalDetailScreen | `goal_detail_screen.dart` | 990 | Single goal details + sub-goals |
| GoalListScreen | `goal_list_screen.dart` | 376 | All goals list |
| RaceResultScreen | `race_result_screen.dart` | 1431 | Post-race result linking |

### 3.2 GoalSetupWizard — Critical Issues

**Finding (HIGH):** 3356-line single file with 12+ private widget classes and 30+ state variables. Extremely difficult to navigate and maintain.

**Finding (MEDIUM):** Steps 3-8 of `_validateCurrentStep()` always return `true` (lines 98-143). Only steps 0 (name) and 2 (date) have actual validation.

**Finding (MEDIUM):** When user changes race type (step 1), all training parameters are silently reset to defaults via `getRaceDefaults()`. Customizations to volume/phases/schedule are lost without warning.

**Finding (MEDIUM):** No unsaved changes warning when closing the wizard. The close button immediately navigates away.

**Finding (LOW):** No draft saving — all wizard state lives in the StatefulWidget. App backgrounding or memory pressure loses all progress.

**Finding (LOW):** Hardcoded English day names at lines 2802-2809 and 3110-3118 instead of localized strings.

### 3.3 Wizard Step Details

| Step | Lines | Inputs | Validation |
|------|-------|--------|------------|
| Name (0) | 1644-1700 | TextFormField | Non-empty, min 2 chars |
| Race Type (1) | 1702-1785 | Selection chips | None (always valid) |
| Date (2) | 1892-2062 | Two date pickers | Race date must be future |
| Target Time (3) | 2064-2412 | Slider + manual input | None |
| Volume (4) | 2415-2631 | Counters + sliders | None |
| Phases (5) | 2633-2779 | 3 sliders | Auto-clamps silently |
| Scheduling (6) | 2781-2945 | Dropdowns + checkboxes | None |
| Duration (7) | 2947-3058 | Slider (4-24 weeks) | None |
| Review (8) | 3061-3356 | Read-only + submit | None |

**Finding (LOW):** Plan weeks capping prevents advancing past step 3 if date range is insufficient, but the error only shows at submission time.

### 3.4 PlanScreen Issues

**Finding (HIGH):** Workout mark-complete does not invalidate `goalsProvider` — only `dashboardProvider` is invalidated (`plan_screen.dart:656`). Plan screen shows stale completion state.

**Finding (HIGH):** Edit workout save has no loading indicator on the save button (`plan_screen.dart:1063-1071`). Button fires and forgets.

**Finding (MEDIUM):** Delete confirmation dialogs use hardcoded English strings instead of localized `S.of(context)`.

**Finding (MEDIUM):** `DropdownButtonFormField` uses `initialValue` instead of `value` — dropdown may not reflect selected type visually.

**Finding (MEDIUM):** Reorder persistence calls API sequentially per workout with no rollback on partial failure (`plan_screen.dart:465-484`). Local/remote state divergence risk.

**Finding (LOW):** Multiple active goals — only first is shown, no indication to user (`plan_screen.dart:28`).

**Finding (LOW):** Error state shows raw `error.toString()` to user — may leak implementation details.

### 3.5 GoalDetailScreen Issues

**Finding (MEDIUM):** Workout color/icon/label mapping duplicated between this file and `plan_screen.dart` (and `dashboard_screen.dart`). Should be shared utility.

**Finding (LOW):** Loading state uses basic `CircularProgressIndicator` instead of skeleton — inconsistent with PlanScreen.

**Finding (LOW):** `_CompletionCheckbox` uses `GestureDetector` without semantics — poor accessibility.

### 3.6 Loading State Consistency

| Screen | Loading State | Quality |
|--------|---------------|---------|
| PlanScreen | Skeleton shimmer | Good |
| GoalDetailScreen | Basic spinner | Minimal |
| GoalListScreen | Skeleton shimmer | Good |
| WeekScheduleCard | `SizedBox.shrink()` | Bad — disappears |
| TrainingPacesCard | `SizedBox.shrink()` | Bad — disappears |
| TrainingStatusCard | Skeleton shimmer | Good |

### 3.7 PhaseIndicator — Hardcoded vs. User-Configured

**Location:** `phase_indicator.dart:133-166`

Phase computation uses hardcoded percentages (0.4 base, 0.25 build, etc.) rather than the user-configured phase durations from the wizard. The user configures specific phase durations but the indicator shows generic proportional phases.

**Finding (MEDIUM):** Disconnect between wizard configuration and phase display.

### 3.8 Accessibility

- No `Semantics` widgets on interactive plan elements
- Workout cards use `InkWell` without `tooltip` or semantic labels
- Wizard step progress bar is purely visual — no screen reader support
- Completion checkbox uses `GestureDetector` without semantics
- Bottom sheet actions have no semantic ordering

### 3.9 Localization Gaps

Hardcoded English strings found in:
- `plan_screen.dart` (delete confirmations)
- `goal_setup_wizard.dart` (day names)
- `race_countdown_card.dart` (month names, status text)
- `phase_indicator.dart` (phase labels)
- `training_paces_card.dart` (zone labels)
- `week_schedule_card.dart` ("This Week")

---

## 4. Persistence & API Layer

### 4.1 Architecture

- **Storage**: SQLite (`sqlite3` package) for caching, `SharedPreferences` for misc UI state
- **Cache Layer**: `CacheDatasource` backed by SQLite `api_cache` table
- **API Client**: Dio with interceptors (auth, refresh, retry, dedup, connectivity, error)
- **Repository Pattern**: Clean Architecture with stale-while-revalidate caching

### 4.2 Database

**Location:** `app_database.dart` (lines 9-676)

- Schema version 5, migration support
- No dedicated plans/goals table — plans stored as JSON in `api_cache`

**Finding (LOW):** Singleton pattern not thread-safe (line 18-19). No synchronization guard.

**Finding (LOW):** Database close clears reference but in-flight operations could fail.

### 4.3 Cache Datasource

**Location:** `cache_datasource.dart:10-55`

Key-value JSON cache with TTL support.

**Finding (LOW):** No cache size limits — no eviction policy.
**Finding (LOW):** No cache versioning — model changes cause deserialization failures on stale cache.
**Finding (LOW):** Synchronous SQLite calls could cause jank on large payloads.
**Finding (LOW):** `isExpired` not timezone-aware.

### 4.4 API Endpoints

**Location:** `api_constants.dart:63-65`

**Finding (LOW):** Inconsistent URL paths:
- Plan endpoints: `$baseUrl/api/plans` (no version prefix)
- Workout endpoints: `$baseUrl/api/mobile/v1/workouts` (versioned)

### 4.5 Repository Implementation — Critical Cache Issues

**Location:** `goal_repository_impl.dart:16-307`

#### Stale-While-Revalidate Race Condition

**Finding (MEDIUM):** `_cacheFirst` (lines 274-295) fires `_refreshInBackground` with `unawaited()`. If user triggers a mutation before background refresh completes, cache could be overwritten with stale data.

#### Cache Invalidation Gaps

| Operation | Invalidates `goals` cache? | Invalidates `goal_` cache? | Verdict |
|-----------|---------------------------|---------------------------|---------|
| `createGoal` | YES | NO (new goal, correct) | OK |
| `updateGoal` | YES | YES | OK |
| `deleteGoal` | YES | YES | OK |
| **`updateWorkout`** | **NO** | **NO** | **BUG** |
| **`reorderWorkout`** | **NO** | **NO** | **BUG** |
| `createSubGoal` | YES | YES | OK |
| `deleteSubGoal` | YES | YES | OK |

**Finding (HIGH):** `updateWorkout` and `reorderWorkout` do NOT invalidate goal caches. After marking a workout complete or editing it, the goal list and individual goal caches show stale workout data until 15-minute cache expires. Users see outdated completion state.

#### Other Repository Issues

**Finding (MEDIUM):** `listWorkouts` has NO caching (lines 145-175) — fails entirely on offline.

**Finding (MEDIUM):** Silent error swallowing in `_refreshInBackground` (line 305): `catch (_) {}` — no logging, no retry, no user notification.

**Finding (LOW):** `createGoal` response parsing uses `unwrapPayload` with `['goal']` key — falls back to parsing full response if key not found.

### 4.6 Duplicate `_cacheFirst` Implementation

Identical `_cacheFirst` method exists in:
- `goal_repository_impl.dart:274-306`
- `dashboard_repository_impl.dart:115-147`

**Finding (LOW):** DRY violation. Goal data cached in TWO separate cache keys (`'dashboard_response'` and `'goals'`) with no coordination.

### 4.7 No Offline Support for Plans

- `OfflineSyncService` only handles activity operations — no queue for plan CRUD or workout updates
- Plan data only available through cache-first pattern — empty cache + offline = error
- Workout operations (complete, edit, reorder) cannot be performed offline
- No `pending_sync` queue for plan mutations

**Finding (MEDIUM):** Complete lack of offline support for plan operations.

### 4.8 Background Sync

**Location:** `background_sync.dart:32-219`

Plan data is NOT synced in background. Only activities and readiness data.

**Finding (LOW):** Background sync creates new `GoalRepositoryImpl` instances bypassing Riverpod state, so cache writes from background don't update foreground providers.

### 4.9 State Management — Provider Issues

**Location:** `goal_providers.dart:1-77`

**Finding (MEDIUM):** After workout mutations in PlanScreen, `goalsProvider` is NOT refreshed — only `dashboardProvider` is invalidated. Plan screen may show stale data after navigating away and back.

**Finding (LOW):** `goalRepositoryProvider` is `keepAlive: true` — stale cache persists for entire app lifecycle.

**Finding (LOW):** No optimistic updates — all mutations wait for server response, causing perceived latency.

### 4.10 Missing `planStartDate` in Goal Model

**Location:** `dashboard_models.dart:256-293`

`CreateGoalRequest` has `planStartDate` but the returned `Goal` model does not. The user's plan start date is lost after creation.

**Finding (LOW):** Information loss after plan creation.

---

## 5. Test Coverage & Error Handling

### 5.1 Existing Test Files

| File | Scope | Lines |
|------|-------|-------|
| `test/unit/goal_repository_test.dart` | GoalRepositoryImpl CRUD | 366 |
| `test/unit/goal_models_test.dart` | Model serialization | 356 |
| `test/unit/goal_detail_provider_test.dart` | goalDetailProvider | 133 |
| `test/widget/goal_setup_wizard_test.dart` | Wizard navigation only | 154 |
| `test/widget/goal_list_screen_test.dart` | Goal list UI states | 252 |
| `test/unit/vdot_test.dart` | VDOT calculator | 181 |
| `test/unit/workout_adaptation_engine_test.dart` | Workout adaptation | 518 |

### 5.2 Untested Code — HIGH Severity

| Component | File | What's Missing |
|-----------|------|---------------|
| **PlanScreen** | `plan_screen.dart` (1081 lines) | Zero widget test coverage for all 7 widget classes |
| **GoalDetailScreen** | `goal_detail_screen.dart` (990 lines) | Zero widget test coverage |
| **goal_projection.dart** | `goal_projection.dart` (269 lines) | Zero tests for all projection algorithms |
| **Onboarding plan creation** | `review_step.dart` (284 lines) | Zero tests for `_submitPlan()` |
| **Wizard submission** | `goal_setup_wizard.dart` | Only navigation tested, not `_submit()` |

### 5.3 Untested Code — MEDIUM Severity

| Component | What's Missing |
|-----------|---------------|
| `triathlon_estimator.dart` | Zero tests |
| `Goals` notifier | `createGoal()`, `deleteGoal()`, `reorderWorkout()`, `refresh()` untested |
| `GoalRepositoryImpl` | `createSubGoal`, `deleteSubGoal`, `_cacheFirst` fallback untested |
| `athlete_defaults.dart` | Zero tests |
| `race_defaults.dart` | Zero tests |

### 5.4 Error Handling Issues

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| E-01 | HIGH | Silent error in `_refreshInBackground` — `catch (_) {}` with no logging | `goal_repository_impl.dart:305` |
| E-02 | HIGH | Mark-complete failure — error logged only, no user feedback, no state revert | `plan_screen.dart:641-658` |
| E-03 | MEDIUM | Edit workout failure — bottom sheet stays open with no error message | `plan_screen.dart:674-687` |
| E-04 | MEDIUM | Reorder partial failure — UI shows all reordered, server may be inconsistent | `plan_screen.dart:465-484` |
| E-05 | MEDIUM | `_cacheFirst` fallback to stale cache has no logging | `goal_repository_impl.dart:287-294` |
| E-06 | MEDIUM | Readiness orchestrator silently catches all errors — `unavailable` with no explanation | `readiness_orchestrator.dart:28,35,86` |
| E-07 | LOW | `_CompletionCheckbox._toggle()` catches with `catch (_)` — error not logged | `goal_detail_screen.dart:888` |
| E-08 | LOW | `createGoal` returns goal without refreshing when provider unmounted | `goal_providers.dart:35-41` |

### 5.5 Logging Gaps

Only 3 `logger.error()` calls exist in the entire plan flow, all in `plan_screen.dart`. No logging in:
- `goal_setup_wizard.dart` (plan creation)
- `review_step.dart` (onboarding plan creation)
- `goal_repository_impl.dart` (all API calls)
- `goal_providers.dart` (all mutations)
- `goal_detail_screen.dart` (sub-goal operations, workout toggle)

### 5.6 Edge Cases

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| X-01 | MEDIUM | No validation for backyard ultra loop distance at submission | `goal_setup_wizard.dart:1301-1379` |
| X-02 | LOW | Target time silently null when VO2max unavailable — no validation | `goal_setup_wizard.dart:163-194` |
| X-03 | LOW | Plan name can be empty if cleared after step 0 validation | `goal_setup_wizard.dart:1301-1379` |
| X-04 | LOW | `RestDays` not passed from onboarding state in `review_step.dart` | `review_step.dart:193-216` |

---

## 6. Consolidated Findings by Severity

### CRITICAL (1)

| # | Finding | Area | Location |
|---|---------|------|----------|
| C-01 | **Weekly mileage unit confusion**: Wizard/onboarding send meters (`*1000`), projection algorithms treat as km — potential for wildly inflated progression coefficients | Algorithms | `goal_setup_wizard.dart:1327`, `review_step.dart:200`, `goal_projection.dart:112-208` |

### HIGH (8)

| # | Finding | Area | Location |
|---|---------|------|----------|
| H-01 | `updateWorkout` and `reorderWorkout` do NOT invalidate goal caches — stale workout data in UI | Persistence | `goal_repository_impl.dart:178-215` |
| H-02 | Zero test coverage for PlanScreen (1081 lines, 7 widget classes) | Testing | `plan_screen.dart` |
| H-03 | Zero test coverage for GoalDetailScreen (990 lines) | Testing | `goal_detail_screen.dart` |
| H-04 | Zero test coverage for goal projection algorithms | Testing | `goal_projection.dart` |
| H-05 | Zero test coverage for onboarding plan creation (`review_step.dart`) | Testing | `review_step.dart:183` |
| H-06 | Algorithm duplication: VDOT/projection logic in 2-3 copies with divergent behavior | Algorithms | `goal_projection.dart`, `vdot_calculator.dart`, `vdot.dart` |
| H-07 | `customSwimDistM`/`customBikeDistM`/`customRunDistM` in data model but missing from domain entity | Models | `goal_models.dart:29-67` vs `goal_entities.dart:44-244` |
| H-08 | Mark-complete failure has no user feedback and no state revert | Error Handling | `plan_screen.dart:641-658` |

### MEDIUM (18)

| # | Finding | Area | Location |
|---|---------|------|----------|
| M-01 | Enum mapping via `.values[index]` — silently breaks on reorder | Models | `dashboard_mappers.dart:5-27` |
| M-02 | WorkoutType has two different JSON serialization conventions | Models | `dashboard_models.dart`, `goal_models.g.dart` |
| M-03 | No input validation on model fields (planWeeks, runsPerWeek, etc.) | Models | All model files |
| M-04 | Naming inconsistencies across layers (qualityDay/workoutDay, etc.) | Models | Multiple files |
| M-05 | `computedPlanWeeks` ignores phase configuration | Models | `onboarding_providers.dart:321` |
| M-06 | Projection returns zero result for 9/17 race types — silent no-op | Algorithms | `goal_projection.dart:48` |
| M-07 | Fallback current weekly km hardcoded at 50% of target | Algorithms | `goal_projection.dart:152` |
| M-08 | Race type change silently resets all training parameters | UI | `goal_setup_wizard.dart:1431-1461` |
| M-09 | No unsaved changes warning in wizard | UI | `goal_setup_wizard.dart:1389-1391` |
| M-10 | PhaseIndicator uses hardcoded percentages instead of user config | UI | `phase_indicator.dart:133-166` |
| M-11 | Reorder persistence sequential with no rollback on partial failure | UI | `plan_screen.dart:465-484` |
| M-12 | 3356-line wizard file — should be split into step files | UI | `goal_setup_wizard.dart` |
| M-13 | Stale-while-revalidate race condition with concurrent mutations | Persistence | `goal_repository_impl.dart:274-295` |
| M-14 | `listWorkouts` has no caching — fails on offline | Persistence | `goal_repository_impl.dart:145-175` |
| M-15 | No offline support for plan operations | Persistence | Architecture-wide |
| M-16 | Readiness orchestrator silently swallows all errors | Error Handling | `readiness_orchestrator.dart:28,35,86` |
| M-17 | `collectInputs()` ignores maxHr/restingHr/age — uses fallback values | Algorithms | `readiness_orchestrator.dart:20-96` |
| M-18 | Workaround type mapping `TrainingPacesCard` duplicates algorithm | Algorithms | `training_paces_card.dart:156-169` |

### LOW (20)

| # | Finding | Area |
|---|---------|------|
| L-01 | `required` on nullable types is semantically confusing | Models |
| L-02 | `targetDistance`/`targetPace`/`targetDuration` default to 0 — ambiguous | Models |
| L-03 | Structured workout models lack `hashCode`/`operator ==` | Models |
| L-04 | Custom JSON parsers silently return 0 on malformed data | Models |
| L-05 | Stringly-typed fields (sport, planSource, phase, etc.) | Models |
| L-06 | Linear progression model without diminishing returns | Algorithms |
| L-07 | Shape penalty breaks on negative currentShapePercent | Algorithms |
| L-08 | Training pace naming inversion (easyMin is actually fast end) | Algorithms |
| L-09 | Repetition pace at 105% VO2max may produce unrealistic values | Algorithms |
| L-10 | Race defaults are undocumented magic numbers | Algorithms |
| L-11 | EWMA starts at 0 — understated CTL/ATL initially | Algorithms |
| L-12 | Sex defaults to 'male' in TRIMP computation | Algorithms |
| L-13 | Backyard ultra projection is stub/placeholder | Algorithms |
| L-14 | HR zone gap at exactly LTHR boundary | Algorithms |
| L-15 | Adaptation fixed regardless of readiness score magnitude | Algorithms |
| L-16 | Strength workouts can be swapped to easy runs | Algorithms |
| L-17 | Database singleton not thread-safe | Persistence |
| L-18 | `_cacheFirst` duplicated across repositories | Persistence |
| L-19 | No draft saving in wizard | UI |
| L-20 | Hardcoded English strings in multiple widgets | UI |

---

## 7. Code Quality Summary

### Duplication Count

| What | Where | Copies |
|------|-------|--------|
| VDOT calculation | `vdot.dart`, `vdot_calculator.dart` | 2 |
| Goal time projection | `goal_projection.dart`, `vdot_calculator.dart` | 2 |
| Training pace computation | `vdot_calculator.dart`, `training_paces_card.dart` | 2 |
| Workout color/icon mapping | `plan_screen.dart`, `goal_detail_screen.dart`, `dashboard_screen.dart` | 3 |
| Error widgets | 4 screen files | 4 |
| `_cacheFirst` method | `goal_repository_impl.dart`, `dashboard_repository_impl.dart` | 2 |

### File Size Concerns

| File | Lines | Concern |
|------|-------|---------|
| `goal_setup_wizard.dart` | 3356 | Extremely large — split recommended |
| `race_result_screen.dart` | 1431 | Large — could split by mode |
| `plan_screen.dart` | 1081 | Large but manageable |
| `goal_detail_screen.dart` | 990 | Moderate |

### Test Coverage Assessment

| Category | Assessed Coverage |
|----------|------------------|
| Workout adaptation engine | **Good** (518 lines tests) |
| Readiness scoring service | **Good** (637 lines tests) |
| TRIMP service | **Good** |
| Goal repository (basic CRUD) | **Moderate** (366 lines) |
| Goal model serialization | **Moderate** (356 lines) |
| VDOT calculator | **Moderate** (181 lines) |
| Goal time projection | **None** |
| Triathlon estimator | **None** |
| Race defaults | **None** |
| Athlete defaults | **None** |
| Plan screen UI | **None** |
| Goal detail screen UI | **None** |
| Wizard submission flow | **None** |
| Onboarding plan creation | **None** |

---

*End of audit report. No fixes were implemented. All findings are documented for prioritization and remediation.*

---

# Appendix A: Independent Review

**Reviewer:** Independent general-purpose subagent  
**Date:** 2026-05-17  
**Methodology:** Spot-checked 17 findings against source code, verified all file paths/line numbers/line counts

## Overall Assessment: GOOD

The audit is thorough, well-structured, and largely accurate. It correctly identifies the most critical risks (unit confusion, cache invalidation, algorithm duplication) and provides a comprehensive severity-tiered findings table.

| Metric | Result |
|--------|--------|
| Findings verified as accurate | 15/17 spot-checked |
| False positives | 1 (H-07) |
| Misleading descriptions | 1 (M-17) |
| File/line number accuracy | 100% |
| File size claims | 100% |

## Disputed Findings

### H-07: FALSE POSITIVE
The audit claims `customSwimDistM`/`customBikeDistM`/`customRunDistM` are missing from the domain entity. They are actually present in `goal_entities.dart:73-75` and `105-107`. **Recommendation: Remove H-07.**

### M-17: Misleading Description
`collectInputs()` does use `maxHr`/`restingHr` (lines 59-60, 78, 93-94). The actual issue is the **caller** (`readiness_providers.dart:87-91`) passing `null`. **Recommendation: Reword to "Readiness provider's `refresh()` always passes null for maxHr/restingHr/age, causing fallback values."**

## Severity Adjustments Recommended

| Finding | Audit Severity | Recommended | Reason |
|---------|---------------|-------------|--------|
| H-07 | HIGH | **Remove** | False positive |
| M-12 | MEDIUM | **Consider HIGH** | 3356-line file is a serious maintainability problem |
| E-01 | HIGH | **MEDIUM** | Silent background refresh is lower impact than user-facing errors |

## Missing Findings the Audit Should Add

1. **`copyWith` null-reset bug**: Manual domain entities cannot reset nullable fields to `null` (e.g., `Goal.copyWith(raceType: null)` keeps existing value). Systematic across all domain entities (`dashboard_entities.dart:663-689`).
2. **Provider-level partial mitigation of H-01**: `Goals.reorderWorkout()` calls `refresh()` after API success, partially mitigating stale provider state — but `goalDetail` and direct cache consumers remain stale.
3. **No top-level error boundary**: Plan generation flow lacks crash recovery or retry strategy beyond basic `onRetry`.

## Final Verdict

With H-07 removed and M-17 corrected, the audit provides an excellent foundation for prioritizing remediation. The C-01 unit confusion finding should be conclusively resolved against the server contract as the highest-priority follow-up action.

---

# Appendix B: Unified Plan Creation Design Plan (Audit)

**Status:** Proposal only, no implementation

## Proposed Unified Plan Creation (verbatim)

**Unified Plan Creation - Design Plan**

- **Define the target**
  - Single generation pipeline that outputs a normalized "advanced-editor-ready" plan format for all users.
  - AI analysis works on any plan with workouts.
  - No regressions from either legacy flow.

- **Feature audit + best-of selection**
  - Inventory all features/logic in both generators (progression, taper, recovery, personalization, constraints, metrics).
  - Create a "best-of" spec per feature: which logic wins, and how conflicts are resolved.
  - Document minimum required inputs and defaults.

- **Normalize the data model**
  - Ensure one canonical goal/workout schema supports all advanced fields.
  - Add any missing fields needed by the advanced editor or analysis (phase, weekIndex, intensity metadata, etc.).
  - Deprecate plan source distinctions after migration.

- **Unified generator design**
  - Single generator function that accepts a superset of inputs and maps legacy inputs to the new schema.
  - Shared validation + defaults module so both UI flows produce identical output shapes.
  - Output always includes the fields required by advanced editor and analysis.

- **Advanced editor as the sole editor**
  - All plans open in the advanced editor.
  - Editor auto-fills derived metadata if missing (phase labels, week boundaries, etc.).
  - Maintain editing parity for all plan types.

- **Unified analysis endpoint**
  - One analysis route that accepts any goalId without checking plan type.
  - Shared analysis prompt builder uses safe fallbacks for any missing data.
  - UI routes call the same endpoint.

- **Migration + backfill**
  - Migrate existing standard plans to the unified schema.
  - Backfill missing metadata needed for advanced editor/analysis.
  - Mark all migrated plans as editable in advanced editor.

- **Regression protection**
  - Automated tests for both legacy input styles.
  - Snapshot tests for plan output shape + key features.
  - Integration tests: advanced editor loads, AI analysis succeeds.

- **Rollout strategy**
  - Feature flag the unified generator.
  - Gradual rollout, monitor plan quality and analysis success.
  - Remove legacy generation paths once stable.

## Audit of the Proposal Against Known Findings

Legend: **Yes** = clearly addressed, **Partial** = related but not explicit, **No** = not addressed.

| Finding (from main audit) | Covered? | Notes |
|---------------------------|----------|-------|
| C-01 Unit confusion (weeklyMileageGoal) | **Partial** | Shared validation/defaults helps, but units are not explicitly defined or enforced. Needs explicit unit contract + tests. |
| H-01 Cache invalidation gaps | **No** | Proposal focuses on generator unification, not cache behavior. |
| H-06 Algorithm duplication | **Partial** | Single generator can reduce duplication, but does not address duplicated VDOT/projection helpers unless explicitly consolidated. |
| H-08 Mark-complete failure w/o feedback | **No** | UI/UX error handling not covered. |
| M-06 Projection returns zeros for some race types | **No** | Generator plan does not mention projections or race-type coverage. |
| M-08 Race type change resets values | **No** | Wizard UX behavior not addressed. |
| M-09 No unsaved-changes warning | **No** | Wizard navigation not addressed. |
| E-01 Silent refresh error | **No** | Error handling strategy not covered. |
| X-04 restDays omitted in onboarding | **No** | Input wiring and request completeness not addressed. |

## Regression Risk Assessment

- **Primary risks**: changed defaults or derived metadata can alter plan quality; migration/backfill could mislabel phases/weeks; advanced editor auto-fill could mask missing data.
- **Mitigations already in proposal**: feature flag, snapshot tests, integration tests, gradual rollout.
- **Additional mitigations needed**: parity tests against legacy outputs, contract tests for units/fields, server response diffs, and explicit acceptance criteria per race type.

## Gaps to Address Before This Plan Can Claim "No Regressions"

1. **Unit contract**: define and enforce km vs meters in all request/response paths with tests.
2. **Validation completeness**: ensure wizard/onboarding validation covers steps 3-8 and required fields (restDays, race params).
3. **Cache/refresh correctness**: reconcile goal/workout mutation cache invalidation in repositories/providers.
4. **Error handling UX**: surface failures for mark-complete, refresh, and create flows.
5. **Algorithm consolidation**: explicitly remove duplicate VDOT/projection code paths.

## Verdict

The unifying plan **improves architecture and product consistency**, but **does not on its own resolve most of the high/critical findings** from the audit. It is a strong strategic direction if paired with explicit unit contracts, validation coverage, cache correctness, and algorithm consolidation.

---

# Appendix C: Production-Ready Unified Plan (Improved)

**Status:** Proposal only, no implementation

## Goal

Deliver a single, production-safe plan generation flow that:

- Produces a canonical advanced-editor-ready plan for all users
- Preserves behavior from both legacy flows (no regressions)
- Eliminates current high/critical audit risks
- Is fully analyzable by AI and editable in the advanced editor

## Production-Ready Plan (Revised)

### 1. Contracts and Units (Blocker)

- Define a **unit contract** for all distance/time fields (meters vs km) at every boundary: UI -> API -> storage -> projection.
- Encode units in types or field names (`weeklyMileageMeters`), not implicit conversions.
- Add contract tests for request/response payloads and projection inputs.

### 2. Canonical Schema and Mapping

- Define a **single canonical schema** for `Goal`, `Workout`, `Phase`, and `PlanMeta` that includes all advanced editor fields.
- Add explicit **schema versioning** to support migration and safe parsing.
- Map all legacy inputs into the canonical schema through a single mapper.

### 3. Unified Generator (Single Source of Truth)

- Create one generator entry point that:
  - Accepts a superset input model
  - Applies shared validation + defaults
  - Calls a **single projection/VDOT implementation**
  - Emits canonical schema only

### 4. Algorithm Consolidation

- Remove duplicated VDOT/projection implementations and keep exactly one.
- Lock down expected outputs with snapshot tests and numeric tolerances.

### 5. Validation and Required Fields (Blocker)

- Ensure all wizard/onboarding steps validate required fields (including `restDays`, race params, and weekly mileage).
- Add validation parity tests for both flows.

### 6. Cache and State Correctness (Blocker)

- Make all workout mutations invalidate relevant caches and providers.
- Add consistency tests: mark-complete, reorder, update, and refresh.

### 7. Error Handling and UX (Blocker)

- Surface failures for mark-complete, refresh, create flows (snackbar/toast + rollback if needed).
- Add retry affordances and a top-level error boundary for plan screens.

### 8. Advanced Editor as the Only Editor

- All plans open in the advanced editor.
- Editor auto-fills **derived metadata** only if explicitly missing, and logs backfill events.
- Ensure parity for all plan types and race types.

### 9. Migration + Backfill

- Migrate all existing plans to canonical schema with a versioned migration.
- Backfill missing phase/week metadata in a deterministic, auditable way.
- Record migration provenance (source, date, version).

### 10. Unified Analysis Endpoint

- One analysis route accepts any `goalId`.
- Prompt builder uses safe defaults and validates required metadata.

### 11. Regression Protection

- Snapshot tests for plan output shape and key metrics.
- Parity tests comparing legacy outputs with unified outputs.
- Integration tests: create plan -> open in editor -> analyze -> edit -> re-analyze.

### 12. Rollout and Monitoring

- Feature flag the unified generator and allow gradual rollout.
- Telemetry: plan creation success rate, analysis success rate, editor load success, cache errors.
- Define rollback criteria and automated alerting for regression thresholds.

## Acceptance Criteria (Production-Ready)

- 100% of new plans are created via the unified generator.
- 100% of plans open in the advanced editor without fallback.
- Analysis succeeds for all plan types and race types.
- No unit mismatches in distance/time fields (contract tests pass).
- No cache staleness after workout mutations (consistency tests pass).
- All required fields validated in onboarding and wizard.

## Regression Risk Note

This plan is production-safe only if the **blocker items** (units, validation, cache, error handling) are implemented and verified before full rollout.

---

# Appendix D: Detailed Plan Audit & Plain-English Explanation

## Plain-English Explanation of the Plan

### What problem does this solve?

Right now there are **two separate ways** to create a training plan in RunFlow:

1. **Goal Setup Wizard** (`goal_setup_wizard.dart`, 3356 lines) — the full-featured wizard accessible from the Goals tab. It handles running races, triathlons, backyard ultras, custom distances, and more.

2. **Onboarding Wizard** (`review_step.dart` + `onboarding_providers.dart`) — the simplified flow for new users. It only handles basic running races and skips 12 fields that the full wizard provides (triathlon params, rest days, swim/bike/strength per week, etc.).

Both flows build a `CreateGoalRequest` object, convert km to meters (`*1000`), and POST it to the same API endpoint. But they use **different default values** (28 km vs 40 km for weekly mileage), **different validation** (wizard validates name + dates; onboarding validates nothing), and **different projection algorithms** (wizard uses `goal_projection.dart`; onboarding uses `vdot_calculator.dart`).

The plan proposes to **merge these into one unified flow** so every plan works the same way, every plan can be edited in an advanced editor, and every plan can be analyzed by AI.

### What does each step do, in plain English?

**Step 1 — Contracts and Units:** Fix the biggest bug first. Right now `weeklyMileageGoal` is in km in the UI, gets multiplied by 1000 before being sent to the server (so it arrives in meters), and comes back in meters. But the field name never tells you what unit it is. This step says: name fields clearly (`weeklyMileageGoalMeters` or `weeklyMileageGoalKm`) and write tests proving the conversion is correct at every boundary.

**Step 2 — Canonical Schema:** Today there are multiple data classes for `Goal`, `Workout`, `SubGoal`, `CreateGoalRequest`, etc. spread across `dashboard_entities.dart`, `goal_entities.dart`, `dashboard_models.dart`, and `goal_models.dart`. This step says: define ONE canonical shape for each entity, add a version number so you can evolve it safely, and have a single mapper that converts any legacy format into the canonical one.

**Step 3 — Unified Generator:** Instead of two separate code paths building `CreateGoalRequest` differently, create ONE function that accepts all possible inputs, fills in defaults, validates, and emits the canonical format. Both the wizard and onboarding would call this same function.

**Step 4 — Algorithm Consolidation:** There are literally two identical copies of the VDOT calculation (`vdot.dart:3` and `vdot_calculator.dart:19` — character-for-character the same). There are also two separate `calculateProjectedGoalTime` functions and two separate `calculateProgressionCoefficient` functions. This step says: delete the duplicates, keep one authoritative implementation, and lock its outputs with tests.

**Step 5 — Validation:** The wizard's `_validateCurrentStep()` returns `true` (no validation) for 6 out of 9 steps. The onboarding flow validates **nothing at all**. This step says: validate everything (rest days selected, mileage within range, race-type-specific fields filled in) before sending to the API.

**Step 6 — Cache Correctness:** When a user marks a workout complete or reorders workouts, the app does NOT invalidate the cached goal data. The user sees stale state for up to 15 minutes. This step says: every mutation must invalidate the relevant cache entries.

**Step 7 — Error Handling:** Three error handlers in `plan_screen.dart` silently swallow errors (mark-complete, reorder, edit workout) — the user gets no feedback at all when these fail. This step says: show a snackbar, rollback optimistic UI, and add retry buttons.

**Step 8 — Advanced Editor:** Today there is no advanced editor — only a bottom sheet to edit individual workout fields. This step says: build a proper editor that can modify plan-level metadata (phases, weekly mileage, race params) after creation.

**Step 9 — Migration:** Existing plans live only on the server and are cached as JSON blobs in SQLite. This step says: add schema versioning to the cache, backfill missing metadata, and record what was migrated.

**Step 10 — Unified Analysis:** There is no plan-specific AI analysis today — only a freeform chat. This step says: build a structured analysis endpoint that injects plan context (race type, target time, phase structure) into the AI prompt.

**Step 11 — Regression Protection:** There are zero integration tests for plan creation and zero golden tests for plan screens. This step says: add snapshot tests, parity tests (old vs new output), and end-to-end integration tests.

**Step 12 — Rollout:** There are no feature flags, no analytics events, and no remote config in the app. This step says: add a feature flag system so the unified generator can be toggled on gradually, and add telemetry to monitor success rates.

---

## Detailed Audit: Will Each Step Work in Production?

### Step 1: Contracts and Units — WILL WORK with caveats

**What exists:** 24 explicit `*1000` or `/1000` conversions scattered across 15 files. Zero unit tests. Zero documentation of units.

**What needs to happen:** Rename `weeklyMileageGoal` to include the unit (e.g. `weeklyMileageGoalMeters` on the API model, `weeklyMileageGoalKm` in the UI layer). Add explicit conversion functions with tests.

**Risks:**
- Renaming a field that's serialized to JSON changes the API payload. The server must accept the new field name OR the rename must stay in the mapper layer only.
- The field `maxLongRunKm` already has the unit suffix (`Km`) and is sent directly to the server in km — this is **inconsistent** with `weeklyMileageGoal` which is sent in meters. The plan doesn't address this inconsistency.
- 24 conversion sites must all be updated. Missing one causes silent data corruption.

**Production verdict: FEASIBLE but requires server team coordination on field naming. The plan should explicitly state whether renames are API-level or mapper-only.**

### Step 2: Canonical Schema — WILL WORK with significant new code

**What exists:** 4 Goal-like classes, 2 Workout-like classes, 1 SubGoal, 1 CreateGoalRequest, 1 UpdateGoalRequest, 1 UpdateWorkoutRequest. 12 mapper files. No schema versioning. No `Phase` or `PlanMeta` entity.

**What needs to happen:** Create new `Phase` and `PlanMeta` entities. Add a `schemaVersion` field to the cache format. Consolidate mapper logic.

**Risks:**
- Creating `Phase` and `PlanMeta` is a significant new code surface — these don't exist today. Phase is only a `String?` on `Workout`.
- 10 fields in `CreateGoalRequest` (calibrationTime, calibrationDistance, calibrationFactor, athleteCssOverride, athleteBikeSpeedOverride, customSwimDistM, customBikeDistM, customRunDistM, maxLongRunKm, planStartDate) are **write-only** — they exist in the request but NOT in the server response `Goal`. The plan says "ensure one canonical schema supports all advanced fields" but doesn't explain what happens to write-only fields.
- The `goal_mappers.dart` data->domain mapper at line 29-58 already drops `customSwimDistM`, `customBikeDistM`, `customRunDistM`. This existing bug must be fixed as a prerequisite.

**Production verdict: FEASIBLE but the plan underestimates the scope. Creating Phase and PlanMeta from scratch is significant work. Write-only field handling needs explicit design.**

### Step 3: Unified Generator — WILL WORK but needs careful design

**What exists:** Two separate `CreateGoalRequest` construction sites (wizard line 1321-1361, onboarding line 194-216) with 12 fields missing from onboarding. Divergent defaults (28 km vs 40 km).

**What needs to happen:** A single function that accepts all inputs, fills defaults, validates, and emits `CreateGoalRequest`.

**Risks:**
- Onboarding doesn't provide `ridesPerWeek`, `swimsPerWeek`, `strengthPerWeek`, `swimDay`, `restDays`, `sport`, `backyardLoopDistM`, `targetLaps`, triathlon custom distances, or `athleteCssOverride`/`athleteBikeSpeedOverride`. The "superset input model" means onboarding will need to either: (a) start collecting these fields, or (b) the generator must have sensible defaults for all of them. The plan says "shared validation + defaults module" but doesn't specify which defaults win.
- Onboarding provides `calibrationTime`, `calibrationDistance`, `calibrationFactor` — the wizard doesn't. The generator must handle both cases.
- The wizard has triathlon-specific logic (sport selection, swim/bike/run distances) that onboarding doesn't expose at all. If the unified generator is used for onboarding, triathlon plans created via onboarding will be incomplete unless onboarding adds triathlon support.

**Production verdict: FEASIBLE but the plan must specify: (1) which defaults for each missing field, (2) whether onboarding gains triathlon support, (3) how calibration fields flow from onboarding to the generator.**

### Step 4: Algorithm Consolidation — WILL WORK, straightforward

**What exists:** `vdot.dart` and `vdot_calculator.dart` have identical `calculateVdot()` functions. `goal_projection.dart` and `vdot_calculator.dart` have duplicate `calculateProjectedGoalTime()`, `calculateProgressionCoefficient()`, and `calculateShapePenalty()` functions.

**What needs to happen:** Keep one copy, delete the other, update all call sites.

**Risks:**
- `vdot.dart:estimateTime()` uses Newton-Raphson iteration. `vdot_calculator.dart:_predictRaceTimeBinarySearch()` uses binary search. These are **different algorithms** that may produce slightly different results. The plan must pick one and verify the output matches within tolerance.
- `vdot_calculator.dart` has additional functions (`calculateTrainingPaces`, `velocityAtPercentVO2max`, `velocityToPace`, `calculateDefaultMaxLongRunKm`, `calculateHRZonesFromLTHR`) that `vdot.dart` doesn't have. These can't just be deleted — they need to be kept somewhere.
- 181 lines of VDOT tests exist in `vdot_test.dart` but they test `vdot.dart` functions. If `vdot_calculator.dart` is deleted, its unique functions need test coverage too.
- The `training_paces_card.dart` widget (lines 156-169) has inline copies of `velocityAtPercentVO2max` and `velocityToPace` — a third duplication site the plan doesn't mention.

**Production verdict: FEASIBLE. The plan needs to specify which algorithm wins (Newton-Raphson vs binary search) and account for the third duplication site in `training_paces_card.dart`.**

### Step 5: Validation — WILL WORK, straightforward

**What exists:** Wizard validates only name and dates. Onboarding validates nothing.

**What needs to happen:** Add validation for all required fields in both flows.

**Risks:**
- Low risk. This is purely additive — adding validation checks before API calls.
- The plan correctly identifies the gap. Implementation just needs to enumerate required fields per race type.
- One consideration: onboarding has no `restDays` field (not collected). Validation must either: (a) require rest days to be added to onboarding, or (b) use a sensible default and skip validation for onboarding.

**Production verdict: FEASIBLE and low-risk. The plan should specify required fields per race type and per flow.**

### Step 6: Cache Correctness — WILL WORK, surgical fix

**What exists:** `updateWorkout()` and `reorderWorkout()` in `goal_repository_impl.dart` don't invalidate cache. 15-minute stale cache window.

**What needs to happen:** Add `cacheDatasource.remove()` calls to both methods.

**Risks:**
- Low risk. The fix is 2-4 lines of code (copy the pattern from `updateGoal()` at line 108-109).
- Must also invalidate `goalDetailProvider` after mark-complete in `plan_screen.dart` line 655.
- The `_refreshInBackground()` method at line 305 has a silent `catch (_) {}` — this must be fixed too or the background refresh could fail silently after cache invalidation.

**Production verdict: FEASIBLE and low-risk. The plan should also mention fixing the silent `catch (_) {}` in `_refreshInBackground`.**

### Step 7: Error Handling — WILL WORK, additive

**What exists:** 3 silent error handlers in `plan_screen.dart` (reorder line 484, mark-complete line 658, edit workout line 685). 1 silent handler in `onboarding_wizard_screen.dart` (line 365). Good pattern exists at `goal_detail_screen.dart:891` (rollback + snackbar).

**What needs to happen:** Replace `logger.error()` with snackbar + rollback.

**Risks:**
- Low risk. Follow the existing pattern from `goal_detail_screen.dart:891`.
- No error boundary exists, but Flutter's default behavior + Sentry already catches unhandled exceptions. A custom error boundary is nice-to-have, not critical.

**Production verdict: FEASIBLE and low-risk. Follow existing patterns.**

### Step 8: Advanced Editor — SIGNIFICANT NEW WORK, plan is underspecified

**What exists:** No advanced editor. Only a workout-edit bottom sheet (`_EditWorkoutSheet` in `plan_screen.dart:918-1081`).

**What needs to happen:** Build an entirely new screen that can edit plan-level metadata.

**Risks:**
- This is the largest scope item in the plan. The plan says "all plans open in the advanced editor" but doesn't define what the editor looks like or what it can modify.
- The plan says "auto-fill derived metadata" but doesn't define what "derived" means. Phase labels? Week boundaries? VDOT? These are all server-computed.
- No API endpoint exists for updating plan-level metadata (only `UpdateGoalRequest` with 4 fields: name, targetTime, isActive, currentVdot). The server would need new endpoints for editing phases, weekly mileage, race params, etc.
- This step depends on the server team adding update endpoints — the plan doesn't mention this dependency.

**Production verdict: UNDERSPECIFIED. This step requires server API changes that are not in scope for the Flutter client alone. The plan must either: (a) limit the editor to fields that already have update APIs, or (b) coordinate with the server team.**

### Step 9: Migration — WILL WORK, simpler than expected

**What exists:** Plans are server-only. Local storage is just API cache JSON blobs with no versioning.

**What needs to happen:** Add versioning to cache format. On cache miss/hit, check version and transform if needed.

**Risks:**
- Since plans are server-only, "migration" means updating the cache format, not a database migration. Much simpler than a full migration.
- Existing migration infrastructure in `app_database.dart` (version 5) only covers local tables, not the API cache.
- Backfilling "missing phase/week metadata" requires the server to return that data. If the server already returns phase info on `Workout.phase`, no backfill is needed for new plans. For old plans, the server would need to re-compute phases.

**Production verdict: FEASIBLE but simpler than the plan suggests. Most "migration" is just clearing the cache and letting it rebuild from server data.**

### Step 10: Unified Analysis — SIGNIFICANT NEW WORK, plan is underspecified

**What exists:** No plan-specific analysis endpoint. Only a freeform AI chat with no plan context injection.

**What needs to happen:** Build a new analysis route, prompt builder, and UI.

**Risks:**
- This is entirely new functionality. The plan says "one analysis route accepts any goalId" but there's no server endpoint for plan analysis.
- The prompt builder must inject plan metadata (race type, target time, phase structure, weekly mileage) into the AI context. None of this infrastructure exists.
- The plan says "safe defaults and validates required metadata" but doesn't define what metadata is required for analysis to succeed.

**Production verdict: UNDERSPECIFIED. This step requires server API changes and significant new client code. The plan should define: (1) what the analysis endpoint returns, (2) what metadata is required, (3) what happens when metadata is missing.**

### Step 11: Regression Protection — WILL WORK, additive

**What exists:** CI pipeline exists (`flutter-ci.yml`). 49 unit tests. 7 golden tests (none for plan screens). No plan integration tests.

**What needs to happen:** Add plan-flow tests.

**Risks:**
- Low risk. This is purely additive testing.
- The plan's "parity tests comparing legacy outputs with unified outputs" is excellent but requires both generators to run side-by-side during the transition period.
- Golden tests for plan screens would require test data setup for plans with workouts.

**Production verdict: FEASIBLE and low-risk. Should be the first thing implemented, not the last.**

### Step 12: Rollout — BLOCKED, infrastructure doesn't exist

**What exists:** No feature flags. No analytics events. No remote config. Only Sentry for crashes.

**What needs to happen:** Build or integrate a feature flag system.

**Risks:**
- No feature flag infrastructure exists. The plan must either: (a) use Firebase Remote Config (already have Firebase Core), (b) use a third-party SDK (LaunchDarkly, etc.), or (c) build a simple local flag (shared preferences or build-time constant).
- Without analytics, the plan's "monitor plan quality and analysis success rate" cannot be measured. Analytics infrastructure must be added first.
- The plan says "gradual rollout" but with no remote config, gradual rollout requires app store updates.

**Production verdict: BLOCKED until feature flag and analytics infrastructure is added. Recommend using Firebase Remote Config since Firebase Core is already a dependency.**

---

## Overall Assessment: Can This Plan Work in Production?

### Steps That Are Production-Ready (implement as-is)

| Step | Effort | Risk |
|------|--------|------|
| 4. Algorithm Consolidation | Medium | Low |
| 5. Validation | Low | Low |
| 6. Cache Correctness | Low | Low |
| 7. Error Handling | Low | Low |
| 11. Regression Protection | Medium | Low |

### Steps That Need More Design Before Implementation

| Step | Missing Design | Dependency |
|------|---------------|------------|
| 1. Contracts and Units | API field naming (mapper-only vs API-level rename) | Server team alignment |
| 2. Canonical Schema | Write-only field handling, Phase/PlanMeta definition | None |
| 3. Unified Generator | Default values for missing fields, triathlon in onboarding | Steps 1+2 |
| 9. Migration | What metadata needs backfilling | Server team |

### Steps That Are Blocked or Significantly Underspecified

| Step | Blocker |
|------|---------|
| 8. Advanced Editor | No server API for updating plan-level metadata |
| 10. Unified Analysis | No server endpoint, no prompt builder, no UI |
| 12. Rollout | No feature flag or analytics infrastructure |

### Recommended Implementation Order

1. **Phase 0 — Prerequisites** (Week 1-2)
   - Step 12 (partial): Add Firebase Remote Config for feature flags
   - Step 11 (partial): Add test infrastructure for plan flows
   - Step 6: Fix cache invalidation (2-4 lines)
   - Step 7: Fix silent error handlers (follow existing pattern)

2. **Phase 1 — Foundation** (Week 2-4)
   - Step 1: Define unit contracts, rename fields in mappers, add tests
   - Step 4: Consolidate VDOT/projection algorithms
   - Step 5: Add validation to both flows

3. **Phase 2 — Unification** (Week 4-6)
   - Step 2: Define canonical schema with versioning
   - Step 3: Build unified generator with shared defaults

4. **Phase 3 — New Features** (Week 6-10)
   - Step 8: Build advanced editor (requires server API design)
   - Step 9: Migration / cache versioning
   - Step 10: Unified analysis (requires server endpoint)

5. **Phase 4 — Rollout** (Week 10+)
   - Step 12 (full): Gradual rollout with telemetry
   - Remove legacy paths

### Critical Missing Pieces the Plan Must Address

1. **Server API dependency**: Steps 8 and 10 require new server endpoints. The plan must coordinate with the server team or limit scope to what the current API supports.
2. **Triathlon in onboarding**: The unified generator can't produce complete triathlon plans from onboarding unless onboarding gains triathlon support.
3. **Third duplication site**: `training_paces_card.dart:156-169` has inline copies of VDOT functions not mentioned in the consolidation plan.
4. **Silent `_refreshInBackground` catch**: `goal_repository_impl.dart:305` has `catch (_) {}` that will mask cache refresh failures after invalidation fixes.
5. **Write-only fields**: 10 fields in `CreateGoalRequest` are not returned by the server. The canonical schema must decide how to handle these.
6. **Divergent defaults**: Wizard defaults to 28 km/week; onboarding defaults to 40 km/week. The "shared defaults module" must pick one.
7. **Mapper data loss**: `goal_mappers.dart:29-58` drops 3 custom distance fields. Must be fixed before canonical schema work.

---

# Appendix E: Production-Ready Plan — Final Specification

## Workout Field Reference (Server-Generated)

Every workout in a plan has these 16 fields. The server generates ALL of them based on `CreateGoalRequest` inputs. The client can subsequently edit 6 of them via `UpdateWorkoutRequest`.

| Field | Type | Units | Nullable | Default | JSON Key | Server-Gen? | Client-Editable? | Displayed in UI? |
|-------|------|-------|----------|---------|----------|-------------|-------------------|-------------------|
| `id` | `String` | — | No | UUID | `id` | Yes | No | Indirect (nav, keys) |
| `goalId` | `String` | — | No | — | `goalId` | Yes | No | No |
| `scheduledDate` | `DateTime` | ISO 8601 | No | — | `scheduledDate` | Yes | No (reorder API only) | Date section headers |
| `workoutType` | `WorkoutType` | enum (21 values) | No | — | `workoutType` | Yes | Yes | Badge + icon + color |
| `description` | `String` | — | No | `''` | `description` | Yes | Yes | Body text |
| `targetDistance` | `double` | **meters** | No | `0.0` | `targetDistance` | Yes | Yes | Distance row (if >0) |
| `targetPace` | `double` | **sec/km** | No | `0.0` | `targetPace` | Yes | Yes | Pace row (if >0) |
| `targetDuration` | `int` | **seconds** | No | `0` | `targetDuration` | Yes | Yes | Not in plan_screen |
| `isCompleted` | `bool` | — | No | `false` | `isCompleted` | Both | Yes | Icon/badge/strikethrough |
| `completedAt` | `DateTime?` | ISO 8601 | Yes | null | `completedAt` | Server-set | No | No |
| `activityId` | `String?` | — | Yes | null | `activityId` | Server-set | No | No |
| `sport` | `String` | `'RUN'`/`'TRI'` etc. | No | `'RUN'` | `sport` | Yes | No | No |
| `displayDescription` | `String?` | — | Yes | null | **`displayDesc`** | Yes | No | Notifications |
| `intensityZone` | `String?` | — | Yes | null | `intensityZone` | Yes | No | No |
| `phase` | `String?` | `'BASE'`/`'BUILD'`/`'PEAK'`/`'TAPER'` | Yes | null | `phase` | Yes | No | Controls pace precision |
| `targetHrZone` | `int?` | zone 1-5 | Yes | null | `targetHrZone` | Yes | No | No |

**Key units:** distance=meters, pace=seconds/km, duration=seconds. Display converts to km and min:sec.

---

## Regression Risk Summary

| Change | Severity | Regressions? | Mitigation |
|--------|----------|-------------|------------|
| 1. Unit contracts | HIGH | API payload breaks if JSON key changes | Add `@JsonKey(name: 'weeklyMileageGoal')` to preserve contract |
| 2. Algorithm consolidation | HIGH | Race predictions shift if algorithm swapped | Keep both algorithms, don't swap; update imports only |
| 3. Cache invalidation | MEDIUM | None — fixes existing stale-data bug | Add `cacheDatasource.remove()` calls |
| 4. Validation | MEDIUM | Existing wizard test breaks | Update test to fill required fields |
| 5. Error handlers | LOW | Reorder needs rollback | Store pre-reorder state, restore on failure |
| 6. Mapper fix | HIGH | None — fixes data-loss bug | Add 3 missing field mappings |
| 7. Cache versioning | MEDIUM | All cached data invalidated once | Acceptable one-time cost |
| 8. New entities | LOW | None — purely additive | New files only |
| 9. Advanced editor | MEDIUM | Blocked — server API missing | Limit to fields with existing APIs |
| 10. Analysis endpoint | MEDIUM | Blocked — no server endpoint | Build prompt builder, defer to server |
| 11. Tests | LOW | None — purely additive | Write tests first |
| 12. Feature flags | LOW | None — purely additive | SharedPreferences first, Remote Config later |

---

## Production-Ready Step Specifications

### Step 1: Contracts and Units

**Problem:** `weeklyMileageGoal` is km in the UI, multiplied by 1000 before API send, and returned in meters by the server. Field name has no unit suffix. 24 explicit `*1000`/`/1000` conversions across 15 files. Zero unit tests.

**Action:** Rename in domain layer ONLY. Preserve API contract.

**Exact changes:**
- `goal_entities.dart:83`: rename field to `weeklyMileageGoalKm`, update constructor, field, copyWith, ==, hashCode
- `dashboard_entities.dart:637`: rename field to `weeklyMileageGoalMeters`, update all occurrences
- `goal_mappers.dart:36`: `toDomain()` — add explicit `/1000` conversion with comment
- `goal_mappers.dart:68`: `toData()` — add explicit `*1000` conversion with comment
- `dashboard_mappers.dart:203,273`: pass-through (already in meters)
- `goal_setup_wizard.dart:1327`: REMOVE the `*1000` — now done in mapper
- `review_step.dart:200`: REMOVE the `*1000` — now done in mapper
- `goal_projection.dart:56,62,145,152`: field is already treated as km, rename to `weeklyMileageGoalKm`
- `vdot_calculator.dart:204`: rename param
- `goal_models.dart:37` and `dashboard_models.dart:264`: Add `@JsonKey(name: 'weeklyMileageGoal')` to preserve API contract
- Run `dart run build_runner build --delete-conflicting-outputs`
- Update 11 test files

**No regression:** API JSON key stays `weeklyMileageGoal`. Only internal Dart names change.

---

### Step 2: Canonical Schema

**Problem:** 4 Goal-like classes, 2 Workout classes, no `Phase` or `PlanMeta` entity, no schema versioning. 10 write-only fields in `CreateGoalRequest` not returned by server.

**Action:** Add versioning to cache, create Phase/PlanMeta as new files, fix mapper data loss.

**Exact changes:**
- `app_database.dart`: Bump `_currentVersion` to 6, add v5 migration: `ALTER TABLE api_cache ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1`
- `cache_datasource.dart`: Add `schemaVersion` to `set()`/`get()`
- NEW `lib/domain/entities/phase_entities.dart`: `Phase` class with `name`, `startWeek`, `endWeek`, `phaseType`
- NEW `lib/domain/entities/plan_meta_entities.dart`: `PlanMeta` class with plan-level metadata
- `goal_mappers.dart:29-58`: Add `customSwimDistM`, `customBikeDistM`, `customRunDistM` (fix data-loss bug)
- Write-only fields: keep in `CreateGoalRequest` only, do NOT add to `Goal` response model

**No regression:** New entities are additive. Mapper fix corrects existing bug. Cache version migration is non-destructive.

---

### Step 3: Unified Generator

**Problem:** Two separate `CreateGoalRequest` construction sites (wizard `goal_setup_wizard.dart:1321-1361`, onboarding `review_step.dart:194-216`). 12 fields missing from onboarding. Divergent defaults (28 vs 40 km/week).

**Action:** Create shared input builder and defaults module.

**Exact changes:**
- NEW `lib/core/utils/plan_input_builder.dart`: Single function `buildCreateGoalRequest(PlanInputParams)` that:
  - Accepts superset of both wizard and onboarding inputs
  - Applies shared defaults from `race_defaults.dart`
  - Converts units (km -> meters) via the mapper (not inline)
  - Validates all required fields
- NEW `lib/core/utils/plan_defaults.dart`: Shared default constants:
  - `defaultWeeklyMileageKm = 28.0` (from `race_defaults.dart`, VDOT-adjusted)
  - Default scheduling (longRunDay=0, workoutDay=3, swimDay=1, restDays=[1,5])
  - Default phase structure (taper=2, peak=4, build=4)
- `goal_setup_wizard.dart:1321-1361`: Replace manual construction with `buildCreateGoalRequest()`
- `review_step.dart:194-216`: Replace manual construction with `buildCreateGoalRequest()`
- Onboarding missing fields: `ridesPerWeek=0`, `swimsPerWeek=0`, `strengthPerWeek=0`, `swimDay=1`, `restDays=[1,5]`, `sport='RUN'`, `backyardLoopDistM=null`, `targetLaps=null`, triathlon custom distances=null. These become defaults in the builder.
- Calibration fields: only from onboarding (`calibrationTime`, `calibrationDistance`, `calibrationFactor`). Wizard passes null.

**Regression risk:** Onboarding plans may change slightly due to different defaults (was 40 km/week, now VDOT-adjusted from `race_defaults.dart`). Mitigate with feature flag (step 12).

---

### Step 4: Algorithm Consolidation

**Problem:** `vdot.dart` and `vdot_calculator.dart` have identical `calculateVdot()`. Different time prediction algorithms (Newton-Raphson vs binary search). Third duplication in `training_paces_card.dart:156-169`.

**Action:** Keep both algorithms (different precision characteristics), consolidate into one file, eliminate inline copies.

**Exact changes:**
- Expand `vdot.dart` to include ALL public functions from `vdot_calculator.dart`:
  - `calculateVdot` (keep existing, identical)
  - `calculateVdotFromRace` (from vdot_calculator.dart:10-17)
  - `estimateTime` (Newton-Raphson, keep existing) — used by goal_projection.dart
  - `predictRaceTimeSeconds` (binary search, rename from `_predictRaceTimeBinarySearch`, make public) — used by onboarding
  - `velocityAtPercentVO2max`, `velocityToPace`, `calculateTrainingPaces` (from vdot_calculator.dart:58-92)
  - `calculateDefaultMaxLongRunKm`, `calculateHRZonesFromLTHR` (from vdot_calculator.dart:286-328)
  - `raceDistances` map, `TrainingPaces`, `HeartRateZone` classes
- `vdot_calculator.dart`: Convert to a barrel re-export (`export 'vdot.dart'`) for backward compatibility
- `training_paces_card.dart:156-169`: Replace inline copies with imports from `vdot.dart`
- Update 11 import sites (6 from `vdot.dart`, 5 from `vdot_calculator.dart`)

**No regression:** Both algorithms preserved. `vdot_calculator.dart` becomes a re-export so existing imports still work.

---

### Step 5: Validation

**Problem:** Wizard `_validateCurrentStep()` returns `true` for 6/9 steps. Onboarding validates nothing. `restDays`, `weeklyMileageGoal`, race-type fields never validated.

**Action:** Add per-step validation to wizard, add pre-submit validation to onboarding.

**Exact changes:**
- `goal_setup_wizard.dart:98-144` `_validateCurrentStep()`:
  - Step 1 (race type): check `_selectedRaceType != null`
  - Step 3 (target time): check `_targetTimeInSeconds > 0`
  - Step 4 (training volume): check `_weeklyMileageGoal >= 10`
  - Step 6 (scheduling): check `_restDays.isNotEmpty`
  - Step 7 (plan duration): check `effectivePlanWeeks > 0`
  - Step 8 (review): always `true`
  - Backyard-specific: check `_backyardLoopDistM > 0` and `_targetLaps > 0` when race type is backyard
  - Triathlon-specific: check custom distances > 0 when race type is custom triathlon
- `review_step.dart:183-231`: Add pre-submit checks:
  - `goalName` non-empty
  - `raceDate` is future
  - `runsPerWeek > 0`
  - `weeklyMileage > 0`
- `goal_setup_wizard_test.dart`: Update test at line 48 to fill required fields on newly-validated steps

**Regression:** Wizard test breaks. Fix: update test to provide valid inputs per step.

---

### Step 6: Cache Correctness

**Problem:** `updateWorkout()` (line 178) and `reorderWorkout()` (line 198) don't invalidate cache. Stale data for up to 15 minutes.

**Action:** Add cache invalidation to both methods + fix silent background refresh.

**Exact changes:**
- `goal_repository_impl.dart:178-195` `updateWorkout()`:
  - After API success, add: `await cacheDatasource.remove(CacheKeys.goals);` and `await cacheDatasource.remove('${CacheKeys.goalPrefix}${goalId}');`
  - Need to accept `goalId` as parameter (currently only has `workoutId`)
- `goal_repository_impl.dart:198-215` `reorderWorkout()`:
  - After API success, add same cache removals
- `goal_repository_impl.dart:305`: Replace `catch (_) {}` with `catch (e) { logger.warning('[GoalRepo] Background refresh failed: $e'); }`
- `plan_screen.dart:641-658`: After mark-complete, add `ref.invalidate(goalsProvider);` and `ref.invalidate(goalDetailProvider);`

**No regression:** Fixes stale-data bug. The `Goals.reorderWorkout()` provider already calls `refresh()` which will now correctly fetch fresh data instead of stale cache.

---

### Step 7: Error Handling

**Problem:** 3 silent error handlers in `plan_screen.dart` (reorder:484, mark-complete:658, edit:685). 1 in `onboarding_wizard_screen.dart:365`.

**Action:** Add user-facing error feedback + rollback.

**Exact changes:**
- `plan_screen.dart:481-483` reorder failure:
  - Store `originalWorkouts` list before optimistic reorder
  - On catch: `setState(() { allWorkouts = originalWorkouts; });` + `ScaffoldMessenger.of(context).showSnackBar(...)`
- `plan_screen.dart:656-658` mark-complete failure:
  - On catch: `ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to mark workout complete')));`
- `plan_screen.dart:682-685` edit workout failure:
  - On catch: `ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save changes')));`
- `onboarding_wizard_screen.dart:365`:
  - Replace `catch (_) {}` with `catch (e) { logger.error('[Onboarding] Sync failed: $e'); }`

**No regression:** Only affects error paths. `Scaffold` exists at `plan_screen.dart:70`.

---

### Step 8: Advanced Editor

**Problem:** No advanced editor exists. Only a workout-edit bottom sheet (`plan_screen.dart:918-1081`). Server `UpdateGoalRequest` only supports 4 fields.

**Action:** Build advanced editor limited to currently-supported APIs. Flag plan-structure editing as blocked.

**Exact changes:**
- NEW `lib/presentation/screens/plan/plan_editor_screen.dart`: Full-screen editor with:
  - **Editable now** (existing APIs): name, targetTime, isActive (via `UpdateGoalRequest`)
  - **Editable now** (per-workout): workoutType, description, targetDistance, targetPace, targetDuration (via `UpdateWorkoutRequest`)
  - **Read-only** (no API): weeklyMileageGoal, planWeeks, runsPerWeek, phase structure, scheduling, sport
  - Reorder workouts (existing `reorderWorkout` API)
  - Mark complete (existing `updateWorkout` API)
- `plan_screen.dart`: Add "Edit Plan" button that navigates to editor
- `app_router.dart`: Add `/plan/:id/edit` route

**Blocked items (need server API):** Editing weekly mileage, phase structure, scheduling, or sport requires server `UpdateGoalRequest` to accept these fields. Track as separate server-side ticket.

**No regression:** New screen, existing functionality untouched.

---

### Step 9: Migration

**Problem:** Plans are server-only, cached as JSON blobs in `api_cache` table. No schema versioning.

**Action:** Add cache schema versioning, one-time stale cache flush.

**Exact changes:**
- `app_database.dart`: Bump to v6, add v5 migration (`ALTER TABLE api_cache ADD COLUMN schema_version INTEGER`)
- `cache_datasource.dart`: Write `schemaVersion = 2` on all new cache writes
- On app update, `get()` checks version — if version < 2, delete the entry (forces re-fetch from server)
- No server-side migration needed — plans live on the server

**No regression:** Stale cache gets cleared once, fresh data fetched from server. Users see a brief loading state on first launch.

---

### Step 10: Unified Analysis

**Problem:** No plan-specific analysis. Only freeform AI chat with no plan context.

**Action:** Build analysis prompt builder. Defer server endpoint to backend team.

**Exact changes:**
- NEW `lib/core/utils/plan_analysis_builder.dart`: Function that builds analysis prompt from plan data:
  - Injects: race type, target time, weekly mileage, phase structure, completion rate, sport
  - Safe fallbacks: if phase is null, use "Unknown phase"; if target time is null, skip
  - Returns a structured prompt string
- NEW `lib/presentation/providers/plan_analysis_provider.dart`: Provider that calls the chat API with the built prompt
- `chat_screen.dart`: Add "Analyze Plan" as a suggested prompt that triggers the builder
- Server endpoint: use existing `/api/ai/chat` endpoint with enriched prompt (no new endpoint needed)

**No regression:** New provider and utility. Existing chat unchanged.

---

### Step 11: Regression Protection

**Problem:** Zero plan-flow integration tests. Zero golden tests for plan screens. No tests for cache invalidation or mapper completeness.

**Action:** Add comprehensive test coverage.

**Exact changes:**
- NEW `test/unit/plan_input_builder_test.dart`: Test unified generator with both wizard and onboarding inputs
- NEW `test/unit/goal_mappers_test.dart`: Test data->domain mapper includes all fields (especially custom distances)
- NEW `test/unit/cache_invalidation_test.dart`: Test that updateWorkout and reorderWorkout invalidate cache
- NEW `test/unit/unit_contract_test.dart`: Test that weeklyMileageGoal round-trips correctly (km in domain, meters in JSON)
- NEW `test/unit/validation_test.dart`: Test validation for all wizard steps and onboarding pre-submit
- NEW `test/unit/algorithm_parity_test.dart`: Test that both time prediction algorithms agree within 1% tolerance
- NEW `test/golden/plan_screen_test.dart`: Golden test for plan screen
- NEW `test/integration/plan_flow_test.dart`: Integration test: create plan -> view -> edit workout -> mark complete -> reorder
- Update `goal_setup_wizard_test.dart`: Fix broken test after validation changes

**No regression:** All additive.

---

### Step 12: Rollout and Monitoring

**Problem:** No feature flags. No analytics. Only Sentry for crashes. No remote config.

**Action:** Add SharedPreferences-based feature flags. Add Firebase Remote Config for production. Add telemetry events via Sentry.

**Exact changes:**
- NEW `lib/core/services/feature_flags.dart`:
  - `isUnifiedGeneratorEnabled()`: default false, read from SharedPreferences
  - `setUnifiedGeneratorEnabled(bool)`: for dev toggling
- Add `firebase_remote_config: ^5.0.0` to `pubspec.yaml`
- NEW `lib/core/services/remote_config_service.dart`:
  - Initializes Remote Config with defaults
  - `getBool(key)` with SharedPreferences fallback
- Wire into `plan_input_builder.dart`: if feature flag off, use legacy construction path
- Add Sentry breadcrumbs for plan creation, plan edit, analysis trigger
- `goal_providers.dart`: Add `Sentry.addBreadcrumb()` on `createGoal` success/failure

**No regression:** Feature flag defaults to OFF. Legacy behavior unchanged until explicitly enabled.

---

## Implementation Order (Revised)

**Phase 0 — Bug Fixes + Infrastructure (Week 1, no regressions)**
1. Step 6: Cache invalidation (2-4 lines, fixes stale-data bug)
2. Step 7: Error handling (add SnackBars, reorder rollback)
3. Step 11 (partial): Add unit_contract_test, cache_invalidation_test, goal_mappers_test
4. Step 12 (partial): Feature flags (SharedPreferences)
5. Prerequisite: Fix `goal_mappers.dart:29-58` data-loss bug

**Phase 1 — Foundation (Week 2-3)**
6. Step 1: Unit contracts (domain-only rename, @JsonKey preservation)
7. Step 4: Algorithm consolidation (keep both algorithms, merge files)
8. Step 5: Validation (per-step wizard, pre-submit onboarding)
9. Step 2 (partial): Cache schema versioning

**Phase 2 — Unification (Week 4-5)**
10. Step 3: Unified generator (plan_input_builder + plan_defaults)
11. Step 2 (complete): Phase/PlanMeta entities
12. Step 11 (complete): Integration + golden tests

**Phase 3 — New Features (Week 6-8, some items blocked by server)**
13. Step 8: Advanced editor (limited to existing APIs)
14. Step 10: Analysis prompt builder (uses existing chat API)
15. Step 9: Cache migration (version bump)

**Phase 4 — Rollout (Week 9+)**
16. Step 12 (complete): Firebase Remote Config + Sentry breadcrumbs
17. Enable feature flag for unified generator (10% -> 50% -> 100%)
18. Remove legacy construction paths
