# RunFlow Stabilization Plan — Agent Executable

> **Audience:** `@general` agents in OpenCode  
> **Source of truth:** `audit_review.md` + `audit17.5.md`  
> **Rule:** Each phase MUST pass its review gate before proceeding to the next phase.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    PHASE 0 (P0)                      │
│              Critical Production Fixes               │
│  Sub-agents: 0A, 0B, 0C, 0D                         │
│  ──────────── REVIEW GATE 0 ────────────             │
├──────────────────────────────────────────────────────┤
│                    PHASE 1 (P1)                      │
│                Foundation & Safety                   │
│  Sub-agents: 1A, 1B, 1C                             │
│  ──────────── REVIEW GATE 1 ────────────             │
├──────────────────────────────────────────────────────┤
│                    PHASE 2 (P2)                      │
│              Algorithm & Unit Contracts              │
│  Sub-agents: 2A, 2B, 2C                             │
│  ──────────── REVIEW GATE 2 ────────────             │
├──────────────────────────────────────────────────────┤
│                    PHASE 3 (P3)                      │
│              Unification & Architecture              │
│  Sub-agents: 3A, 3B                                 │
│  ──────────── REVIEW GATE 3 ────────────             │
├──────────────────────────────────────────────────────┤
│                    PHASE 4 (P4)                      │
│              Features & Polish                       │
│  Sub-agents: 4A, 4B                                 │
│  ──────────── FINAL REVIEW GATE ─────────            │
└──────────────────────────────────────────────────────┘
```

---

## PHASE 0 — Critical Production Fixes

> **Risk:** These bugs are live in production and affect real users.  
> **Constraint:** Zero architectural changes. Bug fixes only.

### Sub-agent 0A: GDPR Cron Safety

**Prompt for `@general`:**
```
Fix critical safety issues in Web/src/app/api/cron/cleanup-inactive-users/route.ts:

1. The `CRON_SECRET` check is fail-open — if the env var is unset, anyone can
   trigger user deletion. Change to fail-closed:
   ```ts
   const cronSecret = process.env.CRON_SECRET;
   if (!cronSecret) {
     return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
   }
   if (authHeader !== `Bearer ${cronSecret}`) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. The query uses `updatedAt` to detect inactivity. A user who logs in regularly
   but never updates their profile would be flagged. Change to also check the
   `Session` table (or `Account` table lastLogin). Use whichever is more recent
   between `user.updatedAt` and the user's latest session `expires` field.

3. Add a `?dryRun=true` query parameter that returns the list of users that
   WOULD be deleted without actually deleting them.

4. Before the `deleteMany`, log all user IDs being deleted using the structured
   logger: `import { logger } from '@/lib/logging/logger'`

5. Fix the typo: "Casade" → "Cascade"

Do NOT change any other files. Run: cd Web && npx tsc --noEmit
```

### Sub-agent 0B: Cache Invalidation Fix

**Prompt for `@general`:**
```
Fix stale cache after workout mutations in
flutter/lib/data/repositories/goal_repository_impl.dart:

1. In `updateWorkout` (line 178): after the successful API response and before
   the return, add cache invalidation:
   ```dart
   await cacheDatasource.remove(CacheKeys.goals);
   ```

2. In `reorderWorkout` (line 198): after the successful API call, add:
   ```dart
   await cacheDatasource.remove(CacheKeys.goals);
   ```

3. In `_refreshInBackground` (line 301-306): replace `catch (_) {}` with:
   ```dart
   catch (e) {
     // Log but don't rethrow — this is a background refresh
     debugPrint('Background cache refresh failed for $key: $e');
   }
   ```

Run verification:
  cd flutter && flutter analyze
  cd flutter && flutter test test/unit/goal_repository_test.dart
```

### Sub-agent 0C: Silent Error Handlers

**Prompt for `@general`:**
```
Find and fix all silent `catch (_) {}` or `catch (e) {}` blocks that swallow
errors without logging in the Flutter codebase.

Search: `grep -rn "catch (_)" flutter/lib/` and `grep -rn "catch (e) {}" flutter/lib/`

For each occurrence:
- If it's a background/non-critical operation: replace with
  `catch (e) { debugPrint('ContextDescription: $e'); }`
- If it's in a user-facing flow: ensure the error surfaces via snackbar or
  state update (check if it already does — some catches DO handle errors properly,
  like _CompletionCheckbox._toggle which already has rollback+snackbar)

Do NOT change catches that already log or handle errors.
Do NOT change test files.

Run: cd flutter && flutter analyze
```

### Sub-agent 0D: Public API Hardening

**Prompt for `@general`:**
```
Harden the public plan generator API:

1. In Web/src/app/api/public/plan/generate/route.ts:
   - Remove the standalone OPTIONS handler that sets `Access-Control-Allow-Origin: *`
     (the middleware already handles CORS for /api/public routes)
   - Add XSS sanitization: any string field in the response that came from user
     input should be escaped with a simple `escapeHtml()` function

2. In Web/src/app/api/public/plan/export/route.ts:
   - Remove the standalone OPTIONS handler (same reason)
   - In `generateHtml()`: escape all user-provided strings before inserting into
     HTML template. Create a helper:
     ```ts
     function escapeHtml(str: string): string {
       return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
     }
     ```
   - Apply `escapeHtml()` to: w.description, w.type, w.phase, w.dayOfWeek,
     week.phase, plan.raceType, plan.raceDate

3. In Web/src/app/plan-generator/page.tsx line 181:
   - The `catch { }` in handleExport swallows errors. Add:
     `catch { setError('Export failed. Please try again.'); }`

Run: cd Web && npx tsc --noEmit
```

### ═══ REVIEW GATE 0 ═══

**Prompt for `@general`:**
```
REVIEW GATE — Phase 0 verification. Run ALL of the following and report results:

1. cd Web && npx tsc --noEmit
   PASS CRITERIA: zero errors

2. cd flutter && flutter analyze
   PASS CRITERIA: zero errors (infos are acceptable)

3. cd flutter && flutter test
   PASS CRITERIA: zero failures

4. Verify GDPR fix:
   - Open Web/src/app/api/cron/cleanup-inactive-users/route.ts
   - Confirm: CRON_SECRET check is fail-closed (returns 500 if unset)
   - Confirm: dryRun parameter exists
   - Confirm: user IDs are logged before deletion

5. Verify cache fix:
   - Open flutter/lib/data/repositories/goal_repository_impl.dart
   - Confirm: updateWorkout calls cacheDatasource.remove
   - Confirm: reorderWorkout calls cacheDatasource.remove
   - Confirm: _refreshInBackground logs errors instead of swallowing

6. Verify public API fix:
   - Open Web/src/app/api/public/plan/generate/route.ts
   - Confirm: no standalone OPTIONS handler with wildcard CORS
   - Open Web/src/app/api/public/plan/export/route.ts
   - Confirm: escapeHtml applied to user strings in generateHtml

Report: GATE 0 PASS or GATE 0 FAIL with specific failures listed.
Do NOT proceed to Phase 1 if any check fails.
```

---

## PHASE 1 — Foundation & Safety

> **Prerequisite:** GATE 0 PASS  
> **Goal:** Fix the most impactful logic bugs without architectural changes.

### Sub-agent 1A: effectiveSport No-Op Fix

**Prompt for `@general`:**
```
Fix the effectiveSport bug in Web/src/lib/services/plan-creation.ts.

Find the line (around line 327) that reads:
  const effectiveSport = sport ?? (isNoRace ? 'RUN' : 'RUN');

This ternary is a no-op — it always resolves to 'RUN' regardless of isNoRace.

Fix: The intent is to default non-race goals to 'RUN' but race goals should use
the sport parameter. The correct logic is:
  const effectiveSport = sport || 'RUN';

This preserves backward compatibility: if sport is provided, use it; otherwise
default to RUN.

Run: cd Web && npx tsc --noEmit
```

### Sub-agent 1B: Wizard Validation Gaps

**Prompt for `@general`:**
```
Add validation to wizard steps that currently return `true` unconditionally.

File: flutter/lib/presentation/screens/goals/goal_setup_wizard.dart
Method: _validateCurrentStep()

Current state:
- Steps 0, 2, 5: already have proper validation ✓
- Steps 1, 3, 4, 6, 7, 8: return true unconditionally

Add validation for:

Step 3 (target time): If _hasTargetTime is true and no VO2max data exists,
  verify the manual time fields have a value > 0. Show snackbar if invalid.

Step 4 (weekly volume): Verify _weeklyMileageGoal >= 5.0 and _runsPerWeek >= 1.
  Show snackbar with localized message if invalid.

Step 6 (schedule): Verify _longRunDay != _qualityDay (can't have long run and
  quality workout on same day). Show snackbar if invalid.

Steps 1, 7, 8: Leave as `return true` — these are selection steps that always
  have valid defaults.

Use existing pattern from step 2 for snackbar messages. Use S.of(context) for
any new strings — add them to the ARB files if needed, or use English literals
as placeholder.

Run:
  cd flutter && flutter analyze
  cd flutter && flutter test test/widget/goal_setup_wizard_test.dart
```

### Sub-agent 1C: Strava Disconnect Transaction

**Prompt for `@general`:**
```
Wrap the Strava disconnect operations in a Prisma transaction.

File: Web/src/app/api/user/strava/disconnect/route.ts

Currently, the account deletion and user update are separate operations. If the
user update fails, the account link is already deleted but tokens remain.

Wrap in a transaction:
```ts
await prisma.$transaction(async (tx) => {
    await tx.account.deleteMany({
        where: { userId, provider: 'strava' }
    });

    await tx.user.update({
        where: { id: userId },
        data: {
            stravaAccessToken: null,
            stravaRefreshToken: null,
            stravaTokenExpiry: null,
            stravaId: null,
        }
    });

    if (deleteActivities) {
        const deleteResult = await tx.activity.deleteMany({
            where: {
                userId,
                stravaId: { gt: BigInt(0) }
            }
        });
        deletedActivitiesCount = deleteResult.count;
    }
});
```

Declare `let deletedActivitiesCount = 0;` before the transaction.

Run: cd Web && npx tsc --noEmit
```

### ═══ REVIEW GATE 1 ═══

**Prompt for `@general`:**
```
REVIEW GATE — Phase 1 verification:

1. cd Web && npx tsc --noEmit
   PASS CRITERIA: zero errors

2. cd flutter && flutter analyze
   PASS CRITERIA: zero errors

3. cd flutter && flutter test
   PASS CRITERIA: zero failures

4. Verify effectiveSport:
   - Open Web/src/lib/services/plan-creation.ts
   - Confirm: effectiveSport = sport || 'RUN' (NOT the no-op ternary)

5. Verify wizard validation:
   - Open flutter/lib/presentation/screens/goals/goal_setup_wizard.dart
   - Confirm: step 4 validates _weeklyMileageGoal >= 5 and _runsPerWeek >= 1
   - Confirm: step 6 validates _longRunDay != _qualityDay

6. Verify Strava disconnect:
   - Open Web/src/app/api/user/strava/disconnect/route.ts
   - Confirm: operations wrapped in prisma.$transaction

Report: GATE 1 PASS or GATE 1 FAIL.
```

---

## PHASE 2 — Algorithm & Unit Contracts

> **Prerequisite:** GATE 1 PASS  
> **Goal:** Consolidate duplicate algorithms, enforce unit contracts.

### Sub-agent 2A: VDOT Algorithm Consolidation

**Prompt for `@general`:**
```
Consolidate duplicate VDOT implementations.

STEP 1 — Audit: List all files containing VDOT/VO2max calculation functions:
  grep -rn "estimateTime\|predictRaceTime\|vdotFromTime\|timeFromVdot" flutter/lib/

STEP 2 — Compare: The primary implementation should be in
flutter/lib/core/utils/vdot.dart. Find any duplicate implementations
(particularly in vdot_calculator.dart or inline in training_paces_card.dart).

STEP 3 — Consolidate:
- Keep flutter/lib/core/utils/vdot.dart as the single source of truth
- If vdot_calculator.dart exists with different functions, merge unique functions
  into vdot.dart and make vdot_calculator.dart re-export from vdot.dart
- Remove any inline VDOT calculations from widget files — they should import
  from vdot.dart
- Update all imports across the codebase

STEP 4 — Verify: Ensure existing tests still pass:
  cd flutter && flutter test test/unit/vdot_test.dart
  cd flutter && flutter analyze
```

### Sub-agent 2B: Unit Contract Tests

**Prompt for `@general`:**
```
Create unit contract tests to verify km/meters consistency.

Create file: flutter/test/unit/unit_contract_test.dart

The test should verify:

1. CreateGoalRequest.weeklyMileageGoal — document what unit this is (km).
   Test that when the wizard sets _weeklyMileageGoal = 28.0, the request
   field weeklyMileageGoal = 28.0 (km, not meters).

2. CreateGoalRequest.maxLongRunKm — verify the field name matches the unit.
   Test maxLongRunKm = 18.0 means 18 kilometers.

3. CreateGoalRequest.backyardLoopDistM — verify this is meters.
   Test backyardLoopDistM = 6706.0 means 6706 meters.

4. CreateGoalRequest.customSwimDistM / customBikeDistM / customRunDistM —
   verify these are meters.

5. Workout.targetDistance — document the unit. Check the formatDistance()
   utility to see what unit it expects.

6. Workout.targetPace — document the unit. Check formatPace() to verify.

For each test, add a doc comment stating the canonical unit:
  /// weeklyMileageGoal is in KILOMETERS (km)
  /// The server API stores this in meters internally

Run:
  cd flutter && flutter test test/unit/unit_contract_test.dart
  cd flutter && flutter analyze
```

### Sub-agent 2C: Progression Coefficient Documentation

**Prompt for `@general`:**
```
Document and add guardrails to the progression coefficient calculation.

File: flutter/lib/core/utils/goal_projection.dart
Function: calculateProgressionCoefficient

1. Add a comprehensive doc comment explaining:
   - What the coefficient represents (expected VDOT improvement ratio)
   - Input units: weeks (int), runsPerWeek (int), weeklyMileageGoal (km)
   - Output range: 1.0 to 1.15 (no improvement to 15% max improvement)
   - Scientific basis: based on Daniels (2014) with linear approximation

2. Add an assertion or clamp to ensure the output never exceeds 1.20:
   ```dart
   assert(result >= 1.0 && result <= 1.20,
     'Progression coefficient $result out of expected range [1.0, 1.20]');
   return result.clamp(1.0, 1.20);
   ```

3. Add a unit test in flutter/test/unit/ that verifies:
   - 0 weeks → coefficient = 1.0
   - 12 weeks, 4 runs/week, 40km/week → coefficient between 1.05 and 1.15
   - 24 weeks max → coefficient <= 1.15 (capped)
   - Edge case: 0 runs/week → coefficient = 1.0 (no training = no improvement)

Run:
  cd flutter && flutter analyze
  cd flutter && flutter test
```

### ═══ REVIEW GATE 2 ═══

**Prompt for `@general`:**
```
REVIEW GATE — Phase 2 verification:

1. cd flutter && flutter analyze
   PASS CRITERIA: zero errors

2. cd flutter && flutter test
   PASS CRITERIA: zero failures

3. Verify VDOT consolidation:
   - Run: grep -rn "estimateTime\|predictRaceTime" flutter/lib/ --include="*.dart"
   - Confirm: all VDOT functions live in vdot.dart (or re-exported from it)
   - Confirm: no inline VDOT math in widget files

4. Verify unit contract tests exist:
   - Confirm: flutter/test/unit/unit_contract_test.dart exists and passes
   - Confirm: each field's canonical unit is documented in test comments

5. Verify progression coefficient:
   - Open flutter/lib/core/utils/goal_projection.dart
   - Confirm: calculateProgressionCoefficient has doc comment with unit info
   - Confirm: output is clamped to [1.0, 1.20]

Report: GATE 2 PASS or GATE 2 FAIL.
```

---

## PHASE 3 — Unification & Architecture

> **Prerequisite:** GATE 2 PASS  
> **Goal:** Unify plan creation inputs, extract shared UI components.

### Sub-agent 3A: Unified Plan Defaults

**Prompt for `@general`:**
```
Create a single source of truth for plan creation defaults.

Create file: flutter/lib/core/utils/plan_defaults.dart

This file should export a class or set of functions that resolve ALL default
values for plan creation, used by both the wizard AND onboarding:

```dart
/// Canonical defaults for plan creation.
/// Both GoalSetupWizard and onboarding flows MUST use these.
class PlanDefaults {
  /// Default weekly mileage in KM based on race type and fitness level
  static double weeklyMileageKm(RaceType raceType, {double? currentVdot}) {
    // Use VDOT-adjusted defaults if available
    if (currentVdot != null && currentVdot > 0) {
      // ~0.7 km per VDOT point per week is a reasonable heuristic
      return (currentVdot * 0.7).clamp(15.0, 120.0);
    }
    // Static defaults by race type
    switch (raceType) {
      case RaceType.fiveK: return 20.0;
      case RaceType.tenK: return 28.0;
      case RaceType.halfMarathon: return 35.0;
      case RaceType.marathon: return 45.0;
      // ... etc for all race types
    }
  }

  static int runsPerWeek(RaceType raceType) { ... }
  static int planWeeks(RaceType raceType, DateTime raceDate) { ... }
  static double maxLongRunKm(RaceType raceType) { ... }
  static List<int> phaseWeeks(int totalWeeks, RaceType raceType) { ... }
}
```

Then update GoalSetupWizard to use PlanDefaults for its initial values instead
of hardcoded values (e.g., replace `double _weeklyMileageGoal = 28.0` with
a value from PlanDefaults).

Do NOT change the onboarding flow yet — just create the shared defaults.

Run:
  cd flutter && flutter analyze
  cd flutter && flutter test
```

### Sub-agent 3B: Shared Workout Theme Utilities

**Prompt for `@general`:**
```
Extract duplicated workout color/icon/label logic into a shared utility.

Currently, workout colors, icons, and labels are duplicated in:
- flutter/lib/presentation/screens/goals/goal_detail_screen.dart (_WorkoutCard)
- flutter/lib/presentation/screens/plan/plan_screen.dart (if it exists)
- Any other screen with workout type rendering

Create: flutter/lib/core/utils/workout_theme.dart

```dart
import 'package:flutter/material.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

/// Canonical workout type visual properties.
/// Use this instead of inline switch-cases in widget files.
class WorkoutTheme {
  static Color color(WorkoutType type) {
    return switch (type) {
      WorkoutType.easy => const Color(0xFF4CAF50),
      WorkoutType.longRun => const Color(0xFF2196F3),
      // ... all types
    };
  }

  static IconData icon(WorkoutType type) {
    return switch (type) {
      WorkoutType.easy => Icons.directions_run,
      // ... all types
    };
  }

  static String label(BuildContext context, WorkoutType type) {
    // Use S.of(context) for localized types, fallback for non-localized
    return switch (type) {
      WorkoutType.easy => S.of(context).workoutTypeEasy,
      // ... all types
    };
  }
}
```

Update goal_detail_screen.dart to use WorkoutTheme instead of its inline
_workoutColor(), _workoutIcon(), _workoutLabel() methods.

Run:
  cd flutter && flutter analyze
  cd flutter && flutter test
```

### ═══ REVIEW GATE 3 ═══

**Prompt for `@general`:**
```
REVIEW GATE — Phase 3 verification:

1. cd flutter && flutter analyze
   PASS CRITERIA: zero errors

2. cd flutter && flutter test
   PASS CRITERIA: zero failures

3. Verify PlanDefaults:
   - Confirm: flutter/lib/core/utils/plan_defaults.dart exists
   - Confirm: GoalSetupWizard imports and uses PlanDefaults for initial values
   - Confirm: PlanDefaults has doc comments stating units (km, meters, etc.)

4. Verify WorkoutTheme:
   - Confirm: flutter/lib/core/utils/workout_theme.dart exists
   - Confirm: goal_detail_screen.dart uses WorkoutTheme.color/icon/label
   - Confirm: no remaining inline _workoutColor/_workoutIcon switch-cases in
     goal_detail_screen.dart

5. Regression check:
   - Run: cd flutter && flutter test test/widget/goal_setup_wizard_test.dart
   - Run: cd flutter && flutter test test/unit/goal_detail_provider_test.dart
   - PASS CRITERIA: zero failures

Report: GATE 3 PASS or GATE 3 FAIL.
```

---

## PHASE 4 — Features & Polish

> **Prerequisite:** GATE 3 PASS  
> **Goal:** Add new capabilities on the stabilized foundation.

### Sub-agent 4A: Plan Overview Screen Improvements

**Prompt for `@general`:**
```
Improve the goal detail screen to show plan metadata.

File: flutter/lib/presentation/screens/goals/goal_detail_screen.dart

In the _GoalHeader widget, add display of plan configuration metadata:
- Weekly mileage goal (using formatDistance or km display)
- Plan duration in weeks
- Runs per week
- Current training phase (if derivable from workout dates)

Use the existing Goal entity fields. Only display fields that are non-null.
Use the existing Card + Row pattern from _GoalHeader for consistency.

Run:
  cd flutter && flutter analyze
  cd flutter && flutter test
```

### Sub-agent 4B: Web Plan Creation Unit Guard

**Prompt for `@general`:**
```
Add unit documentation and a guard to the server-side plan creation.

File: Web/src/lib/services/plan-creation.ts

1. At the top of createPlanWithWorkouts, add a comment block:
   ```ts
   /**
    * Creates a training plan with workouts.
    *
    * UNIT CONTRACT:
    * - weeklyMileageGoal: METERS (stored in DB as meters)
    * - maxLongRunKm: KILOMETERS (despite the km suffix, converted internally)
    * - All workout targetDistance: METERS
    * - All workout targetPace: SECONDS PER KM
    */
   ```

2. Add a runtime guard near the top of the function:
   ```ts
   // Sanity check: weeklyMileageGoal should be in meters (> 1000 for any
   // reasonable training plan). If it's < 200, it was likely passed in km.
   if (weeklyMileageGoal && weeklyMileageGoal > 0 && weeklyMileageGoal < 200) {
     console.warn(`weeklyMileageGoal=${weeklyMileageGoal} appears to be in km, not meters. Auto-converting.`);
     weeklyMileageGoal = weeklyMileageGoal * 1000;
   }
   ```

Run: cd Web && npx tsc --noEmit
```

### ═══ FINAL REVIEW GATE ═══

**Prompt for `@general`:**
```
FINAL REVIEW GATE — Full project verification:

1. cd Web && npx tsc --noEmit
   PASS CRITERIA: zero errors

2. cd flutter && flutter analyze
   PASS CRITERIA: zero errors

3. cd flutter && flutter test
   PASS CRITERIA: zero failures

4. Summary check — verify all phases are complete:

   Phase 0:
   [ ] GDPR cron is fail-closed with dryRun support
   [ ] Cache invalidation added to updateWorkout and reorderWorkout
   [ ] Silent catches replaced with logging
   [ ] Public API XSS protection via escapeHtml

   Phase 1:
   [ ] effectiveSport bug fixed (no longer no-op ternary)
   [ ] Wizard validation added for steps 4 and 6
   [ ] Strava disconnect wrapped in transaction

   Phase 2:
   [ ] VDOT functions consolidated into single file
   [ ] Unit contract tests exist and pass
   [ ] Progression coefficient documented and clamped

   Phase 3:
   [ ] PlanDefaults created and used by wizard
   [ ] WorkoutTheme extracted and used by goal_detail_screen

   Phase 4:
   [ ] Goal detail shows plan metadata
   [ ] Server-side unit guard on weeklyMileageGoal

5. Pre-push checklist (from AGENTS.md):
   cd flutter && flutter analyze  — must pass with zero errors
   cd flutter && flutter test     — must pass with zero failures

Report: ALL GATES PASS or list remaining failures.

If ALL GATES PASS:
  git add -A
  git commit -m "feat: RunFlow stabilization — cache fixes, GDPR safety, VDOT consolidation, unit contracts, shared defaults"
  git push
```

---

## Execution Guide

### How to run this plan in OpenCode

Execute phases sequentially. Copy each sub-agent prompt to `@general`:

```
Phase 0: Run 0A → 0B → 0C → 0D → REVIEW GATE 0
Phase 1: Run 1A → 1B → 1C → REVIEW GATE 1
Phase 2: Run 2A → 2B → 2C → REVIEW GATE 2
Phase 3: Run 3A → 3B → REVIEW GATE 3
Phase 4: Run 4A → 4B → FINAL REVIEW GATE
```

Sub-agents within a phase can run in parallel if they touch different files:
- **Phase 0:** 0A (Web) ∥ 0B (Flutter) ∥ 0C (Flutter) ∥ 0D (Web)
- **Phase 1:** 1A (Web) ∥ 1B (Flutter) ∥ 1C (Web)
- **Phase 2:** 2A ∥ 2B ∥ 2C (all Flutter, but different files)
- **Phase 3:** 3A → 3B (sequential — 3B may reference patterns from 3A)
- **Phase 4:** 4A (Flutter) ∥ 4B (Web)

### If a gate fails

1. Read the specific failure from the gate report
2. Create a fix prompt targeting only the failing check
3. Re-run the gate — do NOT proceed until it passes
