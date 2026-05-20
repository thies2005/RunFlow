# Unified Onboarding + Plan Wizard — Implementation-Ready Plan v4

## 1. Audit Summary

### Flutter (Mobile App)

#### Active Flows
- **`/onboarding`** → `FeatureShowcaseScreen` (4-page tutorial carousel: Record, Analytics, AI Food, Plans). No plan creation. Marks `onboarding_completed` = true, redirects to `/login`.
- **`/goals/new`** → `GoalSetupWizard` (3318-line standalone wizard). The real plan creation.

#### Dead / Orphaned Flow
- `OnboardingWizardScreen` — full multi-step wizard (connect, sync, analyze, plan) but never routed to. Dead code with reusable step logic.

#### Flow After Refactor
- **`/onboarding`** → `FeatureShowcaseScreen` (kept!) → then `UnifiedPlanWizard` (all 13 steps)
- **`/goals/new`** → `UnifiedPlanWizard` directly (steps gated by connection state)

### Web App (Next.js)

#### Active Flows — THREE Plan Creation UIs
1. **`/onboarding`** → `OnboardingWizard` (4-step) → `PlanSetupForm` (1072 lines, most features)
2. **`/plan-advanced`** (no active plan) → `PlanLanding` (710 lines, has sub-goals, CSV import)
3. **`/plan-advanced`** (create from existing plan) → `CreatePlanDialog` (367 lines, simplified modal)
4. **Dashboard + `/plan`** → "Create Training Plan" buttons → `/onboarding?step=3`

All three call `POST /api/plans` but with **different fields, different UIs, different capabilities**.

#### No Tutorial Slides
- Web has no feature showcase equivalent. New users go straight to the onboarding wizard.

#### Flow After Refactor — ONE Plan Creation UI
- **`/onboarding`** → `PlanSetupForm` in onboarding mode (steps 1-13)
- **`/plan-advanced`** → `PlanSetupForm` in advanced mode (steps 3-13, with sub-goals + CSV import)
- **Dashboard "Create Plan"** → `/onboarding` (same form)
- **`/plan-generator`** → Kept as-is (public, no auth — out of scope)
- `CreatePlanDialog` → **Deleted**
- `PlanLanding` → **Deleted**
- `OnboardingWizard` → Simplified to just orchestrate steps, uses `PlanSetupForm` for plan config

### Feature Coverage — Cross-Platform Comparison

| Capability | Flutter GoalSetup (active) | Flutter Onboarding (dead) | Web Onboarding (active) | Web Missing |
|---|:---:|:---:|:---:|---|
| Platform connect (Strava/Health) | ❌ | ✅ | ✅ | — |
| Historical data import | ❌ | ✅ | ✅ | — |
| Profile analysis (VDOT/CTL/ATL/TSB) | ❌ | ✅ | ✅ | — |
| Experience level | ❌ | ✅ (dead) | ❌ | Web missing |
| Calibration (recent time → VDOT) | ❌ | ✅ | ✅ (CalibrationSection) | — |
| Heart rate profile | ❌ | ✅ (dead) | ✅ (HeartRateZonesSection) | — |
| Goal name | ✅ | ❌ | ✅ | Flutter onboarding missing |
| Triathlon splits + custom dist | ✅ | ❌ | ✅ (TriathlonGoalTimeRenderer) | Flutter onboarding missing |
| Backyard ultra (loop + laps) | ✅ | ❌ | ❌ | Web missing |
| Timed events (12h/24h) | ✅ | ❌ | ❌ | Web missing |
| Rides/swims/strength per week | ✅ | ❌ | ✅ (PlanVolumeSection) | Flutter onboarding missing |
| Swim day scheduling | ✅ | ❌ | ✅ | Flutter onboarding missing |
| Multi-select rest days | ✅ | ❌ | ✅ | Flutter onboarding missing |
| Race type selection | ✅ | ✅ | ✅ | — |
| Dates (race + plan start) | ✅ | ✅ | ✅ | — |
| Goal time projection | ✅ | ✅ | ✅ | — |
| Training volume | ✅ | ✅ | ✅ | — |
| Training phases | ✅ | ✅ | ✅ | — |
| Day scheduling | ✅ | ✅ | ✅ | — |
| Review & submit | ✅ | ✅ | ✅ | Both platforms must merge all fields |

### Root Problem
**Flutter**: Two plan creation flows — one dead but feature-rich, one active but missing features.
**Web**: Already unified but missing backyard ultra and timed event support in plan creation.
**Cross-platform**: Both platforms hit the same `POST /api/plans` endpoint but with different UI capabilities and field coverage.

---

## 2. Critical Findings

### Finding 0: REGRESSIONS FOUND IN PLAN (Must Fix)

#### Flutter Regressions

**R0a. Router redirect guard blocks `/onboarding/wizard`**
- `app_router.dart:63` uses `state.matchedLocation == '/onboarding'` (exact match, not prefix).
- After FeatureShowcase marks `onboarding_completed=true` and navigates to `/onboarding/wizard`, the guard at lines 74-76 sees `isOnboarding=false` (wrong!) and `!isAuthenticated=true` → redirects to `/login`.
- **FIX**: Change to `state.matchedLocation.startsWith('/onboarding')`. Update guard logic so `/onboarding/wizard` is allowed when `onboarding_completed=true`.

**R0b. FeatureShowcase.markCompleted() called too early**
- Current `_finish()` calls `markCompleted()` then navigates. But in the new flow, if completed=true is set before the wizard runs, the guard blocks re-entry to `/onboarding/*`.
- **FIX**: FeatureShowcase should NOT call `markCompleted()`. Just navigate to `/onboarding/wizard`. The unified wizard calls `markCompleted()` only after successful plan creation.
- **ABANDONMENT ISSUE**: If user abandons wizard mid-way, `onboarding_completed` stays `false` → user sees FeatureShowcase again on next launch. This is annoying UX.
- **PROPER FIX**: Use a **separate** `showcase_completed` flag. FeatureShowcase sets `showcase_completed=true` (not `onboarding_completed`). The redirect guard checks: if `!showcase_completed` → show FeatureShowcase. If `showcase_completed && !onboarding_completed` → go to `/onboarding/wizard` directly (skip showcase). If `onboarding_completed` → normal flow. This requires updating the redirect guard with a second flag check.

**R0c. GoalSetupWizard test breaks CI (8 tests)**
- `goal_setup_wizard_test.dart` imports `GoalSetupWizard` directly. Deleting the class breaks all 8 tests.
- **FIX**: Replace with `UnifiedPlanWizard` tests before deleting GoalSetupWizard.

**R0d. Race type change cross-step side-effects**
- `goal_setup_wizard.dart:1473-1504`: When race type changes (step 1), multiple fields reset: `_isManualMode=false`, `_sliderGoalTimeSeconds=null`, `_hasTargetTime=false`, controllers cleared, defaults recalculated.
- **FIX**: Must preserve this cross-step reset in unified wizard.

**R0e. Mid-onboarding users lose progress**
- Stale SharedPreferences keys (`onboarding_step`, `onboarding_connected_platforms`, `onboarding_sync_status`) become orphaned. Users restart from scratch.
- **FIX**: Add one-time migration in new notifier to clean up old keys. LOW severity.

#### Web Regressions

**R0f. `planSource: 'advanced'` not sent by PlanSetupForm — CRITICAL**
- PlanLanding sends `planSource: 'advanced'` and `creationMode: 'EXPERT_MANUAL'`. PlanSetupForm sends neither.
- Without `planSource: 'advanced'`: plans are **invisible** to `/plan-advanced` (filtered by `planSource=advanced` in page.tsx:14) and **deactivate existing active plans** (`plan-creation.ts:185`: `deactivateExisting: planSource !== 'advanced'`).
- **FIX**: PlanSetupForm must accept and pass through `planSource` and `creationMode` in advanced/modal modes.

**R0g. Sub-goals UI missing from PlanSetupForm — HIGH**
- PlanLanding has full sub-goals creation UI (add/remove sub-goals with name, sport, raceType, raceDate, targetTime).
- PlanSetupForm has ZERO sub-goals support. Backend fully supports sub-goals (`plan-creation.ts:757-834`).
- **FIX**: Add sub-goals section to PlanSetupForm in advanced mode. This is new feature work, not refactoring.

**R0h. NO_RACE sport type missing from PlanSetupForm — HIGH**
- PlanLanding supports `sport: 'NO_RACE'` (training plan without a race). PlanSetupForm always requires a raceType + raceDate.
- PlanSetupForm's TargetRaceSection has no sport selector. Sport is computed as RUN or TRIATHLON only.
- **FIX**: Add sport selector UI to TargetRaceSection (or PlanSetupForm). Add NO_RACE conditional logic (hide race date, show duration weeks).

**R0i. CSV Import shortcut missing — LOW**
- PlanLanding has a CSV import shortcut that creates a blank plan and redirects to editor.
- Editor already has CSV import. Shortcut is nice-to-have, not critical.
- **FIX**: Add CSV import button to PlanSetupForm in advanced mode. LOW priority.

**R0j. CreatePlanDialog is dead code**
- Zero callers found anywhere in the codebase. Safe to delete.
- **FIX**: Just delete it. No regression.

#### Web Regressions (Additional)

**R0k. PlanSetupForm handleSubmit dispatch wrong for advanced mode — CRITICAL**
- `PlanSetupForm.tsx:688-692`: `handleSubmit` only checks `mode === 'onboarding'` vs else. Adding `mode === 'advanced'` without updating this logic causes it to fall into the `else` branch → calls `updateSettingsMutation` (hits `/api/settings/update-vdot` instead of `POST /api/plans`).
- **FIX**: Change to `if (mode === 'onboarding' || mode === 'advanced') { createGoalMutation.mutate() } else { updateSettingsMutation.mutate() }`.

**R0l. Plan name field hidden in advanced mode**
- `TargetRaceSection.tsx:37`: Goal name input only renders when `mode === 'onboarding'`. Advanced mode won't show a plan name field.
- **FIX**: Update TargetRaceSection to also show goal name when `mode === 'advanced'`.

**R0m. onSuccess navigation missing for advanced mode**
- PlanLanding navigates to `/plan-advanced/${planId}` after creation (`PlanLanding.tsx:205-208`).
- PlanSetupForm calls `onSuccess?.()` callback. `page.tsx` must pass `onSuccess` that navigates to the new plan's editor.
- **FIX**: Pass `onSuccess={(planId) => router.push(`/plan-advanced/${planId}`)}` from page.tsx.

**R0n. Validation only runs for onboarding mode**
- `PlanSetupForm.tsx:673-677`: `handleSubmit` only validates when `mode === 'onboarding'`. Advanced mode needs similar validation.
- **FIX**: Update validation to cover `mode === 'advanced'` (plan name, race date when sport !== NO_RACE, etc.).

### Finding 1: Experience Level Is Dead Code (Flutter) (Flutter)
- Collected by dead `OnboardingWizardScreen` but never used for defaults or sent to API.
- Web doesn't have this step at all.
- **Decision**: Add to both platforms. Wire to actual defaults via `adjustDefaultsForExperience()`.

### Finding 2: Heart Rate Profile Is Not Sent to API (Both Platforms) (Both Platforms)
- Flutter: stored in state but never in `CreateGoalRequest` (no HR fields exist in the model).
- Web: `HeartRateZonesSection` exists but only sends `maxHR`/`restingHR` via settings update (`POST /api/settings/update-vdot`), not in plan creation.
- **Decision**: Keep as display-only/local-only on both platforms. Backend ticket for future integration.

### Finding 3: Two Different Request Shapes (Flutter) (Flutter)
- `GoalSetupWizard._submit()` sets sport, backyard, triathlon fields but NOT calibration.
- Dead `ReviewStep._submitPlan()` sets calibration but NOT sport, backyard, triathlon fields.
- Web `PlanSetupForm` sends its own subset via `POST /api/plans`.
- **Risk**: Unified submit must produce ALL 31 fields.
- **Decision**: Merge both into one complete submit.

### Finding 4: Domain Mapper Is Broken (Flutter — Pre-existing Bug)
- `goal_mappers.dart:29-58` missing `startWeeklyMileage`, `customSwimDistM`, `customBikeDistM`, `customRunDistM`.
- `goal_mappers.dart:61-93` missing `startWeeklyMileage`.
- **Decision**: Fix in Phase 1 before wizard work.

### Finding 5: Step Gating Must Use Connection State (Both Platforms)
- A returning user who never connected Strava should still see connect/import steps.
- Web already handles this correctly (step 0 only shows for non-Strava users).
- **Decision**: Gate on actual connection state on both platforms.

### Finding 6: Web Has THREE Plan Creation UIs (see R0f-R0j)
- `PlanSetupForm` (1072 lines) — used in onboarding + settings. Has HR zones, calibration, advanced scheduling.
- `PlanLanding` (710 lines) — used in `/plan-advanced`. Has sub-goals, backyard ultra, CSV import, triathlon time renderer.
- `CreatePlanDialog` (367 lines) — simplified modal from `/plan-advanced`. Missing calibration, phases, scheduling, HR, backyard, sub-goals.
- All three call `POST /api/plans` but with **different fields, different UIs, different capabilities**.
- **Decision**: Unify into one `PlanSetupForm` with mode prop (`onboarding` | `advanced` | `modal`). Add missing features from PlanLanding (sub-goals, backyard, CSV import) to PlanSetupForm. Delete CreatePlanDialog and PlanLanding.

### Finding 6b: ALL Plans Must Be Editable in Advanced Editor (No planSource Filter)
- Currently 26 Prisma `where` clauses across 17 API route files filter by `planSource: 'advanced'`.
- The `/plan-advanced` page only lists plans with `planSource: 'advanced'`.
- Plans created from onboarding have `planSource: 'standard'` and are **invisible** to the advanced editor.
- **Decision**: Remove all `planSource: 'advanced'` filters so any plan can be loaded/edited in the advanced editor.
- **Scope**: 26 where clauses in 17 route files + 3 frontend fetches + 1 React Query key.
- **Critical logic**: `plan-creation.ts:185` has `deactivateExisting: planSource !== 'advanced'`. This means creating a standard plan deactivates all others. After this change, decide: should creating ANY plan deactivate others, or allow coexistence? **Recommended**: Keep the current behavior (new plan deactivates existing) since it matches user expectations. Just remove the filter from READ queries, not the write-time logic.
- **No Prisma migration needed** — `planSource` column stays in DB.

### Finding 7: Web Missing Backyard Ultra + Timed Events in PlanSetupForm
- Web `PlanSetupForm` + `GoalTimeRenderer` don't handle `backyardUltra`, `twelveHour`, `twentyFourHour` race types.
- These race types exist in `RaceType` enum (Prisma + Flutter) but have no web UI.
- **Decision**: Add backyard ultra + timed event support to web `PlanSetupForm`. These are simpler UI additions (loop distance + laps slider for backyard; fixed duration display for timed events + estimated distance/pace).

### Finding 8: No Prism in Repo
- Repo has **Prisma** (ORM), not **Prism** (Stoplight mock server).
- OpenAPI spec exists at `Web/openapi-mobile-v1.yaml` (1339 lines).
- **Decision**: Use OpenAPI spec for contract validation, not Prism.

### Finding 9: No Tests for Flutter Step Widgets
- Zero test files for onboarding step widgets.
- Web has tests at `Web/src/app/api/goals/__tests__/` but not for UI components.
- **Decision**: Write widget tests for unified wizard steps.

---

## 3. Unified Step Flow (Both Platforms)

### Flutter Flow
```
App Install → FeatureShowcaseScreen (tutorial slides) → UnifiedPlanWizard
Create Plan Button → UnifiedPlanWizard
```

### Web Flow
```
Register/Login → UnifiedOnboardingWizard (enriched)
Dashboard "Create Plan" → /onboarding (same wizard)
```

### Step Sequence (Shared Logic, Platform-Specific UI)

| Step | Title | Gating | Flutter Source | Web Source | Notes |
|---|---|---|---|---|---|
| 0 | Tutorial Slides | First app launch only (Flutter) | `FeatureShowcaseScreen` (kept) | N/A | Flutter only. 4-page carousel before wizard. |
| 1 | Connect Platforms | `connectedPlatforms.isEmpty` | `SyncPlatformSelector` widget | `SyncPlatformSelector.tsx` | Both platforms have this component |
| 2 | Import History | Connected && !imported | Onboarding sync logic | OnboardingWizard step 1 | Import range + sync status |
| 3 | Profile Analysis | Always | `_ProfileStatsCard` | `AnalyticsDashboard.tsx` | VDOT, CTL, ATL, TSB, Marathon Shape. Empty-state if no data. |
| 4 | Experience Level | Always | `ExperienceLevelStep` | **New** | Wire to defaults on both platforms |
| 5 | Goal Name + Race Type | Always | Merge both flows | `TargetRaceSection.tsx` | Full race type list including backyard + timed |
| 6 | Dates | Always | `GoalSetupWizard` dates step | `TargetRaceSection.tsx` dates | Race date + plan start |
| 7 | Calibration | Always | `CurrentFitnessStep` | `CalibrationSection.tsx` | Recent race → VDOT + calibrationFactor |
| 8 | Target Time | Always | `GoalSetupWizard` (full) | `GoalTimeRenderer.tsx` + `TriathlonGoalTimeRenderer.tsx` | Must add backyard + timed to web |
| 9 | Training Volume | Always | Merge both | `PlanVolumeSection.tsx` | Runs/rides/swims/strength + mileage |
| 10 | Training Phases | Always | `GoalSetupWizard` | `PlanVolumeSection.tsx` phases | Build / Peak / Taper |
| 11 | Workout Scheduling | Always | `GoalSetupWizard` | `PlanVolumeSection.tsx` scheduling | Long run, quality, swim day, rest days |
| 12 | Heart Rate Profile | Always (skip) | `HeartRateProfileStep` | `HeartRateZonesSection.tsx` | Display-only. Skip button. |
| 13 | Review | Always | Merge both | `PlanSetupForm` review | All 31 fields in summary |

### Step Visibility Rules (Both Platforms)
- **Step 0** (Tutorial): Flutter only. Shown when `onboarding_completed` is false. Tutorial does **not** set completion; it navigates to the wizard. The completion flag is set only after a plan is successfully created in the unified wizard.
- **Steps 1-2**: Shown only when user has no connected platform. "Skip for now" available.
- **Step 3** (Profile): Always shown. Data from analytics API. Empty-state with defaults explanation if no data.
- **Steps 4-13**: Always shown.

### UX Parity Requirements (Must Preserve)
- **Target time UX (Flutter parity):** Keep AI-assisted vs manual toggle, slider + reset-to-projected, and manual HH:MM:SS entry for running and triathlon.
- **Timed events (12h/24h):** Show fixed duration *plus* estimated distance and projected pace when VO2max is available (parity with Flutter timed event step).
- **Triathlon projections:** Surface CSS + bike speed override sources and include those overrides in projections and payload.
- **Start weekly mileage:** Provide start-weekly-mileage slider with analytics-based default and clamp bounds (parity with Flutter’s Training Volume step).
- **HR profile:** Preserve threshold pace inputs and LTHR-derived zone display even if stored locally only.
- **CSV import shortcut:** Advanced mode button should create a blank NO_RACE advanced plan (durationWeeks=12, planSource=advanced) and navigate to editor.

---

## 4. Data Model Consolidation

### CreateGoalRequest — Full Field Inventory (31 fields)

| # | Field | Type | Required/Default | Flutter GoalSetup | Flutter Onboarding | Web PlanSetup | Unified Must Send |
|---|-------|------|-------------------|:---:|:---:|:---:|:---:|
| 1 | name | String | required | ✅ | ✅ | ✅ | ✅ |
| 2 | raceType | RaceType | required | ✅ | ✅ | ✅ | ✅ |
| 3 | raceDate | DateTime | required | ✅ | ✅ | ✅ | ✅ |
| 4 | planStartDate | DateTime? | optional | ✅ | ✅ | ✅ | ✅ |
| 5 | targetTime | int? | optional | ✅ | ✅ | ✅ | ✅ |
| 6 | weeklyMileageGoal | double? | optional | ✅ | ✅ | ✅ | ✅ |
| 7 | startWeeklyMileage | double? | optional | ✅ | ❌ | ✅ | ✅ |
| 8 | planWeeks | int | @Default(12) | ✅ | ✅ | ✅ | ✅ |
| 9 | runsPerWeek | int | @Default(4) | ✅ | ✅ | ✅ | ✅ |
| 10 | ridesPerWeek | int | @Default(0) | ✅ | ✅ | ✅ | ✅ |
| 11 | swimsPerWeek | int | @Default(0) | ✅ | ✅ | ✅ | ✅ |
| 12 | strengthPerWeek | int | @Default(0) | ✅ | ✅ | ✅ | ✅ |
| 13 | taperWeeks | int | @Default(2) | ✅ | ✅ | ✅ | ✅ |
| 14 | peakWeeks | int | @Default(4) | ✅ | ✅ | ✅ | ✅ |
| 15 | buildWeeks | int | @Default(4) | ✅ | ✅ | ✅ | ✅ |
| 16 | maxLongRunKm | double? | optional | ✅ | ✅ | ✅ | ✅ |
| 17 | longRunDay | int | @Default(0) | ✅ | ✅ | ✅ | ✅ |
| 18 | workoutDay | int | @Default(3) | ✅ | ✅ | ✅ | ✅ |
| 19 | swimDay | int | @Default(1) | ✅ | ❌ | ✅ | ✅ |
| 20 | restDays | List<int>? | optional | ✅ | ✅ | ✅ | ✅ |
| 21 | calibrationTime | int? | optional | ❌ | ✅ | ✅ | ✅ |
| 22 | calibrationDistance | String? | optional | ❌ | ✅ | ✅ | ✅ |
| 23 | calibrationFactor | double? | optional | ❌ | ✅ | ✅ | ✅ |
| 24 | backyardLoopDistM | double? | optional | ✅ (backyard) | ❌ | ❌ | ✅ (backyard) |
| 25 | targetLaps | int? | optional | ✅ (backyard) | ❌ | ❌ | ✅ (backyard) |
| 26 | sport | String? | optional | ✅ | ❌ | ✅ | ✅ |
| 27 | athleteCssOverride | double? | optional | ✅ (tri) | ❌ | ✅ (tri) | ✅ (tri) |
| 28 | athleteBikeSpeedOverride | double? | optional | ✅ (tri) | ❌ | ✅ (tri) | ✅ (tri) |
| 29 | customSwimDistM | double? | optional | ✅ (customTri) | ❌ | ✅ (customTri) | ✅ (customTri) |
| 30 | customBikeDistM | double? | optional | ✅ (customTri) | ❌ | ✅ (customTri) | ✅ (customTri) |
| 31 | customRunDistM | double? | optional | ✅ (customTri) | ❌ | ✅ (customTri) | ✅ (customTri) |

### Pre-existing Bug: Flutter Domain Mapper Fix
- `goal_mappers.dart:29-58` (`toDomain`): Add `startWeeklyMileage`, `customSwimDistM`, `customBikeDistM`, `customRunDistM`.
- `goal_mappers.dart:61-93` (`toData`): Add `startWeeklyMileage`.

### Experience Level → Defaults Wiring (New — Both Platforms)
- Create `adjustDefaultsForExperience()` on both platforms.
- Apply experience adjustment first (coarse), then VDOT adjustment (fine).
- Beginner: lower volume/frequency. Advanced: higher defaults.

### HR Profile — Local Only (Both Platforms)
- HR fields stored locally only. NOT added to `CreateGoalRequest`.
- HR zones computed and displayed for user reference.
- Backend ticket for future API integration.

---

## 5. Routing & Flow Changes

### Flutter
| Route | Before | After |
|---|---|---|
| `/onboarding` | `FeatureShowcaseScreen` | `FeatureShowcaseScreen` → on complete → `UnifiedPlanWizard` |
| `/goals/new` | `GoalSetupWizard` | `UnifiedPlanWizard` |

- `FeatureShowcaseScreen` stays. After tutorial completes (`markCompleted()` + `context.go`), instead of going to `/login`, it navigates to the wizard. The onboarding redirect guard still uses `'onboarding_completed'` flag.
- Actually: The guard redirects unauthenticated users. So the flow is: FeatureShowcase → markCompleted → `/login` → after auth → auto-redirect to wizard (since no active goal exists, web's mobile-layout check applies). **OR** FeatureShowcase → markCompleted → navigate directly to wizard within the same screen. **Simpler approach**: FeatureShowcaseScreen's `_finish()` calls `markCompleted()` then navigates to a new route like `/onboarding/wizard` or just replaces the screen with the wizard inline.

**Decision**: Keep `FeatureShowcaseScreen` as-is. Add a new route `/onboarding/wizard` that renders `UnifiedPlanWizard`. After showcase completes, `_finish()` navigates to `/onboarding/wizard` instead of `/login`. The redirect guard sees `onboarding_completed=true` and doesn't force back to showcase. After wizard completes, navigate to `/login` (if not authenticated) or `/dashboard`.

### Web
| Route | Before | After |
|---|---|---|
| `/onboarding` | `OnboardingWizard` (4 steps) → `PlanSetupForm` | Same route, enriched `PlanSetupForm` with experience level + backyard + timed + sub-goals |
| `/plan-advanced` (no plan) | `PlanLanding` (710 lines) | `PlanSetupForm` in `advanced` mode (full-page) |
| `/plan-advanced` (create new) | `CreatePlanDialog` (modal) | `PlanSetupForm` in `modal` mode |
| Dashboard "Create Plan" | `/onboarding?step=3` | Same URL, same `PlanSetupForm` |
| `/plan-generator` | Public generator | No change (out of scope) |

**Files to delete:**
- `Web/src/app/plan-advanced/components/CreatePlanDialog.tsx` — replaced by PlanSetupForm in modal mode
- `Web/src/app/plan-advanced/components/PlanLanding.tsx` — replaced by PlanSetupForm in advanced mode

**PlanSetupForm mode prop:**
- `mode="onboarding"` — full wizard with sync/import/analyze steps, "Skip for now" button
- `mode="advanced"` — full-page, includes sub-goals + CSV import, sends `planSource: 'advanced'`
- `mode="modal"` — compact modal view for quick creation from plan-advanced
- `mode="settings"` — existing behavior (update existing plan via `POST /api/settings/update-vdot`)

**Features to add to PlanSetupForm from PlanLanding:**
- Sub-goals section (add/remove sub-goals inline)
- CSV import button
- `planSource` + `creationMode` props for advanced mode

### Platform Connection State (Both)
- **Flutter**: Read from `onboardingProvider.connectedPlatforms` or server-side connection flag.
- **Web**: Already checks `session?.user?.stravaConnected` in `OnboardingWizard`.

---

## 6. Scenario Matrix (Must Pass — Both Platforms)

| # | Scenario | Platform | Entry | Connected | Analytics | Expected Steps |
|---|---|---|---|:---:|:---:|---|
| 1 | New user, first launch | Flutter | /onboarding | ❌ | ❌ | Tutorial → 1-13 |
| 2 | New user, connects + imports | Flutter | /onboarding | ✅ | ✅ | Tutorial → 1-13 |
| 3 | Returning user, connected | Flutter | /goals/new | ✅ | ✅ | 3-13 |
| 4 | Returning user, not connected | Flutter | /goals/new | ❌ | ❌ | 1-13 |
| 5 | Returning user, no analytics | Flutter | /goals/new | ✅ | ❌ | 3-13 (empty-state) |
| 6 | New web user (email signup) | Web | /onboarding | ❌ | ❌ | 1-13 |
| 7 | New web user (Strava) | Web | /onboarding | ✅ | — | 2-13 (skips step 1) |
| 8 | Web returning, no active plan | Web | /onboarding | ✅ | ✅ | 3-13 |
| 8b | Web plan-advanced, create plan | Web | /plan-advanced | ✅ | ✅ | PlanSetupForm (advanced mode) |
| 8c | Web plan-advanced, modal create | Web | /plan-advanced | ✅ | ✅ | PlanSetupForm (modal mode) |
| 9 | Triathlon race | Both | either | — | — | Steps show splits |
| 10 | Custom triathlon | Both | either | — | — | Custom distance fields |
| 11 | Backyard ultra | Both | either | — | — | Loop distance + target laps |
| 12 | Timed event (12h/24h) | Both | either | — | — | Fixed duration display |
| 13 | Skip HR profile | Both | either | — | — | Age-estimated defaults |
| 14 | Deep link | Both | direct URL | — | — | Route resolves correctly |

---

## 7. Multi-Phase Execution Plan

### Phase 0 — Preparation ✅
- [x] Audit both platforms (this document)
- [x] Lock step list and data contract (31 fields)
- [x] Document migration map
- [x] Define gating rules and scenario matrix
- [x] Identify pre-existing bugs
- **Gate**: User approves → Phase 1

### Phase 1 — State + Data Contract (Gate: Static Review)
**Flutter:**
- [ ] Fix domain mapper bug (`goal_mappers.dart` — add missing fields)
- [ ] Create `PlanWizardState` + `PlanWizardNotifier` (Riverpod) with all 31+ fields
- [ ] Wire experience level to defaults (`adjustDefaultsForExperience()`)
- [ ] Define unified `_submit()` producing complete `CreateGoalRequest`
- [ ] Add migration cleanup for old onboarding prefs (`onboarding_step`, `onboarding_connected_platforms`, `onboarding_sync_status`)

**Web:**
- [ ] Verify `PlanSetupForm` sends all 31 fields (check what's missing)
- [ ] Add experience level to form state
- [ ] Wire experience level to defaults
- [ ] Add `mode` prop to `PlanSetupForm` (`onboarding` | `advanced` | `modal` | `settings`)
- [ ] Add `planSource` + `creationMode` props for advanced/modal modes
- [ ] Remove `planSource: 'advanced'` filter from 26 Prisma where clauses in 17 API route files under `Web/src/app/api/plan-advanced/` (keep write-time planSource in plan-creation.ts:185)
- [ ] Update `plan-advanced/page.tsx` fetch to drop `planSource=advanced` (list all plans)
- [ ] Update `plan-advanced/layout.tsx` fetch to drop `planSource=advanced`
- [ ] Add sub-goals section from `PlanLanding` to `PlanSetupForm`
- [ ] Add CSV import button from `PlanLanding` to `PlanSetupForm` (advanced mode only)
- [ ] Add NO_RACE sport selector + duration weeks support to `PlanSetupForm` (advanced + modal)
- [ ] Add `startWeeklyMileage` slider + analytics default to `PlanSetupForm`

**Tests:**
- [ ] Flutter: unit tests for state model + submit logic
- [ ] Web: API contract test for `POST /api/plans` payload shape

**Review Agent A Gate**: State completeness vs. field inventory. Submit produces all 31 fields on both platforms.
**Gate commands**: `flutter analyze` + `flutter test` + `cd Web && npm test`

### Phase 2 — Wizard Shell + Routing (Gate: UI Review)
**Flutter:**
- [ ] Create `UnifiedPlanWizard` skeleton (stepper, progress bar, step registration)
- [ ] Implement step visibility gating (connection state, analytics availability)
- [ ] Add `/onboarding/wizard` route → `UnifiedPlanWizard`
- [ ] Update `/goals/new` route → `UnifiedPlanWizard`
- [ ] Update `FeatureShowcaseScreen._finish()` → set `showcase_completed=true` (new flag), navigate to `/onboarding/wizard` instead of `/login` (do NOT set `onboarding_completed`)
- [ ] Update redirect guard: use `.startsWith('/onboarding')` and check `showcase_completed` to skip showcase on re-launch

**Web:**
- [ ] Enrich `OnboardingWizard` with experience level step
- [ ] Update step count/progress indicator
- [ ] Verify routing still works (no route changes needed — same `/onboarding` path)
- [ ] Update `/plan-advanced/page.tsx` to render `PlanSetupForm` (advanced mode) instead of `PlanLanding`, with `onSuccess` navigating to `/plan-advanced/${planId}`
- [ ] Fix `PlanSetupForm.handleSubmit` dispatch: `mode === 'advanced'` must call `createGoalMutation`, not `updateSettingsMutation` (R0k)
- [ ] Fix `TargetRaceSection` to show goal name for advanced mode (R0l)
- [ ] Fix `PlanSetupForm` validation to cover advanced mode (R0n)

**Review Agent B Gate**: Step visibility rules correct. Tutorial slides preserved on Flutter. Routing works on both platforms.
**Gate commands**: `flutter analyze` + `flutter test` + `cd Web && npx tsc --noEmit`

### Phase 3 — Step Integration (Gate: Behavior Review)
**Flutter (port all 13 steps):**
- [ ] Step 1: Connect Platforms (`SyncPlatformSelector` reuse)
- [ ] Step 2: Import History (sync logic)
- [ ] Step 3: Profile Analysis (`_ProfileStatsCard` + empty-state)
- [ ] Step 4: Experience Level (`ExperienceLevelStep`, wired to defaults)
- [ ] Step 5: Goal Name + Race Type (merged)
- [ ] Step 6: Dates
- [ ] Step 7: Calibration (`CurrentFitnessStep`)
- [ ] Step 8: Target Time (running + triathlon + backyard + timed)
- [ ] Step 9: Training Volume (with rides/swims/strength)
- [ ] Step 10: Training Phases
- [ ] Step 11: Workout Scheduling (with swim day, multi-select rest days)
- [ ] Step 12: Heart Rate Profile (with skip button)
- [ ] Step 13: Review (all 31 fields)

**Web (enrich existing components):**
- [ ] Add experience level step to `OnboardingWizard`
- [ ] Add backyard ultra support to `GoalTimeRenderer` (loop distance + target laps)
- [ ] Add timed event support to `GoalTimeRenderer` (fixed duration display)
- [ ] Add timed event estimated distance + projected pace (VO2max) display
- [ ] Ensure calibration sends `calibrationTime`/`calibrationDistance`/`calibrationFactor`
- [ ] Verify `PlanSetupForm` submit includes all 31 fields
- [ ] Test `PlanSetupForm` in advanced mode (sub-goals, CSV import, planSource)
- [ ] Test `PlanSetupForm` in modal mode (compact, quick creation)

**Tests:**
- [ ] Flutter: widget tests for each step
- [ ] Web: component tests for new race type UIs

**Review Agent C Gate**: All race types work on both platforms. Skip HR works. Calibration sends to API.
**Gate commands**: `flutter analyze` + `flutter test` + `cd Web && npm test`

### Phase 4 — Cleanup + Migration (Gate: Migration Review)
**Flutter:**
- [ ] Remove `OnboardingWizardScreen` (dead code)
- [ ] Remove `GoalSetupWizard` (replaced by unified wizard)
- [ ] Remove `OnboardingState` / `OnboardingNotifier` (`onboarding_providers.dart`)
- [ ] Remove old step imports
- [ ] Keep `FeatureShowcaseScreen` (it's still used!)
- [ ] Verify no orphaned routes or dead imports

**Web:**
- [ ] Remove `CreatePlanDialog.tsx` (replaced by PlanSetupForm modal mode)
- [ ] Remove `PlanLanding.tsx` (replaced by PlanSetupForm advanced mode)
- [ ] Remove any dead code from old `OnboardingWizard` if replaced
- [ ] Verify no broken imports

**Review Agent D Gate**: Dead code scan returns zero hits. Tutorial slides still work on Flutter.
**Gate commands**: `flutter analyze` + `flutter test` + `cd Web && npx tsc --noEmit && npm test`

### Phase 5 — Verification (Gate: Quality Check)
- [ ] `flutter analyze` — zero errors
- [ ] `flutter test` — zero failures
- [ ] `cd Web && npm run lint && npx tsc --noEmit && npm test` — all pass
- [ ] Validate `CreateGoalRequest.toJson()` against OpenAPI spec
- [ ] Validate web `POST /api/plans` payload against OpenAPI spec
- [ ] Flutter: `flutter build apk --release --dart-define=STRAVA_CLIENT_ID=193995`
- [ ] Web: `cd Web && npm run build` — successful build
- **Review Agent E Gate**: All quality checks green on both platforms.

---

## 8. Review Agents

### Agent A — State & Data Contract Reviewer
- Validate state models have all 31 fields (both platforms).
- Validate submit produces complete `CreateGoalRequest`.
- Validate Flutter domain mapper fix.

### Agent B — UX & Step Logic Reviewer
- Validate step visibility rules against scenario matrix (both platforms).
- Validate Flutter tutorial slides still show before wizard.
- Validate routing guards on both platforms.
- Validate modal vs full-page UX parity for plan-advanced (advanced vs modal mode).
- Validate onboarding stepper remains for new users (web onboarding wizard wrapper).

### Agent C — Advanced Race Logic Reviewer
- Validate triathlon + custom distances + CSS/bike overrides (both platforms).
- Validate backyard ultra (both platforms — new on web).
- Validate timed events (both platforms — new on web).
- Validate calibration sends to API (both platforms).

### Agent D — Migration & Cleanup Reviewer
- Validate dead code removed with no orphaned refs (both platforms).
- Validate `FeatureShowcaseScreen` still works (Flutter).
- Validate web components still render correctly.

### Agent E — Contract & QA Reviewer
- Validate payloads match OpenAPI spec (both platforms).
- Run all analyze/test/lint commands.
- Validate builds succeed (Flutter APK + Web).

---

## 9. Quality Gates Summary

| Phase | Gate | Flutter Commands | Web Commands | Must Pass |
|---|---|---|---|---|
| 0 | Plan Review | N/A | N/A | User approves |
| 1 | Static Review | `flutter analyze` + `flutter test` | `npm test` | Zero errors/failures |
| 2 | UI Review | `flutter analyze` + `flutter test` | `tsc --noEmit` | Zero errors |
| 3 | Behavior Review | `flutter analyze` + `flutter test` | `npm test` | Zero errors/failures |
| 4 | Migration Review | `flutter analyze` + `flutter test` + dead scan | `tsc --noEmit` + `npm test` | All clean |
| 5 | Quality Check | `flutter analyze` + `flutter test` + APK build | `lint` + `tsc` + `test` + `build` | All green |

---

## 10. Acceptance Criteria

**Both Platforms:**
- All race types work: running, triathlon (sprint-custom), backyard ultra, timed events (12h/24h).
- Experience level is wired to defaults (not dead code).
- HR profile is display-only/local-only.
- All 31 `CreateGoalRequest` fields populated correctly.
- `POST /api/plans` payload matches OpenAPI spec.

**Flutter:**
- `FeatureShowcaseScreen` (tutorial slides) still shows on first app launch.
- After tutorial, user proceeds to `UnifiedPlanWizard` (not `/login`).
- `/goals/new` renders `UnifiedPlanWizard` with connection-state gating.
- Dead code removed (`OnboardingWizardScreen`, `GoalSetupWizard`, old providers).
- `flutter analyze` + `flutter test` pass. APK builds.

**Web:**
- `/onboarding` renders enriched wizard with experience level + backyard + timed events.
- `/plan-advanced` uses `PlanSetupForm` (not separate PlanLanding/CreatePlanDialog).
- Backyard ultra and timed events have proper UI in `PlanSetupForm`.
- `PlanSetupForm` works in all modes: onboarding, advanced, modal, settings.
- `CreatePlanDialog.tsx` and `PlanLanding.tsx` are deleted.
- `npm run lint` + `tsc --noEmit` + `npm test` pass. Web builds.

---

## 11. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Flutter tutorial flow breakage | Keep `FeatureShowcaseScreen` untouched. Use separate `showcase_completed` flag. `onboarding_completed` only set after plan creation. |
| Showcase re-shown on wizard abandonment (R0b) | Separate `showcase_completed` flag. Guard skips showcase if shown before, goes straight to wizard. |
| Router redirect blocks /onboarding/wizard (R0a) | Change `== '/onboarding'` to `.startsWith('/onboarding')`. Update guard logic for new flag. |
| Two divergent submit flows merge incorrectly | 31-field inventory table checked line-by-line in both platforms' submit code |
| Advanced race types regress (Flutter) | Dedicated test cases for each race type |
| Race type change cross-step reset lost (R0d) | Preserve exact reset logic from GoalSetupWizard:1473-1504 |
| Domain mapper bug causes data loss | Fix in Phase 1 before wizard work |
| Web `planSource` missing breaks /plan-advanced (R0f) | Pass `planSource` via mode prop + remove planSource filters from all 26 read queries so ALL plans are editable |
| Web sub-goals regression (R0g) | Add sub-goals section to PlanSetupForm in advanced mode before deleting PlanLanding |
| Web NO_RACE regression (R0h) | Add sport selector to TargetRaceSection + NO_RACE conditional logic |
| Web + Flutter out of sync on fields | Both validated against same OpenAPI spec in Phase 5 |
| Experience level defaults feel wrong | Define clear brackets; VDOT override still applies as fine-tuning |
| Cross-platform scope creep | `/plan-generator` and `/plan-advanced/[goalId]` editor explicitly out of scope |
| Web CreatePlanDialog/PlanLanding divergence | Delete both. Single `PlanSetupForm` with mode prop replaces all three |
| Web handleSubmit wrong endpoint for advanced (R0k) | Fix dispatch: `if (onboarding || advanced) createGoal else updateSettings` |
| Web plan name hidden in advanced mode (R0l) | Update TargetRaceSection to show name for advanced mode |
| Web onSuccess navigation missing (R0m) | Pass `onSuccess` from page.tsx that navigates to `/plan-advanced/${planId}` |
| Web validation missing for advanced (R0n) | Extend validation to cover advanced mode |
| GoalSetupWizard test breaks CI (R0c) | Replace test file before deleting GoalSetupWizard |

---

## 12. Out of Scope

- **`/plan-generator`** (Web): Public plan generator — completely separate flow, no auth. Not touched.
- **`/plan-advanced/[goalId]`** (Web): The premium drag-and-drop **editor UI components** (Calendar, Editor, Toolbar, MassEdit, etc.) are not touched. Only the planSource filter on the API routes is removed so any plan can be loaded.
- **Backend API**: No endpoint changes, no Prisma migration, no new fields.
- **Backend AI/plan generation logic**: No changes to `plan-creation.ts` or workout generation.

---

## 13. Key File Reference

### Flutter
| Artifact | File | Key Lines |
|---|---|---|
| FeatureShowcaseScreen (kept) | `flutter/lib/presentation/screens/onboarding/feature_showcase_screen.dart` | 1-294 |
| Freezed CreateGoalRequest | `flutter/lib/data/models/goal_models.dart` | 29-68 |
| Domain CreateGoalRequest | `flutter/lib/domain/entities/goal_entities.dart` | 44-249 |
| Domain mapper (broken) | `flutter/lib/data/mappers/goal_mappers.dart` | 29-93 |
| GoalSetupWizard (to replace) | `flutter/lib/presentation/screens/goals/goal_setup_wizard.dart` | 1-3318 |
| OnboardingWizardScreen (dead, to remove) | `flutter/lib/presentation/screens/onboarding/onboarding_wizard_screen.dart` | 1-~900 |
| Onboarding step widgets | `flutter/lib/presentation/screens/onboarding/steps/*.dart` | 8 files |
| Router config | `flutter/lib/presentation/router/app_router.dart` | 53-102, 241-245 |
| OnboardingState | `flutter/lib/presentation/providers/onboarding_providers.dart` | 243-409 |
| Analytics stats provider | `flutter/lib/presentation/providers/analytics_providers.dart` | 21-51 |
| VDOT calculation | `flutter/lib/core/utils/vdot.dart` | 3-58 |
| Race defaults | `flutter/lib/core/utils/race_defaults.dart` | 72-132 |
| Triathlon estimator | `flutter/lib/core/utils/triathlon_estimator.dart` | 138-263 |
| Athlete defaults | `flutter/lib/core/utils/athlete_defaults.dart` | 33-103 |
| Existing tests | `flutter/test/widget/goal_setup_wizard_test.dart`, `flutter/test/unit/goal_*.dart` | ~138 tests |
| CI workflow | `.github/workflows/flutter-ci.yml` | test + build-beta |

### Web
| Artifact | File | Key Lines |
|---|---|---|
| OnboardingWizard (to enrich) | `Web/src/components/OnboardingWizard.tsx` | 1-244 |
| PlanSetupForm (to enrich — THE one form) | `Web/src/components/PlanSetupForm.tsx` | 1-1072 |
| CreatePlanDialog (to delete) | `Web/src/app/plan-advanced/components/CreatePlanDialog.tsx` | 1-367 |
| PlanLanding (to delete) | `Web/src/app/plan-advanced/components/PlanLanding.tsx` | 1-710 |
| TargetRaceSection | `Web/src/components/setup/TargetRaceSection.tsx` | full |
| CalibrationSection | `Web/src/components/setup/CalibrationSection.tsx` | full |
| GoalTimeRenderer | `Web/src/components/setup/GoalTimeRenderer.tsx` | full |
| TriathlonGoalTimeRenderer | `Web/src/components/setup/TriathlonGoalTimeRenderer.tsx` | full |
| PlanVolumeSection | `Web/src/components/setup/PlanVolumeSection.tsx` | full |
| HeartRateZonesSection | `Web/src/components/setup/HeartRateZonesSection.tsx` | full |
| Web types | `Web/src/lib/types.ts` | 1-405 |
| Plan creation service | `Web/src/lib/services/plan-creation.ts` | full |
| Validation schemas | `Web/src/lib/validation/schemas.ts` | full |
| Onboarding page | `Web/src/app/onboarding/page.tsx` | 1-35 |
| Mobile layout redirect | `Web/src/app/mobile-layout.tsx` | 328-334 |
| API goals route | `Web/src/app/api/plans/route.ts` | full |
| API goals tests | `Web/src/app/api/goals/__tests__/` | test files |
| OpenAPI spec | `Web/openapi-mobile-v1.yaml` | 1-1339 |
| Prisma schema | `Web/prisma/schema.prisma` | 1-1275 |
| Web CI | `.github/workflows/ci.yml` | full |
