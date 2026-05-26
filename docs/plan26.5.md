# Plan 26.5: Plan Generation Fixes

## Goal

Fix the main plan generation issues found in `docs/PLAN_GEN_AUDIT.md`, with priority on making generated workouts reliable, explainable, and consistent across heart rate zones, pace zones, and goal pace.

## Current Problems

1. The app uses multiple incompatible heart rate zone systems.
2. HR profile inputs collected in the Flutter wizard are not sent to the backend.
3. Generated workouts store HR zone numbers but not the zone methodology or bpm ranges.
4. Backend calculates 7 HR zones, but Flutter activity analytics only preserve zones 1-5.
5. Generated plan workouts do not have structured workout steps.
6. Quality session distances are hardcoded and do not scale well by athlete volume.
7. Goal pace affects workouts indirectly through VDOT, with limited sanity checking.
8. Critical calculation logic lacks direct unit tests.

## Recommended Implementation Order

### Phase 1: Choose One HR Zone System

Use **LTHR-based zones** as the primary plan-generation HR zone system.

Reasoning:
- The Flutter wizard already asks for threshold HR.
- LTHR zones map better to training intent than generic max-HR percentages.
- Workout targets like threshold, tempo, VO2max, and recovery are easier to explain from LTHR.

Implementation tasks:
1. Define a shared zone model with 7 zones: recovery, aerobic, tempo, threshold, VO2max, anaerobic, neuromuscular.
2. Keep the current LTHR boundaries unless product requirements change:
   - Z1: up to 75% LTHR
   - Z2: 75-87% LTHR
   - Z3: 87-94% LTHR
   - Z4: 94-100% LTHR
   - Z5: 100-105% LTHR
   - Z6: 105-110% LTHR
   - Z7: above 110% LTHR
3. Mark the backend Karvonen helper as analytics-only or replace it with LTHR-based calculation.
4. Update UI copy so users know HR zones are based on threshold HR.

Files likely involved:
- `flutter/lib/core/utils/vdot_calculator.dart`
- `flutter/lib/presentation/screens/onboarding/unified_plan_wizard.dart`
- `Web/src/lib/analytics/zones.ts`
- `Web/src/lib/plans/index.ts`

Acceptance criteria:
- One documented HR zone method is used for generated plan targets.
- The wizard preview, backend plan zones, and profile/analytics labels no longer contradict each other.

### Phase 2: Send HR Profile Data to the Backend

Extend the plan creation payload so HR-based plan generation is not cosmetic.

Implementation tasks:
1. Add optional fields to `CreateGoalRequest`:
   - `maxHeartRate`
   - `restingHeartRate`
   - `thresholdHeartRate`
   - `thresholdPaceSecondsPerKm`
   - `hrZoneMethod`, defaulting to `LTHR`
2. Update Flutter domain/data models and mappers.
3. Update `PlanWizardNotifier.buildSubmitPayload()` to include the HR values.
4. Update backend request validation/normalization.
5. Store the selected HR profile data on the plan or user profile, depending on existing DB ownership.

Files likely involved:
- `flutter/lib/domain/entities/goal_entities.dart`
- `flutter/lib/data/models/goal_models.dart`
- `flutter/lib/data/mappers/goal_mappers.dart`
- `flutter/lib/presentation/providers/plan_wizard_providers.dart`
- `Web/src/lib/services/plan-creation.ts`
- Backend schema/API validation files if present

Acceptance criteria:
- HR fields entered in the wizard appear in the backend create-plan input.
- Generated workouts can be tied to the same zone method and values the user reviewed.

### Phase 3: Store Zone Targets Clearly on Workouts

Generated workouts currently store `targetHrZone` as a number and `intensityZone` as a string. Make this explicit and future-proof.

Implementation tasks:
1. Keep `targetHrZone` for backward compatibility.
2. Add optional structured fields where appropriate:
   - `targetHrZoneLabel`
   - `targetHrMinBpm`
   - `targetHrMaxBpm`
   - `targetPaceZoneLabel`
   - `targetPaceMinSecondsPerKm`
   - `targetPaceMaxSecondsPerKm`
3. Populate these from the selected HR zone system and VDOT training paces.
4. Update plan display UI to show clearer targets, for example `Z2 Aerobic, 139-151 bpm`.

Files likely involved:
- `flutter/lib/domain/entities/dashboard_entities.dart`
- `flutter/lib/data/models/dashboard_models.dart`
- `flutter/lib/data/mappers/dashboard_mappers.dart` if present
- `Web/src/lib/plans/index.ts`
- `Web/src/lib/plans/descriptions.ts`
- Database schema/migrations if workouts are persisted relationally

Acceptance criteria:
- A generated workout can display both the zone name and concrete bpm/pace range.
- Users do not need to infer what `Zone 3` means.

### Phase 4: Fix Zones 6-7 Data Loss

The backend tracks 7 zones, but Flutter analytics only carry zones 1-5.

Implementation tasks:
1. Add `hrZone6Time` and `hrZone7Time` to Flutter `Activity` data and domain models.
2. Update JSON serialization and mappers.
3. Update analytics aggregation to pass real zones 6 and 7 instead of zeros.
4. Add regression tests for 7-zone activity data.

Files likely involved:
- `flutter/lib/domain/entities/dashboard_entities.dart`
- `flutter/lib/data/models/dashboard_models.dart`
- `flutter/lib/data/mappers/dashboard_mappers.dart` if present
- `flutter/lib/presentation/screens/analytics/analytics_screen.dart`
- `flutter/test/unit/goal_models_test.dart`
- `flutter/test/widget/hr_zone_distribution_chart_test.dart`

Acceptance criteria:
- Flutter preserves and displays zones 1-7 from backend activity data.
- Analytics no longer hardcode zones 6 and 7 to zero.

### Phase 5: Add Structured Workout Steps to Generated Plans

Generated workouts currently embed interval details in description strings. This prevents reliable guided execution.

Implementation tasks:
1. Define a persisted structured workout schema for generated plans.
2. Use existing client concepts where possible:
   - warmup
   - interval
   - recovery
   - cooldown
   - repeat groups
   - pace target range
   - HR target zone/range
3. Add backend step generation for key workout types:
   - Easy
   - Long run
   - Tempo
   - Intervals
   - Repetitions
   - Fartlek
   - Race pace segments
4. Update Flutter plan/workout screens to prefer structured steps when available.
5. Keep text descriptions as summaries, not as the source of truth.

Files likely involved:
- `flutter/lib/domain/entities/workout_step.dart`
- `flutter/lib/domain/services/workout_step_execution_engine.dart`
- `flutter/lib/presentation/screens/workout/workout_preview_screen.dart`
- `Web/src/lib/plans/index.ts`
- `Web/src/lib/plans/generators/run-ultra.ts`
- `Web/src/lib/plans/generators/triathlon.ts`
- Backend workout persistence schema

Acceptance criteria:
- Generated interval workouts include machine-readable steps.
- Guided workout execution can run a generated plan workout without parsing description text.

### Phase 6: Scale Quality Session Distances

Quality workouts are currently too hardcoded. Scale them by weekly volume, race type, and plan phase.

Implementation tasks:
1. Define target quality-volume fractions by workout type:
   - Tempo: moderate quality fraction
   - Intervals: lower total quality distance but higher intensity
   - Repetitions: smallest quality distance
   - Marathon pace segments: larger but controlled quality fraction
2. Apply floor and ceiling values per race type.
3. Use athlete weekly volume and phase to determine total session distance.
4. Preserve recovery-week reductions.
5. Add tests for low-volume, medium-volume, and high-volume athletes.

Files likely involved:
- `Web/src/lib/plans/index.ts`
- `Web/src/lib/plans/generators/run-ultra.ts`
- `Web/src/lib/plans/generators/triathlon.ts`

Acceptance criteria:
- A 30 km/week athlete does not receive the same quality session distance as an 80 km/week athlete.
- Session distances remain within safe minimum/maximum bounds.

### Phase 7: Add Goal Pace Sanity Checks

Goal pace currently influences workouts through target-time-derived VDOT. Add guardrails.

Implementation tasks:
1. Compare VDOT from target time with calibration/current VDOT.
2. Flag unrealistic goals where target VDOT exceeds current VDOT by more than the allowed improvement cap.
3. Decide product behavior:
   - warn only
   - cap training paces to projected VDOT
   - require user confirmation
4. Prefer projected training VDOT for workouts and keep goal time as aspirational if unrealistic.

Files likely involved:
- `Web/src/lib/services/plan-creation.ts`
- `Web/src/lib/metrics/goalProjection.ts`
- `flutter/lib/presentation/screens/onboarding/unified_plan_wizard.dart`

Acceptance criteria:
- Unrealistic target times do not silently generate unsafe training paces.
- The UI explains the difference between goal time and training pace basis.

### Phase 8: Add Tests Before and During Refactors

Add tests for the calculation logic most likely to regress.

Minimum tests:
1. `calculateHRZonesFromLTHR()`:
   - normal LTHR boundaries
   - continuity between zones
   - zero/invalid input behavior
2. `calculateTrainingPaces()`:
   - paces are ordered correctly
   - known VDOT snapshot values
   - client/server parity if practical
3. `PaceZoneResult.evaluate()`:
   - too fast
   - in zone
   - too slow
   - exact tolerance boundary
   - no target
4. Plan generation quality scaling:
   - low volume
   - medium volume
   - high volume
   - recovery week
5. Workout step generation:
   - tempo steps
   - interval repeat groups
   - recovery steps
   - long run with race pace segments

Files likely involved:
- `flutter/test/unit/vdot_test.dart`
- New `flutter/test/unit/vdot_calculator_test.dart`
- New `flutter/test/unit/pace_zone_test.dart`
- Backend test files if the Web app has a test runner configured

Acceptance criteria:
- The highest-risk calculations have direct unit tests.
- Existing Flutter `flutter test` still passes.
- Backend tests pass or are added if not currently configured.

## Migration Strategy

1. Add new fields as optional first.
2. Keep existing `targetHrZone`, `targetPace`, `intensityZone`, and `description` fields working.
3. Backfill only if historical plan display requires it; otherwise use new fields for newly generated plans.
4. Avoid breaking existing plans until generated structured steps are stable.
5. Once structured steps are proven, treat descriptions as display summaries only.

## Verification Checklist

Before pushing implementation changes:

1. Run Flutter analyzer:

```bash
cd flutter && flutter analyze
```

2. Run Flutter tests:

```bash
cd flutter && flutter test
```

3. Build APK with Strava client ID:

```bash
cd flutter && flutter build apk --release --dart-define=STRAVA_CLIENT_ID=193995
```

4. Run backend checks if available:

```bash
cd Web && npm test
cd Web && npm run lint
cd Web && npm run build
```

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Choose One HR Zone System | **Done** | LTHR-based zones confirmed as primary; Karvonen kept analytics-only |
| 2. Send HR Profile Data | **Done** | HR fields added to CreateGoalRequest, wizard, backend schema/normalizer, with tests |
| 3. Store Zone Targets Clearly | **Deferred** | Requires DB migration and UI design decisions; new fields are additive |
| 4. Fix Zones 6-7 Data Loss | **Done** | `hrZone6Time`/`hrZone7Time` added to Activity model, mappers, analytics aggregation |
| 5. Add Structured Steps | **Done** | Backend generates warmup/work/cooldown steps; Flutter preserves `structuredSteps` JSON |
| 6. Scale Quality Distances | **Done** | `scaleQualitySessionDistance()` with per-type fractions, floor/ceiling bounds, 500m rounding |
| 7. Goal Pace Guardrails | **Done** | `resolveTrainingVdotForGoal()` caps VDOT at `currentVdot * 1.15` when fitness baseline exists |
| 8. Add Tests | **Done** | 56 new unit tests across Flutter and backend (VDOT, paces, zones, scaling, guardrails) |

### Deferred Items

- **Phase 3 (Store Zone Targets Clearly)**: Requires a DB migration for new columns on the `Workout` table and updated UI to display concrete bpm/pace ranges. The current zone-label fields (`targetHrZone`, `intensityZone`) continue to work.
- **APK build**: Blocked in CI by missing `ANDROID_HOME` environment variable.
- **Pre-existing Web test failures**: `ai/chat/history` and `admin/recalculate-fitness` routes have mock DB issues unrelated to this work.

## Recommended First PR

Start with a small PR that does only this:

1. Add HR profile fields to `CreateGoalRequest`.
2. Send wizard HR values to the backend.
3. Add backend normalization for these fields.
4. Add tests proving the payload includes HR fields.

This creates the foundation for consistent HR-zone-based plan generation without changing the whole generator at once.
